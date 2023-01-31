import roomServer from "./roomServer.js";
import rSiteTrackClientForTiming from "./rSiteTrackClientForTiming.js";
import tcpClientAutoReconnect from "./tcpClient.js";
import {promises as fs} from 'fs';
import wsManagerClass from './wsServer2Server.js';
/**
 * IDEAS: 
 * - rTiming has two datasets: the rSite it is connected to (stored in rSiteClient) and its own. 
 * - rTimings own data shall always represent the data that is available in the timing software (or at least in the last stored input file for the timing software). The only exception is when e.g. the input file could not successfully be written. Then, we shall show a warning to the user and the option to try to send again.
 * 
 * 
 */
export default class rTiming extends roomServer{
    
    constructor(wsManagerOld, timingName, eventHandler, mongoDb, logger, heatsPushable=false, reactionPullable=false, resultsPullable=false){
        
        // initialize the room
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTickets=-1, conflictChecking=false, dynamicRoom=undefined, reportToSideChannel=true, keepWritingTicket=true)
        // there is no sidechannel for rTiming
        let roomName = `timing${timingName}`;
        super(eventHandler, mongoDb, logger, roomName, true, -1, false, undefined, false, true);

        // we cannot use the ws connection provided by wsManager, since we need to use a separate client (or server) for every timing software. Otherwise, the note/request handlers will deliver the incoming messages to rSite-Server instead of rSite. (Note: it is impossible to have client and server on the same connection, since the room name is the same and there is no other concept to differentiate between server and client). How can we adopt the wsManager for this?
        // TODO: note+request handlers! They must be able to handle the rSiteClient!
        // actually, I think we only need note handler for the moment, since clients only receive notes, but no requests
        let requestHandlerCreator = (wsProcessorInstance, ws)=>{
            return (request, responseFunc)=>{
                // handle requests
            }
        }
        /**
         * noteHandling: handling the incoming notes. Must have one argument, so it can be used in the wsProcessor directly. Currently this is unused yet, as so far everything is a request...
         * IMPORTANT TODO: make sure that notes of the wrong data type do not crash the server!
         * @param {any} note The data that was sent. could be any datatype, as defined on client and server as soon it is used. 
         */
        const noteHandlerCreator = (wsProcessor, ws={})=>{

            return (note)=>{

                if (!('name' in note) || !('data' in note)){
                    logger.log(75, 'The note "'+note.toString()+'" must have properties data and name');
                    return;
                } 

                let name = note.name;
                let data = note.data;

                if(name=='room'){
                    
                    // tabId must have been reported before; the rooms expect to get this information
                    if ('arg' in data && 'roomName' in data && ws.tabID){ // as of 2021-01

                        // the room name must be the name of the rSiteClient (not server!) This procedure is unusual for the Server. 
                        if (data.roomName == this.rSiteClient.name){
                            this.rSiteClient.wsNoteIncoming(data.arg, data.opt)
                        } else {
                            logger.log(75, `The only allowed room in this ws connection is ${this.rSiteClient.name}, but room name was ${data.roomName}. Neglecting note with arg=${data.arg} and opt=${data.opt}`);
                        }

                    } else {
                        logger.log(75, 'Missing arguments (a request to "room" must contain the properties "arg" and "roomName")');
                    }

                }else{
                    let errMsg = '"'+ name +'" does not exist as keyword for Websocket notes.';
                    logger.log(5, errMsg);
                }
            }
        }
        const wsManager = new wsManagerClass(logger, eventHandler, requestHandlerCreator, noteHandlerCreator);
        this.wsManager = wsManager;

        // store the ws connection and the rSiteClient
        this.conn = null;
        this.rSiteClient = null;

        // store a reference to the interval of reading reaction times and results
        this.pullResultsInterval = null;
        this.pullReactionInterval = null;

        // if we do the initial comparison between the rSite data and the actual data of this room, we might add/delete many contests and heats. Every of this change will be handled in the respective functions. Typically, these function will directly send the change to teh timing, since it is the idea that rTiming-data always represnts the data in the timing software. However, if the exchange is file based, it does not make sense to write the file at every small change, when we know that many more small changes will/might follow during the initial comparison. Thus, we have the variable deferWrite, which is set to true at the beginning of the initial comparison and set to false at the end together with calling this.deferredWrite(). This allows file-type heat exchanges to not (re-)write the file when derferWrite=true and to create the file at the end. If this deferredWritign does not make sense for a certain timing client, then it can simply be negelected.
        this.deferWrite = false; // prevent writing of single changes (depends on timing client)

        this.data = {
            name: timingName,
            timingOptions:{}, // to be set by the timing specific implementatzion
            siteConf:{},

            // capabilities of the timing software; for information of the client only; stays constant
            capabilities: {
                heatsPushable, // is it possible to push heats to the timing? (heatsPull is not needed since this is done automatically if present)
                reactionPullable, // is it possible to pull reaction times manually? (reactionPush is not needed since this is done automatically if present)
                resultsPullable, // is it possible to pull results manually? (resultsPush is not needed since this is done automatically if present)
                
                //useReactionTimes: true, // not used and NOT STORED yet
            },
            infos:{
                lastHeatPushFailed: false, // set to true when the last heatPush failed to notify the user 
                
                siteServerConnected: false,
                lastSiteServerConnectionError: '',
                siteRoomConnected: false,
                lastSiteRoomConnectionError: '',
                timing:{}, // to be filled by the inheriting timing-specific class
            },

            // options which events in rSite result in direct transfer to/from rTiming
            // key: -1: never, -2: always auto, >=0: minimum state of the contest/series to do so.
            // to rTiming: 
            auto:{}, // what changes should be done automatically; will be loaded from Mongo

            timers: {}, // the timeouts for pulling results and reactionTimes

            data: [], // here we put the actual data with contests and heats!

            contests: [], // will be filled with the data of the rSiteTrackClient.contests

            meeting:{}, // will be filled with the meeting data rSiteTrackClient.meeting

            disciplines: [], // raw data of rDiscipline; received via rSiteTrackClient
        }

        this.defaultSiteConf = {
            shortname: 'DBDisz',
            host: 'localhost',
            port: 3000,
            path: '/ws',
            token: "c5fe8f20-5a67-4a14-8e3c-31acd0c392a4",
            secure: false,
            siteNumber: 1,
        };

