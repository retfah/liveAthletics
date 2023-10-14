// formerly this was the sideChannel room. Now it is the room handling the backup and replication stuff, i.e. it holds the configuration for the sideChannel room 


/**  
 * What tokens do we need when:
 * - secondary server initiates the connection to the main server:
 *   - on the main server: a list of tokens of allowed pull servers
 *   - on the secondary server: the token of this server, which is registered on the main server
 * - main server initiates the connection to the secondary server
 *   - on the main server: token of the secondary servers to push to
 *   - on the secondary server: the token of this server, which is registered on the main server
 * --> so it is actually the same for push and pull: the one token  
 * --> IMPORTANT: no token shall be used for multiple connections, i.e. we should not set the token on the main server and register it in all pulling secondary servers! 
*/

import roomServer from './roomServer.js';
import rSideChannelClient from './rSideChannelClient.js';
import rSideChannel from './rSideChannel.js';
import conf from './conf.js'; 
import {spawn} from 'child_process';
//import fs from 'fs';
import { readFile, writeFile, unlink } from 'fs/promises';
import zlib from 'zlib';
import { promisify } from 'util';
const doGZip = promisify(zlib.gzip);
const doGUnzip = promisify(zlib.gunzip);


class rBackup extends roomServer{
    
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, rMeetings, wsManager){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false dynamicRoom=undefined, reportToSideChannel=true)
        super(eventHandler, mongoDb, logger, "backup@" + meetingShortname, true, -1, false, undefined, false); // do not report change to the sideChannel!

        // we need the reference to the meeting room to 
        this.rMeetings = rMeetings;
        this.rSideChannel = undefined; // will be defined later.
        this.meetingShortname = meetingShortname;
        this.wsManager = wsManager; // get connection to other servers

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        // store the connection (roomClient?) to the main server; in that use case, this server shall work as a client; therefore we might use an roomClient instance
        //this.connectionToMain = undefined;

        // after what time shall we retry to connect to the push room, if only conencting to the room fails, but the actual ws connection was successful.
        this.pushRetryTimeout = 15; // in seconds

        this.pullRetryTimeout = 15; // in seconds

        
        // delete all written temp files (during backup and restore) after a certain timeout
        this.deleteFileTimeout = 60 // s

        // keep track of all established connections to push to secondary servers; the info part of this object is identical with the data stored in status.
        this.pushConnections = {}; // property-name=token, object: {connection, info}

        this.data = {
            backup:{}, // to be loaded from MongoDb
            aux: {
                serverName: conf.name,
            },
            status: {

                // entered on the secondary=here;
                // connection to main server
                // entered as client on main server
                // status of data (fullData requested, incremental updates requested, upToDate)
                connectionToMain:{
                    enteredOnSecondary: false, // set in fakeResponseFunc in rSideChannel.wsRequestIncoming
                    connectedToMain: false, // set in rSideChannelClient
                    clientOnMain: false, // set in rSideChannelClient
                    successfulInitialization: false, // this.connected=true in rSideChannelClient; changed when success in rSideChannelClient is called
                },
                
                secondaryPushConnections:{},
                secondaryPullConnections:{} // an object for every secondary server, where the token is the proeprty name; proeprties of the object are 'lastConnected' (for currently not connected secondaries; timestamp when either entred or left), connected:true/false, connection and the token. 
            }
        }; 

        this.ready = false; // as soon as the data is loaded from Mongo, set to true


        // data to be held locally on the room: 
        this.pullConnection = null; // store here the wsConnection if we pull from the server

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.updateBackup = this.updateBackup.bind(this);
        this.functionsReadOnly.createBackup = this.createBackup.bind(this);
        this.functionsWrite.restoreBackup = this.restoreBackup.bind(this);

        this.functionsWrite.secondaryConnected = this.secondaryConnected.bind(this);
        this.functionsWrite.secondaryDisconnected = this.secondaryDisconnected.bind(this);
        this.functionsWrite.statusChanged = this.statusChanged.bind(this);

        this.defaultData = {
            isMain: true,
            token: this.uuidv4(),
            pullFromServer: null,
            secondaryPullServers:[],
            secondaryPushServers:[],
        }

        const schemaBackup = {
            type:'object',
            properties:{
                isMain: {type:'boolean', default:true},
                token: {type:'string'},
                // the connection and token details where this secondary server shall pul from 
                pullFromServer: {
                    type:['object', 'null'], // null if the server does not pull
                    properties:{
                        host: {type:'string'},
                        port: {type:'integer'},
                        path: {type:'string', default:'/ws'}, // currently this is not variied. 
                        secure: {type:'boolean', default:true},
                        shortname: {type:'string'}, // shortname on the main server
                        // not token here!
                    },
                    required:['host', 'port', 'path', 'secure', 'shortname'],
                    additionalProperties: false,
                },
                // list of tokens of secondary servers that are allowed to pull from this server
                secondaryPullServers:{
                    type:'array',
                    items: {
                        type: 'object',
                        properties: {
                            token:{type:"string"},
                            name:{type:"string", default:''},
                        },
                        required:['token'],
                        additionalProperties: false,
                    },
                },
                // list of connections and tokens this server shall push changes to.
                secondaryPushServers: {
                    type:'array',
                    items: {
                        type:'object',
                        properties:{
                            host: {type:'string'},
                            port: {type:'integer'},
                            path: {type:'string', default:'/ws'}, // currently this is not variied. 
                            secure: {type:'boolean', default:true},
                            token: {type:'string'}, // the token used to prove to the secondary server that this server is allowed to push.
                            shortname: {type:'string'},
                            name: {type:'string', default:''},
                        },
                        required:['host', 'port', 'path', 'secure', 'token', 'shortname'],
                        additionalProperties: false,
                    },
                },
            },
            required:['isMain', 'token', 'pullFromServer', 'secondaryPullServers', 'secondaryPushServers'],
            additionalProperties: false,
        }

        const schemaCreateBackup={
            type:"object",
            properties:{
                backupSideChannelConfiguration: {type:"boolean"},
                backupSideChannelData: {type:"boolean"},
            },
            required: ["backupSideChannelData", "backupSideChannelConfiguration"],
            additionalProperties: false,
        }
        
        const schemaBackupObject = {
            type:"object",
            properties:{
                version: {type:["number", "string"]},
                versionSql: {type:["number", "string"]},
                sql: {type:"string"}, // actually a Buffer
                mongo: {type:"string"}, // actually a Buffer
                oldMongoDbName: {type:"string"}
            },
            required: ["version", "versionSql", "sql", "mongo", "oldMongoDbName"],
            additionalProperties: false,
        }

        const schemaRestore = {
            type:"object",
            properties: {
                backup: {"anyOf":[
                    {type: "string"},
                    schemaBackupObject
                ]}, // or object! TODO
                restoreSideChannelData: {type:"boolean"},
                restoreSideChannelConfiguration: {type:"boolean"},
            },
            required: ["backup", "restoreSideChannelData", "restoreSideChannelConfiguration"]
        }

        this.validateBackup = this.ajv.compile(schemaBackup);
        this.validateCreateBackup = this.ajv.compile(schemaCreateBackup);
        this.validateRestore = this.ajv.compile(schemaRestore);
        this.validateBackupObject = this.ajv.compile(schemaBackupObject);
    }

    /**
     * Called as soon this.collection is set, i.e. when the collection of this room is ready.
     * Overrides the empty parent
     */
    async onMongoConnected(){
    
        // try to get the backup document:
        let data = {};
        /*let cursor = this.collection.find({type:'backup'});
        let len = await cursor.count(); */ // deprecated 2022-05
        let len = await this.collection.countDocuments({type:'backup'});
        if (len==0){

            // create the document
            await this.collection.updateOne({type:'backup'},{$set:{backup: this.defaultData}},{upsert:true}) //update with upsert=insert when not exists
            data = this.defaultData;

        } else if (len>1){
            this.logger.log(10, `Cannot initialize rBackup for shortname=${this.meetingShortname} since there is more than one mongo document.`)
            return;
        } else {
            let cursor = this.collection.find({type:'backup'});
            let raw = await cursor.next();
            data = raw.backup;
        }

        this.data.backup = data;

        // if this is a secondary server at the moment, notify all other rooms about this to not provide any writingTickets.
        if (!data.isMain){
            // since the rooms are started in main-mode, nothing is needed when this is correct
            this.updateRoomMode(data.isMain);
        }

        this.ready = true;

        // start everything up when rSideChannel is ready too
        if (this.rSideChannel.ready){
            this.startItUp();
        } else {
            let listenerName = `${this.name}SCready`;
            this.eH.eventSubscribe(`${this.rSideChannel.name}:ready`, ()=>{
                this.startItUp();
                this.eH.eventUnsubscribe(`${this.rSideChannel.name}:ready`, listenerName);
            }, listenerName)
        }

    }

    /**
     * Called after a secondary server connected to the sideChannel
     * data contains:
     * @param {string} tabId 
     * @param {string} datasetName 
     * @param {any} enterOptions {token, meetingShortnameClient}
     * @param {object} session
     */
    async secondaryConnected(data){

        let token = data.enterOptions.token;

        // was it the main room entering this room for broadcast?
        if (this.data.backup.token == token){
            this.data.status.connectionToMain.enteredOnSecondary = true; // main has entered here successfully
        }
        
        // find whether this is a push or pull client and update the information there
        if (this.data.backup.secondaryPullServers.find(sps => sps.token == token) != undefined){
            this.data.status.secondaryPullConnections[token].connected=true;
            this.data.status.secondaryPullConnections[token].lastConnected = new Date();
        }

        // the same for push servers
        if (this.data.backup.secondaryPushServers.find(sps => sps.token == token) != undefined){
            this.data.status.secondaryPushConnections[token].connected=true;
            this.data.status.secondaryPushConnections[token].lastConnected = new Date();
        }

        // return broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateStatus', data: this.data.status},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, // not relevant
            preventBroadcastToCaller: true
        };

        return ret;
    }
        
    /**
     * Called after a secondary server disconnected from the sideChannel
     * data contains:
     * @param {string} tabId 
     * @param {string} datasetName 
     * @param {any} enterOptions {token, meetingShortnameClient}
     * @param {object} session 
     */
    async secondaryDisconnected(data){

        let token = data.enterOptions.token;

        // was it the main server leaving this room ?
        if (this.data.backup.token == token){
            this.data.status.connectionToMain.enteredOnSecondary = false; 
        }

        // find whether this is a push or pull client and update the information there
        if (this.data.backup.secondaryPullServers.find(sps => sps.token == token) != undefined){
            this.data.status.secondaryPullConnections[token].connected=false;
            this.data.status.secondaryPullConnections[token].lastConnected = new Date();
        }

        // the same for push servers
        if (this.data.backup.secondaryPushServers.find(sps => sps.token == token) != undefined){
            this.data.status.secondaryPushConnections[token].connected=false;
            this.data.status.secondaryPushConnections[token].lastConnected = new Date();
        }

        // return broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateStatus', data: this.data.status},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, // not relevant
            preventBroadcastToCaller: true
        };

        return ret;
    }



    /**
     * Make sure that after this function is run, all configured connections in "backup" have their status part in "status" set. If a connection is not available, try to create it; if a token/connection was deleted from the list (i.e. has no rights to get the secondary information anymore) but exists, make sure the connection is closed.
     * NOTE: This function is not only called on startup, but also on every updateBackup.
     */
    async startItUp(){
        // when we change from pull-secondary to main OR from secondary getting pushed to to main, then end this connection properly
                // TODO: as a secondary server: when the server is changed from secondary to main, make sure the old connection to main is stopped. --> this would happen automatically when we decide to restart all rooms when this change occurs (e.g. because we need to set whether rooms have writing rights or not) 
        await this.stopPush(); // if this WAS a secondary server receiving push messages, stop the current push connection

        // get changes from another server to this server
        let p1 = this.startStopPull(); // as a secondary server: try to connect to main server when in pull mode or stop an existing pull connection when not in pull mode

        // push changes on this server to others
        let p2 = this.startStopPush(); // as a main server: try to push to all registered secondary servers
        let p3 = this.revisePullTokens(); // as a main server: make sure, only allowed servers are listening

        await Promise.all([p1, p2, p3]);

        // send new status data to all clients
        this.serverFuncWrite('statusChanged',undefined).catch(()=>{});


        /**
         * All possible from to states:
         * TODO: which of those changes is handled where? Answer every question for main and secondary server!
         * TODO: finally check all those changes, whether the server does not crash and can reconnect in another state
         * - main --> sec. pull         (nothing to do on main), startStopPull (on secondary)
         * - main --> sec. push         (nothing to do on main), (nothing to do on secondary)
         * - sec. pull --> sec. push    (nothing to do on main), startStopPull (on secondary)
         * - sec. pull --> main:        (nothing to do on main), startStopPull (on secondary)
         * - sec. push --> sec. pull:   (nothing to do on main), stopPush (on secondary)
         * - sec. push --> main:        (nothing to do on main), stopPush (on secondary)
         * - sec. push changed:         startStopPush (on main), (nothing to do on secondary)
         * - sec. pull changed:         (nothing to do on main), startStopPull (on secondary)
         */
    }

    // stop !receiving! push messages from a main server.
    async stopPush(){
        // if this was a secondary server in push mode and is not anymore, then stop the old connection
        // how to detect that there was a push connection? This.pullConnection is still undefined, but there is a sideChannelClient (i.e. connectionToMain is defined); 
        if ((!this.pullConnection && this.rSideChannel.connectionToMain) && (this.data.backup.pullFromServer || this.data.backup.isMain)){

            // make the main server leave here (on the secondary)
            this.rSideChannel.leaveNote(this.rSideChannel.connectionToMain.wsHandler.tabId);

            // make the client leave the "fake entering" on this server
            if (this.rSideChannel?.connectionToMain?.connected){
                this.rSideChannel.connectionToMain.leave();
                this.rSideChannel.connectionToMain = undefined;
            }

            // update status
            this.resetStatusConnectionToMain();

            // unregister events 
            // there is (probably) no need to unregister any events here, since the only registered events are the events of roomServer / roomClient (which then call sideChannel.clientLeft, which then calls rBackup.secondaryDisconnected)
            
        }

    }

    resetStatusConnectionToMain(){

        let CTM = this.data.status.connectionToMain;
        CTM.enteredOnSecondary = false; // set in fakeResponseFunc in rSideChannel.wsRequestIncoming
        CTM.connectedToMain = false; // set in rSideChannelClient
        CTM.clientOnMain = false; // set in rSideChannelClient
        CTM.successfulInitialization = false; // this.connected=true in rSideChannelClient; changed when success in rSideChannelClient is called

        this.serverFuncWrite('statusChanged',undefined).catch(()=>{});

    }

    // create the rSideChannel client when this is a secondary server. It will retry to connect until it succeeds the first time.
    setupSecondary(connection, shortname, succCB2=()=>{}, failCB2=(value, code)=>{}){

        // create a side channel once, and if connecting fails, try to connect it again until conenctionToMain is changed (e.g. because the connection was closed or some property has changed)

        let ctm; // connection to main; neded here tho reference it in the failure cb.

        let succCB = ()=>{

            // now, try to "fake"-enter the side channel locally, to make sure the data arriving to rSideChannel directly will be processed.

            let fakeSession = {};

            let fakeResponseFunc = (value, code)=>{
                // If everything else is correctly programmed (e.g. when the connection is lost the server leaves properly and gives back the writing ticket.), then entering should always work.
                this.logger.log(95, `sideChannel "fake-entered" (i.e. the main server was entered as a client, but he actually never asked for this. It is needed, because any messages from main to secondary go directly to the sideChannelSeverRoom and not to rSideChannelClient.); resulted in value ${JSON.stringify(value)} and code ${code}.` );

                if (code==0){
                    // on success, return true;
                    this.logger.log(95, `Main server successfully registered as writing client on the secondary server`)

                    this.data.status.connectionToMain.enteredOnSecondary = true;
                    this.serverFuncWrite('statusChanged',undefined).catch(()=>{});
                    succCB2();

                } else {
                    this.logger.log(50, `Main server could not be registered as writing client on the secondary server. ${code}: ${JSON.stringify(value)}`)
                    failCB2(value, code);
                }
            }

            this.rSideChannel.enter(connection.tabId, connection.wsProcessor, fakeResponseFunc, {writing:true, failOnWritingDeclined: true, ID:this.rSideChannel.ID, enterOptions:{token: this.data.backup.token}}, fakeSession);

        }
        
        let failureCB = ()=>{
            // on failure try again after a timeout:
            setTimeout(()=>{
                if (ctm==this.rSideChannel.connectionToMain){
                    ctm.connect(false, succCB, failureCB)
                }
                // if the connctionToMain has changed, it will simply stop here and no further timeout will be called. 
            },1000*this.pullRetryTimeout);
        }
        
        ctm = new rSideChannelClient(connection, this.eH, shortname, this.meetingShortname, this.logger, this.rSideChannel, this.data.backup.token, succCB, failureCB); 
        this.rSideChannel.connectionToMain = ctm;

    }

    // end the pull connection; is callsed either when we do not push anymore or when the room is closed
    endPull(){
        let SC = this.pullConnection;
            
        // make the client leave on the main server
        if (this.rSideChannel?.connectionToMain?.connected){
            this.rSideChannel.connectionToMain.leave();
            this.rSideChannel.connectionToMain = undefined;
        }

        // close the connection when no other meeting is using it
        this.wsManager.returnConnection(this.meetingShortname, SC.host, SC.port, SC.path, SC.secure);

        // unsubscribe from the connection-events:
        this.unsubscribeEventsForTabId(SC.connection.tabId);
        
        // reset it, to let the next part know to create a new connection
        this.pullConnection = null;

        // update status.connectionToMain
        this.resetStatusConnectionToMain();

    }

    // as a secondary server: try to connect to main server when in pull mode or stop an existing pull connection when not in pull mode anymore
    async startStopPull(){

        // if there is a connection that needs to be stopped now (because the server is main now or is not pulling anymore or the connection-setup has changed)
        if (this.pullConnection != null && (this.data.backup.isMain || this.data.backup.pullFromServer == null || this.pullConnection.host != this.data.backup.pullFromServer.host || this.pullConnection.port != this.data.backup.pullFromServer.port || this.pullConnection.path != this.data.backup.pullFromServer.path || this.pullConnection.secure != this.data.backup.pullFromServer.secure)){


        }

        // check whether this is a pullServer and no pullConnection exists yet
        if (!this.data.backup.isMain && this.data.backup.pullFromServer != null && this.pullConnection == null){

            this.pullConnection = {
                info: {
                    token: this.data.backup.token,
                    lastConnected: undefined,
                    connected: false,
                    status: 0, // 0) no connection; 1) ws-connection established; 2) tabIdReported; 3) 'connectToMainServer' returned succeess; -1): failure: connection established, but sideChannel room failed to answer (e.g. because is in main mode or not ready -> automatic retry to conenct)
                    lastError: '', // store here the last error that occured
                },
                connection: undefined,
                // repeat here the configuration, since it is needed to tell the wsManager that the connection to XY is not needed by this room anymore
                host: this.data.backup.pullFromServer.host,
                port: this.data.backup.pullFromServer.port,
                path: this.data.backup.pullFromServer.path,
                secure: this.data.backup.pullFromServer.secure,

            }

            // try to start a connection
            let conn = this.wsManager.getConnection(this.meetingShortname, this.data.backup.pullFromServer.host, this.data.backup.pullFromServer.port, this.data.backup.pullFromServer.path, this.data.backup.pullFromServer.secure);
            this.pullConnection.connection = conn; // type: websocketServer2Server; this is NOT a wsExtension instance

            // when the wsConnection is successfully established, enter the main server as a writing client and enter the same room on the main server.
            let connectRoom = ()=>{

                this.data.status.connectionToMain.connectedToMain = true;
                this.serverFuncWrite('statusChanged',undefined).catch(()=>{});

                // enter the room here

                /*let fakeResponseFunc = (value, code)=>{
                    // If everything else is correctly programmed (e.g. when the connection is lost the server leaves properly and gives back the writing ticket.), then entering should always work.
                    this.logger.log(95, `sideChannel "fake-entered"; resulted in value ${JSON.stringify(value)} and code ${code}.` );
    
                    if (code==0){
                        // on success, return true;
                        this.logger.log(95, `Main server successfully registered as writing client on the secondary server`)
    
                        this.data.status.connectionToMain.enteredOnSecondary = true;
                        this.serverFuncWrite('statusChanged',undefined).catch(()=>{});
    
                    } else {
                        this.logger.log(50, `Main server could not be registered as writing client on the secondary server. ${code}: ${JSON.stringify(value)}`)
                    }
                }

                // enter the room here
                this.enterSideChannel(conn, fakeResponseFunc)*/

                // then create a rSideChannelClient, and fake enter on this server (secondary)
                this.setupSecondary(conn, this.data.backup.pullFromServer.shortname);
                
            }

            // if the connection is lost, the wsManager and wsServer2Sever, respectively, will try to reconnect; listen to those events to instantly reconnect the sideChannel-rooms
            this.eH.eventSubscribe(`TabIdSet/${conn.tabId}`, connectRoom, `sideChannel:${this.meetingShortname}`); // we use the shortname of the meeting as an identifier for the eventHandler 

            //this.eH.eventSubscribe(`wsConnected/${conn.tabId}`, ()=>{this.data.status.connectionToMain.connectedToMain = true;}, `sideChannel:${this.meetingShortname}`);

            this.eH.eventSubscribe(`wsClosed/${conn.tabId}`, ()=>{
                // not a lot to do when the connection was closed, since we are already waiting for the reconnect
                // simply reset the status 
                this.data.status.connectionToMain.connectedToMain = false;
                this.serverFuncWrite('statusChanged',undefined).catch(()=>{});

                // do NOT unsubscribe the events, they stay the same as long as the conneciton stays the same!
                
            }, `sideChannel:${this.meetingShortname}`);

            // if the connection is already established and the tabId is reported, we call on connectRoom now.
            if (conn.connected){
                this.data.status.connectionToMain.connectedToMain = true;
                if (conn.tabIdReported){
                    connectRoom(); // also sets status =2
                }
            }
            
        }
    }

    unsubscribeEventsForTabId(tabId){
        this.eH.eventUnsubscribe(`wsConnected/${tabId}`, `sideChannel:${this.meetingShortname}`);
        this.eH.eventUnsubscribe(`TabIdSet/${tabId}`, `sideChannel:${this.meetingShortname}`);
        this.eH.eventUnsubscribe(`wsClosed/${tabId}`, `sideChannel:${this.meetingShortname}`);
    }

    async statusChanged(noData){
        // simply broadcast the already changed data to all listening clients
        // only used internally with
        //this.serverFuncWrite('statusChanged',undefined).catch(()=>{});

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'statusChanged', data: this.data.status},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret;
    }

    // end the pull connection with the given token; is callsed either when we do not push anymore or when the room is closed
    endPush(pushToken){
        let SC = this.pushConnections[pushToken];

        // if the client was still trying to connect the room, stop it now.
        clearTimeout(SC.roomConnectTimeout);

        // let the client know that he will be left by the main server
        let sendData = {arg: 'leaveFromMain', roomName: "sideChannel@" + SC.shortname, opt:{shortname: this.meetingShortname, token:pushToken}}; 
        SC.connection.emitNote("room", sendData)

        // The tabId is defined here on the main server when opneing the websocketServer2Server connection, but is also used by rSideChannelClient to register here on the main server.
        // we kick the client out and do not wait for the "friendly leave"
        this.rSideChannel.leaveNote(SC.connection.tabId);

        // close the connection when no other meeting is using it
        this.wsManager.returnConnection(this.meetingShortname, SC.host, SC.port, SC.path, SC.secure)

        // unsubscribe from the connection-events:
        this.unsubscribeEventsForTabId(SC.connection.tabId);
        
        // delete the token
        delete this.pushConnections[pushToken];
        delete this.data.status.secondaryPushConnections[pushToken];
        
        this.serverFuncWrite('statusChanged',undefined).catch(()=>{});
    }

    /**
     * startStopPushServers; to be called when the backup data has changed. Automatically stops pushing to clients that are not in the list anymore and connects to clients that newly should receive changes as a push.
     */
    async startStopPush(){
        // first check whether the previous push servers still exist after an eventual configuration change:
        for (let pushToken in this.data.status.secondaryPushConnections){
            if (this.data.backup.secondaryPushServers.findIndex(el=>el.token==pushToken)==-1){
                // token was deleted by the user --> stop the connection and delete the token

                this.endPush(pushToken);
            }
        }

        // now make sure that every token in the data exists in status; if not, add it
        for (let pushServer of this.data.backup.secondaryPushServers){

            if (!(pushServer.token in this.data.status.secondaryPushConnections)){

                this.logger.log(92, `Create push connection for token ${pushServer.token}.`);

                // create the object for the status etc
                let sideChannel = {
                    info:{
                        token: pushServer.token,
                        lastConnected: undefined,
                        connected: false,
                        status: 0, // 0) no connection; 1) ws-connection established; 2) tabIdReported; 3) 'connectToMainServer' returned succeess; -1): failure: connection established, but sideChannel roomed failed to answer (e.g. because is in main mode or not ready -> automatic retry to conenct)
                        lastError: '', // store here the last error that occured
                    },
                    connection: undefined,
                    roomConnectTimeout: undefined, // the timeout when the room-connection fails. Thi is needed to make sure that on a change we stop trying to connect to the old room
                    // repeat here the configuration, since it is needed to tell the wsManager that the connection to XY is not needed by this room anymore
                    host: pushServer.host,
                    port: pushServer.port,
                    path: pushServer.path,
                    secure: pushServer.secure,
                    shortname: pushServer.shortname, // needed when being left from the main server
                }

                this.data.status.secondaryPushConnections[pushServer.token] = sideChannel.info;

                this.pushConnections[pushServer.token] = sideChannel;

                // start the connection
                let conn = this.wsManager.getConnection(this.meetingShortname, pushServer.host, pushServer.port, pushServer.path, pushServer.secure);
                sideChannel.connection = conn; // type: websocketServer2Server; this is NOT a wsExtenions instance
            
                // the events raised by the connection are as follows:
                // - `wsConnected/${this.tabId}`
                // - `TabIdSet/${this.tabId}`
                // - `wsClosed/${this.tabId}`

                // prepare a function that shall be called whenever the connection is (re-)established, which then sends a note to the client so that the client will 
                let connectRoom = ()=>{

                    this.logger.log(92, `wsConnection for tabId ${conn.tabId} and token ${pushServer.token} is connected and TabId reported. Sending 'connectToMainServer' to the secondary`);

                    sideChannel.info.status = 2;

                    // use the shortname on the secondary server and give it 
                    let sendData = {arg: 'connectToMainServer', roomName: "sideChannel@" + pushServer.shortname, opt:{shortname: this.meetingShortname, token:pushServer.token}}; 

                    let success = (response)=>{
                        // need to do something here? I think the secondary server  initiates the rest.
                        // the response should be true;
                        if (response==true){
                            sideChannel.info.status = 3;

                            // broadcast the statusChange
                            this.serverFuncWrite('statusChanged',undefined).catch(()=>{});

                            this.logger.log(92, `sideChannel for tabId ${conn.tabId} and token ${pushServer.token} successfully connected.`);
                        }
                    };
                    let failure = (errCode, errMsg)=>{

                        // there was an error in sending the request to the sideChannel room of the secondary server. This could happen when the called server was in main mode or is not ready yet. Automatically retry after a certain timeout

                        sideChannel.info.status = -1;
                        sideChannel.info.connected = false;
                        //if (errCode!=22){ // always retry; it could be that the secondary (thinks it) is still connected to this main server, but simply needs some more time until the connection is deemed failed. After that point, reconnecting should work
                            sideChannel.roomConnectTimeout = setTimeout(connectRoom, 1000*this.pushRetryTimeout);
                        //}
                        
                        let errMsg2 = `Could not connect the side channel to ${pushServer.host}:${pushServer.port}/${pushServer.path}/${pushServer.secure.toString()}. Code: ${errCode}. Message: ${errMsg}`;

                        this.logger.log(10, errMsg2);

                        sideChannel.info.lastError = errMsg2;

                        
                        // broadcast the statusChange
                        this.serverFuncWrite('statusChanged',undefined).catch(()=>{});

                    };
                    let opt = {}; // no special options at the moment

                    conn.emitRequest("room", sendData, success, failure, opt)
                    
                }

                // if the connection is lost, the wsManager and wsServer2Sever, respectively, will try to reconnect; listen to those events to instantly reconnect the sideChannel-rooms
                this.eH.eventSubscribe(`TabIdSet/${conn.tabId}`, connectRoom, `sideChannel:${this.meetingShortname}`); // we use the shortname of the meeting as an identifier for the eventHandler 

                this.eH.eventSubscribe(`wsConnected/${conn.tabId}`, ()=>{

                    this.logger.log(92, `wsConnection for tabId ${conn.tabId} and token ${pushServer.token} is connected. TabId to be reported.`);

                    sideChannel.info.status=1;
                    // broadcast the statusChange
                    this.serverFuncWrite('statusChanged',undefined).catch(()=>{});
                }, `sideChannel:${this.meetingShortname}`);

                this.eH.eventSubscribe(`wsClosed/${conn.tabId}`, ()=>{
                    // not a lot to do when the connection was closed, since we are already waiting for the reconnect

                    // if the client was still trying to connect the room, stop it now.
                    clearTimeout(sideChannel.roomConnectTimeout);

                    // since the wsManager retries to connect, only send statusChanged when it really changes
                    if (sideChannel.info.status!=0){
                        this.logger.log(92, `Client with tabId ${conn.tabId} and token ${pushServer.token} was disconnected.`);
                        // simply reset the status to unconnected/0
                        sideChannel.info.status = 0;
                        sideChannel.info.connected = false;
                        // broadcast the statusChange
                        this.serverFuncWrite('statusChanged',undefined).catch(()=>{});
                    } 

                    // do NOT unsubscribe the events, they stay the same as long as the conneciton stays the same!


                }, `sideChannel:${this.meetingShortname}`);

                // if the connection is already established and the tabId is reported, we call on connectRoom now.
                if (conn.connected){
                    sideChannel.info.status = 1;
                    // broadcast the statusChange
                    this.serverFuncWrite('statusChanged',undefined).catch(()=>{});
                    if (conn.tabIdReported){
                        connectRoom(); // also sets status =2
                    }
                }
            }
        }

    }

    /**
     * Check if new tokens were added to the list of tokens or were deleted
     */
    async revisePullTokens(){
        // first check whether the previous tokens still exist after an eventual configuration change:
        for (let pullToken in this.data.status.secondaryPullConnections){
            if (this.data.backup.secondaryPullServers.findIndex(el=>el.token==pullToken)==-1){
                // token was deleted by the used --> stop the connection and delete the token
                
                // TODO
                //this.data.status.secondaryPullConnections[pullToken].connection."end"
                
                // delete the token
                delete this.data.status.secondaryPullConnections[pullToken];
            }
        }

        // now make sure that every token in the data exists in status; if not, add it
        for (let pullServer of this.data.backup.secondaryPullServers){
            if (!(pullServer.token in this.data.status.secondaryPullConnections)){
                this.data.status.secondaryPullConnections[pullServer.token] = {
                    token: pullServer.token,
                    lastConnected: undefined,
                    connected: false,
                    connection: undefined,
                }
            }
        }

    }

    async updateBackup(data){
        if (!this.validateBackup(data)){
            throw {code: 21, message: `The sent data is not valid: ${this.ajv.errorsText(this.validateBackup.errors)}.`}
        }

        let oldData = this.data.backup; 

        // store the data to DB
        try {
            await this.collection.updateOne({type:'backup'}, {$set:{backup: data}})
        } catch (e){
            let msg = `Could not update backup in MongoDB: ${e}`;
            this.logger.log(20, msg)
            throw {code: 23, message: msg};
        }

        // if all was ok, store the new validator and the data
        this.data.backup = data;

        // If it is the change from sec/main, then also restart the rooms to make sure that all rooms can now have writing clients. And vice versa.
        if ((oldData.isMain && !data.isMain) || (!oldData.isMain && data.isMain)){
            // notify all rooms (except sideChannel and this room) about the fact that this is now a main/secondary server.
            this.updateRoomMode(data.isMain);

            // If the mode is changed from secondary to main OR if the mode is changed from push to pull or vice versa, stop the possible "connectionToMain" in rSideChannel and "exit"/close the current writing client. 
            // TODO
        }

        // apply the changes in the side channels, e.g. open a connection to added push servers, stop removed connections, etc.
        this.startItUp();

        // return broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateBackup', data: data},
            undoObj: {funcName: 'updateBackup', data: oldData, ID: this.ID},
            response: data, 
            preventBroadcastToCaller: true
        };

        return ret;

    }

    /**
     * Set in all rooms (except rBackup and rSideChannel), whether this meeting is in main or secondary mode to reset the writing tickets to zero.
     * @param {boolean} isMain set in all client, whether this room is a main or secondary room. 
     */
    updateRoomMode(isMain){
        for (const roomName in this.rMeetings.activeMeetings[this.meetingShortname].rooms){
            if (roomName != 'backup' && roomName != 'sideChannel'){
                this.rMeetings.activeMeetings[this.meetingShortname].rooms[roomName]._changeMode(!isMain);
            }
        }
    }

    // excludeSideChannel when the backup is to be restored on a secondary server
    async _mongoDump(pathMongo, excludeSideChannel=false){

        // Backup MongoDB
        // TODO: add UN (-u) and PW (-p)
        // out can be "-", which is stdout!
        // --gzip
        // -out or --archive ? Archive creates one file, while -out is actually a folder structure, replicating DB/collection/...
        // for out we need to arguments --out "file"
        // for archive it is just one: "--archive=file"

        var args = ['--host', `${conf.databaseMongo.host}:${conf.databaseMongo.port}` , '--db='+this.rMeetings.getDbNameMongo(this.meetingShortname), '--archive='+pathMongo, '--gzip', '--excludeCollection=backup'] 
        if (excludeSideChannel){
            args.push('--excludeCollection=sideChannel');
        }
        let mongoDumpProm = new Promise((resolve, reject)=>{
            var mongodump = spawn('mongodump', args);
            mongodump.stdout.on('data', (data)=>{
                this.logger.log(98,'stdout: ' + data);
            });
            mongodump.stderr.on('data', (data)=>{
                this.logger.log(98,'stderr: ' + data);
            });
            mongodump.on('exit', (code)=>{
                console.log('mongodump exited with code ' + code);
                if (code==0){
                    this.logger.log(96, 'Successful Mongo dump')
                    resolve();
                }else {
                    reject();
                }
            });
        })

        return mongoDumpProm;
    }

    async _sqlDump(pathSql){
        // Backup SQL
        var args = ['--port', conf.database.port, '--host', conf.database.host, `--password=${conf.database.password}`, `--user=${conf.database.username}`, this.rMeetings.getDbNameSql(this.meetingShortname), "--result-file="+pathSql]
        let mysqlDumpProm = new Promise((resolve, reject)=>{
            var mysqldump = spawn(conf.database.pathToDumpScript, args)
            mysqldump.stdout.on('data', (data)=>{
                console.log('mysqldump stdout: ' + data);
            });
            mysqldump.stderr.on('data', (data)=>{
                console.log('mysqldump stderr: ' + data);
            });
            mysqldump.on('exit', (code)=>{
                console.log('mysqldump exited with code ' + code);
                if (code==0){
                    this.logger.log(96, 'Successful SQL dump')
                    resolve();
                } else {
                    reject();
                }
            });
        })

        return mysqlDumpProm;
    }

    /**
     * TODO: 
     * The backup and/or restore process must be able to not update the data in the side channel room or at least not the configuration. Eventually we can handle this on restore.
     * The export shall always exclude the content of the backup-mongoDb, or at least the typical four room documents "stack", "ID", "writingTickets", "offlineWritingClients". However, on request, the backup might include separately (1) the configuration part ("backup" document; ATTENTION: contains confidential tokens!) (2) the stack of changes.  
     */

    async createBackup(data){

        if (!this.validateCreateBackup(data)){
            throw {code: 21, message: `The sent data is not valid: ${this.ajv.errorsText(this.validateCreateBackup.errors)}.`}
        }

        // the files that are written and read here must not interefer with each other. Make that sure by applying the current date/time and a random string to the file name. (The date/time is only used in debug mode.)
        let randStringExtension
        if (false){ // formerly: developMode (problem: path migh be too long on windows)
            let d = new Date();
            randStringExtension = `${d.toJSON().replace(/:/g, '-')}${this.randomStr(4)}`; // cannot have : in file name
        } else {
            randStringExtension = this.randomStr(10);
        }

        // Backup MongoDB
        let pathMongo = `./temp/mongodump${randStringExtension}.gz`;
        let mongoDumpProm = this._mongoDump(pathMongo, !data.backupSideChannelData).catch();

        // Backup SQL
        let pathSql = `./temp/mysqldump${randStringExtension}.sql`;
        let mysqlDumpProm = this._sqlDump(pathSql).catch();

        // create a function that deletes all temporary stored files. (To be called after a certain timeout.)
        let deleteTempFiles = ()=>{
            let pathes = [pathMongo, pathSql];
            for (let path of pathes){
                unlink(path).catch();
            }
        } 

        await Promise.all([mongoDumpProm, mysqlDumpProm]).then(()=>{this.logger.log(95, 'Successful SQL and Mongo dumps')}).catch((err)=>{
            throw {code: 22, message:`Creating SQL or Mongodump failed: ${err}`};
        })

        // now, read the files, create a gzip of the sql data to reduce the file size, merge it to the backup object and send it
        // read files
        let fileSql = await readFile(pathSql); // return a buffer

        // gzip the sql data
        let fileSqlZipped = await doGZip(fileSql);
        let dataSentSql = JSON.stringify(fileSqlZipped);

        let fileMongo = await readFile(pathMongo);
        let dataSentMongo = JSON.stringify(fileMongo);

        let backup = {
            version: conf.version,
            versionSql: conf.database.version,
            sql: dataSentSql,
            mongo: dataSentMongo,
            oldMongoDbName: this.rMeetings.getDbNameMongo(this.meetingShortname), // needed since we should not use the --db option anymore (2022) (and should use --nsFrom / --nsTo) 
        };

        // backup "sideChannel" document and in the future the stack of changes manually on request and add it to the stored object
        if (data.backupSideChannelData){
            // probably this is handled already by excluding the side channel from mongoDB, since all sideCHannel data is stored in MongoDb at the moment (2022-07)
        }
        if (data.backupSideChannelConfiguration){
            backup.sideChannel = this.data.sideChannel;
        }
        // never store the 4 Mongo documents of roomServer!

        setTimeout(deleteTempFiles, this.deleteFileTimeout*1000);

        return backup;

    }

    async _mongoRestore(pathMongo, fromDbName){

        // Restore MongoDB
        // TODO: add UN (-u) and PW (-p)
        // out can be "-", which is stdout!
        // --gzip
        // --drop deletes all collections before they are reinserted. It does not delete unaffected collections (e.g. the backup)


        var args = ['--host', `${conf.databaseMongo.host}:${conf.databaseMongo.port}` , '--drop', '--archive='+pathMongo, '--gzip', '--nsFrom='+fromDbName+'.*', `--nsTo=${this.rMeetings.getDbNameMongo(this.meetingShortname)}.*`] 
        let mongorestoreProm = new Promise((resolve, reject)=>{
            var mongorestore = spawn('mongorestore', args);
            mongorestore.stdout.on('data', (data)=>{
                console.log('restore stdout: ' + data);
            });
            mongorestore.stderr.on('data', (data)=>{
                console.log('restore stderr: ' + data);
            });
            mongorestore.on('exit', (code)=>{
                console.log('mongorestore exited with code ' + code);
                if (code==0){
                    this.logger.log(99, 'Successful Mongo restore')
                    resolve();
                }else {
                    reject();
                }
            });
        })

        return mongorestoreProm;
    }

    // TODO: if this is a secondary server, make sure that all rooms are set to secondary mode after restoring!!!
    async restoreBackup(data){

        if (!this.validateRestore(data)){
            throw {code: 21, message: `The sent data is not valid: ${this.ajv.errorsText(this.validateRestore.errors)}.`}
        }

        // TODO: also add option to include to update data and configuration fo the backup (if it is included in the backup)
        
        // most of the work must be done within rMeetings probably:
        // 0. check version of the backup, whether it is compatible with the server!
        // 0. check data for completeness
        // 0. make sure an erronous data will not kill the whole server! --> ideally we can revert to the old data
        // 1. shut down all rooms of the respective meeting, except the backup (i.e. this one)
        // 2. replace both DBs
        // 3. delte all unnecessarily inserted writingTickets / offlienWritingClients
        // 3. start the rooms again
        // 4. delete all writingTickets and offlienClients, which were received from the backup (actually it should better be avoided to have this data in the backup, but at the moment (2022-01) we cannot filter documents in collections, when we dump the full DB. Additionally, this could also be a feature for server take over.)
        let backupObj
        if (typeof (data.backup)=="string"){
            backupObj = JSON.parse(data.backup);
            if (!this.validateBackupObject(backupObj)){
                throw {code: 28, message: `The received backup-object does nto fulfill the schema: ${this.ajv.errorsText(this.validateBackupObject.errors)}.`}
            }
        } else {
            // is already validated
            backupObj = data.backup;
        }

        if (backupObj.version > conf.version || backupObj.version < conf.versionMinForRestore || backupObj.versionSql> conf.database.version || backupObj.versionSql < conf.database.versionMinForRestore){
            throw {message: 'The backup cannot be restored, because the version of the backup is not compatible with the installed version.', code: 22}
        }

        // the files that are written and read here must not interefer with each other. Make that sure by applying the current date/time and a random string to the file name. (The date/time is only used in debug mode.)
        let randStringExtension
        if (false){ // formerly: developMode (problem: path migh be too long on windows)
            let d = new Date();
            randStringExtension = `${d.toJSON().replace(/:/g, '-')}${this.randomStr(4)}`; // cannot have : in file name
        } else {
            randStringExtension = this.randomStr(10);
        }
        // create a backup of the current database, for the case that restoring does not succeed
        // path MUST contain some random part to make sure that concurrent dumps/restores do not interfere each other (by experience I know it happens!)
        let pathMongo = `./temp/mongodumpDuringRestore${randStringExtension}.gz`;
        let mongoDumpProm = this._mongoDump(pathMongo);

        // Backup SQL
        let pathSql = `./temp/mysqldumpDuringRestore${randStringExtension}.sql`;
        let mysqlDumpProm = this._sqlDump(pathSql);

        await Promise.all([mysqlDumpProm, mongoDumpProm]).then(()=>{this.logger.log(95, 'Successful SQL and Mongo dumps')}).catch((err)=>{
            throw {code: 23, message:`Creating SQL or Mongodump failed: ${err}`};
        })
        // backups done --> on error restore them

        // for the sql-stuff we first need to select the DB
        await mysqlConn.query(`use ${this.rMeetings.getDbNameSql(this.meetingShortname)}`)

        // shutdown rooms (all but the side channel)
        await this.rMeetings.closeMainRoomsForMeeting(this.meetingShortname);

        // all the data manipulation stuff is in an async function, which shall work as a try-catch for errors and we restore the current database if there is an error
        
        let pathMongoRestore = `./temp/mongodumpReceived${randStringExtension}.gz`;
        let pathSqlDumpRecieved = `./temp/mysqldumpReceived${randStringExtension}.sql`;
        let changeDbs = async ()=>{
            let fileContentReceivedSqlZipped = Buffer.from(JSON.parse(backupObj.sql));
            let fileContentReceivedSql = await doGUnzip(fileContentReceivedSqlZipped);
            let fileContentReceivedMongo = Buffer.from(JSON.parse(backupObj.mongo));
            
            let sql = fileContentReceivedSql.toString();
            if (developMode){
                await writeFile(pathSqlDumpRecieved, fileContentReceivedSql); // for testing only, not needed by the code
            }
            
            await writeFile(pathMongoRestore, fileContentReceivedMongo);

            // do the restore process!
            // the mysql dump includes all "drop tables"; thus we can simply run this code
            // NOTE: with MariaDB 10.6.5 (server) and mariadb module 2.5.5 (2022-01), there is a charset error, since MariaDB 10.6 renamed collations utf8_xyz to utf8mb3_xyz, which is not yet changed in the code of mariadb Module. I manually added the following line in mariadb/lib/const/collations.js to make it work:
            // defaultCharsets['utf8mb3'] = charsets[33]; // added
            let sqlRestoreProm = mysqlConn.query(sql).catch(async (error)=>{throw {message: `Database could not be restored: ${error}`, code:25};})

            // MongoDB
            // check the manual: likely we can simply run mongorestore, which does update and insert only
            let mongoRestoreProm = this._mongoRestore(pathMongoRestore, backupObj.oldMongoDbName)

            // if any promise fails, restore the previous data
            await Promise.all([mongoRestoreProm, sqlRestoreProm]).catch(err=>{
                // restore previous data and hope this process does not fail... --> is done outside this function
                throw err;
            })

            // reset all writing tickets and offlineClients, before we restart the rooms:
            // it would be nicest, if this would be done within each room (e.g. with a function implemented in roomServer). However, this gets very tricky when it comes to resetting dynamically created/defined rooms. Thus, it is probably the easiest approach to do this directly in mongoDB while the rooms are not started:
            //let mongoCollections = this.mongoDB.getCollectionNames();
            let mongoCollections = await this.mongoDB.listCollections().toArray().then(data=>data.map(el=>el.name));
            for (let collName of mongoCollections){
                // do not reset writingTickets/offlineClients for the side channel
                if (collName != "backup"){
                    let col = this.mongoDB.collection(collName);
                    col.updateOne({type:'writingTickets'}, {$set:{writingTickets: []}});
                    col.updateOne({type:'offlineWritingClients'}, {$set:{offlineWritingClients: {} }});
                }
            }
            
            // restart rooms
            this.rMeetings.createRoomsForMeeting(this.meetingShortname, this.seq, this.models, this.mongoDB)

            // set secondary mode, if needed
            if (!this.data.backup.isMain){
                this.updateRoomMode(this.data.backup.isMain);
            }

        }

        // create a function that deletes all temporary stored files. (To be called after a certain timeout.)
        let deleteTempFiles = ()=>{
            let pathes = [pathMongo, pathSql, pathMongoRestore, pathSqlDumpRecieved];
            for (let path of pathes){
                unlink(path).catch();
            }
        } 

        await changeDbs().then(()=>{this.logger.log(95, "Mongo and SQL DBs successfully restored.")}).catch(async (err2)=>{

            this.logger.log(95, `Error during restoring of Mongo or SQL DBs: ${JSON.stringify(err2)}`);

            // recreate './temp/mysqldumpDuringRestore.sql' and './temp/mongodumpDuringRestore.gz'
            let fileSql = await readFile(pathSql); // returns a buffer

            let sqlRestoreProm = mysqlConn.query(fileSql.toString()).catch(async (error)=>{throw {message: `Database could not be restored: ${error}`, code:26};})

            // MongoDB
            // check the manual: likely we can simply run mongorestore, which does update and insert only
            let mongoRestoreProm = this._mongoRestore(pathMongoRestore, backupObj.oldMongoDbName)

            // if any promise fails, restore the previous data
            await Promise.all([mongoRestoreProm, sqlRestoreProm]).catch(err=>{
                // we now have a problem...
                throw {code: 27, message:`Restoring the temporary backup failed, after restoring the regular backup alreqady failed (${JSON.stringify(err)}). We now have a problem... Try to create a new meeting and restore the data there.`}
            })
                
            // restart rooms:
            this.rMeetings.createRoomsForMeeting(this.meetingShortname, this.seq, this.models, this.mongoDB)

            // set secondary mode, if needed
            if (!this.data.backup.isMain){
                this.updateRoomMode(this.data.backup.isMain);
            }

            setTimeout(deleteTempFiles, this.deleteFileTimeout*1000);
            
            throw({message: `Error during database modification (${err}); successfully reinstalled the old DB.`, code: 24})
        })

        setTimeout(deleteTempFiles, this.deleteFileTimeout*1000);

        let ret = {
            isAchange: false,
            response: true,
        }
        return ret;

    }

    // called on close, unregister all (possibly) registered events
    async close(){

        // if this (secondary) server received push data, we probably do not need to unregister any events, since this is done in the roomServer/roomClient and not here

        // if this secondary server got the data by pulling, it (likely) has registered the TabIDset and wsClosed events
        if (this.pullConnection){
            // close the pull connection
            this.endPull();

        }

        // for push sideChannels, where we asked for the connection from the wsManager, also tell the wsManager that we do not need the conenction anymore. If this was the only meeting using this connection, the ws conncetion will be ended 
        for (let pushToken in this.data.status.secondaryPushConnections){
            this.endPush(pushToken);
        }

        // usually already unregistered:
        this.eH.eventUnsubscribe(`${this.rSideChannel.name}:ready`, this.name+'SCready');

    }

    // create a random string of given length
    randomStr (length = 8) {
        // Declare all characters
        let chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    
        // Pick characers randomly
        let str = '';
        for (let i = 0; i < length; i++) {
            str += chars.charAt(Math.floor(Math.random() * chars.length));
        }
    
        return str;
    
    };


     

}

export default rBackup;