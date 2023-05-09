import roomServer from "./roomServer.js";
import rSiteTrackClientForTiming from "./rSiteTrackClientForTiming.js";
import tcpClientAutoReconnect from "./tcpClient.js";
import {promises as fs} from 'fs';
import wsManagerClass from './wsServer2Server.js';
import {parseStringPromise, processors as xmlProcessors} from 'xml2js';
import path from 'path';
import {disciplineValidators, } from './static/performanceProcessing.js';

/**
 * IDEAS: 
 * - rTiming has two datasets: (1) the rSite it is connected to (stored in rSiteClient) and (2) its own, reflecting the data in the timing software
 * - rTimings own data shall always represent the data that is available in the timing software (or at least in the last stored input file for the timing software). The only exception is when e.g. the input file could not successfully be written. Then, we shall show a warning to the user and the option to try to send again.
 * 
 * 
 */
export default class rTiming extends roomServer{
    
    constructor(wsManagerOld, timingName, eventHandler, mongoDb, logger, heatsPushable=false, resultsPullable=false, reactionPullable=false){
        
        // initialize the room
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTickets=-1, conflictChecking=false, dynamicRoom=undefined, reportToSideChannel=true, keepWritingTicket=true)
        // there is no sidechannel for rTiming
        let roomName = `timing${timingName}`;
        super(eventHandler, mongoDb, logger, roomName, true, -1, false, undefined, false, true);

        // we cannot use the ws connection provided by wsManager, since we need to use a separate client (or server) for every timing software. Otherwise, the note/request handlers will deliver the incoming messages to rSite-Server instead of rSite-client. (Note: it is impossible to have client and server on the same connection, since the room name is the same and there is no other concept to differentiate between server and client to pass the incoming data to the right one). How can we adopt the wsManager for this --> simply by having a connection for each timing (equivalent to the browser on normal clients) 
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