        this.defaultAuto = {
            changeContestAuto: -1,
            changeSeriesAuto: -1,
            addSeriesAuto: -1,
            deleteSeriesAuto: -1,
            // key: -1: never, -2: always auto, >=0: maximum state of series/contest to do so.
            // from rTiming: 
            addResultAuto: -1, // single result, eventually inofficial
            addResultHeatAuto: -1, // full heat, eventually including some info about the heat itself, eventually inofficial
            addReactionTimeAuto: -1, // 
            // TODO: probably we need more events; but try to keep the number of events low!
        };

        this.defaultTimers = {
            // in s, 0=off
            pullReactionTimes:0,
            pullResults:5,
        };

        this.heatsPushable = heatsPushable; // is it possible to push heats to the timing? (heatsPull is not needed since this is done automatically if present)
        this.reactionPullable = reactionPullable; // is it possible to pull reaction times manually? (reactionPush is not needed since this is done automatically if present)
        this.resultsPullable = resultsPullable; // is it possible to pull results manually? (resultsPush is not needed since this is done automatically if present)


        // this room shall keep track of the connections to the server and to the timing-software
        // IMPORTANT: in this room we should handle only the connection to the server; each kind of timing-API shall then inherit from this class and implement its special things in this other class

        // the locally stored data should be stored fully in MongoDB and contain the following;
        // Server infos: host, path, port, token, secure
        // timing infos: for ALGE: path to meeting files, path to result files, tcp-connection settings to the OpiVersatileExchangeProtocol and to the ALGEDisplay (ideally only teh first would be required)

        // based on the settings that are made on the client, we first create a ws-connection to the server (even if it would be on the same server), then we create a rSiteClient instance, which connects to the site on the main server. 

        // on startup: 
        // 1) get all data and settings from MongoDB; done in onMongoConencted --> after this point this.ready will be true.
        // 2) when this.ready is set: start the ws connection (via wsManager), and start rSiteTrackClient
        // 3) as soon as rSiteTrackClient is connected: compare data in rSiteTrackClient with data in rTiming and handle differences on the basis of the changeContestAuto, ... addResultHeatAuto -settings.

        if (this.ready){
            this.connectSite();
        } else {
            // make sure the connection to the server is started when the room is ready:
            this._onReadyFunctions.push(this.connectSite.bind(this));
        }

        // the events raised by the connection are as follows:
        // - `wsConnected/${this.tabId}`
        // - `TabIdSet/${this.tabId}`
        // - `wsClosed/${this.tabId}`

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        this.functionsWrite.updateSiteConf = this.updateSiteConf.bind(this);
        this.functionsWrite.updateAuto = this.updateAuto.bind(this);
        this.functionsWrite.updateTimers = this.updateTimers.bind(this);
        this.functionsWrite.updateTimingOptions = this.updateTimingOptions.bind(this);

