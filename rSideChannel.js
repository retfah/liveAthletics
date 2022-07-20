

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
import conf from './conf.js'; 
import rSideChannelClient from './rSideChannelClient.js';
import findRoom from './findRoom.js';

class rSideChannel extends roomServer{
    
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, rMeetings, wsManager, rBackup){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false dynamicRoom=undefined, reportToSideChannel=true, keepWritingTicket=true)
        super(eventHandler, mongoDb, logger, "sideChannel@" + meetingShortname, true, 1, false, undefined, false, false);

        // there are several special thing in this room (comapred to all other rooms). On of them is the "conflict"-handling: 
        // when the main server broadcasts a change,this is recieved as a regular note and this secondary server will try to apply the change. However, the main server will also send the new ID. However, since this is actually a server as well and not a client, it will comapre the ID with the present ID, and there will be a difference (of course). And therefore the secondary server will alwalys reject the change due to "outdated" main server. How can we handle the rpoblem and/or bypass the ID check, without implementing a safety issue?
        // several options: 
        // - find a way that the roomClientForServer gets the data; and then use serverFuncWrite()
        // - eventually we can also change the wsNoteIncoming to not use func(), but use serverFuncWrite(), where we can set the ID. (how to make sure that only main servers can send such notes that can bypass the ID checking and are always executed?)
        // - implement a fake conflictChecking, which always says that the change is ok (in rSideChannel)? 
        // IMPORTANT: what is always required with the above: also the ID of the rSideChannel must be changed to the ID of the incoming request. This would make serverFuncWrite ideal to be used. How to avoid fake server note-func, that were not issued by legitimate main servers? We could implement an extra "client-is-writing" check directly in wsNoteIncoming-func, before we call serverFuncWrite. AND it still must be limited just to rSideChannel. Together with the limitation that only one server can have writing rights, this should work. However, we MUST be able to avoid that an evil secondary server (whcich still would have to be registered as a pull/push server on the main server) can get writing rights; this should only be possible for the one server that can present the token of this server.
        // We should check that the oldID is in fact the old ID. Otherwise, negelect the incoming change and do a fullReload (or if possible, get the changes since the last ID). 

        // we need the reference to the meeting room to 
        this.rMeetings = rMeetings;
        this.meetingShortname = meetingShortname;
        this.wsManager = wsManager; // get connection to other servers
        this.rBackup = rBackup;

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        // store the connection (roomClient?) to the main server; in that use case, this server shall work as a client; therefore we might use an roomClient instance
        this.connectionToMain = undefined;

        // after what time shall we retry to connect to the push room, if only conencting to the room fails, but the actual ws connection was successful.
        this.pushRetryTimeout = 60; // in seconds

        this.functionsWrite.change = this.change.bind(this);

        // the changes are coming in via the eventHandler; with this approach we can avoid that we need to provide the sideChannel to each an every roomServer
        // however, to make it work as a regular call in the room, we have to put this changes (coming in through the event) into a regular function call, which will result in the brodcast, storage of the stack and creation of a new ID. 
        const changeForSideChannelHandler = (data)=>{
            // only if this is a main server, the change must run though this here; otherwise its own changes would result in an entry here and so on... 
            if(this.rBackup.data.backup.isMain){
                data.processed = true;
                this.serverFuncWrite('change', data);
            }

        }
        this.eH.eventSubscribe(`${this.meetingShortname}:changeForSideChannel`, changeForSideChannelHandler, this.name, true);
        
        // we need no data in this room apart of the regular stack. The backup will be provided as "the data" when requested by the client by misusing the getPersonalizedFata function. 
        this.data = {};
        

            /*sideChannel:{}, // to be loaded from MongoDb; holds all the 
            aux: {
                serverName: conf.name,
            },
            status: {
                connectionToMain: 0, // only used when this is a secondary server; 0=no connection or this is a main server, 1=socket connection established, 2=sideChannel entered the room on the server, 3=checking need for full update, 4=doing full update, 5=doing partial update, 6=upToDate/waiting for broadcasts, 7=trying to connect (will probably give up after some time! --> TBD)
                secondaryPushConnections:{},
                secondaryPullConnections:{} // an object for every secondary server, where the token is the proeprty name; proeprties of the object are 'lastConnected' (for currently not connected secondaries), connected:true/false, connection and the token. 
            }
        }; */

        this.ready = true; // since there is no data to load, the room is instantly ready (Note: after this is set to true, it is NOT instantly true; setting the ready state actually sets _childReady in roomServer. Ready resports true if _childReady AND _monogReady are both true)


        // data to be held locally on the room: 
        this.pullConnection = null; // store here the wsConnection if we pull from the main server

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        // expected functions:
        // getFullBackup (eventually avoided by having a proxy on data)
        // changeProcessed (called whenever a room changes something OR when the change is incoming from the main server via rSideChannelClient; both shall be treated the same)

        const schemaChangeProcessed = {
            type:'object',
            properties: {
                roomName: {type: 'string'}, // the room where the change shall be applied
                funcName: {type: 'string'}, // the function (name) called in the room
                data: {}, // any type; the data given to the function in the room.
                ID: {type:'string'}, // the ID that was assigned to this change in the respective room  
                oldID: {type:"string"}, // the old ID, used to check whether a change was missed or not
                processed: {type:'boolean'},
            },
            required:['roomName', 'funcName', 'data', 'ID'],
            additionalProperties: false,
        }
        this.validateChange = this.ajv.compile(schemaChangeProcessed);
    }

    /**
     * 
     * @param {any} data The data needed to process the change done in a function in a room.
     * @returns 
     */
    async change(data){

        if (!this.validateChange(data)){
            throw {code: 21, message: `The sent data is not valid: ${this.ajv.errorsText(this.validateChange.errors)}.`}
        }

        // TODO: Remove
        console.log(`change in ${this.name}: ${JSON.stringify(data)}`);

        // if this is a change that was already processed on this server, then data.processed=true and we only have to broadcast the result
        if (!data.processed){
            // apply the change here as if it was done here
            // first we need to get the room; 
            // create the meeting and room name
            let meetingAndRoomName = `${data.roomName.split('@')[0]}@${this.meetingShortname}`;
            let room = await findRoom(meetingAndRoomName, this.rMeetings, {}, this.logger); // if it fails, it throws the right errors

            // apply the changes in the room
            // IMPORTANT: we need to implement a way to predefine the ID that the change will receive in the room. Eventually we can implement this in serverFuncWrite
            await room.serverFuncWrite(data.funcName, data.data, data.ID).catch(err=>{
                throw {code:22 , message:`${this.name} could not process change. Error: ${JSON.stringify(err)}. Change: ${JSON.stringify(data)}`}
            }) 
        }

        // make sure the change is processed on the next server
        data.processed = false;

        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'change',
            data: data // should have the same properties as data, but with added xClub
            // the UUID will be added on resolve
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // deleteClub
            data: {}
            // the ID will be added on resolve
        };

        let ret = {
            doObj,
            undoObj,
            isAchange: true,
            response: data,
            preventBroadcastToCaller: true,
        }

        return ret;
    }

    // overwrite the default to replace the roomName with the given one from the enterOptions
    /**
     * broadcast Send some data to every connected client
     * @param {object} obj The object with the changes to do; must be have the following properties (see also 'pushChange' for schema): funcName, data, ID (the new UUID)
     * @param {wsConnectionUUID} tabIdExclude Exclude this wsConnection-UUID form the broadcast (e.g. because the request came fomr this UUID)
     * @param {boolean} roomDatasetOnly Set to true, if the broadcast should only go to clients of the room-data itself and not of a roomDataset (e.g. during broadcasts of changes, which are handled separately in the roomDatasets)
     */
     broadcast(obj, tabIdExclude, roomDatasetOnly=false){

        // broadcast to clients of the room itself (and not just of a roomView)
        // currently the potential to send one data-package per client, eventually with the data of several views, is left unused 

        // extend the object with the roomName
        obj.roomName = this.name;

        // loop over all clients and send them the data (except the sender)
        // additionally for the sideChannel: do NOT send the broadcast to writingClients! TODO
        for (let tabId in this.clients){
            if ( !roomDatasetOnly || this.clients[tabId].datasetName==''){
                //DISCONTINUED for (let tabId of this.roomClients){
                if (tabId!=tabIdExclude){

                    // reset to default behavior, e.g. roomName is the same for the "client"=secondary room as on this server
                    obj.roomName = this.name;

                    // if there is a meeting specified, where the change shall be applied on the secondary server=client (the meetingShortname can be different on the secondary server), then use this.
                    if (this.clients[tabId].enterOptions.meetingShortnameClient){
                        let splitRoom = this.name.split('@');
                        if (splitRoom.length==2){
                            obj.roomName = `${splitRoom[0]}@${this.clients[tabId].enterOptions.meetingShortnameClient}`;
                        }

                    } 
                    

                    // wrap the object to be sent to the room-handler
                    let sendObj = {
                        name:'room',
                        data:obj
                    }
                    
                    this.clients[tabId].processor.sendNote(sendObj);
                }
            }

        }
    }

    // check that the client has teh rights to access the server; the allowed tokens are storen in rBackup
    evaluateRights(tabId, datasetName, enterOptions, session, writing){

        let token = enterOptions.token;

        this.logger.log(90, `Evaluating rights for ${token} on ${this.name}.`);

        // check that the token is valid and there is no connection yet for this token
        
        // does this client want to write, then it is the main server trying to enter the room. It must present the token of this room.
        if (writing){
            if (this.rBackup.data.backup.token == enterOptions?.token){
                return true;
            } else {
                return false;
            }
        }
        
        // if a push server is also registered as a pull server, then it kind of can connect twice, or respectively, first the pull connection is used and then the push connection !!!
        // TODO: solve this, e.g. by having an additional info in the enterOptions

        // try to find the token
        //let pullServer = this.rBackup.data.backup.secondaryPullServers.find(sps => sps.token == token);
        if (this.rBackup.data.backup.secondaryPullServers.find(sps => sps.token == token) != undefined){
            // is a pullServer; check that the token is not already used in a connection
            if (this.rBackup.data.status.secondaryPullConnections[token]?.connected==true){
                return false;
            }
            // TODO: store the tabId of the client that will now enter the room
            return true;
        }

        // the same for push servers
        if (this.rBackup.data.backup.secondaryPushServers.find(sps => sps.token == token) != undefined){
            // is a pullServer; check that the token is not already used in a connection
            if (this.rBackup.data.status.secondaryPushConnections[token]?.connected==true){
                return false;
            }
            // TODO: store the tabId of the client that will now enter the room
            return true;
        }
        return false;
    }

    /**
     * Called after a client successfully entered the room; can be implemented in an inheriting class
     * @param {string} tabId 
     * @param {string} datasetName 
     * @param {any} enterOptions e.g. a token
     * @param {object} session
     */
    async clientEntered(tabId, datasetName, enterOptions, session){

        this.logger.log(90, `Token ${enterOptions.token} successfully entered ${this.name}.`);

        this.rBackup.serverFuncWrite('secondaryConnected', {tabId, datasetName, enterOptions, session})
        //this.rBackup.secondaryConnected(tabId, datasetName, token, session);
    }
    
    /**
     * Called after a client has left the room; can be implemented in an inheriting class
     * @param {string} tabId 
     * @param {string} datasetName 
     * @param {any} enterOptions e.g. a token
     * @param {object} session 
     */
    async clientLeft(tabId, datasetName, enterOptions, session){

        this.logger.log(90, `Token ${enterOptions.token} left room ${this.name}.`);

        this.rBackup.serverFuncWrite('secondaryDisconnected', {tabId, datasetName, enterOptions, session})
        //this.rBackup.secondaryDisconnected(tabId, datasetName, token, session)
    }

    close(){ 
        // delete the listener when we close the room
        this.eH.eventUnsubscribe(`${this.meetingShortname}:changeForSideChannel`, this.name);
        
    }

    /**
     * Any room may provide a getPersonalizedData function meant to provide a client specific data-object on enter and on fullReload.
     * 
     * @param {object} client The client-object of the requesting client;  
     * @returns object
     */
    async getPersonalizedData(client){

        this.logger.log(90, `Creating personalized data for token ${client.enterOptions.token} in room ${this.name}.`);
        
        // override here the default behavior and return a full backup, created in rBackup
        // ONLY DO THIS WHEN THIS CLIENT IS NOT A WRITING CLIENT (=main server) ! 
        if (!client.writing){
            let ret = await this.rBackup.serverFuncReadOnly('createBackup', {backupSideChannelConfiguration: false,
                backupSideChannelData: false})
                
            return ret.response;
        }

        // TODO: what to return otherwise
        
    }

    // add the function-argument. This shall only be implemented in the rSideChannel.
    /**
     * This function is called when a note to the room is incoming.
     * @param {string} tabId The tabId of the requestign client
     * @param {wsProcessor} wsProcessor The wsProcessor-instance of the requesting client (e.g. needed for multiple answers)
     * @param {string} arg The argument/function to be processed (what shall be done)
     * @param {any} opt The data to be processed
     * @param {object} session The sesison object as returned by express-session
     */
     wsNoteIncoming(tabId, wsProcessor, arg, opt, session){

        if (this.closing){
            return;
        }

        // call the respective function on this room
        if (arg=='leave'){

            // I dont know what options could apply here...
            this.leaveNote(tabId)

        }else if (arg=='function'){

            // check that the server sending this note is the main server and make sure that the function to be called is teh change functino (no other function is allowed)
            if (this.clients[tabId]?.writing && opt?.funcName=='change'){
                // formerly (before 2022-07): check that the oldID is fine. Otherwise start a full reload via roomClient
                // now (post 2022-07): do the check in _startWriteFunctionServer! We canot do the check here, since the ID of this room will only be changed as soon as the former request was fully processed (i.e. change has finished and returned success to roomServer). If a next request arrives before the former change was processed, opt.oldID would be newser than this.ID, raising an error. If we do the check in _startWriteFunctionServer, then the check is done just before the next 
                //if (opt.oldID == this.ID){

                    // we cannot use this.func here, since its ID-check would require that the reported ID is the current ID and not the updated one (as it is used if regular clients send changes to the server, where the server defined the new ID). Therefore we do the ID check here and use the serverFuncWrite with the additional parameters of the new ID and the tabId to be excluded in the broadcast.

                    this.serverFuncWrite('change', opt.data, opt.ID, opt.oldID, tabId).catch(err=>{
                        // set the error string; if it is an javascript error, use just the error; otherwise, make a string via JSON.stringify(err)
                        let errStr;
                        if (err instanceof(Error)){
                            // real javascript error; stringify would result in an empty string
                            errStr = err;
                        } else {
                            errStr = JSON.stringify(err);
                        }
                        this.logger.log(20,`${this.name}:The incoming note-change (${JSON.stringify(opt.data)}) could not be processed. A full reload of the data will be done. Reason: ${errStr}`);
                        if (this.connectionToMain){
                            this.connectionToMain.getFullData();
                        }
                    })
                /*} else {
                    this.logger.log(20, `It seems like the secondary sideChannel ${this.name} was outdated when the latest change (${JSON.stringify(opt.data)}) arrived. Initiate a full reload of the data to be up to data again.`)
                    if (this.connectionToMain){
                        this.connectionToMain.getFullData();
                    }
                }*/
                
            } else {
                this.logger.log(20, `The incoming function call (through a note) cannot be processed, since the client either has no writing rights (i.e. is not the main server) or because a function other than "change" should have been called.`)
                /*if (this.connectionToMain){
                    this.connectionToMain.getFullData();
                }*/
                // eventually send an error to the main server; however, it would not reach the room, but simply arrive in the general wsProcessor and probably get logged there.
            }

            // OLD
            // since this is a note, there is no responseFunc. However, in the server2server communication, request-style notes are used to broadcast changes, which then arrive as notes. However, we are actually not interested in the response (since it should never fail)
            // we only log errors
            // let respFunc = (msg, code)=>{
            //     this.logger.log(20, `A function call that came in as a note could not be processed (code: ${code}, msg: ${msg}). This should actually not happen, but might occur especially for incoming sideChannel broadcasts. ${opt.toString()}`)
            // } 
            // // opt must store everything like 'what function to call', 'the parameters of this function'
            // this.func(tabId, respFunc, opt) // there is no response func!

        } else if(arg=='changeClientName'){
            this.changeClientName(tabId, opt);

        } else if(arg=='returnWritingTicket'){
            this.returnWritingTicket(tabId);

        } else{
            this.logger.log(75,`This argument ${arg} is not a valid argument.`);
        }
    }

    /**
     * This function is called when a request to the room is incoming.
     * roomServer override. Additionally implement request that this server connects as a client to the main server (connectToMainServer). The client requesting this (i.e. the main server) must not be in the room (yet), this is why this function is not implemented via a regular func, but here. 
     * @param {string} tabId The tabId of the requestign client
     * @param {wsProcessor} wsProcessor The wsProcessor-instance of the requesting client (e.g. needed for multiple answers)
     * @param {function} responseFunc The function to be called for the response
     * @param {string} arg The argument/function to be processed (what shall be done)
     * @param {any} opt The data to be processed
     * @param {object} session The session object as returned by express-session
     */
    async wsRequestIncoming(tabId, wsProcessor, responseFunc, arg, opt, session){
        if (arg=='connectToMainServer'){

            // we have a connection
            this.rBackup.data.status.connectionToMain.connectedToMain = true;
            this.rBackup.serverFuncWrite('statusChanged',undefined).catch(()=>{});

            // make sure that rBackup and this room (rSideChannel) are ready
            if (!this.rBackup.ready || !this.ready){
                responseFunc(`This server (${this.meetingShortname}) is not ready yet for sideChannel connections.`, 24)
                return;
            }

            // check that this server is in secondary mode and that it is configured for push!
            if (this.rBackup.data.backup.isMain || this.rBackup.data.pullFromServer){
                responseFunc(`This server (${this.meetingShortname}) is a main server and does not accept a side channel input OR is configured to create the connection itself (pull-mode).`, 23)
                return;
            }

            // check that the token is correct
            if (opt?.token != this.rBackup.data.backup.token){
                responseFunc(`The token ${opt.token} is not correct for the meeting ${this.meetingShortname}`, 21)
                return;
            }

            // check that there is no other main server yet
            if (this.connectionToMain){
                responseFunc(`The meeting ${this.meetingShortname} already is connected to a main room.`, 22)
                return;
            }

            // try the approach with the secondary server as a client; try to get it a writing ticket and limit the number of writing tickets to one.

            // we give it the current (local, secondary) ID to avoid the preparation of any data to be transmitted, which would be useless in this case
            // the token is the one defined here in rBackup (it was already checked above that the transmitted one is the same as the one here)
            // since we should not continue before we successfully have entered this (secondary) server with writing rights (in order not to create the sideChannel client, which then would already (eventuelly successfully connect to the main server)), we have to do this workaround with a manual promise, since this.enter "returns its answer" in the fakeResponseFunc
            let continue2=true;
            await new Promise ((resolve, reject)=>{

                let fakeResponseFunc = (value, code)=>{
                    // If everything else is correctly programmed (e.g. when the connection is lost the server leaves properly and gives back the writing ticket.), then entering should always work.
                    this.logger.log(95, `sideChannel "fake-entered" (i.e. the main server was entered as a client, but he actually never asked for this. It is needed, because any messages from main to secondary go directly to the sideChannelSeverRoom and not to rSideChannelClient.); resulted in value ${JSON.stringify(value)} and code ${code}.` );
    
                    if (code==0){
                        // on success, return true;
                        this.logger.log(95, `Main server successfully registered as writing client on the secondary server`)
    
                        this.rBackup.data.status.connectionToMain.enteredOnSecondary = true;
                        this.rBackup.serverFuncWrite('statusChanged',undefined).catch(()=>{});
                        resolve();

                    } else {
                        this.logger.log(50, `Main server could not be registered as writing client on the secondary server. ${code}: ${JSON.stringify(value)}`)
                        responseFunc(`rSideChannelClient could not register the main server as a writing client on the secondary server.`, 25);
                        reject();
                    }
                }

                this.enter(tabId, wsProcessor, fakeResponseFunc, {writing:true, failOnWritingDeclined: true, ID:this.ID, enterOptions:{token: opt?.token}}, session);
            }).catch(err=>{
                continue2=false;
            })
            if (!continue2){
                return;
            }
            
            // create a special roomClient instance and connect it to the rSideChannel on the main server
            // In the browser (regular roomClient) wsHandler is an instance of socketProcessor2. Actually, only emitNote, emitRequest, connected and ... are implemented
            let wsHandler = {
                emitRequest:(eventName, data={}, success=(response)=>{}, failure=(errCode, errMsg)=>{}, opt={}, cbAck=(statusCode, statusMsg)=>{})=>{
                    // should actually been checked already
                    if (!wsProcessor.closing){
                        //request, cbSuccess=(response)=>{}, cbFailure=(errCode, errMsg)=>{}, opt={}, cbAck=(statusCode, statusMsg)=>{}
                        wsProcessor.sendRequest({name:eventName, 'data':data}, success, failure, opt, cbAck)
                    } else {
                        // directly call the failure callback
                        failure(3, 'Connection was closed before the reqeust could be sent.');
                    }
                },
                emitNote:(eventName, data={}, opt={}, cbAck=(statusCode, statusMsg)=>{})=>{
                    // should actually been checked already
                    if (!wsProcessor.closing){
                        // note, opt={}, cbAck=(errCode, errMsg)=>{}
                        wsProcessor.sendNote({name:eventName, 'data':data}, opt, cbAck)
                    } else {
                        if (opt.sendAck){
                            cbAck(3, 'Connection was closed before the note could be sent.')
                        }
                    }
                },
                connected: true, // if the connection is already established, this is correct; otherwise, actively call connect(false, ()={//success}, ()=>{//failure})
                tabIdReported: true,
                tabId: tabId, // needed at least for the case when the secondary server changes away from being push-secondary. 
                // if both connected and tabIdReported are true, then connect(9 will be called automatically) 
            };

            // think this should only be done when client could be entered (is the case now 2022-07)
            this.connectionToMain = new rSideChannelClient(wsHandler, this.eH, opt.shortname, this.meetingShortname, this.logger, this, this.rBackup.data.backup.token); 

            // on failure of the connection, simply destroy the client; it will be reopened again when the connection is reestablished.
            this.eH.eventSubscribe('wsClientDisconnect/'+tabId,()=>{

                // the writing ticket is automatically returned (since roomServer also listens to the same event).
                // delete the connection to main (Note: there is no need to call close() or somethign like that, since the connection has failed already anyway)
                this.connectionToMain = undefined; 

                // change the status in rBackup:
                this.rBackup.data.status.connectionToMain.enteredOnSecondary = false;
                this.rBackup.data.status.connectionToMain.connectedToMain = false;
                this.rBackup.data.status.connectionToMain.clientOnMain = false;
                this.rBackup.data.status.connectionToMain.successfulInitialization = false;

                this.rBackup.serverFuncWrite('statusChanged',undefined).catch(()=>{});

                // unregister event
                this.eH.eventUnsubscribe('wsClientDisconnect/'+tabId, this.name)
            }, this.name)

            // do not send the actual data! we need no data on the main server. 
            responseFunc(true,0);

        } else {
            // handle with the basic request handler in roomServer
            return super.wsRequestIncoming(tabId, wsProcessor, responseFunc, arg, opt, session);
        }
    }


     

}

export default rSideChannel;