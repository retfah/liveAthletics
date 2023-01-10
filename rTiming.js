import roomServer from "./roomServer.js";
import Net from 'net';
import {promises as fs} from 'fs';
import roomClient from "./roomClientForServer.js";
//import { rSiteTrackClientForTiming } from "./static/rSiteTrackClient.js";

/**
 * IDEAS: 
 * - rTiming has two datasets: the rSite it is connected to (stored in rSiteClient) and its own. 
 * - rTimings own data shall always represent the data that is available in the timing software (or at least in the last stored input file for the timing software). The only exception is when e.g. the input file could not successfully be written. Then, we shall show a warning to the user and the option to try to send again.
 * 
 * 
 */
export default class rTiming extends roomServer{
    
    constructor(wsManager, timingName, eventHandler, mongoDb, logger, heatsPushable=false, reactionPullable=false, resultsPullable=false){
        
        // initialize the room
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false)
        let roomName = `timing${timingName}`;
        super(eventHandler, mongoDb, logger, roomName, true, -1, false);

        this.wsManager = wsManager;

        // store the ws connection and the rSiteClient
        this.conn = null;
        this.rSiteClient = null;

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
                siteRoomConnected: false,
            },

            // options which events in rSite result in direct transfer to/from rTiming
            // key: -1: never, -2: always auto, >=0: minimum state of the contest/series to do so.
            // to rTiming: 
            auto:{}, // what changes should be done automatically; will be loaded from Mongo

            timers: {}, // the timeouts for pulling resukts and reactionTimes

            data: {}, // here we put the actual data with contests and heats!

            contests: {}, // will be filled with the data of the rSiteTrackClient.contests
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
            // key: -1: never, -2: always auto, >=0: maximum state of series to do so.
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
        this.functionsWrite.updateTimingOptions = this.updateTimingOptions.bind(this);

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
        }
        this.validateSiteConf = this.ajv.compile(schemaSiteConf);
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

        // data:
        len = await this.collection.countDocuments({type:'data'});
        if (len==0){

            // create a default document
            await this.collection.updateOne({type:'data'},{$set:{data: {}}},{upsert:true}) //update with upsert=insert when not exists
            this.data.data = {};

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
        // prepare a function to strat the rSIteClient that shall be called whenever the connection is (re-)established
        let connectRoom = ()=>{

            this.infos.siteServerConnected = true;
            this.broadcastSiteInfos();

            // start rSiteClient
            let createSiteClient = ()=>{
                let failureCB = ()=>{
                    this.rSiteClient = null;
                    // on failure try again after a timeout:
                    setTimeout(createSiteClient, 2000); // retry every 2 seconds
                }
                let succCB = ()=>{
                    this.infos.siteRoomConnected = true;
                    this.broadcastInfos();
                }

                // create the rSiteClient
                //this.rSiteClient = new rSiteTrackClientForTiming(this.conn, this.eH, `sites/${this.siteConf.siteNumber}@${this.siteConf.shortname}`)
            }
            
            // then, start the comparison between this.data.data and rSiteClient.data.contests
            // based on the this.data.auto-settings, transfer some stuff automatically or not.
            // if there is at least one change, we must send the change to the timing. 
            // TODO: how to deduplicate this? (i.e. only write the file once at the end of the comparison (if needed) and not after avery added series?)
            // --> I think we must create a deduplication on our own. Idea: provide a "delay(Write)" bool in rTiming, which is set to true at the beginning and set back to false at the end, while at the end at the same time a function is called that starts the writing. If the timing would anyway not write a file, it will not care about the delayWrite bool and the write function called at the end does nothing. In contrast, timings that write to file will not do anything when delayWrite is true, but they will handle the write-call.
            // --> use "delay" for the boolean and "delayedWrite" for the function.
            
        }

        // get the connection
        this.conn = this.wsManager.getConnection(this.data.siteConf.shortname, this.data.siteConf.host, this.data.siteConf.port, this.data.siteConf.path, this.data.siteConf.secure)

        if (this.conn.connected){
            connectRoom();
        }

        // if the connection is lost, the wsManager and wsServer2Sever, respectively, will try to reconnect; listen to those events to instantly reconnect the sideChannel-rooms
        this.eH.eventSubscribe(`TabIdSet/${this.conn.tabId}`, connectRoom, this.name); // we use the shortname of the meeting as an identifier for the eventHandler 

        // not needed, since the TabIdSet-event is enough.
        //this.eH.eventSubscribe(`wsConnected/${conn.tabId}`, ()=>{this.data.status.connectionToMain.connectedToMain = true;}, `sideChannel:${this.meetingShortname}`);

        this.eH.eventSubscribe(`wsClosed/${this.conn.tabId}`, ()=>{

            this.infos.siteServerConnected = false;
            this.infos.siteRoomConnected = false;
            this.broadcastInfos();
            
            this.rSiteClient = null;
            this.conn = null;
        }, this.name);

    }

    // exemplary:
    closeSiteConnection(){
        if (this.conn?.connected){
            this.info.siteRoomConnected = false;
            this.info.siteServerConnected = false;
            this.broadcastInfos();
    
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
            this.wsManager.returnConnection(this.siteConf.shortname, this.siteConf.host, this.siteConf.port, this.siteConf.path, this.siteConf.secure);
            this.conn = null;
        }
    }

    broadcastSiteInfos(){
        let doObj = {
            funcName: 'updateInfo', 
            data: this.data.infos,
        }
        this.processChange(doObj, {})
    }

    // called after many changes to this.data.data were made, while "delay" was true
    delayedWrite(){

    }
    
    // TODO: which functions do we need in rTiming?
    // --> every event that might be raised either from the rSiteTrackClient or from the timing (e.g. when results have arrived.)
    // implement here how it should be reacted, e.g. automatically write results to rSite or not / automatically write changed series to timing (or just wait); also known as push/pull/manual modes !!! (see Prozesse.md)

    /**
     * Called by rSiteTrack when a series is changed
     * @param {TODO} heat 
     */
    heatChanged(heat){
        // do nothing here; to be implemented by the timing specific part, where we also 
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

    async updateSiteConf(siteConf){
        if (!this.validateSiteConf(siteConf)){
            throw {code:21, message: this.ajv.errorsText(this.validateSiteConf.errors)}
        }

        // stop the old connection
        this.closeSiteConnection();

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

    }

    // often, this function will have to be implemented with extensions by the inheriting class 
    async updateTimingOptions(timingOptions){
        if (!this.validateTimingOptions(timingOptions)){
            throw {code:21, message: this.ajv.errorsText(this.validateTimingOptions.errors)}
        }

        let oldTimingOptions = this.timingOptions;

        this.data.timingOptions = timingOptions;
        await this._storeTimingOptions();

        
        // if host or port have changed, change the tcp connection
        // TODO

        // if any path has changed, rewrite the xml.
        // TODO

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

    // called after many changes to this.data.data were made, while "delay" was true
    delayedWrite(){
        this.writeInput();
    }


    writeInput(){
        // TODO: write the input file
    }

    /**
     * Called by rSiteTrack when a series is changed
     * @param {TODO} heat 
     */
    heatChanged(heat){

    }

    // implement here all ALGE specific stuff (connection to timing) while the general stuff (connection to rSite via rSiteClient, etc) shall be handled in the parent class

    // may be called (1) after a change (when the automatic is on) or (2) after the user requested to take over a heat, contest or everything or (3) when the timing pulls the heats (to be implemented in the timing-specific part, i.e. in this class)
    // called sendHeats and not pushHeats, since it is also used for pull
    sendHeats(){
        // implement here the serializer, creating the input file from the local rTiming data and write this file

        this.infos.lastHeatPushFailed = false; // TODO: set accordingly
    }

    pullResults(){
        // get the results

        // send all changes to resultsIncoming
        this.resultsIncoming(results);
    }

    pullReaction(){
        // get the reaction times

        // send all changes to resultsIncoming
        this.resultsIncoming(results);
    }

    // How to implement pushResults and pushReaction: 
    // Depends on how this is done for the timing: if the timing software only announces that new results are available, simply then start the respective pull function. If the timing software also directly send the results/reaction times with the tcp-message, then we 

}

/**
 * create a tcp client connection and automatically try to reopen it as soon as the connection has failed.
 * Data is merge together until the end sign has arrived (by default carriage retrun / ASCII 13)
 */
export class tcpClientAutoReconnect {


    /**
     * 
     * @param {object} connectionOptions The connection options for the socketClient. See node.js Net.client documentation
     * @param {function} onError callback(Error) called on error (right before the close event will be fired; )
     * @param {function} onClose callback(hadErrors) called after closing 
     * @param {function} onConnect callback() called when tcp connection is established 
     * @param {function} onData callback(data) called for every datapackage, separated by the endCharacter. I.e. data is not equivalent the chunks that arrive. This class will put together all chunks until the endCharacter is found and will send all text up to the endCharacter as data to the callback.   
     * @param {string} endCharacter The endCharacter(s) separating one message form the next. Default: CR carriage return (ASCII 13)
     * @param {integer} retryInterval After which timeout (in ms) it should be tried again to establish a connection. Default: 5000 ms.
     */
    constructor(connectionOptions, onError, onClose, onConnect, onData, endCharacter='\r', retryInterval=5000){

        this.connectionOptions = connectionOptions;
        this.onError = onError;
        this.onClose = onClose;
        this.onConnect = onConnect;
        this.onData = onData;
        this.endCharacter = endCharacter; // default carriage return /ASCII 13
        this.retryInterval = retryInterval; // in ms

        // arrived data:; temporary storage, if data arirves in multiple chunks
        this.tempData = '';

        // at the end, do nto restart the connection 
        this.ending = false;

        this.startConnection();
    }

    startConnection(){
        // create a new connection and set the connect event handler (NOTE: the "ready" event is useless since it is anyway called right after the "connect" event)
        this.connection = Net.createConnection(this.connectionOptions, ()=>{this.onConnect()});
        this.connection.setEncoding('utf8'); // make sure strings are returned and not buffers (this should be fine for the small portions of text that are arriving)

        this.connection.on('close', (hadError)=>{
            this.onClose(hadError);

            // try to recreate the connection (the timeout was already started, if there was an error previously)
            if (!hadError && !this.ending){
                setTimeout(this.startConnection.bind(this), this.retryInterval);
            }
        })

        this.connection.on('data', (chunk)=>{ // chunk should be a string in UTF8
            // first, just add the chunk to the temp data
            this.tempData += chunk;

            // then check if the endCharacter can be found and call the callback for every piece of data
            // recursive function to handle also multiple statements in one chunk
            const processTempData = ()=>{
                let endCharPos = this.tempData.search(this.endCharacter);
                if (endCharPos>=0){
                    this.onData(this.tempData.slice(0,endCharPos));
                    this.tempData = this.tempData.slice(endCharPos + this.endCharacter.length);
                    if (this.tempData.length>0){
                        // recursively check if there is more data in the tempData
                        processTempData();
                    }
                } 
            }
            processTempData();

        })

        this.connection.on('end', ()=>{
            // when the server closes the connection
            // not used currently
        })

        this.connection.on('error', (err)=>{
            // called right before close is called
            this.onError(err);

            // try to recreate the connection
            setTimeout(this.startConnection.bind(this), this.retryInterval);
            
        })

    }

    /**
     * Stop this connection
     */
    close(){
        this.ending = true; // make sure the close event does not result in retrying to start the connection
        this.connection.end();
    }

}

/**
 * open a tcp connection and write everything (connect, error, close, data) to the fileHandles specified
 */
class tcpToFile extends tcpClientAutoReconnect{
    constructor(connectionOptions, name, fileHandles){

        const writer = (data)=>{
            for (let file of fileHandles){
                file.write(data);
            }
        }

        const onError = (err)=>{
            const d = new Date();
            writer(`${d.toISOString()} ${name}, error: ${err}.\n`);
        }
        const onClose = (hadError)=>{
            const d = new Date();
            writer(`${d.toISOString()} ${name}, closed; after error: ${hadError}.\n`);
        }
        const onConnect = ()=>{
            const d = new Date();
            writer(`${d.toISOString()} ${name}, connected.\n`);
        }
        const onData = (data)=>{
            const d = new Date();
            writer(`${d.toISOString()} ${name}, data: ${data}.\n`);
        }

        super(connectionOptions, onError, onClose, onConnect, onData)
    }
} 

/**
 * Log the different 
 */
class ALGElogger {

    static async create(folder, nameAll='all.txt', nameDisplayGaz='displayGaz.txt', nameDisplayDline='displayDline.txt', nameAlgeOutput='algeOutput.txt', nameVersatileExchange='versatileExchange.txt'){
        // since we want to open files async (instead of sync (very bad idea) or with callbacks (old school), we prepare the file handles first and then call the constructor)

        const fileAll = await fs.open(folder + "\\" + nameAll, 'a+');
        const fileDisplayGaz = await fs.open(folder + "\\" + nameDisplayGaz, 'a+');
        const fileDisplayDline = await fs.open(folder + "\\" + nameDisplayDline, 'a+');
        const fileAlgeOutput = await fs.open(folder + "\\" + nameAlgeOutput, 'a+');
        const fileVersatileExchange = await fs.open(folder + "\\" + nameVersatileExchange, 'a+');

        return new ALGElogger(fileAll, fileDisplayGaz, fileDisplayDline, fileAlgeOutput, fileVersatileExchange);
    }

    constructor(fileAll, fileDisplayGaz, fileDisplayDline, fileAlgeOutput, fileVersatileExchange){

        // NOTE: in the test, I activated every possible output in the four configurations !!!

        // ALGE DisplayBoard connection options (see Net.socket.connect)
        let optDisplayGaz = {
            port: 4445,
            host: '192.168.3.101',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }
        let optDisplayDline = {
            port: 4446,
            host: '192.168.3.101',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        // ALGE Output Port
        let optAlgeOutput = {
            port: 4447,
            host: '192.168.3.101',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        // ALGE Versatile Exchange connection options (see Net.socket.connect)
        let optVersatileExchange = {
            port: 4448,
            host: '192.168.3.101',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        // create tcpToFile class for every output
        const oDisplayGaz = new tcpToFile(optDisplayGaz, 'displayGaz__', [fileAll, fileDisplayGaz]); // the underlines are intended to make the string as long as Dline for easier comparison
        const oDisplayDline = new tcpToFile(optDisplayDline, 'displayDline', [fileAll, fileDisplayDline]);
        const oAlgeOutput = new tcpToFile(optAlgeOutput, 'algeOutput', [fileAll, fileAlgeOutput]);
        const oVersatileExchange = new tcpToFile(optVersatileExchange, 'versatileExchange', [fileAll, fileVersatileExchange]);

    }
}
ALGElogger.create('C:\\Users\\Reto\\Documents\\Reto\\Programmieren\\liveAthletics\\Zeitmessung\\Alge Schnittstelle')