        const schemaTimers = {
            type:'object',
            properties: {
                pullReactionTimes: {type: 'integer', minimum:0}, 
                pullResults: {type: 'integer', minimum: 0}, 
            },
            required:['pullReactionTimes', 'pullResults'],
            additionalProperties: false,
        };
        const schemaAuto = {
            type:'object',
            properties: {
                changeContestAuto: {type: 'integer', minimum:-2}, 
                changeSeriesAuto: {type: 'integer', minimum:-2}, 
                addSeriesAuto: {type: 'integer', minimum:-2}, 
                deleteSeriesAuto: {type: 'integer', minimum:-2}, 
                addResultAuto: {type: 'integer', minimum:-2}, 
                addResultHeatAuto: {type: 'integer', minimum:-2}, 
                addReactionTimeAuto: {type: 'integer', minimum:-2}, 
            },
            required:['changeContestAuto', 'changeSeriesAuto', 'addSeriesAuto', 'deleteSeriesAuto', 'addResultAuto', 'addResultHeatAuto', 'addReactionTimeAuto'],
            additionalProperties: false,
        };
        const schemaSiteConf = {
            type:'object',
            properties: {
                host: {type: 'string'}, 
                port: {type: 'integer', minimum: 1, maximum:62235}, 
                secure: {type: 'boolean'},
                path: {type:'string'},   
                shortname: {type:"string"}, 
                token: {type:'string', maxLength: 36}, // minLength: 36
                siteNumber: {type: 'integer', minimum: 0}
            },
            required:['host', 'port', 'secure', 'path', 'shortname', 'token', 'siteNumber'],
            additionalProperties: false,
        };
        this.validateSiteConf = this.ajv.compile(schemaSiteConf);
        this.validateAuto = this.ajv.compile(schemaAuto);
        this.validateTimers = this.ajv.compile(schemaTimers);
        this.validateTimingOptions = this.ajv.compile({}); // to be implemented by the inheriting class

    }

    /**
     * get all data from Mongo
     */
    async onMongoConnected(){
        // try to get the documents:
        // timingOptions: 
        let len = await this.collection.countDocuments({type:'timingOptions'});
        if (len==0){

            // create a default document
            await this.collection.updateOne({type:'timingOptions'},{$set:{timingOptions: {}}},{upsert:true}) //update with upsert=insert when not exists
            this.data.timingOptions = {};

        } else if (len>1){
            this.logger.log(10, `Cannot initialize mongoData in ${this.name} since there is more than one mongo document.`)
            return;
        } else {
            let cursor = this.collection.find({type:'timingOptions'});
            let raw = await cursor.next();
            this.data.timingOptions = raw.timingOptions;
        }

        // siteConf
        len = await this.collection.countDocuments({type:'siteConf'});
        if (len==0){

            // create a default document
            await this.collection.updateOne({type:'siteConf'},{$set:{siteConf: this.defaultSiteConf}},{upsert:true}) //update with upsert=insert when not exists
            this.data.siteConf = JSON.parse(JSON.stringify(this.defaultSiteConf));

        } else if (len>1){
            this.logger.log(10, `Cannot initialize mongoData in ${this.name} since there is more than one mongo document.`)
            return;
        } else {
            let cursor = this.collection.find({type:'siteConf'});
            let raw = await cursor.next();
            this.data.siteConf = raw.siteConf;
        }

        // auto: 
        len = await this.collection.countDocuments({type:'auto'});
        if (len==0){

            // create a default document
            await this.collection.updateOne({type:'auto'},{$set:{auto: this.defaultAuto}},{upsert:true}) //update with upsert=insert when not exists
            this.data.auto = JSON.parse(JSON.stringify(this.defaultAuto));

        } else if (len>1){
            this.logger.log(10, `Cannot initialize mongoData in ${this.name} since there is more than one mongo document.`)
            return;
        } else {
            let cursor = this.collection.find({type:'auto'});
            let raw = await cursor.next();
            this.data.auto = raw.auto;
        }

        // timers:
        len = await this.collection.countDocuments({type:'timers'});
        if (len==0){

            // create a default document
            await this.collection.updateOne({type:'timers'},{$set:{timers: this.defaultTimers}},{upsert:true}) //update with upsert=insert when not exists
            this.data.timers = JSON.parse(JSON.stringify(this.defaultTimers));

        } else if (len>1){
            this.logger.log(10, `Cannot initialize mongoData in ${this.name} since there is more than one mongo document.`)
            return;
        } else {
            let cursor = this.collection.find({type:'timers'});
            let raw = await cursor.next();
            this.data.timers = raw.timers;
        }

        // start the timers
        if (this.data.timers.pullReactionTimes>0){
            this.pullReactionInterval = setInterval(()=>{this.pullReaction();},1000*this.data.timers.pullReactionTimes);
        }
        if (this.data.timers.pullResults>0){
            this.pullResultsInterval = setInterval(()=>{this.pullResults();},1000*this.data.timers.pullResults);
        }

        // data:
        len = await this.collection.countDocuments({type:'data'});
        if (len==0){

            // create a default document
            await this.collection.updateOne({type:'data'},{$set:{data: []}},{upsert:true}) //update with upsert=insert when not exists
            this.data.data = [];

        } else if (len>1){
            this.logger.log(10, `Cannot initialize mongoData in ${this.name} since there is more than one mongo document.`)
            return;
        } else {
            let cursor = this.collection.find({type:'data'});
            let raw = await cursor.next();
            this.data.data = raw.data;
        }

        // now the room is ready:
        this.logger.log(95, 'rTiming ready')
        this.ready = true;
    }

    // NOTE: we presume that, once the room is connected, it will stay connected until the ws-connection is lost (or we leave it on purpose)
    connectSite(){
        // prepare a function to start the rSIteClient that shall be called whenever the connection is (re-)established
        let connectRoom = ()=>{

            this.data.infos.siteServerConnected = true;
            this.data.infos.lastSiteServerConnectionError = '';
            this.broadcastInf();

            // start rSiteClient
            let failureCB = (err)=>{
                
                this.data.infos.siteRoomConnected = false;
                this.data.infos.lastSiteRoomConnectionError = `Error: ${JSON.stringify(err)}`;
                this.broadcastInf();

                this.rSiteClient = null;
                // on failure try again after a timeout:
                setTimeout(connectRoom, 2000); // retry every 2 seconds
            }
            let successCB = ()=>{
                this.data.infos.siteRoomConnected = true;
                this.data.infos.lastSiteRoomConnectionError = '';
                this.broadcastInf();

                // reference the rSite data in this room.
                this.data.contests = this.rSiteClient.data.contests;
                this.data.meeting = this.rSiteClient.data.meeting;
                this.data.disciplines = this.rSiteClient.data.disciplines;
                // broadcast data
                this.broadcastSiteData();

                // now start the initial comparison between the timing data and the rSite data
                this.fullUpdate();
            }

            // create the rSiteClient
            //wsHandler, eventHandler, roomName, successCB, failureCB, logger, rTiming
            this.rSiteClient = new rSiteTrackClientForTiming(this.conn, this.eH, `sites/${this.data.siteConf.siteNumber}@${this.data.siteConf.shortname}`, successCB, failureCB, this.logger, this);
            
        }

        // get the connection
        this.conn = this.wsManager.getConnection(this.data.siteConf.shortname, this.data.siteConf.host, this.data.siteConf.port, this.data.siteConf.path, this.data.siteConf.secure)

        if (this.conn.connected){
            connectRoom();
        }

        // if the connection is lost, the wsManager and wsServer2Sever, respectively, will try to reconnect; listen to those events to instantly reconnect the sideChannel-rooms
        this.eH.eventSubscribe(`TabIdSet/${this.conn.tabId}`, connectRoom, this.name); // we use the shortname of the meeting as an identifier for the eventHandler 

        this.eH.eventSubscribe(`wsError/${this.conn.tabId}`, (err)=>{

        }, this.name); 

        // not needed, since the TabIdSet-event is enough.
        //this.eH.eventSubscribe(`wsConnected/${conn.tabId}`, ()=>{this.data.status.connectionToMain.connectedToMain = true;}, `sideChannel:${this.meetingShortname}`);

        this.eH.eventSubscribe(`wsClosed/${this.conn.tabId}`, ()=>{

            this.data.infos.siteServerConnected = false;
            this.data.infos.siteRoomConnected = false;
            // do not change the lastErrors here
            this.broadcastInf();
            
            this.rSiteClient = null;
            this.conn = null;
        }, this.name);

    }

    // TODO: provide a function to actively reload the data in rSIteTrackClient in order to get the updated rMeeting data. (Since this data typically does not change during a meeting, it is not so important.)

    closeSiteConnection(){
        if (this.conn?.connected){
            this.data.infos.siteRoomConnected = false;
            this.data.infos.siteServerConnected = false;
            this.data.infos.lastSiteRoomConnectionError = '';
            this.data.infos.lastSiteServerConnectionError = '';
            this.broadcastInf();
    
            // send leave signal
            if (this.rSiteClient){
                this.rSiteClient.leave();
            }
    
            // delete the room
            this.rSiteClient = null;
    
            // unsubscribe from the connection-events:
            //this.eH.eventUnsubscribe(`wsConnected/${this.conn.tabId}`, this.name);
            this.eH.eventUnsubscribe(`TabIdSet/${this.conn.tabId}`, this.name);
            this.eH.eventUnsubscribe(`wsClosed/${this.conn.tabId}`, this.name);
            
            // close the connection
            this.wsManager.returnConnection(this.data.siteConf.shortname, this.data.siteConf.host, this.data.siteConf.port, this.data.siteConf.path, this.data.siteConf.secure);
            this.conn = null;
        }
    }

    // sort the local data by the starttime, heat number and position
    sortData(){
        // first sort the contests
        this.data.data.sort((c1, c2)=>{
            return c1.datetimeStart-c2.datetimeStart;
        })

        // then sort each series
        for (let c of this.data.data){
            c.series.sort((s1, s2)=>{
                // use the number for sorting.
                return s1.number-s2.number;
            })

            // sort the athletes in the heat
            for (let s of c.series){
                s.SSRs.sort((ssr1, ssr2)=>{
                    return ssr1.position-ssr2.position;
                })
            }
        }
    }

    /**
     * compare all data from rSite (this.data.contests) with the local data (this.data.data) and see what information shall be transferred or not on the basis of the settings in this.data.auto
     */
    fullUpdate(){
        // make sure that the changes are not actually processed one by one, but only at the end
        this.deferWrite = true;

        /**  compare local data with the data in the room
         * 
         * IMPORTANT: How to know which way to transfer data: 
         * - series only in site --> transfer to timing
         * - series only in timing (happens when series are deleted in site or when the timing creats series)
         *   - if a flag ("timingCreated") is set that the heat was created by the timing software, keep it as it is.
         *   - if not:
         *     - if there are results: keep as it is (Note: this should not happen!)
         *     - otherwise: delete the series in timing
         * - series exists in site and timing: 
         *   - timing has results --> copy from timing to site (note that this might overwrite manual results, if addResultAuto does not restrict the overwrite, e.g. because the series-status is finished, but addResultAuto only occurs when in progress.)
         *   - timing has no results --> copy
         */
        for (let contestS of this.data.contests){
            // check if the contest also exists in rTiming
            let contestT = this.data.data.find(c=>c.xContest==contestS.xContest);
            if (contestT){
                // compare every heat
                // add and update
                for (let seriesS of contestS.series){
                    let seriesT = contestT.series.find(s=>s.xSeries == seriesS.xSeries);
                    if (!seriesT){
                        // create series
                        this.addSeriesTiming({contest: contestT, series: seriesS});
                    } else {
                        if (!this.objectsEqual( seriesS, seriesT, false, false )){
                            // if there are no results yet, copy the series to timing, otherwise vice versa
                            let hasResults = false;
                            for (let SSR of seriesT.SSRs){
                                if (SSR.resultstrack){
                                    hasResults = true;
                                    break;
                                }
                            }
                            if (hasResults){
                                // has results --> copy to rSite
                                // TODO !!! 
                            } else{
                                this.changeSeriesTiming(seriesS);
                            }
                        }
                    }
                }
                // handle cases where a series is only availble in the timing.
                for (let seriesT of contestT.series){
                    let seriesS = contestS.series.find(s=>s.xSeries == seriesT.xSeries);
                    if (!seriesS){
                        // the series is only available in timing
                        // check if the flag is set, then simply keep everything as it is.
                        if (seriesT.timingCreated) continue;
                        // if there are no results in this series, delete it
                        let hasResults = false;
                        for (let SSR of seriesT.SSRs){
                            if (SSR.resultstrack){
                                hasResults = true;
                                break;
                            }
                        }
                        if (!hasResults){
                            this.deleteSeriesTiming(seriesT);
                        }

                    } // the other cases were already handled above.
                }
                
            } else {
                // call addSeries in this room for every heat. (auto take-over will be checked there!)
                // Note: addSeries also adds the contest
                for (let s of contestS.series){
                    this.addSeriesTiming({contest: contestS, series: s});
                }
            }
        }
        // sort all data
        this.sortData();

        this.deferWrite = false;
        this.deferredWrite();
    }

    /**
     * If rSiteTrackClientForTiming receives a change, the data in rTiming on the server (this.data.contests) is automatically changed, since it is a reference to rSiteTrackClientForTiming.data.contests . However, on the client, the rSiteTrack functions are incorporated in the regular rTmingCLient room. Thus, we need tp relay the changes here. This must also issue a new roomId.
     * @param {string} funcName The function to be called in rTiming on the client. (Currently, it is planned that this is the same name as in rSiteTrack)
     * @param {any} data The data to be sent, typically an object
     */
    relaySiteChange(funcName, data){
        // rTiming does not have a sideChannel. (If it had, it would get here a little complicated, since the same change would be processed twice probably.)
        let doObj = {
            funcName: funcName, 
            data: data,
        }
        this.processChange(doObj, {})
    }

    // do the same as rSiteTrack (given the auto is set accordingly)
    changeContestTiming(contest){
        // check the auto setting whether to transfer the data or not:
        if (this.data.auto.changeContestAuto==-2 || (this.data.auto.changeContestAuto>=0 && this.data.auto.changeContestAuto<=contest.status)){
            // search the contest first
            const ic = this.data.data.findIndex(c=>c.xContest==contest.xContest);
            // copy over the present series to the new contest object and save it
            // create the new contest object (do NOT use contest given as the parameter, since this references the rSiteTrack-object! It must be independent!)
            const cNew = {};
            this.propertyTransfer(contest, cNew);
            cNew.series = this.data.data[ic].series;
            this.data.data[ic] = cNew; 

            // sort all data
            this.sortData();
            
            this._storeData(); // async
            
            // broadcast the change:
            let doObj = {
                funcName: 'changeContestTiming', 
                data: contest,
            }
            this.processChange(doObj, {}) 

            this.changedContest(cNew);

        }
    }
    changeSeriesTiming(series){
        if (this.data.auto.changeSeriesAuto == -2 || (this.data.auto.changeSeriesAuto>=0 && this.data.auto.changeSeriesAuto <=series.status)){
            // search the contest first
            const c = this.data.data.find(c=>c.xContest==series.xContest);
            let s;
            if (c){
                // search the series
                s = c.series.find(s=>s.xSeries == series.xSeries);

                // update it
                this.propertyTransfer(series, s)

            } else {
                this.logger.log(20, `Could not update xSeries=${series.xSeries} from xContest=${series.xContest} because this contest has no series on xSite=${this.site.xSite}.`)
            }
            // sort all data
            this.sortData();
            this._storeData(); // async

            // broadcast the change:
            let doObj = {
                funcName: 'changeSeriesTiming', 
                data: series,
            }
            this.processChange(doObj, {})

            this.changedSeries(s, c);
        }
    }
    deleteSeriesTiming(series){

        // check the auto setting whether to transfer the data or not:
        if (this.data.auto.deleteSeriesAuto==-2 || ( this.data.auto.deleteSeriesAuto>=0 && this.data.auto.deleteSeriesAuto<=series.status)){
            // search the contest first
            const c = this.data.data.find(c=>c.xContest==series.xContest);
            if (c){
                // search the series
                const si = c.series.findIndex(s=>s.xSeries == series.xSeries);

                // delete it
                c.series.splice(si,1);

                // delete the contest if it has no series anymore
                if (c.series.length == 0){
                    let i = this.data.data.findIndex(c=>c.xContest==series.xContest);
                    if (i>=0){
                        // should always be the case
                        this.data.data.splice(i,1);
                    }
                }
            } else {
                this.logger.log(20, `Could not delete xSeries=${series.xSeries} from xContest=${series.xContest} because this contest has no series on xSite=${this.site.xSite}.`)
            }
            // sort all data
            this.sortData();
            this._storeData(); // async

            // broadcast the change:
            let doObj = {
                funcName: 'deleteSeriesTiming', 
                data: series,
            }
            this.processChange(doObj, {})

            this.deletedSeries(series, c);
        }
    }
    addSeriesTiming(data){

        const contestS = data.contest;
        const seriesS = data.series;

        // check the auto setting whether to transfer the data or not:
        if (this.data.auto.addSeriesAuto==-2 || (this.data.auto.addSeriesAuto>=0 && this.data.auto.addSeriesAuto<=seriesS.status)){
    
            // get (or create) the contest in the data of this room 
            const c = this.getOrCreateContestTiming(contestS.xContest, contestS);
            
            // create a new series object. (since the property references the series of the rSiteTrack data!)
            // add the series to the main data object
            const newSeriesT = {}
            this.propertyTransfer(seriesS, newSeriesT)
            c.series.push(newSeriesT);
            // sort all data
            this.sortData();
            this._storeData(); // async

            // broadcast the change:
            let doObj = {
                funcName: 'addSeriesTiming', 
                data: data,
            }
            this.processChange(doObj, {})

            this.seriesAdded(newSeriesT, c);
        }
    }

    /**
     * Called whenever a series was added to rTiming. To be implemented by the timing.
     */
    seriesAdded(series, contest){

    }
    /**
     * Called whenever a series was deleted in rTiming. To be implemented by the timing.
     */
    deletedSeries(series, contest){

    }
    /**
     * Called whenever a series was changed in rTiming. To be implemented by the timing.
     */
    changedSeries(series, contest){

    }
    /**
     * Called whenever a contest was changed in rTiming. To be implemented by the timing.
     */
    changedContest(contest){

    }

    broadcastInf(){
        let doObj = {
            funcName: 'updateInfo', 
            data: this.data.infos,
        }
        this.processChange(doObj, {})
    }
    broadcastSiteData(){
        let doObj = {
            funcName: 'updateSiteData', 
            data: this.data.contests,
        }
        this.processChange(doObj, {})
    }

    // called after many changes to this.data.data were made, while "deferWrite" was true
    deferredWrite(){

    }


    /**
     * Provide the general function to handle incoming results. This function is called by a timing-specific push- or pull-results-function. The function shall be able to handle new and updated results!
     * @param {*} result 
     */
    resultsIncoming(result){
        // check if the results are new or just an update!
        // TODO

        // if automatic take over is on, immediately send the change to rSite
        // TODO
    }

    /**
     * Provide the general function to handle incoming reaction times. This function is called by a timing-specific push- or pull-results-function. The function shall be able to handle new and updated reaction times!
     * @param {*} reaction 
     */
    reactionsIncoming(reaction){
        // check if the reactions are new or just an update!
        // TODO

        // if automatic take over is on, immediately send the change to rSite
        // TODO
    }

    async _resetTiming(){
        // the timing specific implementation might need the data to do the reset; thus, delete the data afterwards.
        await this.resetTiming();
        
        this.data.data = [];
        await this._storeData();
    }

    /** to be implemented by the timing-specific class. 
     * Will be called when the timing data shall be resetted, e.g. when the meeting that it gets connected to is changed. 
     * The function is called before the timing daa is deleted.
     * Use this to e.g. delete the old exchange files.
     */
    async resetTiming(){

    }

    async updateSiteConf(siteConf){
        if (!this.validateSiteConf(siteConf)){
            throw {code:21, message: this.ajv.errorsText(this.validateSiteConf.errors)}
        }

        // stop the old connection
        this.closeSiteConnection();
        
        // if something changes, we need to reset the timing data; additionally, we call the timing specific reset function (which e.g. might delete all old result-files for the previous meeting.)
        if (JSON.stringify(this.data.siteConf) != JSON.stringify(siteConf)){
            await this._resetTiming();
        }

        this.data.siteConf = siteConf;
        await this._storeSiteConf();

        // try to start the new connection
        this.connectSite();

        // broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateSiteConf', data: siteConf},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: siteConf, 
            preventBroadcastToCaller: true
        };

        return ret;
    }

    // often, this function will have to be implemented with extensions by the inheriting class 
    async updateTimingOptions(timingOptions){
        if (!this.validateTimingOptions(timingOptions)){
            throw {code:21, message: this.ajv.errorsText(this.validateTimingOptions.errors)}
        }

        this.data.timingOptions = timingOptions;
        await this._storeTimingOptions();

        // broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateTimingOptions', data: timingOptions},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: timingOptions, 
            preventBroadcastToCaller: true
        };

        return ret;
    }

    async updateTimers(timers){
        if (!this.validateTimers(timers)){
            throw {code:21, message: this.ajv.errorsText(this.validateTimers.errors)}
        }

        // start/stop the timers if changed
        if (timers.pullReactionTimes != this.data.timers.pullReactionTimes){
            if (this.data.timers.pullReactionTimes>0){
                // there was a timer before:
                clearInterval(this.pullReactionInterval);
                this.pullReactionInterval = null;
            }
            if (timers.pullReactionTimes>0){
                // there shall be a timer afterwards
                this.pullReactionInterval = setInterval(()=>{this.pullReaction();},1000*timers.pullReactionTimes);
            }
        }
        if (timers.pullResults != this.data.timers.pullResults){
            if (this.data.timers.pullResults>0){
                // there was a timer before:
                clearInterval(this.pullResultsInterval);
                this.pullResultsInterval = null;
            }
            
            if (timers.pullResults>0){
                // there shall be a timer after
                this.pullResultsInterval = setInterval(()=>{this.pullResults();},1000*timers.pullResults);
            }
        }

        this.data.timers = timers;
        await this._storeTimers();

        // broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateTimers', data: timers},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: timers, 
            preventBroadcastToCaller: true
        };

        return ret;
    }

    // to be implemented by the timing specific class; will be called in the given timer interval
    async pullResults(){

    }

    // to be implemented by the timing specific class; will be called in the given timer interval
    async pullReaction(){
    
    }

    async updateAuto(auto){
        if (!this.validateAuto(auto)){
            throw {code:21, message: this.ajv.errorsText(this.validateAuto.errors)}
        }

        this.data.auto = auto;
        await this._storeAuto();

        // broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateAuto', data: auto},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: auto, 
            preventBroadcastToCaller: true
        };

        return ret;
    }

    /**
     * Try to get the object of the specified contest
     * @param {integer} xContest 
     * @param {object} contest the contest data object for 
     */
    getOrCreateContestTiming(xContest, contest){
        let c = this.data.data.find(contest=>contest.xContest == xContest);
        if (!c){
            // add the contest
            const c2 = contest;
            c = {
                conf: c2.conf,
                datetimeAppeal: c2.datetimeAppeal,
                datetimeCall: c2.datetimeCall,
                datetimeStart: c2.datetimeStart,
                name: c2.name,
                status: c2.status,
                xBaseDiscipline: c2.xBaseDiscipline,
                xContest: c2.xContest,
                series:[],
                baseConfiguration: c2.baseConfiguration,
            }
            this.data.data.push(c);
        }
        return c;
    }

    // for start, falseStart, finish signals the timing-implementation shall call the respective functions on rSiteTrack directly.

    // internal function to store changed data in mongo.
    // returns the mongoDB.collection.updateOne-promise
    async _storeTimingOptions(){
        // store the data to DB
        return this.collection.updateOne({type:'timingOptions'}, {$set:{timingOptions: this.data.timingOptions}})
    }
    async _storeSiteConf(){
        // store the data to DB
        return this.collection.updateOne({type:'siteConf'}, {$set:{siteConf: this.data.siteConf}})
    }
    async _storeAuto(){
        // store the data to DB
        return this.collection.updateOne({type:'auto'}, {$set:{auto: this.data.auto}})
    }
    async _storeTimers(){
        // store the data to DB
        return this.collection.updateOne({type:'timers'}, {$set:{timers: this.data.timers}})
    }
    async _storeData(){
        // store the data to DB
        return this.collection.updateOne({type:'data'}, {$set:{data: this.data.data}})
    }

    // copied from https://github.com/ReactiveSets/toubkal/blob/master/lib/util/value_equals.js
    /* --------------------------------------------------------------------------
        @function value_equals( a, b, enforce_properties_order, cyclic )
        
        @short Returns true if a and b are deeply equal, false otherwise.
        
        @parameters
        - **a** (Any type): value to compare to ```b```
        - **b** (Any type): value compared to ```a```
        - **enforce_properties_order** (Boolean): true to check if Object
        properties are provided in the same order between ```a``` and
        ```b```
        - **cyclic** (Boolean): true to check for cycles in cyclic objects
        
        @description
        Implementation:
        ```a``` is considered equal to ```b``` if all scalar values in
        a and b are strictly equal as compared with operator '===' except
        for these two special cases:
        - ```0 === -0``` but are not considered equal by value_equals().
        - ```NaN``` is not equal to itself but is considered equal by
        value_equals().
        
        ```RegExp``` objects must have the same ```lastIndex``` to be
        considered equal. i.e. both regular expressions have matched
        the same number of times.
        
        Functions must be identical, so that they have the same closure
        context.
        
        ```undefined``` is a valid value, including in Objects
        
        This function is checked by 106 CI tests.
        
        Provide options for slower, less-common use cases:
        
        - Unless enforce_properties_order is true, if ```a``` and ```b```
        are non-Array Objects, the order of occurence of their attributes
        is considered irrelevant: ```{ a: 1, b: 2 }``` is considered equal
        to ```{ b: 2, a: 1 }```.
        
        - Unless cyclic is true, Cyclic objects will throw a
        ```RangeError``` exception: ```"Maximum call stack size exceeded"```
    */
    objectsEqual( a, b, enforce_properties_order, cyclic ) {
        return a === b       // strick equality should be enough unless zero
            && a !== 0         // because 0 === -0, requires test by _equals()
            || _equals( a, b ) // handles not strictly equal or zero values
        ;
        
        function _equals( a, b ) {
            // a and b have already failed test for strict equality or are zero
            
            var toString = Object.prototype.toString;
            var s, l, p, x, y;
            
            // They should have the same toString() signature
            if ( ( s = toString.call( a ) ) !== toString.call( b ) ) return false;
            
            switch( s ) {
            default: // Boolean, Date, String
                return a.valueOf() === b.valueOf();
            
            case '[object Number]':
                // Converts Number instances into primitive values
                // This is required also for NaN test bellow
                a = +a;
                b = +b;
                
                return a ?         // a is Non-zero and Non-NaN
                    a === b
                :                // a is 0, -0 or NaN
                    a === a ?      // a is 0 or -O
                    1/a === 1/b    // 1/0 !== 1/-0 because Infinity !== -Infinity
                : b !== b        // NaN, the only Number not equal to itself!
                ;
            // [object Number]
            
            case '[object RegExp]':
                return a.source   == b.source
                && a.global     == b.global
                && a.ignoreCase == b.ignoreCase
                && a.multiline  == b.multiline
                && a.lastIndex  == b.lastIndex
                ;
            // [object RegExp]
            
            case '[object Function]':
                return false; // functions should be strictly equal because of closure context
            // [object Function]
            
            case '[object Array]':
                if ( cyclic && ( x = reference_equals( a, b ) ) !== null ) return x; // intentionally duplicated bellow for [object Object]
                
                if ( ( l = a.length ) != b.length ) return false;
                // Both have as many elements
                
                while ( l-- ) {
                if ( ( x = a[ l ] ) === ( y = b[ l ] ) && x !== 0 || _equals( x, y ) ) continue;
                
                return false;
                }
                
                return true;
            // [object Array]
            
            case '[object Object]':
                if ( cyclic && ( x = reference_equals( a, b ) ) !== null ) return x; // intentionally duplicated from above for [object Array]
                
                l = 0; // counter of own properties
                
                if ( enforce_properties_order ) {
                var properties = [];
                
                for ( p in a ) {
                    if ( a.hasOwnProperty( p ) ) {
                    properties.push( p );
                    
                    if ( ( x = a[ p ] ) === ( y = b[ p ] ) && x !== 0 || _equals( x, y ) ) continue;
                    
                    return false;
                    }
                }
                
                // Check if 'b' has as the same properties as 'a' in the same order
                for ( p in b )
                    if ( b.hasOwnProperty( p ) && properties[ l++ ] != p )
                    return false;
                } else {
                for ( p in a ) {
                    if ( a.hasOwnProperty( p ) ) {
                    ++l;
                    
                    if ( ( x = a[ p ] ) === ( y = b[ p ] ) && x !== 0 || _equals( x, y ) ) continue;
                    
                    return false;
                    }
                }
                
                // Check if 'b' has as not more own properties than 'a'
                for ( p in b )
                    if ( b.hasOwnProperty( p ) && --l < 0 )
                    return false;
                }
                
                return true;
            // [object Object]
            } // switch toString.call( a )
        } // _equals()
        
        /* -----------------------------------------------------------------------------------------
            reference_equals( a, b )
            
            Helper function to compare object references on cyclic objects or arrays.
            
            Returns:
            - null if a or b is not part of a cycle, adding them to object_references array
            - true: same cycle found for a and b
            - false: different cycle found for a and b
            
            On the first call of a specific invocation of equal(), replaces self with inner function
            holding object_references array object in closure context.
            
            This allows to create a context only if and when an invocation of equal() compares
            objects or arrays.
        */
        function reference_equals( a, b ) {
            var object_references = [];
            
            return ( reference_equals = _reference_equals )( a, b );
            
            function _reference_equals( a, b ) {
            var l = object_references.length;
            
            while ( l-- )
                if ( object_references[ l-- ] === b )
                return object_references[ l ] === a;
            
            object_references.push( a, b );
            
            return null;
            } // _reference_equals()
        } // reference_equals()
    } // equals()
      

}