        // if we do the initial comparison between the rSite data and the actual data of this room, we might add/delete many contests and heats. Every of this change will be handled in the respective functions. Typically, these functions will directly send the change to the timing, since it is the idea that rTiming-data always represnts the data in the timing software. However, if the exchange is file based, it does not make sense to write the file at every small change, when we know that many more small changes will/might follow during the initial comparison. Thus, we have the variable deferWrite, which is set to true at the beginning of the initial comparison and set to false at the end together with calling this.deferredWrite(). This allows file-type heat exchanges to not (re-)write the file when derferWrite=true and to create the file at the end. If this deferredWriting does not make sense for a certain way of exchange, then it can simply be negelected.
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
            // TODO: 2023-02-18: the following is not evaluated anymore:
            /*changeContestAuto: -1,
            changeSeriesAuto: -1,
            addSeriesAuto: -1,
            deleteSeriesAuto: -1,
            // key: -1: never, -2: always auto, >=0: maximum state of series/contest to do so.
            // from rTiming: 
            addResultAuto: -1, // single result, eventually inofficial
            addResultHeatAuto: -1, // full heat, eventually including some info about the heat itself, eventually inofficial
            addReactionTimeAuto: -1, // 
            /*

            /**
             * settings for each state
             * heatAud: string, transfer data from site to timing; 'a'=add, 'u'=update, 'd': delete; delete is understood that the heat still exists in the site, but is deleted from the timing, e.g. when the heat is official; the state in the new data is considered
             * heatD: boolean, propagate a deleted heat in site to timing. (note: This is not the same as deleting based on state, where the heat still exists. This setting may be important to avoid that a heat is deleted that is currently used in the timing software. Note: since the heat is deleted, the state that the heat had before deleting is evaluated.
             * heatPreventOnResult: boolean, prevent any transfer from site to timing when there are already results
             * resultAud: string, transfer results and reaction times from timing to site; 'a'=add, 'u'=update, 'd'=delete result.; 
             * 
             * If a new state is added, 
             * - the client will automatically update the seriesStateSetting to match the new existing seriesStates
             * - the server will use {heatAud:"", heatD:false, heatPreventOnResult:true, resultAud:""} for non existing seriesStates.
             **/  
            seriesStateSetting:{
                "10":{heatAud:"", heatD:true, heatPreventOnResult:true, resultAud:""},
                "70":{heatAud:"au", heatD:true, heatPreventOnResult:true, resultAud:""},
                "130":{heatAud:"au", heatD:true, heatPreventOnResult:true, resultAud:"a"},
                "150":{heatAud:"au", heatD:true, heatPreventOnResult:true, resultAud:"au"},
                "180":{heatAud:"u", heatD:true, heatPreventOnResult:true, resultAud:"u"},
                "200":{heatAud:"d", heatD:true, heatPreventOnResult:true, resultAud:""}
            },
        };

        this.defaultTimers = {
            // in s, 0=off
            pullReactionTimes:0,
            pullResults:60,
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
        // those functions are actually not read-only, but they do not generate a new ID on its own, but by calling other functions that do.
        this.functionsReadOnly.heatToTiming = this.heatToTiming.bind(this);
        this.functionsReadOnly.heatsToTiming = this.heatsToTiming.bind(this);
        this.functionsReadOnly.resultsToLA = this.resultsToLA.bind(this);
        //this.functionsReadOnly.resultsToLASingle = this.resultsToLASingle.bind(this);
        this.functionsReadOnly.pullReaction = this.pullReaction.bind(this);
        this.functionsReadOnly.pullResults = this.pullResults.bind(this);
        this.functionsReadOnly.pushHeats = this.pushHeats.bind(this);
        this.functionsReadOnly.changeStatus = this.changeStatus.bind(this);


        const schemaChangeStatus = {
            type:'object',
            properties: {
                xContest: {type:'integer'},
                xSeries: {type:'integer'},
                status: {type:'integer'},
            },
            required:['xContest', 'xSeries'],
            additionalProperties: false,
        };
        const schemaHeatToTiming = {
            type:'object',
            properties: {
                xContest: {type:'integer'},
                xSeries: {type:'integer'}
            },
            required:['xContest', 'xSeries'],
            additionalProperties: false,
        }
        const schemaHeatsToTiming = {
            type:'object',
            properties: {
                add: {type:'boolean'},
                update: {type:'boolean'},
                delete: {type:'boolean'},
                updateContest: {type:'boolean'},
            },
            required:['add', 'update', 'delete', 'updateContest'],
            additionalProperties: false,
        }
        const schemaResultsToLA = {
            type:'object',
            properties: {
                xContest: {type:['integer', "null"]}, // optional; acts as a filter if given
                xSeries: {type:['integer', "null"]}, // optional; acts as a filter if given
                add: {type:'boolean'},
                update: {type:'boolean'},
                delete: {type:'boolean'},
            },
            required:['add', 'update', 'delete'],
            additionalProperties: false,
        }
        /*const schemaResultsToLA = {
            type:'object',
            properties: {
                add: {type:'boolean'},
                update: {type:'boolean'},
                delete: {type:'boolean'},
            },
            required:['add', 'update', 'delete'],
            additionalProperties: false,
        }*/
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
                // TODO: delete all except seriesStateSetting
                /*changeContestAuto: {type: 'integer', minimum:-2}, 
                changeSeriesAuto: {type: 'integer', minimum:-2}, 
                addSeriesAuto: {type: 'integer', minimum:-2}, 
                deleteSeriesAuto: {type: 'integer', minimum:-2}, 
                addResultAuto: {type: 'integer', minimum:-2}, 
                addResultHeatAuto: {type: 'integer', minimum:-2}, 
                addReactionTimeAuto: {type: 'integer', minimum:-2}, */
                seriesStateSetting: {
                    type:'object',
                    patternProperties:{
                        "^\d*$":{ // regex: all numbers as properties are allowed 
                            type:'object',
                            properties: {
                                heatAud:{type:'string'},
                                heatD:{type:'boolean'},
                                heatPreventOnResult:{type:'boolean'},
                                resultAud:{type:'string'},
                            }
                        },
                    }
                },
            },
            required:['seriesStateSetting'],
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
        this.validateHeatsToTiming = this.ajv.compile(schemaHeatsToTiming);
        this.validateHeatToTiming = this.ajv.compile(schemaHeatToTiming);
        this.validateResultsToLA = this.ajv.compile(schemaResultsToLA);
        //this.validateResultsToLASingle = this.ajv.compile(schemaResultsToLASingle);
        this.validateChangeStatus = this.ajv.compile(schemaChangeStatus);
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
            this.pullReactionInterval = setInterval(()=>{
                this.pullReaction().catch(err=>{
                    this.logger.log(5, `Error in async pullReaction: ${err}`);
                });
            },1000*this.data.timers.pullReactionTimes);
        }
        if (this.data.timers.pullResults>0){
            this.pullResultsInterval = setInterval(()=>{
                this.pullResults().catch(err=>{
                    this.logger.log(5, `Error in async pullResults: ${err}`);
                });
            },1000*this.data.timers.pullResults);
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
        // prepare a function to (re-)start the rSiteClient that shall be called whenever the connection is (re-)established
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

            let transferSiteData = ()=>{
                // reference the rSite data in this room.
                this.data.contests = this.rSiteClient.data.contests;
                this.data.meeting = this.rSiteClient.data.meeting;
                this.data.disciplines = this.rSiteClient.data.disciplines;
                // broadcast data
                this.broadcastSiteData();

            }

            let successCB = ()=>{
                this.data.infos.siteRoomConnected = true;
                this.data.infos.lastSiteRoomConnectionError = '';
                this.broadcastInf();

                transferSiteData();

                // now start the initial comparison between the timing data and the rSite data
                this.fullUpdate();
            }


            let fakeVue = {
                onRoomLinked:()=>{}, // not needed
                onWritingTicketChange:()=>{}, // not needed
                afterFullreload:()=>{
                    transferSiteData()
                }, // 
                onChange:()=>{}, // should already be handled 
                dataArrived:()=>{}, // not needed
            }

            // create the rSiteClient
            //wsHandler, eventHandler, roomName, successCB, failureCB, logger, rTiming
            this.rSiteClient = new rSiteTrackClientForTiming(fakeVue, this.conn, this.eH, `sites/${this.data.siteConf.siteNumber}@${this.data.siteConf.shortname}`, successCB, failureCB, this.logger, this);
            
        }

        // get the connection
        this.conn = this.wsManager.getConnection(this.data.siteConf.shortname, this.data.siteConf.host, this.data.siteConf.port, this.data.siteConf.path, this.data.siteConf.secure)

        if (this.conn.connected){
            connectRoom();
        }

        // if the connection is lost, the wsManager and wsServer2Sever, respectively, will try to reconnect; listen to those events to instantly reconnect the sideChannel-rooms
        this.eH.eventSubscribe(`TabIdSet/${this.conn.tabId}`, connectRoom, this.name); // we use the shortname of the meeting as an identifier for the eventHandler 

        this.eH.eventSubscribe(`wsError/${this.conn.tabId}`, (err)=>{
            this.infos.lastSiteServerConnectionError = err.toString();
            this.broadcastInf();
        }, this.name); 

        // not needed, since the TabIdSet-event is enough.
        //this.eH.eventSubscribe(`wsConnected/${conn.tabId}`, ()=>{this.data.status.connectionToMain.connectedToMain = true;}, `sideChannel:${this.meetingShortname}`);

        this.eH.eventSubscribe(`wsClosed/${this.conn.tabId}`, ()=>{

            this.data.infos.siteServerConnected = false;
            this.data.infos.siteRoomConnected = false;
            // do not change the lastErrors here
            this.broadcastInf();
            
            this.rSiteClient = null;
            //this.conn = null; // the connection should get restored automatically
        }, this.name);

    }

    
    /**
     * evaluate whether an change in site shall be processed / applied to the data in timing. (Note: this does not include deleting, when the heat is deleted on the site. Delete is understod here as delete based on the given status.) If no data for the specific status code is found, the default is "do noting". Return true if the change shall be done, false otherwise.
     * @param {integer} statusCode The status code to be evaluated
     * @param {string} action The action, either 'a' for add, 'u' for update or 'd' for delete due to status
     * @param {boolean} hasResults Are there alreayd results in this heat (default=false, since for 'add' any other default would be wrong)
     */
    evaluateAutoProcessHeats (statusCode, action, hasResults=false){
        const setting = this.data.auto.seriesStateSetting[statusCode];
        if (!setting || (hasResults && setting.heatPreventOnResult) || setting.heatAud.indexOf(action)==-1){
            return false;
        }
        return true;
    }

    /**
     * evaluate whether a change in timing shall be processed / applied to the given data in the site. If no data for the specific status code is found, the default is "do noting". Return true if the change shall be done, false otherwise.
     * @param {integer} statusCode The status code to be evaluated
     * @param {string} action The action, either 'a' for add, 'u' for update or 'd' for delete due to statusion 
     * @returns boolean
     */
    evaluateAutoProcessResults (statusCode, action){
        const setting = this.data.auto.seriesStateSetting[statusCode];
        if (!setting || setting.resultAud.indexOf(action)==-1){
            return false;
        }
        return true;
    }

    heatHasResults(series){
        let hasResults = false;
        for (let SSR of series.SSRs){
            if (SSR.resultstrack !== null || SSR.resultOverrule>0){
                hasResults = true;
                break;
            }
        }
        return hasResults;
    }

    // TODO: provide a function to actively reload the data in rSIteTrackClient in order to get the updated rMeeting data. (Since this data typically does not change during a meeting, it is not so important.)

    closeSiteConnection(){
        if (this.conn){
            this.data.infos.siteRoomConnected = false;
            this.data.infos.siteServerConnected = false;
            this.data.infos.lastSiteRoomConnectionError = '';
            this.data.infos.lastSiteServerConnectionError = '';
            this.broadcastInf();
    
            if (this.rSiteClient){
                // send leave signal
                this.rSiteClient.leave();

                // delete the room
                this.rSiteClient = null;
            }
    
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

        // FIRST: from site to timing

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
                        // without sort, the objectsEqual would say that the two SSR arrays are different
                        seriesS.SSRs.sort((a,b)=>a.position-b.position)
                        seriesT.SSRs.sort((a,b)=>a.position-b.position)
                        if (!this.objectsEqual( seriesS, seriesT, false, false )){
                            // if there are no results yet, copy the series to timing, otherwise vice versa
                            if (this.heatHasResults(seriesT)){
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
                        if (!this.heatHasResults(seriesT)){
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

        // SECOND: from timing to site (i.e. results)
        // this only is possible if pull functions are implemented
        this.pullResults().catch(err=>{
            this.logger.log(5, `Error in async pullResults: ${err}`);
        });
        this.pullReaction().catch(err=>{
            this.logger.log(5, `Error in async pullReaction: ${err}`);
        });

    }

    /**
     * If rSiteTrackClientForTiming receives a change, the data in rTiming on the server (this.data.contests) is automatically changed, since it is a reference to rSiteTrackClientForTiming.data.contests . However, on the client, the rSiteTrack functions are incorporated in the regular rTmingCLient room. Thus, we need to relay the changes here. This must also issue a new roomId.
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
    changeContestTiming(contest, override=false){
        // check the auto setting whether to transfer the data or not:
        //if (override || this.data.auto.changeContestAuto==-2 || (this.data.auto.changeContestAuto>=0 && this.data.auto.changeContestAuto<=contest.status)){
        // currently, changes in the contest are always transferred. There are only settings based on heat status
        if (override || true){
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
            
            this._storeData().catch(err=>this.logger.log(10, `${this.name}: Could not store data to mongo: ${err}`)); // async
            
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

        // NOTE: this can not only be change/update, but also add/delete: if the status changes accordingly. Therefore, check this first:
        // try to find the heat in the timing data; if it is present, check for the delete rule; if it is not present, check for the add rule.
        // search the contest first
        const c = this.data.data.find(c=>c.xContest==series.xContest);
        let s;
        if (c){
            // search the series
            s = c.series.find(s=>s.xSeries == series.xSeries);
        } /*else {
            this.logger.log(20, `Could not update xSeries=${series.xSeries} from xContest=${series.xContest} because this contest has no series on xSite=${this.site.xSite}.`);
            return;
        }*/
        if (s===undefined && this.evaluateAutoProcessHeats(series.status, 'a')){
            // get the contest from the site, and not from the contest
            const data = {
                series: series,
                contest: this.data.contests.find(c2=>c2.xContest == series.xContest),
            }
            this.addSeriesTiming(data, true); // set the override flag, since we anyway already did the evaluation.

            // in this case, there is no actual change to send to the client here
            return
        }

        if (s){
            // the heat already exists.
            
            // do we need to delete the heat based on the new status?
            if (this.evaluateAutoProcessHeats(series.status, 'd', this.heatHasResults(s))){
                
                this.deleteSeriesTiming(series, true);
                // in this case, there is no actual change to send to the client here
                return;
            }

            // if the status is changed, then we need also have to check whether the automatic result reading must be done
            let statusChanged = s.status != series.status;

            // do we need to update the heat?
            if (this.evaluateAutoProcessHeats(series.status, 'u', this.heatHasResults(s))){
                // update the heat
                this.propertyTransfer(series, s)

                // sort all data
                this.sortData();
                this._storeData().catch(err=>this.logger.log(10, `${this.name}: Could not store data to mongo: ${err}`)); // async

                // broadcast the change:
                let doObj = {
                    funcName: 'changeSeriesTiming', 
                    data: series,
                }
                this.processChange(doObj, {})

                this.changedSeries(s, c);
            }

            if (statusChanged){
                // check whether there is a result for this heat, which on the basis of the new status should be imported automatically.
                this.addUpdateResults(s);
            }

        }
    }
    // series must contain status, xSeries and xContest
    deleteSeriesTiming(series, override=false){

        // check the auto setting whether to transfer the data or not:
        //if (override || this.data.auto.deleteSeriesAuto==-2 || ( this.data.auto.deleteSeriesAuto>=0 && this.data.auto.deleteSeriesAuto<=series.status)){
        const setting = this.data.auto.seriesStateSetting[series.status];
        if (!setting){
            // if there is nothing defined for this status, we do not delete the heat
            return
        }
        if (override || setting.heatD){
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
                this.logger.log(95, `Could not delete xSeries=${series.xSeries} from xContest=${series.xContest} because this contest has no series on xSite=${this.site.xSite}.`)
            }
            // sort all data
            this.sortData();
            this._storeData().catch(err=>this.logger.log(10, `${this.name}: Could not store data to mongo: ${err}`)); // async

            // broadcast the change:
            let doObj = {
                funcName: 'deleteSeriesTiming', 
                data: series,
            }
            this.processChange(doObj, {})

            this.deletedSeries(series, c);
        }
    }
    addSeriesTiming(data, override=false){

        const contestS = data.contest;
        const seriesS = data.series;

        // check the auto setting whether to transfer the data or not:
        //if (override || this.data.auto.addSeriesAuto==-2 || (this.data.auto.addSeriesAuto>=0 && this.data.auto.addSeriesAuto<=seriesS.status)){
        if (override || this.evaluateAutoProcessHeats(seriesS.status, 'a')){
    
            // get (or create) the contest in the data of this room 
            const c = this.getOrCreateContestTiming(contestS.xContest, contestS);
            
            // create a new series object. (since the property references the series of the rSiteTrack data!)
            // add the series to the main data object
            const newSeriesT = {}
            this.propertyTransfer(seriesS, newSeriesT)
            c.series.push(newSeriesT);
            // sort all data
            this.sortData();
            this._storeData().catch(err=>this.logger.log(10, `${this.name}: Could not store data to mongo: ${err}`)); // async

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

    async changeStatus(data){
        if (!this.validateChangeStatus(data)){
            throw {code:21, message: this.ajv.errorsText(this.validateChangeStatus.errors)}
        }
        // use the regular heatresultsincoming to send the change
        let result = {
            xContest: data.xContest,
            xSeries: data.xSeries,
            status: data.status,
        }   

        this.heatResultsIncoming(result);

        // actually nothing to return
        return true;
    }

    heatsToTiming(data){
        if (!this.validateHeatsToTiming(data)){
            throw {code:21, message: this.ajv.errorsText(this.validateHeatsToTiming.errors)}
        }
        // TODO

    }
    async heatToTiming(data){
        if (!this.validateHeatToTiming(data)){
            throw {code:21, message: this.ajv.errorsText(this.validateHeatToTiming.errors)}
        }

        // get the contest and heat in site
        const contestS = this.data.contests.find(c=>c.xContest == data.xContest);
        if (!contestS){
            throw {code:22, message: `Contest ${data.xContest} does not exist in site.`}
        }
        const seriesS = contestS.series.find(s=>s.xSeries == data.xSeries);

        // try to find the respective contest/heat in timing
        const contestT = this.data.data.find(c=>c.xContest == data.xContest);
        if (!contestT){
            throw {code:24, message: `Contest ${data.xContest} does not exist in timing.`}
        }

        let seriesT;
        if (contestT){
            seriesT = contestT.series.find(s=>s.xSeries == data.xSeries);
        }
        if (!seriesS){
            if (seriesT){
                // should actually always arrive here when there is no series in site; in this case, delete the heat from timing
                // then we need  to delete the heat in timing
                this.deleteSeriesTiming({status:-99, xSeries: data.xSeries, xContest:data.xContest}, true); // status will not be checked
                return true;
            } else {
                // should not occure, if the client does not try to fool us
                throw {code:23, message: `The series ${data.xSeries} neither exists in site nor in timing.`}
            }
            
        }
        // seriesS certainly exists as of here
        if (seriesT){
            // update
            this.changeSeriesTiming(seriesS, true);
        } else {
            // create
            this.addSeriesTiming({contest:contestS, series:seriesS}, true);
        }
        
        // actually nothing to return
        return true;
        
    }

    // called by the client to move results from timing to rSite.
    // if xContest and/or xSeries are defined, use this as a filter
    async resultsToLA(data){
        if (!this.validateResultsToLA(data)){
            throw {code:21, message: this.ajv.errorsText(this.validateResultsToLA.errors)}
        }
        
        let override='';
        if (data.add){
            override +='a';
        }
        if (data.update){
            override += 'u';
        }
        if (data.delete){
            override += 'd';
        }

        let contests = this.data.data;
        if (data.xContest != null){
            contests = this.data.data.filter(c=>c.xContest == data.xContest);
        }

        // loop over all contests and heats
        for (let c of contests){
            let series = c.series;
            if (data.xSeries != null){
                series = c.series.filter(s=>s.xSeries==data.xSeries);
            }
            for (let s of series){
                this.addUpdateResults(s, override); 
            }
        }

        // actually nothing to return
        return true
    }

    // called by the client to move the results of a certain heat from timing to rSite
    /*resultsToLASingle(data){
        if (!this.validateResultsToLASingle(data)){
            throw {code:21, message: this.ajv.errorsText(this.validateResultsToLASingle.errors)}
        }

        // get the contest
        const c = this.data.data.find(c2=>c2.xContest == data.xContest);
        if (!c){
            this.logger.log(10, `Contest ${data.xContest} does not exist in rTiming.`);
            return;
        }
        const s = c.series.find(s=>s.xSeries == data.xSeries)
        if (!s){
            this.logger.log(10, `Series ${data.xSeries} does not exist in rTiming, contest ${data.xContest}`);
            return;
        }

        let override='';
        if (data.add){
            override +='a';
        }
        if (data.update){
            override += 'u';
        }
        if (data.delete){
            override += 'd';
        }
        
        this.addUpdateResults(s, override); 
        
        // actually nothing to return
        return true;
    }*/

    // the name is on purpose not "info" since this is already in use in the room.
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
     * Provide the general function to handle incoming results. This function is called by a timing-specific push- or pull-results-function. The function shall be able to handle new and updated results and/or aux data! The function will update the results in timing and (if requested for the present state) transfer the result to the site/live athletics
     * @param {object} result the object with all results and backgrounddata that are to be transferred. The object has the same structure as a series, but only a part is mandatory:
     * mandatory: xContest (integer), oneOf [xSeries (integer), id (string)] 
     * optional: aux*, status, SSRs (array of SSR); everything else will simply be neglected
     * SSR: 
     * mandatory: oneOf [xSeriesStart, bib]
     * optional: resultstrack (object of resultstrack), resultOverrule;everything else will simply be neglected
     * resultstrack: 
     * mandatory: official (boolean), time (integer>0)
     * optional: rank, reactionTime; everything else will simply be neglected 
     * *ATTENTION: properties given in aux will overwrite the same properties (if already available)! Properties that are not given, will not be deleted. (See roomServer.propertyTransfer for details).
     * TODO: describe the additional aux properties
     * @param {object} obj.newStart start-object as defined by rContestTrack,
     * @param {string} obj.newStart.starttime UTC string; mandatory
     * @param {boolean} obj.newStart.isFalseStart mandatory
     * @param {object} obj.newStart.reactionTimes (see newReactonTimes for properties); optional
     * @param {object} obj.newSplittime start-object as defined by rContestTrack,
     * @param {string} obj.newSplittime.splittime UTC string; mandatory
     * @param {integer} obj.newSplittime.distance distance in m; optional
     * @param {array} obj.newReactionTimes reactiontime array as defined by rContestTrack; see below for properties of single objects:
     * @param {integer} reactionTime.lane the lane of the reaction time
     * @param {integer} reactionTime.reactionTime the actual reaction time in ms
     * @param {string} newFinishTime UTC string; the runtime will then be calculated here.  
     */
    heatResultsIncoming(result, {newStart=null, newSplittime=null, newReactionTimes=null, newFinishTime=null}={}){
        // if the data changed, it will call "addUpdateResults" in rContestTrack. After that, the data in rSite will get updated.

        // set to true when the data was an actual change; then, call the function to potentially send the respective request to rSite/rContestTrack
        let changed;

        // get the contest and heat
        const c = this.data.data.find(c=>c.xContest==result.xContest);
        if (!c){
            this.logger.log(10, `Contest ${result.xContest} does not exist in rTiming.`);
            return;
        }
        let s;
        if ('xSeries' in result){
            s = c.series.find(s=>s.xSeries == result.xSeries)
        } else {
            s = c.series.find(s=>s.id == result.id)
        }
        if (!s){
            this.logger.log(10, `Series ${result.xSeries} does not exist in rTiming, contest ${result.xContest}`);
            return;
        }

        // a further check and adding the rounded time 
        // if there is a rank in results, make sure that all participans have a rank! (either all or none!)
        if ('SSRs' in result){
            let numRanks = 0;
            let numOverrules = 0;
            for (let ssr of result.SSRs){
                let count = 0;
                if (ssr.resultstrack) {
                    count++;
                    if ('rank' in ssr.resultstrack){
                        numRanks++;
                    }
                    if (!('timeRounded' in ssr.resultstrack)){
                        ssr.resultstrack.timeRounded = Math.ceil(ssr.resultstrack.time/100)*100; // 1/1000s, as allowed to consider for the ranking/progress to next round
                    }
                    if (!ssr.resultstrack.reactionTime){
                        ssr.resultstrack.reactionTime = null; // make sure that the property exists
                    }
                };
                if ('resultOverrule' in ssr && ssr.resultOverrule>0){
                    count++;
                    numOverrules++; 
                };
                if (count != 1){
                    this.logger.log(10, 'The ssr must contain either resultstrack or resultsoverrule must be >0.')
                    return;
                }
            }
            if (numRanks>0 && numRanks+numOverrules != result.SSRs.length){
                this.logger.log(10, `Either all or none of SSRs must contain a rank of the new results must either Series ${result.xSeries} does not exist in rTiming, contest ${result.xContest}`);
                return;
            }
        }

        if ('aux' in result && !this.objectsEqual(result.aux, s.aux, false, false)){
            changed = true;
            // only do updates!
            this.propertyTransfer(result.aux, s.aux, true);
        }
        if ('status' in result && result.status != s.status){
            changed = true;
            s.status = result.status;
        }
        if (newStart){
            changed = true;
            s.aux.starttime = newStart.starttime;
            s.aux.isFalseStart = newStart.isFalseStart;
            s.aux.finishtime = null;
            
            // check if the item in aux.starts was already created by another signal source (e.g. direct signal from the automatic starting system or by a former startsignal, when it was still considered that it is nto a false start)
            let start = s.aux.starts.find(s2=>s2.starttime==newStart.starttime);
            if (start){
                this.propertyTransfer(newStart, start, true);
            } else {
                aux.starts.push(newStart);
            }

        }
        if (newSplittime){
            changed = true;

            s.aux.splittimes.push(newSplittime);

        }
        if (newReactionTimes){

            // note: we simply add the reaction time to the last start we have recorded.
            if (s.aux.starts.length==0){
                this.logger.log(30, `Could not add reaction times (xSeries: ${s.xSeries}, xContest:${s.xContest}), since no start was recorded before. Make sure that a start is stored before any reaction times are created. `);
            } else {
                changed = true;
                s.aux.starts[s.aux.starts.length].reactionTimes = newReactionTimes;
            }

        }
        if (newFinishTime){
            // calculate the runtime based on the starttime and the finishtime
            if (!s.aux.starttime){
                this.logger.log(30, `Cannot record finish time, since there is no starttime.`);
            }
            let dStart = new Date(s.aux.starttime);
            let dFinish = new Date(newFinishTime);
            s.aux.finishtime = (dFinish-dStart)*100; // note: since dFinish and dStart are only precise to 1/1000 of a second, there might be small rounding differences between the time recorded here and the actually shown time in the stadium, when shown up to 1/1000. (If the finishtime is set directly through aux.finishtime, e.g. when the runtime (in 1/100000s) is known and not only the finish time of day, then this problem does not appear.)
            changed = true;

        }

        if ('SSRs' in result){
            for (let ssrNew of result.SSRs){
                let ssrCurrent;
                if ('xSeriesStart' in ssrNew){
                    ssrCurrent = s.SSRs.find(x=>x.xSeriesStart == ssrNew.xSeriesStart);
                    if (!ssrCurrent){
                        this.logger.log(10, `SeriesStart ${ssrNew.xSeriesStart} does not exist in rTiming, series ${result.xSeries}, contest ${result.xContest}`);
                        continue;
                    } 
                } else {
                    ssrCurrent = s.SSRs.find(x=>x.bib == ssrNew.bib);
                    if (!ssrCurrent){
                        this.logger.log(10, `SeriesStart ${ssrNew.bib} does not exist in rTiming, series ${result.xSeries}, contest ${result.xContest}`);
                        continue;
                    }
                }
                if ('resultOverrule' in ssrNew && ssrNew.resultOverrule!=ssrCurrent.resultOverrule){
                    changed = true;
                    ssrCurrent.resultOverrule = ssrNew.resultOverrule;
                }
                // the following "check" could not be done above, since ssrNew.xSeriesStart is not necessarily given before
                if (ssrNew.resultstrack !== null && !('xResultTrack' in ssrNew.resultstrack)){
                    ssrNew.resultstrack.xResultTrack = ssrCurrent.xSeriesStart;
                }
                if ('resultstrack' in ssrNew && !this.objectsEqual(ssrNew.resultstrack, ssrCurrent.resultstrack, false, false)){
                    changed = true;
                    if (ssrCurrent.resultstrack===null){
                        ssrCurrent.resultstrack = ssrNew.resultstrack;
                    } else {
                        this.propertyTransfer(ssrNew.resultstrack, ssrCurrent.resultstrack, true);
                    }
                }
            }
        }

        if (changed){
            // save the changed rTiming data
            this._storeData().catch(err=>this.logger.log(10, `${this.name}: Could not store data to mongo: ${err}`)); // async
    
            // notify the clients about the changed data
            let doObj = {
                funcName: 'changeSeriesTiming', 
                data: s,
            };
            this.processChange(doObj, {})
    
            // let the following function decide based on the auto-setting whether the change is sent to the site-->contest or not 
            this.addUpdateResults(s);    

        }
    }

    // single result incoming; the rank is automatically evaluated (if the rank is already known, use the heatResultsIncoming-function)
    // use the same function as for full heat results to send the change to rSite/rContestTrack; 
    // if result.xResultTrack (=xSeriesStart) is not given, the bib must be provided!
    resultIncoming(xContest, result, resultOverrule=0, xSeries=null, id=undefined, bib=null){

        // get the contest and heat
        const c = this.data.data.find(c=>c.xContest==xContest);
        if (!c){
            this.logger.log(10, `Contest ${xContest} does not exist in rTiming.`);
            return;
        }
        let s;
        if (xSeries){
            s = c.series.find(s=>s.xSeries === xSeries)
        } else {
            s = c.series.find(s=>s.id === id)
        }
        if (!s){
            this.logger.log(10, `Series with either xSeries=${xSeries} or id=${id} does not exist in rTiming, contest ${xContest}`);
            return;
        }
        // get the seriesStart
        let SSR
        if (result!==null && 'xResultTrack' in result){
            SSR = s.SSRs.find(ssr=>ssr.xResultTrack == result.xResultTrack);
        } else if(bib!==null) {
            SSR = s.SSRs.find(ssr=>ssr.bib == bib);
            result.xResultTrack = SSR.xSeriesStart;
        }
        if (!SSR){
            this.logger.log(10, `SSR with either bib=${bib} or xSeriesStart=${result.xResultTrack} does not exist in rTiming, contest ${result.xContest}, series ${s.xSeries}. Cannot add a result.`);
            return;
        }

        if (resultOverrule>0){
            // if there was previously a result, we need to delete it AND to rerank all other results
            if (SSR.resultstrack !== null){
                let rankDeleted = SSR.resultstrack.rank;
                SSR.resultstrack = null;

                // decrease the rank of all other SSRs in the same heat
                for (let ssr2 of s.seriesstartsresults){
                    if (ssr2.resultstrack !== null){
                        if (ssr2.resultstrack.rank > rankDeleted){
                            ssr2.resultstrack.rank--;
                        }
                    }
                }
            }
        } else {
            // regular result; or delete result (i.e. result==null)

            if (result !== null){
                if (!result.time){
                    this.logger.log(10, `Result ${result} must have a time property or be null.`)
                    return;
                }
    
                // make sure that the result is complete apart of the rank
                result.timeRounded = result.timeRounded ?? Math.ceil(result.time/100)*100; // 1/1000s, as allowed to consider for the ranking/progress to next round
                result.official = result.official ?? true;
                result.reactionTime = result.reactionTime ?? null;

            }

            // is there already a result?
            let rankBefore = SSR.resultstrack?.rank ?? 9999999;

            // ranking of the new result and reranking of all others is done in analogy to ranking in rContestTrack
            // find the rank
            let rank = 1;
            let currentResults = s.SSRs.filter(ssr2=>ssr2.resultstrack!==null && ssr2.xSeriesStart != SSR.xSeriesStart);
            for (let ssr2 of currentResults){
                if (result!==null && ssr2.resultstrack.timeRounded<result.timeRounded){
                    rank++;
                }
                
                if (ssr2.resultstrack.rank > rankBefore && (result===null || ssr2.resultstrack.timeRounded < result.timeRounded)){
                    // lower the rank by one if the changed/new time is now worse then the investigated one
                    ssr2.resultstrack.rank--;
                } else if (result!==null && ssr2.resultstrack.rank <= rankBefore && ssr2.resultstrack.timeRounded > result.timeRounded){
                    // the rank of the changed result was increased
                    ssr2.resultstrack.rank++;
                }
            }

            if (result !== null){    
                result.rank = rank;
            }
            
            SSR.resultstrack = result;

        }
        SSR.resultOverrule = resultOverrule;

        // store the data
        this._storeData().catch(err=>this.logger.log(10, `${this.name}: Could not store data to mongo: ${err}`)); // async

        // let the following function decide based on the auto-setting whether the change is sent to the site-->contest or not 
        this.addUpdateResults(s);
    }

    /**
     * Check if the changed series in timing (series-aux-data and/or actual results) shall be sent to rSite --> rContest and if yes, send it
     * @param {object} seriesT the series object of rTiming that was changed
     * @param {string} override default '', put 'a' for add, 'u' for update and 'd' for delete to even send the change to the server when the automatic-send-option would say no
     */
    addUpdateResults(seriesT, override=''){

        // send the change to rSite, which will relay it to the respective room, which will raise an event captured by rSite, updating the data of rSite, which then arrives here...
        // this is quite a long path, but a reliable one and comparable easy to understand. If the data was directly added here to rSite, we would somehow have to make 100% sure that the change on rContest is actually made, since rSite shall NEVER be newer than rContest, since it is an artificial room without own data! (Therefore, rSite should only change the data when rCOntest already has processed it. Thus, we send the change via rSite to rContest. The actual request to rSite is not an actual change; the change of rSite data is caused by the event of rContest.)

        // get the series in the site
        let cS = this.data.contests.find(c=>c.xContest==seriesT.xContest);
        if (!cS){
            this.logger.log(10, `Contest ${seriesT.xContest} does not exist rSite.`);
            return;
        }
        const seriesS = cS.series.find(s=>s.xSeries == seriesT.xSeries)
        if (!seriesS){
            this.logger.log(10, `Series ${seriesT.xSeries} does not exist in rTiming, contest ${seriesT.xContest}`);
            return;
        }

        let changes = false;
        // copy the current seriesS as a startpoint for the change to be sent to the server
        let data = {};
        this.propertyTransfer(seriesS, data); // use the site's series object to make sure that there were no changes apart of what we really want to send as a change.

        // if the aux data has changed, send it, otherwise not
        if (this.objectsEqual(seriesT.aux, seriesS.aux, false, false)){
            delete data.aux;
        } else {
            changes = true;
            data.aux = JSON.stringify(seriesT.aux); // must be a string in rContest
        }
        if (seriesT.status != seriesS.status){
            changes = true;
            data.status = seriesT.status;
        }

        // remove all seriesstartsresults, to add them again (under the name seriesstartsresults ! (since rSite and rContest use this name differently)) if they shall be changed; 
        delete data.SSRs;
        data.seriesstartsresults = [];

        for (let ssrT of seriesT.SSRs){

            // find the respective series in rSite
            let ssrS = seriesS.SSRs.find(ssrS=>ssrS.xSeriesStart==ssrT.xSeriesStart);
            if (!ssrS){
                continue;
            }

            // check for every result, if it would be add, update or delete; 
            let hasResultT = ssrT.resultstrack !== null || ssrT.resultOverrule>0;
            let hasResultS = ssrS.resultstrack !== null || ssrS.resultOverrule>0;

            let action = 'none';
            if (hasResultS && hasResultT){action='u'}
            else if (!hasResultS && hasResultT){action='a'}
            else if (hasResultS && !hasResultT){action='d'}

            if (override.search(action)>=0 || this.evaluateAutoProcessResults(seriesS.status, action)){
                // do not send the full dataset, but only teh actual seriesstartsresults data (Note: in rSite and rTiming this is combined with startgroup-infos, e.g. name etc.)
                data.seriesstartsresults.push({
                    xSeriesStart: ssrT.xSeriesStart,
                    xStartgroup: ssrT.xStartgroup,
                    xSeries: ssrT.xSeries,
                    //position: ssrT.position, // not allowed to change
                    resultOverrule: ssrT.resultOverrule,
                    resultRemark: ssrT.resultRemark,
                    resultstrack: ssrT.resultstrack,
                    //qualification,
                    //startConf: ssrT.startConf, // not allowed to change
                });
                changes = true;
            }
        }

        // if no result-change shall be sent and if aux stayewd the same, we do not need to send the change
        if (changes){
            // call the respective function in rSite
            this.rSiteClient.addUpdateResultsHeatInit(data, ()=>{}, (code, msg)=>{this.logger.log(10, `Error sending addUpdateResult to rContest via rSite: ${code} ${msg}`)})
        }

    }

    // TODO: eventually remove this, when the same is already handled with heatResultsIncoming.
    /**
     * Provide the general function to handle incoming reaction times. This function is called by a timing-specific push- or pull-results-function. The function shall be able to handle new and updated reaction times!
     * @param {*} reaction 
     */
    /*reactionsIncoming(reaction){
        // check if the reactions are new or just an update!
        // TODO

        // if automatic take over is on, immediately send the change to rSite
        // TODO
    }*/

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
                this.pullReactionInterval = setInterval(()=>{
                    this.pullReaction().catch(err=>{
                        this.logger.log(5, `Error in async pullReaction: ${err}`);
                    });
                },1000*timers.pullReactionTimes);
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
                this.pullResultsInterval = setInterval(()=>{
                    this.pullResults().catch(err=>{
                        this.logger.log(5, `Error in async pullResults: ${err}`);
                    });;
                },1000*timers.pullResults);
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

    // to be implemented by the timing specific class
    async pushHeats(){

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

    /** ALGE Timing  
     * The ALGE timing data transfers basically uses files for exchange. Optionally, the main software knows the tcp-based versatile exchange protocol sending some information live and the the StartJudge sends reaction time through tcp as well.  
     * 
     * ALGE can push the following messages: 
     * - HeatStart, when heat is started: IsFalseStart, EventId, HeatId, Time (in UTC?)
     * - HeatFinish, when first person crosses the line: EventId, HeatId, Time (in UTC?), Runtime
     * - CompetitorEvaluated, when the time of one competitor was set: Bib, Rank (attention: this might be temporary only!), Time (UTC?), Runtime, RuntimeFullPrecision, Lane, Disqualification (as text), DifferenceToWinner, DifferernceToPrevious, State --> this info seems to lack the event ! --> TODO: store the last event coming in via HeatStart or HeatFinish
     * - HeatResult/Result, when the heat-results are confirmed: 
     *      - HeatResult: SessionId, EventId, HeatId, Starttime, Finishtime, Runtime, Wind, WindUnit, DistanceMeters
     *      - Result: see CompetitorEvaluated 
     * - Time has the format HH:MM:SS.1234
     * 
     * The startjudge can send HeatReactiontimes. 
     * 
     * eventually provide timing-specific options to (de-) activate every single push-reaction
     * 
     * It would be cool if there was a message when a heat is opened and closed, so that we might set the state in liveAthletics accordingly.
     */
    
    constructor (wsManager, timingName, eventHandler, mongoDb, logger){

        // (wsManagerOld, timingName, eventHandler, mongoDb, logger, heatsPushable=false, resultsPullable=false, reactionPullable=false)
        super(wsManager, timingName, eventHandler, mongoDb, logger, true, true, false)
        
        // own properties:
        this.tcpConn = null;
        this.tcpConnSJ = null; // start judge

        // we need to keep track of the last started heat to know where to assign live-incoming results to.
        this.lastHeatXContest = null;
        this.lastHeatSeriesId = null;

        this.defaultTimingOptions = {
            xmlHeatsFolder: '', // path
            xmlResultsFolder: '', // path
            handlePushHeatStartFinish: true, 
            handlePushCompetitorEvaluated: true, // automatically get results of one cometitor when evaluated (marked inofficial)
            competitorEvaluatedWithRank: false, // NOT USED AT THE MOMENT also import the rank. This should be set to false, when the times are not strictly evalauted
            autoStatus: false, // set the status to "in progress" when the heat is started and to "finished" when the final, official results arrive. 
            handlePushHeatResult: true, // automatically get the results of one heat when official
            hostMain: '', // the IP (or any other identifier of the timing)
            portMain: 4446, // same default as Seltec
            hostStartjudge: '',
            portStartjudge: 1111,
        }

        this.data.infos.timing = {
            tcpConnectedMain: false,
            tcpErrorLastMain: '', // the last tcp error. Include the time in the string!
            tcpConnectedStartjudge: false,
            tcpErrorLastStartjudge: '', // the last tcp error. Include the time in the string!
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
                autoStatus: {type:"boolean"},
                handlePushHeatResult: {type:"boolean"},
                hostMain: {type:"string"},
                portMain: {type:"integer", minimum:1, maximum:65535},
                hostStartjudge: {type:"string"},
                portStartjudge: {type:"integer", minimum:1, maximum:65535},
            },
            required:['xmlHeatsFolder', 'xmlResultsFolder', 'handlePushHeatStartFinish', 'handlePushCompetitorEvaluated', 'competitorEvaluatedWithRank', 'autoStatus', 'handlePushHeatResult', 'hostMain', 'portMain', 'hostStartjudge', 'portStartjudge'],
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

        // they will not get started when the string is empty
        this.startTcpVersatileExchange();
        this.startTcpStartjudge();

    }

    
    /** to be implemented by the timing-specific class. 
     * Will be called when the timing data shall be resetted, e.g. when the meeting that it gets connected to is changed. 
     * The function is called before the timing daa is deleted.
     * Use this to e.g. delete the old exchange files.
     */
    async resetTiming(){
        // TODO: delete all files from the exchange, e.g. heats and results
    }

    startTcpStartjudge(){
        if (this.tcpConnSJ !=null){
            // stop the previous connection
            this.tcpConnSJ.close();
            this.tcpConnSJ = null;
        }
        if (this.data.timingOptions.hostStartjudge==''){
            // empty string = not configured.
            return;
        }

        // connection options (see nodejs Net.Client for documentation): 
        const optSJ = {
            port: this.data.timingOptions.portStartjudge,
            host: this.data.timingOptions.hostStartjudge,
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        const onError = (err)=>{
            let d = new Date().toLocaleTimeString();
            this.data.infos.timing.tcpErrorLastStartjudge = `${d}: ${err}`;
            this.broadcastInf();
        }

        const onClose = () =>{
            this.data.infos.timing.tcpConnectedStartjudge = false;
            this.broadcastInf();
        }

        const onConnect = ()=> {
            this.data.infos.timing.tcpConnectedStartjudge = true;
            this.broadcastInf();
        }

        const onData = async (data)=>{
            this.logger.log(90, `ALGE StartJudge2 data: ${data}`); // TODO: change later to level 99

            // parse the xml
            const xml = await parseStringPromise(data, {explicitArray:true, attrValueProcessors:[xmlProcessors.parseBooleans, xmlProcessors.parseNumbers]});

            if ('HeatReactiontimes' in xml){

                let result = {};

                result.id = xml.HeatReactiontimes.$.Id;

                // unfortunately, the contest (liveAthleztics) / event (alge) is probably not given here; thus, we need to search for the correct contest...
                for (let iC=0; iC++; iC<this.data.data){
                    let c = this.data.data[iC];
                    let s = c.series.find(s=>s.id === result.id);
                    if (s){
                        result.xContest = s.xContest;
                        break;
                    }
                }
                if (!s){
                    this.logger.log(20, `Could not find contest for heat-id ${result.id}. Thus, reaction times (${xml}) cannot be imported.`);
                    return
                }

                let newReactionTimes = [];
                if ('Reactiontimes' in xml.HeatReactiontimes && 'Competitor' in xml.HeatReactiontimes.Reactiontimes[0]){
                    for (let competitor of xml.HeatReactiontimes.Reactiontimes[0].Competitor){

                        // the reactiontime is a string; 
                        let reactionTime = parseFloat(competitor.$.Reactiontime);
                        if (!isNaN(reactionTime)){
                            newReactionTimes.push({
                                lane: competitor.$.Lane,
                                reactionTime,
                            })
                        }
                    }
                }
                if (newReactionTimes.length>0){
                    this.heatResultsIncoming(result, {newReactionTimes})
                }

            }

        }

        this.tcpConnSJ = new tcpClientAutoReconnect(optSJ, onError, onClose, onConnect, onData)
    }

    // also works for restart
    startTcpVersatileExchange(){
        if (this.tcpConn !=null){
            // stop the previous connection
            this.tcpConn.close(); 
            this.tcpConn = null;
        }
        if (this.data.timingOptions.hostMain==''){
            // empty string = not configured.
            return;
        }

        // connection options (see nodejs Net.Client for documentation): 
        const optVersatileExchange = {
            port: this.data.timingOptions.portMain,
            host: this.data.timingOptions.hostMain,
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        const onError = (err)=>{
            let d = new Date().toLocaleTimeString();
            this.data.infos.timing.tcpErrorLastMain = `${d}: ${err}`;
            this.broadcastInf();
        }

        const onClose = () =>{
            this.data.infos.timing.tcpConnectedMain = false;
            this.broadcastInf();
        }

        const onConnect = ()=> {
            this.data.infos.timing.tcpConnectedMain = true;
            this.broadcastInf();
        }

        const onData = async (data)=>{
            this.logger.log(90, `ALGE versatile data: ${data}`); // TODO: change later to level 99

            // HeatResult: the reserved field is not available!
            // if "SendResultlistWhenHeatDataChanged" is set to true in the ALGE-Versatile settings, a heatresult is sent whenever a time is entered; 
            // CompetitorEvaluated cannot be used yet, since the fragment does nto contain all necessary data needed (except if we want to search for the athlete in all heats...)
            
            // parse the xml
            const xml = await parseStringPromise(data, {explicitArray:true, attrValueProcessors:[xmlProcessors.parseBooleans, xmlProcessors.parseNumbers]});

            // differentiate the different data
            if (this.data.timingOptions.handlePushHeatResult && 'HeatResult' in xml){

                // until ALGE has updated their interface, we simply read the file when the data arrives.
                let xContest = xml.HeatResult.$.EventId; //
                let seriesId = xml.HeatResult.$.Id; // UUID
                let c = this.data.data.find(c=> c.xContest==xContest)
                if (!c) return;
                let s = c.series.find(s=>s.id == seriesId);
                if (!s) return;
                setTimeout(()=>{
                    this.readHeatResults(s).catch((code, msg)=>{this.logger.log(30, msg)});
                }, 500);
                

                // finished evaluation; the processing should be the same as when data is read from file
                // results are offical

                // NOTE: currently (2023-04-04), Reserved1 does not exist in Versatile data. Thus, use bib instead (or we simply wait until they provide this data). processXmlHeatResult should be able to handle both options.
                // as soon as both (versatile and file) should be the same, we split the xml-processing part from readHeatResults and call it from here as well.

                // TODO: this does not work yet for multiple reasons:
                // - Reserved1 does not exist in versatile (solved)
                // - the structure is <HeatResult><Result> in Versatile and <HeatResult><Results><Competitor> in file
                // heat number: Nr (file) vs HeatId (versatile)

                //this.processXmlHeatResult(xml);

            } else if ( this.data.timingOptions.handlePushHeatStartFinish && 'HeatStart' in xml){
                // heat started
                let falseStart = false;
                if ('IsFalseStart' in xml.HeatStart.$){
                    falseStart = xml.HeatStart.$.IsFalseStart;
                }
                let xContest = xml.HeatStart.$.EventId; //
                let seriesId = xml.HeatStart.$.Id; // UUID

                // store the id and xContest of the last started heat
                this.lastHeatXContest = xContest;
                this.lastHeatSeriesId = seriesId;

                let time;
                if ('Time' in xml.HeatStart.$){
                    // time is time of day, e.g. ”12:30:22.2124”
                    let parts = xml.HeatStart.$.Time.split(/[.:]/);
                    let today = new Date();
                    time = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3].slice(0,3)))// Date constructor is in local time
                } else {
                    time = new Date();
                }

                let result = {
                    xContest,
                    id:seriesId,
                }
                
                if (this.data.timingOptions.autoStatus){
                    // change the status of the heat to in progress
                    result.status = 150;
                }

                let newStart = {
                    isFalseStart:falseStart,
                    starttime:time,
                    // reactionTimes are currently (2023-04-13) not provided with the HeatStart
                }

                this.heatResultsIncoming(result, {newStart});

            } else if (this.data.timingOptions.handlePushHeatStartFinish &&  'HeatFinish' in xml){
                // heat finished (photocell); inofficial finish time 
                let xContest = xml.HeatFinish.$.EventId; //
                let seriesId = xml.HeatFinish.$.Id; // UUID

                if ('Time' in xml.HeatFinish.$){
                    // time is time of day, e.g. ”12:30:22.2124”
                    let parts = xml.HeatFinish.$.Time.split(/[.:]/);
                    let today = new Date();
                    time = new Date(today.getFullYear(), today.getMonth(), today.getDate(), parseInt(parts[0]), parseInt(parts[1]), parseInt(parts[2]), parseInt(parts[3].slice(0,3)))// Date constructor is in local time
                } else {
                    time = new Date();
                }

                let result = {
                    xContest,
                    id:seriesId,
                }

                if (this.data.timingOptions.autoStatus){
                    // change the status of the heat to finished
                    result.status = 180;
                }

                let newFinishTime = time

                this.heatResultsIncoming(result, {newFinishTime});

            } else if ( this.data.timingOptions.handlePushCompetitorEvaluated && 'CompetitorEvaluated' in xml){

                // xContest and xSeries are not transmitted with the 'CompetitorEvaluated' signal; thus, we simply assume that the last started heat is the right one. If this does not match, resultIncoming will simply do nothing and log the "error"
                //this.lastHeatSeriesId
                //this.lastHeatXContest

                const competitor = xml.CompetitorEvaluated
                // mark the result as inofficial so far and do not process the rank

                // rank is not considered, even if present

                // also works when State is undefined
                let resultOverrule = this.stateToResultOverrule(competitor.$.State);
                let result = null;
                if (resultOverrule==0){
                    // regular result
                    // process the time (since it is given as a string)
                    let time = disciplineValidators[3](competitor.$.RuntimeFullPrecision.toString(), discipline).value; // toString is needed since values with just seconds and smaller are processed to float; but the function needs strings

                    result = {
                        official: false,
                        time: time,
                        reactionTime: null, // according to the documentation, the reactiontime is currently not transferred
                        // timeRounded will be calculated
                        // rank will be calculated
                    }

                }

                // the athlete currently is identified by the bib; if Reserved1 is tranferred in the future as well, change to this.;
                let bib = competitor.$.Bib;

                this.resultIncoming(this.lastHeatXContest, result, resultOverrule=resultOverrule, id=this.lastHeatSeriesId, bib=bib)

            } 

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
        if (oldTimingOptions.portMain != timingOptions.portMain || oldTimingOptions.hostMain != timingOptions.hostMain){
            // restart tcp connection
            this.startTcpVersatileExchange();
        }
        if (oldTimingOptions.portStartjudge != timingOptions.portStartjudge || oldTimingOptions.hostStartjudge != timingOptions.hostStartjudge){
            // restart tcp connection
            this.startTcpStartjudge();
        }

        // if any path has changed, rewrite the xml.
        if (oldTimingOptions.xmlHeatsFolder != timingOptions.timingOptions){
            this.writeInput().catch(err=>this.logger.log(1, `Error in rTimingAlge during writeInput: ${err}`));
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
        this.writeInput().catch(err=>this.logger.log(1, `Error in rTimingAlge during writeInput: ${err}`));
    }


    async writeInput(){
        
        // first, sort the contests and series by date/time!
        this.data.data.sort((a,b)=>a.datetimeStart-b.datetimeStart);
        for (let c of this.data.data){
            c.series.sort((a,b)=>a.number-b.number);
        }

        // write the input file from this.data.data
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
            this.writeInput().catch(err=>this.logger.log(1, `Error in rTimingAlge during writeInput: ${err}`));
        }
    }
    /**
     * Called whenever a series was deleted in rTiming. To be implemented by the timing.
     */
    deletedSeries(series, contest){
        if (!this.deferWrite){
            this.writeInput().catch(err=>this.logger.log(1, `Error in rTimingAlge during writeInput: ${err}`));
        }
    }
    /**
     * Called whenever a series was changed in rTiming. To be implemented by the timing.
     */
    changedSeries(series, contest){
        if (!this.deferWrite){
            this.writeInput().catch(err=>this.logger.log(1, `Error in rTimingAlge during writeInput: ${err}`));
        }
    }
    /**
     * Called whenever a contest was changed in rTiming. To be implemented by the timing.
     */
    changedContest(contest){
        if (!this.deferWrite){
            this.writeInput().catch(err=>this.logger.log(1, `Error in rTimingAlge during writeInput: ${err}`));
        }
    }
    
    // push heats to timing; here: write the file
    // report errors
    async pushHeats(){
        await this.writeInput().catch(err=>{
            this.data.infos.lastHeatPushFailed = true;
            this.broadcastInf();
            throw err;
        });
        
        this.data.infos.lastHeatPushFailed = false;
        this.broadcastInf();
    }

    /**
     * Read a single heat. This function is called from pullResults and eventually also when the tcp-message arrived that the heat is finished.
     * @param {object} series The series-object of the timing, i.e. this.data.data[contestIndex].series[seriesIndex] 
     * @param {strring-array} fileNames If the list of file names was already read, it shall be provided to save some time 
     */
    async readHeatResults(series, fileNames=null){

        if (fileNames===null){
            // get a list of all files in the folder, which we can then regex-match for the actual heat
            fileNames = await fs.readdir(this.data.timingOptions.xmlHeatsFolder);
        }
        // check if the file exists
        // filter the files with regex
        const re = new RegExp(`Heat.*${series.id}\\.heatresultxml`)
        let ff = fileNames.filter(item=>item.match(re));
        if (ff.length!=1){
            throw `There is no heat results file (yet) for xSeries=${series.xSeries} / id=${series.id}`;
        }

        // read the file
        const xmlString = await fs.readFile(path.join(this.data.timingOptions.xmlHeatsFolder, ff[0])).catch(err=>{
            throw `Reading the heat result file ${ff[0]} failed: ${err}`;
        });

        // parse to xml object; note that all subnodes are arrays!
        let xml = await parseStringPromise(xmlString, {explicitArray:true, attrValueProcessors:[xmlProcessors.parseBooleans, xmlProcessors.parseNumbers]}).catch(err=> {
            throw `XML-Parsing of heat result file ${ff[0]} failed: ${err}`;
        })

        this.processXmlHeatResult(xml);

        /*const auxData = {};
        const SSRs = [];

        if ('Wind' in xml.HeatResult.$){
            auxData.wind = xml.HeatResult.$.Wind;
        }

        // loop over every result in the list
        for (let competitor of xml.HeatResult.Results[0].Competitor){

            let resultOverrule = 0;
            if (competitor.$.State == "DNS"){
                resultOverrule = 5;
            } else if(competitor.$.State == "DNF"){
                resultOverrule = 3;
            } else if (competitor.$.State == "DSQ"){
                resultOverrule = 6;
            } else if (competitor.$.State == "CAN" || competitor.$.State == "SUR" || competitor.$.State == "FAL"){
                // withdrawal
                resultOverrule = 4;
            }

            // create a fake "discipline" object with the relevant information for the automatic processing to a value
            let discipline = {baseConfiguration:JSON.stringify({distance: xml.HeatResult.$.DistanceMeters})}

            let resultstrack = null;
            if (resultOverrule==0){
                // process the time (since it is given as a string)
                let time = disciplineValidators[3](competitor.$.RuntimeFullPrecision.toString(), discipline).value; // toString is needed since values with just seconds and smaller are processed to float; but the function needs strings

                let reactionTime = null;
                if ("Reaction" in competitor.$){
                    reactionTime = competitor.$.reaction;
                }

                resultstrack = { 
                    time, 
                    rank: competitor.$.Rank,
                    official: true, // at that point in time always true
                    reactionTime, // optional
                }
            }

            SSRs.push({
                xSeriesStart: competitor.$.Reserved1, 
                resultOverrule, // optional
                resultstrack, // optional
            })
        }

        // create the data structure needed by heatResultsIncoming
        let heatResults = {
            xContest: series.xContest,
            xSeries: series.xSeries,
            aux: auxData, // optional
            SSRs: SSRs, // optional
        }

        // send the heat to heatResultsIncoming. rsultsIncoming will then check if the data actually has changed or not.
        this.heatResultsIncoming(heatResults);*/
    }

    // returns the resultOverrule-number for an ALGE-state
    stateToResultOverrule(state){
        let resultOverrule=0; // regular
        if (state == "DNS"){
            resultOverrule = 5;
        } else if(state == "DNF" || state == "SUR"){
            resultOverrule = 3;
        } else if (state == "DSQ"){
            resultOverrule = 6;
        } else if (state == "CAN" || state == "FAL"){
            // withdrawal
            resultOverrule = 4;
        }
        return resultOverrule
    }

    processXmlHeatResult(xml){
        
        const auxData = {};
        const SSRs = [];

        let xContest = xml.HeatResult.$.EventId;
        let heatId = xml.HeatResult.$.Id

        if ('Wind' in xml.HeatResult.$){
            auxData.wind = xml.HeatResult.$.Wind;
        }

        // loop over every result in the list
        for (let competitor of xml.HeatResult.Results[0].Competitor){

            let resultOverrule = this.stateToResultOverrule(competitor.$.State);
            /*if (competitor.$.State == "DNS"){
                resultOverrule = 5;
            } else if(competitor.$.State == "DNF" || competitor.$.State == "SUR"){
                resultOverrule = 3;
            } else if (competitor.$.State == "DSQ"){
                resultOverrule = 6;
            } else if (competitor.$.State == "CAN" || competitor.$.State == "FAL"){
                // withdrawal
                resultOverrule = 4;
            }*/

            // create a fake "discipline" object with the relevant information for the automatic processing to a value
            let discipline = {baseConfiguration:JSON.stringify({distance: xml.HeatResult.$.DistanceMeters})}

            let resultstrack = null;
            if (resultOverrule==0){

                if (!('RuntimeFullPrecision' in competitor.$)){
                    // no result yet. Do not process this person.
                    continue;
                }

                // process the time (since it is given as a string)
                let time = disciplineValidators[3](competitor.$.RuntimeFullPrecision.toString(), discipline).value; // toString is needed since values with just seconds and smaller are processed to float; but the function needs strings

                let reactionTime = null;
                if ("Reaction" in competitor.$){
                    reactionTime = competitor.$.reaction;
                }

                resultstrack = { 
                    time, 
                    rank: competitor.$.Rank,
                    official: true, // at that point in time always true
                    reactionTime, // optional
                }
            }

            if ('Reserved1' in competitor.$){
                // is the case for the file variant, and should be the case in the future (>2023-04) also for versatile
                SSRs.push({
                    xSeriesStart: competitor.$.Reserved1, 
                    resultOverrule, // optional
                    resultstrack, // optional
                })
            } else {
                // evaluate the bib
                SSRs.push({
                    bib: competitor.$.Bib, 
                    resultOverrule, // optional
                    resultstrack, // optional
                })
                
            }

        }

        // create the data structure needed by heatResultsIncoming
        let heatResults = {
            xContest: xContest,
            id: heatId,
            aux: auxData, // optional
            SSRs: SSRs, // optional
        }

        // send the heat to heatResultsIncoming. rsultsIncoming will then check if the data actually has changed or not.
        this.heatResultsIncoming(heatResults);
    }

    async pullResults(){
        
        // get the results from file
        // NOTE: it is expected that the heats can be identified by the unique ID (UUID), which must be the last part in the filename before the .heatsresultxml ending. The filename must look as follows:
        // Heat{whatever you want here}{36 letters of UUID}.heatresultxml

        this.logger.log(98, 'Start pulling results.')
        
        // get a list of all files in the exchange folder (this is not actually necessary since the readHeatResults would check for the file itself; however, especially when only a few heats are finished it might be more efficient to not try to find each file from thre file system, but to create a list first and then only check within this list)
        let fileNames = await fs.readdir(this.data.timingOptions.xmlHeatsFolder);
        
        // filter the files with regex
        fileNames.filter(item=>item.match(/Heat.*\.heatresultxml/));

        // get the ID of all those heats
        let heatIds = fileNames.map(el=>el.substring(el.length-50, el.length-14)); // UUID length=36; ending-length:14. 

        // loop over all contests (in timing!) and heats and check if their respective file exists
        for (let c of this.data.data){
            for (let s of c.series){
                if (heatIds.indexOf(s.id)>=0){
                    await this.readHeatResults(s, fileNames).catch(err=>{
                        if (err instanceof Error){
                            this.data.infos.timing.xmlResultErrorLast =`Error: ${err}. Stack: ${err.stack}`;
                        } else {
                            this.data.infos.timing.xmlResultErrorLast =`Error: ${JSON.stringify(err)}`;
                        }
                        this.broadcastInf();
                    });
                }
            }
        }
    }

    async pullReaction(){

        // get the reaction times

        // send all changes to heatResultsIncoming
        //this.heatResultsIncoming(results);
    }

    // How to implement pushResults and pushReaction: 
    // Depends on how this is done for the timing: if the timing software only announces that new results are available, simply then start the respective pull function. If the timing software also directly send the results/reaction times with the tcp-message, then we 

}