export class rTimingAlge extends rTiming {

    /**  ALGE can push the following messages: 
     * - HeatStart, when heat is started: IsFalseStart, EventId, HeatId, Time (in UTC?)
     * - HeatFinish, when first person crosses the line: EventId, HeatId, Time (in UTC?), Runtime
     * - CompetitorEvaluated, when the time of one competitor was set: Bib, Rank (attention: this might be temporary only!), Time (UTC?), Runtime, RuntimeFullPrecision, Lane, Disqualification (as text), DifferenceToWinner, DifferernceToPrevious --> this info seems to lack the event ! --> TODO: store the last event coming in via HeatStart or HeatFinish
     * - HeatResult/Result, when the heat-results are confirmed: 
     *      - HeatResult: SessionId, EventId, HeatId, Starttime, Finishtime, Runtime, Wind, WindUnit, DistanceMeters
     *      - Result: see CompetitorEvaluated 
     * - Time has the format HH:MM:SS.1234
     * 
     * eventually provide timing-specific options to (de-) activate every single push-reaction
     * 
     * It would be cool if there was a message when a heat is opened and closed, so that we might set the state in liveAthletics accordingly.
     */
    
    constructor (wsManager, timingName, eventHandler, mongoDb, logger){

        super(wsManager, timingName, eventHandler, mongoDb, logger, true, true, true)
        
        // own properties:
        this.tcpConn = null;


        this.defaultTimingOptions = {
            xmlHeatsFolder: '', // path
            xmlResultsFolder: '', // path
            handlePushHeatStartFinish: true, 
            handlePushCompetitorEvaluated: true, // automatically get results of one cometitor when evaluated (marked inofficial)
            competitorEvaluatedWithRank: false, // also import the rank. This should be set to false, when the times are not strictly evalauted 
            handlePushHeatResult: true, // automatically get the results of one heat when official
            host: '192.168.99.99', // the IP (or any other identifier of the timing)
            port: 4446, // same default as Seltec

        }

        this.data.infos.timing = {
            tcpConnected: false,
            tcpErrorLast: '', // the last tcp error. Include the time in the string!
            xmlHeatErrorLast: '', // the last error during xml-heat writing
            xmlResultErrorLast: '', // the last error during xml-results read
        };

        let schemaTimingOptions = {
            type:"object",
            properties: {
                xmlHeatsFolder: {type:"string"},
                xmlResultsFolder: {type:"string"},
                handlePushHeatStartFinish: {type:"boolean"},
                handlePushCompetitorEvaluated: {type:"boolean"},
                competitorEvaluatedWithRank: {type:"boolean"},
                handlePushHeatResult: {type:"boolean"},
                host: {type:"string"},
                port: {type:"integer", minimum:1, maximum:65535},
            },
            required:['xmlHeatsFolder', 'xmlResultsFolder', 'handlePushHeatStartFinish', 'handlePushCompetitorEvaluated', 'competitorEvaluatedWithRank', 'handlePushHeatResult', 'host', 'port'],
            additionalProperties: false,
        }

        this.validateTimingOptions = this.ajv.compile(schemaTimingOptions);
        
    }

    async onMongoConnected(){
        await super.onMongoConnected();

        // any other stuff to be done here:
        // check if the timingOptions already contain all necessary information. Otherwise, create it.
        let change = false;
        for (let prop in this.defaultTimingOptions){
            if (!(prop in this.data.timingOptions)){
                this.data.timingOptions[prop] = this.defaultTimingOptions[prop];
                change=true;
            }
        }
        if (change){
            // store the changed options!
            await this._storeTimingOptions();
        }

        this.startTcpVersatileExchange();

    }

    
    /** to be implemented by the timing-specific class. 
     * Will be called when the timing data shall be resetted, e.g. when the meeting that it gets connected to is changed. 
     * The function is called before the timing daa is deleted.
     * Use this to e.g. delete the old exchange files.
     */
    async resetTiming(){
        // TODO: delete all files from the exchange, e.g. heats and results
    }

    // also works for restart
    startTcpVersatileExchange(){
        if (this.tcpConn !=null){
            // stop the previous connection
            this.tcpConn.tcpConn()
            this.tcpConn = null;
        }

        // connection options (see nodejs Net.Client for documentation): 
        const optVersatileExchange = {
            port: this.data.timingOptions.port,
            host: this.data.timingOptions.host,
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        const onError = (err)=>{
            let d = new Date().toLocaleTimeString();
            this.data.infos.timing.tcpErrorLast = `${d}: ${err}`;
            this.broadcastInf();
        }

        const onClose = () =>{
            this.data.infos.timing.tcpConnected = false;
            this.broadcastInf();
        }

        const onConnect = ()=> {
            this.data.infos.timing.tcpConnected = true;
            this.broadcastInf();
        }

        const onData = (data)=>{
            console.log(`timing data: ${data}`)
            // TODO: provess the data according to the options !!!
            // HeatResult: the reserved field is not available!
            // if "SendResultlistWhenHeatDataChanged" is set to true in the ALGE-Versatile settings, a heatresult is sent whenever a time is entered; 
            // the competitorEvaluated is not used when a time is entered. Probably this only works when the time was set defined through the image.  

        }

        this.tcpConn = new tcpClientAutoReconnect(optVersatileExchange, onError, onClose, onConnect, onData)
    }

    // often, this function will have to be implemented with extensions by the inheriting class 
    async updateTimingOptions(timingOptions){
        if (!this.validateTimingOptions(timingOptions)){
            throw {code:21, message: this.ajv.errorsText(this.validateTimingOptions.errors)}
        }

        let oldTimingOptions = this.data.timingOptions;

        this.data.timingOptions = timingOptions;
        await this._storeTimingOptions();

        
        // if host or port have changed, change the tcp connection
        if (oldTimingOptions.port != timingOptions.port || oldTimingOptions.host != timingOptions.host){
            // restart tcp connection
            this.startTcpVersatileExchange();
        }

        // if any path has changed, rewrite the xml.
        if (oldTimingOptions.xmlHeatsFolder != timingOptions.timingOptions){
            this.writeInput();
        }

        // broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateTimingOptions', data: timingOptions},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: timingOptions, 
            preventBroadcastToCaller: true
        };

        return ret;
    }

    // called after many changes to this.data.data were made, while "deferWrite" was true
    deferredWrite(){
        this.writeInput();
    }


    async writeInput(){
        
        // first, sort the contests and series by date/time!

        // TODO: write the input file from this.data.data
        // try to open the file to write. (This command will already truncate the file)
        // NOTE: do not use the meeting name as the file name on purpose to avoid that the file name changes when the meeting name is changed!
        const file = await fs.open(this.data.timingOptions.xmlHeatsFolder + '\\liveAthletics.meetxml', 'w');

        // write header
        await file.write(`<?xml version="1.0" encoding="utf-8"?>\r\n<Meet xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" Name="${this.data.meeting.name}" Id="${this.data.meeting.shortname}">\r\n`); 
        
        if (this.data.data.length>0){
            // add the new content

            // add the first session
            let d = new Date(this.data.data[0].datetimeStart);
            let currentSession = d.toISOString().split('T')[0];
            let sessionNumber = 1;
            await file.write(`\t<Session Name="${currentSession}" Id="${currentSession}" Nr="${sessionNumber}" Type="Run" Date="${currentSession}">\r\n`);

            // loop over all contests
            for (let c of this.data.data){
                let d2 = new Date(c.datetimeStart);
                let s2 = d2.toISOString().split('T')[0];
                if (s2 != currentSession){
                    // end the session and start the new one
                    sessionNumber++;
                    currentSession = s2;
                    await file.write(`\t</Session>\r\n\t<Session Name="${currentSession}" Id="${currentSession}" Nr="${sessionNumber}" Type="Run" Date="${currentSession}">\r\n`);
                }

                // begin event
                let cName = c.name.length==0 ? `${c.baseConfiguration.distance}m ${c.xContest}` : c.name; 
                let cTime = (new Date(c.datetimeStart)).toISOString().split('T')[1].slice(0,8);
                
                await file.write(`\t\t<Event Name="${cName}" Id="${c.xContest}" Distance="${c.baseConfiguration.distance}" DistanceType="${c.baseConfiguration.type}" ScheduledStarttime="${cTime}">\r\n`) //distanceType (regular, hurdles, relay, steeplechase), windmeasurement "None", "5Seconds", "10Seconds", "13Seconds", "10SecondsWith10SecondsDelay"
                // additionally available: Nr
                
                // insert heats
                for (let s of c.series){
                    // begin heat
                    let sName = s.name.length==0 ? `${cName} - ${s.number}` : s.name;
                    let sTime = (new Date(s.datetime)).toISOString().split('T')[1].slice(0,8);
                    await file.write(`\t\t\t<Heat Name="${sName}" ScheduledStarttime="${sTime}" Id="${s.id}" Nr="${s.number}" Distance="${c.baseConfiguration.distance}" DistanceType="${c.baseConfiguration.type}">\r\n`) 
                    // actually we could also use the xSeries as id

                    // add athletes
                    for (let SSR of s.SSRs){

                        // process lane and position: if the race ends in a lane, provide the startConf, the position otherwise
                        let lane;
                        if (c.baseConfiguration.finishInLanes){
                            lane = Number(SSR.startConf);
                        } else {
                            lane = SSR.position;
                        }

                        await file.write(`\t\t\t\t<Competitor Bib="${SSR.bib}" Lane="${lane}" Lastname="${SSR.athleteName}" Firstname="${SSR.athleteForename}" Nation="${SSR.country}" Club="${SSR.clubName}" Gender="${SSR.sex.toUpperCase()}" Class="${SSR.category}" Reserved1="${SSR.xSeriesStart}" Id="${SSR.xSeriesStart}" />\r\n`)
                    }

                    // end heat
                    await file.write(`\t\t\t</Heat>\r\n`);
                }

                // end event
                await file.write(`\t\t</Event>\r\n`);
            }

            // end the last session
            await file.write(`\t</Session>\r\n`)
        }

        // write footer
        await file.write(`</Meet>`);

        await file.close();

        this.logger.log(98, `${this.name}: Heats file written.`)
    }

    /**
     * Called whenever a series was added to rTiming. To be implemented by the timing.
     */
    seriesAdded(series, contest){
        if (!this.deferWrite){
            this.writeInput();
        }
    }
    /**
     * Called whenever a series was deleted in rTiming. To be implemented by the timing.
     */
    deletedSeries(series, contest){
        if (!this.deferWrite){
            this.writeInput();
        }
    }
    /**
     * Called whenever a series was changed in rTiming. To be implemented by the timing.
     */
    changedSeries(series, contest){
        if (!this.deferWrite){
            this.writeInput();
        }
    }
    /**
     * Called whenever a contest was changed in rTiming. To be implemented by the timing.
     */
    changedContest(contest){
        if (!this.deferWrite){
            this.writeInput();
        }
    }

    // implement here all ALGE specific stuff (connection to timing) while the general stuff (connection to rSite via rSiteClient, etc) shall be handled in the parent class

    // may be called (1) after a change (when the automatic is on) or (2) after the user requested to take over a heat, contest or everything or (3) when the timing pulls the heats (to be implemented in the timing-specific part, i.e. in this class)
    // called sendHeats and not pushHeats, since it is also used for pull
    sendHeats(){
        // implement here the serializer, creating the input file from the local rTiming data and write this file

        this.data.infos.lastHeatPushFailed = false; // TODO: set accordingly
    }

    pullResults(){
        // get the results
        //console.log(`${(new Date()).toISOString()}: pull results`);

        // send all changes to resultsIncoming
        //this.resultsIncoming(results);
    }

    pullReaction(){
        // get the reaction times

        // send all changes to resultsIncoming
        //this.resultsIncoming(results);
    }

    // How to implement pushResults and pushReaction: 
    // Depends on how this is done for the timing: if the timing software only announces that new results are available, simply then start the respective pull function. If the timing software also directly send the results/reaction times with the tcp-message, then we 

}

