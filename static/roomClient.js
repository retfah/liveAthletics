//import { timingSafeEqual } from "crypto";

//import { operators } from "ajv/dist/compile/codegen";

// the base class for rooms on the client:
// startup: connect to room on the server
// have a stack for every change made on the client
// always try to reduce the stack one by one, syncing with the server as fast as possible
// work as if the connection was not reliable, e.g. always require an acknowledgment 

// handling non-success from the server (e.g. on conflicting changes): have undo-functions for every entry on the stack and rollback all entries starting from the last entry on the stack (e.g. not the first one that was )

// as the roomManager cannot add getters/setters to the properties of instances of this class, we must inform it about changes it must show by raising the event 'roomInfoChange'!

class roomClient {

    /**
     * 
     * @param {roomClientVue} v The first vue that will be linked to that room. If v=undefined, then the room will still be opened, but without linked vue.
     * @param {string} name The name of the room to connect to. 
     * @param {wsHandler} wsHandler The wshandler to use for sending data to the server
     * @param {eventHandler} eventHandler The used eventHandler instance, allowing different 'modules'/'rooms' to communicate through named signals 
     * @param {boolean} onlineOnly Only perform writing changes when online. This is a restriction some rooms will apply to make sure they are not getting outdated. it is complementary to other conflict avoiding measures on the servers like checking out tickets. 
     * @param {boolean} writing Set to true when this clients wants to write (even if we then cannot gather writingRights)
     * @param {function} success callback function called on connecting attempt
     * @param {function} failure callback function called on connecting attempt
     * @param {boolean} storeInfos Whather or not to store infos about the other clients locally. It will always be up to date, if true, otherwise it stays empty. Default=false
     * @param {roomManager} rM The roomManager instance, needed to present errors to the client. If undefined, simply no errors are created. 
     * @param {string} datasetName The name of the dataset to get (''=room data=default)
     * @param {function} writingChangedCB callback function when the writing rights did change. TODO
     * @param {object} extraLogger use this logger instead of the logger present in the global scope.
     * @param {string} ID The initial ID to be used; when undefined or 0, the roomClient assumes there is no data and no ID yet and will do a full update on first connect
     * @param {object} roomEnterOptions Additional options that will transmitted during the room enter process
     */
    constructor(v, name, wsHandler, eventHandler, onlineOnly, writing, success, failure, storeInfos=false, rM, datasetName='', writingChangedCB, extraLogger, ID=0, roomEnterOptions=undefined){

        // new 2021-12: previously, logger was always given as a global object. However, since roomClient now also is run on the server for the sidechannel, it must be a property of this object.
        if (extraLogger){
            this.logger = extraLogger;
        } else {
            this.logger = logger; // global object, always present in the browser
        }
        // --> react on lost ws-connection --> change to connected=false
        this.eH = eventHandler;

        // here the data-model is stored.
        this.data = {}
        this.dataPresent = false;

        // all views that use the data of this room shall be registered
        if (v){
            this.vues = [v];
        }else{
            this.vues = [];
        }

        // store the name of the room
        this.name = name;

        // we store whether writing is wanted or not. It is NOT related to whether we have a writing ticket or not!
        this.writingWanted = writing;

        this.roomEnterOptions = roomEnterOptions;

        // set the writign tickets ID, if there was already one.
        // false if this client has no writing rights (yet). If writing rights are requested (writing=true), this will store the writingTicketID (as the name already says) 
        this.writingTicketID = false;
        if ('localStorage' in window){
            let key = this.name + "writingTicketID";
            let val;
            if (val = window.localStorage.getItem[key]){
                this.writingTicketID = val;
            }
        } else{
            this.logger.log(7, 'Local Storage is not supported. Please use a modern browser.')
        }
        // save the CB function for wrting-ticket-ID changes. This allows the inheriting class to either 1) try reconecting without 

        // if the last vue does not use this room anymore, leave the room and notify the room manager
        this.leaveWhenNoVue = true;

        // store the roomManager; only needed to present various error messages to the client by calling the respective functions on the roomManager. If undefined, the functions will simply not be called. 
        this.rM = rM;

        // give the client a name; used to identify the client in rooms; needed especially when a client does not return the writing ticket appropriately and an admin-client must delete the phantom writing ticket  
        this.clientName = rM.data.clientName; 

        
        // should the list of the other clients be stored?
        this.storeInfos = storeInfos;

        // which dataset should we request (by default '', which is the room data itself)
        this.datasetName = datasetName;

        //this.clients = {};
        this.infos = {} // the object that stores infos: numClients, numClientsWriting, maxWritingClients, clients
        
        // initialize the stack for the messages
        this.stack = [];

        // write only when online. This is a restrictive mode to avoid conflicting changes on the server, as this assures that each client that is trying to write is up to date first. When true, this also (kind of) disables the stack, as we do not store any change. Either it can be sent directly or the change is declined.
        // TODO: This variable can be used together with the online-status in Vue.js to enable/disable any control that will be not allowed to send when not online.
        this.onlineOnly = onlineOnly;

        // set the socketProcessor (ws-handler)
        this.wsHandler = wsHandler;
        
        // property storing the information whether a request is currently processed or not
        this.dataSent = false;

        // the (UU)ID of the last status synced with the server; this is needed in order to know if there are potentional conflicting changes and to be able to send differential changes to the client, if needed. 
        this.ID = ID; // 0 if not defined by the calling class

        // all the special functions available in this room must be stored in the following object (IMPORTANT NOTE: this must be done by the child class!)
        // there is no async stuff and no error handling (thus not like on the server)
        // the function must take the data as the argument
        this.functions = {};

        // store whether the room is connected or not
        this.connected = false;

        // during the connecting build up of the room (not the ws connection)
        this.connecting = false; 

        if (wsHandler.connected && wsHandler.tabIdReported){
            // start connecting immediately
            this.connect(writing, success, failure);
        }

        eH.eventSubscribe('TabIdSet', ()=>{
            if (!this.connected && !this.connecting){ //do not try to reconnect when we are connected (however, when tabIdset is correctly only reported once per running connection, this would not be necessary)
                this.connect(writing, success, failure)
                if (this.stack.length>0){
                    this.sync();
                }
            }
        });
        eH.eventSubscribe('wsClosed', ()=>{
            this.connected = false;
            this.tabIdReported = false;

            // if the connection is lost while a request was hanging, the response will never arrive, as the "reopened" connection is not reopened, but is a new one and the server will not be able to send the reponse through the new connection. The last sent (or probably sent) element will stay on the stack and it wil be tried to resend it. When no other change-requst was processed yet, then the server will reply the response directly without reprocessing it and otherwise will return an error and the client will reload everything. 
            this.dataSent = false;

            // notify the room manager about the changed data
            this.eH.raise('roomInfoChange', this);
        });
        
    }

    //{"type":"object", "properties":{"writing":{"type": boolean, "description": "optional, whether or not this connection also intends to write in this room"}, writingTicketID:{"type":"string", "description":"optional, the former writing-ticket-ID"} , "ID":{"type": "string", "description":"optional, the UUID of the current data-status present on the client"}, "name": {"type":"string", "description": "optional, a name of the client used to identify it. Used on the server only if writing is true"}}}

    /**
     * (Re-)Connect to the room
     * @param {boolean} writing Set to true when this clients wants to write 
     * @param {function} success callback function called after successful connecting attempt
     * @param {function} failure callback function called on connecting attempt, arguments: msg, code
     */
    connect(writing, success=()=>{}, failure=()=>{}){
        let opt = {writing:writing};
        if (this.writingTicketID){
            opt.writingTicketID = this.writingTicketID;
        }
        if (this.ID) { // ID=0 when not connected before which is evaluated to false
            opt.ID = this.ID;
        }
        
        // store the client name at request time
        let clientNameRequest = this.clientName;

        // prepare the options
        opt.name = clientNameRequest;
        opt.storeInfos = this.storeInfos;
        // dicontinued: the use of roomViews: 
        // opt.roomViews
        // opt.enterRoom
        opt.datasetName = this.datasetName;
        if (this.roomEnterOptions){
            opt.enterOptions = this.roomEnterOptions;
        }

        var numAttempts = 0;
        var maxAttemps = 10; // how many times it will be tested to (re)-connect to the server (if it formerly was not ready yet.) -1 for infinity

        this.connecting = true;

        // notify the room manager about the changed data
        this.eH.raise('roomInfoChange', this);

        var request = ()=>{

            numAttempts += 1;

            this.wsHandler.emitRequest('room', {
                roomName: this.name, // the name of the room
                arg: 'enter', // enter room
                opt: opt 
            }, (data)=>{
                
                let text = 'Sucessfully connected to room ' + this.name;
                
                this.connecting = false;

                // if the client's name has changed during the request to the server, send it the new name now (because setClientName would correctly not have sent it):
                if (this.clientName != clientNameRequest){
                    this.setClientName(this.clientName, true); // true=override 'no-change-check'
                }

                if (data.type=='full'){
                    // just set the local data to what we received
                    this.data = data.data;
                    this.ID = data.ID

                    if (data.writingTicketID){
                        this.setWritingTicketID(data.writingTicketID)
                        text += " with writingTicktID " + data.writingTicketID;
                    }else{
                        // when we had a wiritng ticket before the current (re-)connect, delete the old ticket
                        this.deleteWritingTicketID();
                    }
                    if (data.infos){
                        this.infos = data.infos;
                    }

                    this.logger.log(99, text + '. Full data update.');

                    // changed 2022-12: before, afterFullReload was always called here and the if function with dataArrived was set below
                    if (!(this.dataPresent)){
                        this.dataPresent = true;
                        
                        // raise dataArrived-events on all vues
                        this.vues.forEach(el=>el.dataArrived()) 
                    } else {
                        this.afterFullreload();
                    }
                    
    
                    // call the success callback with no arguments; the success function will then make sure that the data is further processed
                    success(); 

                } else if (data.type=='incremental'){
                    // TODO: the data.data are the incremental changes to be run. this means the respective functions on the client must be run. If a function for a specific change is not available, request the full new data. Do NOT set the ID already!
    
                    // check if all required functions are available.
                    let funcsAvail = true;
                    // data.data is a sorted (!) array of objects with properties 'funcName' and 'data'
                    for (let i=0; i<data.data.length; i++){
                        if (!(data.data[i].funcName in this.functions)){
                            funcsAvail = false;
                            break;
                        }
                    }
    
                    if (funcsAvail){
                        // run all the incremental changes
                        for (let i=0;i<data.data.length; i++){
                            this.functions[data.data[i].funcName](data.data[i].data); // looks quite strange with this triple 'data', but it's correct
                        }
    
                        // finally:
                        this.ID = data.ID;
                        if (data.writingTicketID){
                            this.setWritingTicketID(data.writingTicketID);
                            text += " with writingTicktID " + data.writingTicketID;
                        }else{
                            // when we had a wiritng ticket before the current (re-)connect, delete the old ticket
                            this.deleteWritingTicketID();
                        }
                        if (data.infos){
                            this.infos = data.infos;
                        }

                        this.logger.log(99, text + '. Incremental data update done.')

                        success();

                        // notify all vue-instances
                        this.onChange();

                    } else {
                        this.logger.log(99, text + '. But sent incremental data could not be processed. Full data request hanging.');
                        this.getFullData(success, failure);
                    }
                }
                
                this.connected = true; 

                // notify the room manager about the changed data
                this.eH.raise('roomInfoChange', this);
    
            }, (code, msg)=>{
    
                // for certain codes, retry after a short delay
                // 4, 14, 17: Server not ready yet (e.g. after a restart) (4: room does not exist yet; 14: room is closing, 17: room exists, but is not ready) --> try again after 1s
                // before 2020-01: 18: no writingTickets available --> delete current writing ticket (if present)
                if ([4, 14, 17].indexOf(code)>=0){
                    // retry in 1s
                    this.logger.log(50, 'Server was not ready yet (codes 4, 14 or 17). Retry in 1s'); 
                    if (numAttempts<maxAttemps || maxAttemps==-1){
                        setTimeout(request,1000); // TODO: test the new changes!
                    } else {
                        failure('Could not connect to server within ' + maxAttemps + ' attempts, as the server was not ready yet.', 23);
                        this.connecting = false;
                        
                        // notify the room manager about the changed data
                        this.eH.raise('roomInfoChange', this);
                    }

                } else {
                    this.connecting = false;
                    let msg2 = `Connecting to room ${this.name} failed with the following code and message: ${code}: ${msg}`;
                    this.logger.log(3, msg2);
                    failure(msg2, code)
                }
            });
        }



        // start the request:
        request();


    }

    /**
     * Leave the room. This MUST be called on leaving the site in order to make sure that the writing ticket is 'given back'
     * TODO: there should be some function that closes the room/view (in room manager) when there is no connected vue instance (this.vues) anymore
     */
    leave(){

        // TODO: leave the room and give the writing ticket back (call to server) and delete the ticket 
        this.wsHandler.emitNote('room', {
            roomName: this.name, // the name of the room
            arg: 'leave', // enter room
            opt: {}
        });
        this.deleteWritingTicketID();

        
        // notify the room manager about it 
        this.rM.deleteRoom(this.name);
    }

    /**
     * Return the writingTicket we currently have, when the connection is ok
     * UNTESTED!
     */
    returnWritingTicket(){
        if (this.connected){
                
            // we do not want writingTicket anymore
            this.writingWanted = false;
            this.deleteWritingTicketID();
            
            // already update what is shown here, without waiting for the info-broadcast change (as this might not come when the client did not request these infos)
            this.eH.raise('roomInfoChange', this);

            let message = {
                roomName: this.name,
                arg: 'returnWritingTicket'
            };
            
            // send the note
            this.wsHandler.emitNote('room', message);
        }
    }

    /**
     * Try to get a writing ticket after the conenction has been established without
     */
    requestWritingTicket(){
        // we assume that the client at least now would like to have writingRights:
        this.writingWanted = true;

        // check if the client does not have writing rights yet and that we are connected 
        if (!this.writingTicketID && this.connected){
            
            // successHandler
            let succ = (data)=>{
                if (data.writingTicketID){
                    this.setWritingTicketID(data.writingTicketID);
                    this.eH.raise('roomInfoChange', this);
                }
            }

            // failureHandler
            let fail = (code, msg)=>{
                // dont care so far...
            }

            // request:
            let req = {
                roomName: this.name,
                arg: 'requestWritingTicket'
            };

            this.wsHandler.emitRequest('room', req, succ, fail);

        }

    }

    /**
     * Set the name of the client. Change only when the name is different (or when override=true, which is actually there only for the case, when the name changed during entering the room, as then the change would not yet have been sent and needs to be sent after getting connection). Send it to the server when already connected. 
     * @param {string} name 
     * @param {boolean} override Actually only used in above mentioned case!
     */
    setClientName(name, override=false){
        if(this.clientName != name || override){
            this.clientName = name;

            // do not send the changed/set clientName before we are connected to the room!
            if (this.connected){
                let sendData = {arg:'changeClientName', roomName: this.name, opt: name};
                this.wsHandler.emitRequest("room", sendData, ()=>{}, (code, msg)=>{}) // we actually do not care whether the message has arrived or not and thus we could also use emitNoteAck.
            }
            
        }
    }

    /**
     * set the writing ticket ID and also store it to the localStorage
     * @param {string} id The writing ticket ID
     */
    setWritingTicketID(id){
        this.writingTicketID = id;
        if ('localStorage' in window){
            let key = this.name + "writingTicketID"
            window.localStorage.setItem(key, id);
        }
        // report change of writingTicket to connected Vues and the room 
        this.vues.forEach(el=>el.onWritingTicketChange()) // vues
        this.onWritingTicketChange(); // room
    }

    onWritingTicketChange(){
        // nothing to do here, but maybe the inheriting class wants to override this function that is called everytime when setWritingTicketID is called here
    }

    afterFullreload(){
        //  in general, we call the same event on every connected vue-instance; the inheriting class might override this
        for (let v of this.vues){
            v.afterFullreload();
        }
    }

    /**
     * Event raised whenever a change to the data is made, except at full reload (--> afterFulReload). This may be used e.g. to force an update in vue.$forceUpdate().  
     */
    onChange(){
        //  in general, we call the same event on every connected vue-instance; the inheriting class might override this
        for (let v of this.vues){
            v.onChange();
        }
    }

    deleteWritingTicketID(){
        // the function might also be called when there was no writing ticket before
        if (this.writingTicketID){
            this.writingTicketID = false;
            if ('localStorage' in window){
                let key = this.name + "writingTicketID"
                window.localStorage.removeItem(key);
            }
            // report change of writingTicket to connected Vues and the room 
            this.vues.forEach(el=>el.onWritingTicketChange()) // vues
            this.onWritingTicketChange(); // room
        }
    }

    /**
     * revoke the writingTicket of the client with the given tabIdHash. 
     * @param {} tabIdHash 
     */
    revokeWritingTicket(tabIdHash){

        let data = {
            roomName: this.name,
            arg: 'revokeWritingTicket',
            opt:{
                writingRequested: (this.writingWanted && !(this.writingTicketID)), // if we already have a writingTicket, we do not need another one...
                tabIdHash
            }
        }

        if (this.writingWanted && !(this.writingTicketID)){
            // revoke the ticket and get it for this client --> on success, store the returned writingTicket for this room
            this.wsHandler.emitRequest('room', data, (data)=>{
                if (data.writingTicketID){
                    this.setWritingTicketID(data.writingTicketID);
                    // let Vue redraw everything
                    this.eH.raise('roomInfoChange', this);
                }
            }, (errCode, errMsg)=>{
                // there was an error somewhere...
                // we dont care here... 
            });

        }else{
            // just revoke the ticket of tabIdHash, but do not gather a ticket; nothing todo when the answer arrives
            this.wsHandler.emitRequest('room', data, ()=>{}, (code, msg)=>{});
        }
    }

    /**
     * 
     * @param {*} success 
     * @param {*} failure 
     */
    getFullData(success=()=>{}, failure=(msg, code)=>{}){

        let text = 'getFullData:'; // string for output

        // TODO: make sure first that we are connected!!!

        // request the full data!
        this.wsHandler.emitRequest('room', {
            roomName: this.name,
            arg: 'fullData',
            opt: {}
        }, (data)=>{
            this.ID = data.ID
            this.data = data.data;
            
            if (data.writingTicketID){
                this.setWritingTicketID(data.writingTicketID);
                text += " got writingTicktID " + data.writingTicketID;
            }
            if (data.infos){
                this.infos = data.infos;
            }
            // notify the room manager about the changed data
            this.eH.raise('roomInfoChange', this);

            this.logger.log(99, text)

            // call this function, as the client has to put the new data into the vue instance, such that it can observe the new data
            this.afterFullreload();

            // todo: eventually raise an event as well.

            success();

        }, (code, msg)=>{
            this.logger.log(3, "Could not get the full data for some strange reason. Code: " + code + " , message: " + msg)
            
            // call the failure callback
            failure(msg, code);
        });
    }

    /**
     * 
     * @param {*} change 
     */
    incomingChange(change){

        // see if the function exists
        if (change.funcName in this.functions){
            // check if the ID is newer than the current ID. This is needed since by default also the requesting client receives the broadcast; however the response should arrive earlier than the broadcast (for async reasons I'm/it'is not 100% sure that is true)
            // call the function
            // broadcasted changes without a new ID (typically for non-important aux data) have ID=null 
            if (this.ID!=change.ID || change.ID==null){
                this.functions[change.funcName](change.data);
                // change the current ID
                if (change.ID!=null){
                    this.ID = change.ID;
                }
                // notify the room manager about the changed data
                this.eH.raise('roomInfoChange', this);

                // notify vue's
                this.onChange();

            } else {
                this.logger.log(98, `Incoming change (${JSON.stringify(change)}) was applied already before (i.e. this.ID=change.ID). The incoming change is ignored.`)
            }
        } else {

            this.logger.log(35, "Incoming change for function '" + change.funcName + "', which does not exist. Do full reload.")

            // full reload
            this.getFullData(()=>{}, (msg, code)=>{
                if (code<20){
                    // if it fails due to connection, simply try again after 5s
                    setTimeout(this.getFullData, 5000);
                }
            });
        }
    }


    /**
     * update the infos about other (connected) clients
     * @param {object} opt The transmitted infos
     */
    infoUpdate(opt){
        // only if the clients are really transferred
        if (opt.clients && opt.clients!=null){
            this.infos.clients = opt.clients;
        }
        this.infos.numClients = opt.numClients;
        this.infos.numClientsWriting = opt.numClientsWriting;
        this.infos.maxWritingTickets = opt.maxWritingTickets;

        // check if there are free writing tickets now and try to get one when the client does not have and would like writing rights
        // FUTURE: eventually do not automatically get a writing ticket or let a variable decide, what is done (nothing/inform user about free ticket/automatically request the ticket)
        if (!this.writingTicketID && this.writingWanted && opt.numClientsWriting < opt.maxWritingTickets){
            this.requestWritingTicket();
        }

        // notify the room manager about the changed data
        this.eH.raise('roomInfoChange', this);
    }

    /**
     * add a function that is then callable for messages from the server (either the result of a request or the broadcast following a request by another client)
     * TODO: all the rights stuff is NOT yet implemented
     * @param {string} name The name of the function. 
     * @param {function} func The actual function. The "this" object will be bound to that function. 
     */
    _addFunction(name, func){

        // IMPORTANT: do not forget to bind the function to this!
        this.functions[name] = func.bind(this);

    }

    /**
     * 
     * @param {string} funcName The functionName to call
     * @param {object, function} data The data to send to the respective function on the server. If data is a function, then the function is called and is expected to return the data to be sent. This is useful when the actual data to send is not known (e.g. the room is offline, an entry is created and then changed; the change event data would typically use the xEntry as an identifier for what to change, but since the client was offline when the change was requested, the xEntry is not known yet at that time. The data-function called can avoid this problem.)
     * @param {object} functionOverride (data, defaultFunction)=>{} Define a function that is called instead of the usual func with the answer of the server (if needed, defaults to undefined) with the data from the server. If not defined, the usual function si called. The function override is helpful when something else shall be done than what is defined in the usual execution function. Also this is helpful when the data passed to the change-requesting-client shall be different than what is sent in the broadcast.
     * @param {*} funcRollback The function to be called to rollback the change (e.g. delete a new entry in the data.) By default, this is an empty function doing nothing. If set to undefined, a rollback will cause the full data to be reloaded from the server!
     * @param {object} opt The options for the request. See wsProcessor-sendRequest options. (Note: acknolwedgement is always requested.) 
     * Ideas for options: 
     * - independent requests: the request is independent of others --> do not rollback other requests if this request failed. (ignore error, just show message to user; this kind of reqeusts might coincide with readOnly-functions in the roomServer)
     * @param {boolean} opt.readOnly Optional (default=false) If the request will not change anything on the server, set this to true. This changes the default behavior for errorCode>=4 from "delete request and rollback all subseeunt requests" to "delete request and send the next on stack", as it is defined by the "smartDelete" rule (see below). 
     * @param {array} opt.errorHandling  optional array defining how to react on which error; example: [{from: 1, to: 3, rule:'sendAgainTimeout', timeout:10},{...}] If an error occurs, the first applicable ("to" and "from" errorcode is valid) rule is considered. 
     * - Every rule has a certain default regarding how the error is shown to the user. This behavior can be overriden by the following options:
     *   - boolean, createErrMsg by default for most rules true. Decide whether the automatic error message should be created or not.
     *   - boolean, popupErrMsg Decide whether the automatic error message should popup directly or not (=visible only in the rooms-menu).
     *   - boolean, customErrMsg function(errCode, errMsg) A custom function that is called with the respective error code and message; can be used e.g. to have an alternative to the default error message, also providing the possibility for translated and more specific error messages. 
     * - The following rules exist and partially have addiational options: (see below for the default rules, that will be added to the end of the array)
     *          - (sendAgain) send again (makes only sense with errCode<4); if errorCode<2, will send as soon as connection is back.
     *          - (sendAgainTimeout) send again after timeout (makes only sense with 2<=errCode<4), additional parameter: timeout (in seconds), default=5;
     *          - (deleteContinue) delete from stack, send the next request on the stack; notify user (makes sense e.g. for any "opt.readOnly=true" request, or as an alternative method on connection loss, assuming the server already processed it; however, since the server would directly anywer with the response if the last request is sent again, resending is probably the better option.)
     *          - (deleteRollback) delete from stack and do full rollback (if other requests might be based on this one.)
     *          - (smartDelete): choose between deleteContinue and deleteRollback whether the request is independent of others or not 
     *          - (user) specific function defined together with the request; additional parameter: userFunc:(errCode, errMsg)=>{}. The function will be bound to "this".
     *    DEFAULT: [{rule:'sendAgain', from:1, to:1.5}, {rule:'sendAgain', from:3, to:3.5}, {rule:'sendAgainTimeout', from:2, to:2.5, timeout:requestTimeout?requestTimeout:10}, {rule:'smartDelete'}]
     * @param {any} info Some information about the change. Might be useful in the future, as soon as there is a conflict handling.   
     */
    addToStack(funcName, data, functionOverride=undefined, funcRollback=()=>{}, opt={}, info={}){

        let l = this.stack.length;

        const request = {funcName: funcName, data: data};

        // check whether we should try to write or not when onlineOnly=true 
        // this implementation where also the local stack must be empty is even stronger than what "onlineOnly" would mean alone, as it also makey sure that no stack builds up. Which would increase the chance that two clients have requests to the server at the same time.
        if (this.onlineOnly && (!this.connected || l>0)){

            // virtual error codes:
            // 0: no connection
            // 0.5: request pending; not accepting more than one request at a time.

            // if readOnly: deleteContinue; otherwise delteRollback (this is equivalend to smartDelete)
            let handling = 'deleteRollbackNoFail';
            if (opt.readOnly){
                handling = 'delete';
            }
            
            if (!this.connected){
                this.rM?.messageNoConnection(this, this.stack[0].info, request, handling, handling == 'deleteRollbackNoFail');
            } else {
                this.rM?.messageRequestPending(this, this.stack[0].info, request, handling, handling == 'deleteRollbackNoFail');
            }

            this.logger.log(8, `Could not send request "${JSON.stringify(info)}" because another request is pending or because there is no connection to server. Delete request and continue. (Room: ${this.name}, request content: ${request})`);

            return false;
        }

        // add an element to the stack
        this.stack.push({request: request, functionOverride: functionOverride, funcRollback: funcRollback, info:info, opt:opt})
        
        // notify the room manager about the changed data
        this.eH.raise('roomInfoChange', this);

        // if the stack was empty, start now the syncing
        if (l==0){
            this.sync();
        }
    }

    // try to send the next item to the server
    sync(){
        if (this.wsHandler.connected && this.dataSent==false && this.stack.length>0){ // the stack length may be 0 if sync is called due to a connection interruption, where a timeout is started and between the timeout and the interruption the stack might be processed already

            // get the request to send 
            let request = this.stack[0].request;
            let opt = this.stack[0].opt;

            // if request.data is a function, then the data needs to be created now, right before sending. This is used e.g. when the index of a change is not known at the time creatign the change request (occurs for offline rooms)
            if ((typeof request.data) == "function"){
                request.data = request.data();
            }

            // add the current ID
            request.ID = this.ID
            
            // data is currently on the way...
            this.dataSent = true;

            // create the object to send, such that it can be prcessed by the 'requestHandling' function
            let sendData = {arg:'function', roomName: this.name, opt: request};

            // options for the transmission in wsProcessor.sendRequest:
            // always use acknowledgement, but without timeout. 
            this.stack[0].opt.sendAck = true;

            // notify the room manager about the sent data
            this.eH.raise('roomInfoChange', this);

            this.wsHandler.emitRequest("room", sendData, (data)=>{
                // currently no change is on the way anymore:
                this.dataSent = false;

                // change the (UU)ID as given by the server (if given: requests without writing stuff wont necessarily have an ID and certainly no new ID)
                if ('ID' in data){
                    this.ID = data.ID;
                }

                // delete the processed change (= first element) from the stack:
                let stackEl = this.stack.shift();

                // process the change --> call the respective function with the given data form the server and the client as arguments
                // when the overrideFunciton is given, call it. Otherwise use the same function as is called on any client receiving the change as broadcast.
                if (stackEl.functionOverride){
                    // TEST 2021-07-31: also provide the default function.
                    stackEl.functionOverride(data.data, this.functions[request.funcName]);
                } else{
                    this.functions[request.funcName](data.data);
                }

                // notify vue's
                this.onChange();
                
                // notify the room manager about the changed stack length
                this.eH.raise('roomInfoChange', this);

                if (this.stack.length>0){
                    this.sync()
                }
            }, (errCode, errMsg)=>{


                // differentiate different strategies for failure. To be chosen in stack.opt. 
                // TODO wsProcessor: merge cbAck into opt. This would make it easier to allow the cbAck also here without adding an additional parameter.

                // on failure: 
                // actually, what can we do on failure? Differentiate several cases: 
                // in some, we need to note the user and let him/her decide. In some a note is enough and some others we need to do nothing than wait for reconnect
                // the following error codes exist in wsProcessor
                /*success: response arrives, if requested, response-ack is sent
                *      - fail 1: (1) connection closed before requestTimeout 
                *        - fail 1.1: (2+3) ... after ack arrived
                *        - fail 1.2: (2) ... before ack arrived
                *                    (3) ... before ack arrived and before ack timed out 
                *        - fail 1.3: (3) ... after ack timed out
                *      - fail 2: (1) request timed out
                *        - fail 2.1: (2+3) ... after ack arrived
                *        - fail 2.2: (2) ... before ack arrived
                *                    (3) ... before ack arrived and before ack timed out; this should not exist, since the ackTimeout should be smaller than the requestTimeout; thus, if the request times out, the ack already has timed out.
                *        - fail 2.3: (3) ... after ack timed out
                *      - ackStatus 0: (2+3) ack arrived
                *      - ackStatus 1: (3) ack timed out; */


                // I think there are basically three different kinds of errors: (1) connection lost, (2) request timeout, (3) error during processing on the server.
                // Dependent on the error, a different error handling strategy might make sense
                
                /** The following error handling strategies are available: (independent on the errorCode, but they do not all make sense in every case)
                 * - (sendAgain) send again (makes only sense with errCode<4); if errorCode<2, will send as soon as connection is back.
                 * - (sendAgainTimeout) send again after timeout (makes only sense with errCode<4)
                 * - (deleteContinue) delete from stack, send the next request on the stack; notify user (e.g. for any "readonly" request, or as an alternative method on connection loss, assuming the server already processed it; however, since the server woudl directly anywer with the response if the last request is sent again, resending is probably the better option.)
                 * - (deleteRollback) delete from stack and do full rollback (if other requests might be based on this one.)
                 * - (deleteRollbackFullReload) delete from stack, do full rollback, and do a full reload as well. This is the un-overridable default for errorCode 13.
                 * - (smartDelete): choose between deleteContinue and deleteRollback whether the request is independent of others or not 
                 * - (user) specific function (userFunc(errCode, errMsg)) defined together with the request; userFunc should be defined
                 */

                // TODO: eventually add a rollback strategy that still tries to execute readOnly requests.

                //The errorHandling configuration is defined in opt.errorHandling (an array). Any number of rules can be given. They might define applicability limits in terms of a range the errorCode must be in ('to' and/or 'from') or in terms of an array of error codes that rule should match ('codes'). The first matching rule will be executed. There are default rules which are simply added to the end of the rules array, as a fallback.  
                //opt.errorHandling = [{from: 1, to: 3, rule:'sendAgainTimeout', timeout:10},{...}]
                // rule is mandatory, from and to are checked when present; the first applicable rule is used, the rules may have optional parameters such as a timeout until retry.
                
                // add default rules to the very end of the array (the first applicable rule will be used) 
                // IMPORTANT: the last rule must NOT have "to / from" to make sure that at least this rule is applied! 
                let defaultErrorHandling = [{rule:"deleteRollbackFullReload", from:13, to:13}, {rule:'sendAgain', from:1, to:1.5}, {rule:'sendAgain', from:3, to:3.5}, {rule:'sendAgainTimeout', from:2, to:2.5, timeout:opt.requestTimeout?opt.requestTimeout:10}, {rule:'smartDelete'}];
                if ('errorHandling' in opt){
                    opt.errorHandling = opt.errorHandling.concat(defaultErrorHandling);
                } else {
                    opt.errorHandling = defaultErrorHandling;
                }

                // Any error should be reported somehow to the user. Therefor, the roomManager provides a message system that can show messages, provide the download of reverted changes and may pop-up the message if needed. Currently, the messages shown and whether they will automatically pop up is linked to the applied rule. Only the 'user' rule will be default not create a message. This can be done in the user function. Eventually this is made a separate option in the future. 
                // Since every message should be translated, the strings are defined in the roomManagerDrawings, while here there are no strings!

                // FUTURE: 
                // allow the user to delete requests --> if this request is not readOnly, do rollback everythign from this element on!

                // because deleteContinue and deleteRollback are also used in smartDelete, we define them here
                var deleteContinue = (ruleObj)=>{
                    // ruleObj is the applied rule-object, containing among others the options for showing the errors.

                    this.logger.log(8, `Error while sending request "${JSON.stringify(this.stack[0].info)}" to server. Code: ${errCode}, Msg: ${errMsg}. Delete request and continue. (Room: ${this.name}, request content: ${JSON.stringify(request)})`);

                    if ("createErrMsg" in ruleObj ? ruleObj.createErrMsg : true){
                        let popupErrMsg = "popupErrMsg" in ruleObj ? ruleObj.popupErrMsg : false;
                        this.rM?.messageGeneralError(this, this.stack[0].info, errCode, errMsg, "deleteContinue", request, popupErrMsg)
                    }
                    if (ruleObj.customErrMsg){
                        ruleObj.customErrMsg(errCode, errMsg)
                    }

                    // rollback this element, delete its stackObj and sync the next element
                    // funcRolback might be undefined; it actually has no meaning for readonly changes, but only for writing changes, where deleteContinue is probably not used
                    if (this.stack[0].funcRollback){
                        this.stack[0].funcRollback();
                    }
                    this.stack.shift();
                    this.dataSent = false;
                    this.sync();
                    
                }

                // ruleObj is the applied rule-object, containing among others the options for showing the errors.
                var deleteRollback = (ruleObj)=>{

                    this.logger.log(8, `Error while sending request "${JSON.stringify(this.stack[0].info)}" to server. Code: ${errCode}, Msg: ${errMsg}. Delete and rollback the request. (Room: ${this.name}, request content: ${JSON.stringify(request)})`);

                    if ("createErrMsg" in ruleObj ? ruleObj.createErrMsg : true){
                        let popupErrMsg = "popupErrMsg" in ruleObj ? ruleObj.popupErrMsg : true;
                        this.rM?.messageGeneralError(this, this.stack[0].info, errCode, errMsg, "deleteRollback", request, popupErrMsg, this.stack)
                    }
                    if (ruleObj.customErrMsg){
                        ruleObj.customErrMsg(errCode, errMsg)
                    }

                    
                    // rollbackEverything (must be at the end so that the stackElement still exists!)
                    this.fullStackRollback()

                }

                var deleteRollbackFullReload = (ruleObj) =>{
                    // idea: basically here we could still process every readOnly message; however, at the time of the processing of the readOnly request it might be not of interest anymore or it might not be of interest if the other writing requests were not processed.

                    this.logger.log(8, `The client room (${this.name}) was outdated. All requests since and including "${this.stack[0].info}" are rolled back. Code: ${errCode}, Msg: ${errMsg}. (request content: ${request})`);

                    // display message to user
                    if ("createErrMsg" in ruleObj ? ruleObj.createErrMsg : true){
                        let popupErrMsg = "popupErrMsg" in ruleObj ? ruleObj.popupErrMsg : true;
                        this.rM?.messageOutdatedRollbackError(this, this.stack[0].info, request, popupErrMsg, this.stack)
                    }
                    if (ruleObj.customErrMsg){
                        ruleObj.customErrMsg(errCode, errMsg)
                    }

                    this.fullStackRollback();
                    this.getFullData(()=>{}, (msg, code)=>{
                        if (code<20){
                            // if it fails due to connection, simply try again after 5s
                            setTimeout(this.getFullData, 5000);
                        }
                    });
                }

                // there is one special case: errCode=13 means that the client is outdated and needs a fullReload. This ALWAYS results in a fullReload and a fullRollback
                // is now implement below!
                // if(errCode==13){

                //     // idea: basically here we could still process every readOnly message; however, at the time of the processing of the reqdOnly request it might be not of interest anymore or it might not be of interest if the other writing requests were not processed.

                //     this.logger.log(8, `The client room (${this.name}) was outdated. All requests since and including "${this.stack[0].info}" are rolled back. Code: ${errCode}, Msg: ${errMsg}. (request content: ${request})`);

                //     // display message to user
                //     if (opt.createErrMsg ? opt.createErrMsg : true){
                //         let popupErrMsg = opt.popupErrMsg ? opt.popupErrMsg : true;
                //         this.rM?.messageOutdatedRollbackError(this, this.stack[0].info, request, popupErrMsg, this.stack)
                //     }
                //     if (opt.customErrMsg){
                //         opt.customErrMsg(errCode, errMsg)
                //     }

                //     this.fullStackRollback();
                //     this.getFullData();

                //     // do not run the rest of the function
                //     return
                // }

                // go trough the rules and check whether they are applicable. Apply the first applicable one.
                for (let i=0;i<opt.errorHandling.length;i++){
                    let ruleObj = opt.errorHandling[i];
                    // check applicability first
                    if ("from" in ruleObj && ruleObj.from>errCode){
                        continue;
                    }
                    if ("to" in ruleObj && ruleObj.to<errCode){
                        continue;
                    }
                    if ('codes' in ruleObj && ruleObj.codes.indexOf(errCode)==-1){
                        // not in list:
                        continue;
                    }

                    // important override: if the errorCode is 13, there is no other option allowed than "deleteRollbackFullReload"
                    if (errCode==13){
                        ruleObj.rule = "deleteRollbackFullReload"; // !
                    }

                    // now handle the specific rule
                    if (ruleObj.rule=="sendAgain"){
                        // the data is still on the stack and will stay there.
                        // if this rule is applied when the connection was lost, sync will not be executed until the connection is back (inlc TabID reported) anyway:

                        this.logger.log(8, `Error while sending request "${JSON.stringify(this.stack[0].info)}" to server. Code: ${errCode}, Msg: ${errMsg}. Try to send the request again. (Room: ${this.name}, request content: ${JSON.stringify(request)})`);

                        // notify user
                        if ("createErrMsg" in ruleObj ? ruleObj.createErrMsg : true){
                            let popupErrMsg = "popupErrMsg" in ruleObj ? ruleObj.popupErrMsg : false;
                            this.rM?.messageGeneralError(this, this.stack[0].info, errCode, errMsg, "sendAgain", request, popupErrMsg)
                        }
                        if (ruleObj.customErrMsg){
                            ruleObj.customErrMsg(errCode, errMsg)
                        }
                        
                        this.sync();

                    } else if (ruleObj.rule == "deleteRollbackFullReload") {

                        deleteRollbackFullReload(ruleObj);

                    } else if (ruleObj.rule=="sendAgainTimeout"){

                        let timeout = ruleObj.timeout ? ruleObj.timeout : 5;

                        // keep dataSent=true until resending
                        setTimeout(()=>{
                            // whether there is a connection or not is checked in sync
                            // reset this.dataSent here (i.e. we prevent syncing in between!) and sync again
                            this.dataSent = false;
                            this.sync();

                        },1000*timeout)

                        this.logger.log(8, `Error while sending request "${JSON.stringify(this.stack[0].info)}" to server. Code: ${errCode}, Msg: ${errMsg}. Try to resend the request after a timeout. (Room: ${this.name}, request content: ${JSON.stringify(request)})`);

                        // notify user
                        if ("createErrMsg" in ruleObj ? ruleObj.createErrMsg : true){
                            let popupErrMsg = "popupErrMsg" in ruleObj ? ruleObj.popupErrMsg : false;
                            this.rM?.messageSendAgainTimeoutError(timeout, this, this.stack[0].info, errCode, errMsg, request, popupErrMsg)
                        }
                        if (ruleObj.customErrMsg){
                            ruleObj.customErrMsg(errCode, errMsg)
                        }

                    } else if (ruleObj.rule=="smartDelete"){
                        // if the request is considered as readOnly, an error will not be problematic for subseqeut requests to the server: 
                        if (opt.readOnly){
                            deleteContinue(ruleObj);
                        } else {
                            deleteRollback(ruleObj);
                        }

                    } else if (ruleObj.rule=="user"){
                        // simply call the provided function. Attention: the function must be appropriately implemented!

                        this.logger.log(8, `Error while sending request "${JSON.stringify(this.stack[0].info)}" to server. Code: ${errCode}, Msg: ${errMsg}. A user-function is executed for error handling. (Room: ${this.name}, request content: ${JSON.stringify(request)})`);

                        // do not add anything to the message system of the room manager; the called function could do this on its own  when needed. However, using the function is probably anyway better, since this will also allow to translate the respective errCode to the language of the user
                        ruleObj.userFunc(errCode, errMsg)

                    } else if (ruleObj.rule=="deleteContinue"){
                        deleteContinue(ruleObj)
                    } else if (ruleObj.rule=="deleteRollback"){
                        deleteRollback(ruleObj)
                    } else {
                        this.logger.log(8, `The error handling rule ${ruleObj.rule} does not exist. Thus the error cannot be handled appropriately. A full reload is done.`)
                        deleteRollbackFullReload({createErrMsg: true, popupErrMsg: true});
                    }

                    // terminate the loop
                    break;
                }

                // reset the stack on error and when onlineOnly=true
                if (this.onlineOnly){
                    this.stack = [];
                }

                // notify the room manager about the changed data
                this.eH.raise('roomInfoChange', this);

            }, this.stack[0].opt) 
        }
        
    }

    /**
     * Rollback of the full stack, starting with the last entry. Only call this function, when no changes are beeing processed on the server. If one or more funcRollback are undefined, reload the full data!
     */
    fullStackRollback(){
        let el;
        while (el=this.stack.pop()){
            if (el.funcRollback){
                el.funcRollback();
            } else {
                this.logger.log(20, "At least one rollback-function on the stack to do a full rollback on is undefined, i.e. the full data must be reloaded.")
                this.getFullData(()=>{}, (msg, code)=>{
                    if (code<20){
                        // if it fails due to connection, simply try again after 5s
                        setTimeout(this.getFullData, 5000);
                    }
                });
                break;
            }
            
        }
        this.dataSent = false;
    }

    /**
     * Register/link a new vue to this room
     * @param {roomClientVue} vue 
     */
    registerVue(vue){
        this.vues.push(vue);
    }

    /**
     * Unregister the view. To be done when the pageHandler changes the page or when a different page is loaded through http
     * @param {roomClientVue} vue 
     */
    unregisterVue(vue){
        let i = this.vues.indexOf(vue);
        if (i>=0){
            this.vues.splice(i,1);
        }

        // optional autoclose when no vues are left
        if (this.leaveWhenNoVue){
            this.leave();
        }
    }

    /**
     * called, when the server requests to close the room; in the default implementation, the roomClient will simply retry to connect again. This can be overridden by the inheriting class
     */
    close(){

        // close...
        this.connected = false;

        // if the connection is lost while a request was hanging, the response will never arrive, as the "reopened" connection is not reopened, but is a new one and the server will not be able to send the reponse through the new connection. The last sent (or probably sent) element will stay on the stack and it wil be tried to resend it. When no other change-requst was processed yet, then the server will reply the response directly without reprocessing it and otherwise will return an error and the client will reload everything. 
        this.dataSent = false;

        // notify the room manager about the changed data
        this.eH.raise('roomInfoChange', this);

        // called when the server closes the room (not necessarily the connection); this room might shall try to reconnect
        // try to reconnect every second
        let reEnterTimeout = 1;
        let tryAgain = ()=>{
            if (this.tabIdReported){
                if (!this.connected && !this.connecting){
                    //do not try to reconnect when we are connected (however, when tabIdset is correctly only reported once per running connection, this would not be necessary)
                    let success = ()=>{
                        this.logger.log(95, `Reconnecting room ${this.name} was successful.`)
                    };
                    let failure = (msg, code)=>{
                        this.logger.log(95, `Reconnecting room ${this.name} failed (code:${code}): ${msg}`)
                    };
                    this.connect(this.writingWanted, success, failure)
                    if (this.stack.length>0){
                        this.sync();
                    }
                }else {
                    setTimeout(tryAgain, reEnterTimeout*1000);
                }
            }  // if the tabId is not reported, then also the ws-connection was lost and retrying will be done as soon as the ws-connection is established again (via eventHandler)
        }
        setTimeout(tryAgain, reEnterTimeout*1000)
    }

    wsNoteIncoming(arg, opt){
        if (arg=='function'){
			this.logger.log(99, "Incoming change: " + opt)

			this.incomingChange(opt);

		} else if (arg == 'infoUpdate'){
			this.infoUpdate(opt)

		} else if (arg == 'fullData'){
            this.ID = opt.ID;
            // transfer the data element by element, such that "change-events" are raised on the properties and vue can react
            this.propertyTransfer(opt.data, this.data)

            // notify the room manager about the changed data
            this.eH.raise('roomInfoChange', this);

            this.afterFullreload();
			
		} else if (arg == 'IDchange'){
			// only update the current ID, e.g. when a change occureds on the server, which has no effect on the dataset on the client
			this.ID = opt;
            
            // notify the room manager about the changed data
            this.eH.raise('roomInfoChange', this);
		} else if (arg == 'close'){
            
            this.logger.log(30, `The room gets closed due to request by the server.`)

            this.close();
        } else if (arg == 'writingTicketRevoked'){
            // called when the server revokes the writing ticket of an actually active client. This mainly (or even only) can happen when the server changes from main to secondary mode

            this.deleteWritingTicketID();
            // notify the room manager about the changed data
            this.eH.raise('roomInfoChange', this);

            this.logger.log(30, `The writing ticket was revoked by the server.`)

        } else {
			this.logger.log(5, "unknown arg-value ('" + arg + "') in room-note.");
		}
    }



    /**
     * returns the index and the object itself of the first object where the property prop is equal to value 
     * @param {array of objects} arr the array
     * @param {string} prop the property to look for
     * @param {*} val the value the property should have
     */
    findObjInArrayByProp(arr, prop, val){
        for (let i=0; i<arr.length;i++){
            if (arr[i][prop] == val){
                return [i, arr[i]];
            }
        }
        return [-1, {}];
    }

    /**
     * Transfer the values of the properties in objFrom to the properties in objTo. Recursive. 
     * If updateOnly=false (default), then properties that do exist only in objTo will be deleted. 
     * @param {object or array} objFrom 
     * @param {object or array} objTo 
     * @param {boolean} updateOnly If true, properties in objTo are not deleted when they do not exist in objFrom. Default: false 
     */
    propertyTransfer(objFrom, objTo, updateOnly=false){

        if (Array.isArray(objFrom)){

            if (!Array.isArray(objTo)){
                console.log('objTo was not of type array, but objFrom was. The property transfer would fail and thus is aborted.')
                return
            }

            // use pop and push to alter the length of the array. Note that we do not detect moved elements. We rather delete or add elements at the end and just transfer the values at each position. (Push is actually not needed, since assigning to elements outside the range is possible.)
            while (objTo.length>objFrom.length){
                objTo.pop();
            }
            /*
            let l = objTo.length; 
            for (let i=0;i<l-objFrom.length;i++){
                // delete the last elements
                objTo.pop();
            }*/

            // copy the elements
            for (let i=0;i<objFrom.length;i++){
                // pay attention to objects and arrays --> recursive calls needed
                if (typeof(objFrom[i])=='object'){
                    // since typeof(null)=object, we have to handle this separately here
                    if (objTo[i]===null){
                        objTo[i] = objFrom[i];
                    } else if (typeof(objTo[i])!='object'){
                        // if this is not done here and if objTo[i] is just a property, the recursive call on propertyTransfer will not occur byReference, as it must be to work.
                        if (Array.isArray(objFrom[i])){
                            objTo[i] = [];
                        } else {
                            objTo[i] = {};
                        }
                    } else {
                        // typeof(null)=object; therefore
                        // is it of the same type? otherwise reset the element in objTo
                        if (Array.isArray(objTo[i]) && !Array.isArray(objFrom[i])){
                            objTo[i] = {};
                        } else if (!Array.isArray(objTo[i]) && Array.isArray(objFrom[i])){
                            objTo[i] = [];
                        }
                    }
                    this.propertyTransfer(objFrom[i], objTo[i], updateOnly);
                } else {
                    objTo[i] = objFrom[i];
                }
            }
            
        } else {

            if (Array.isArray(objTo)){
                console.log('objTo was of type array, but should be a normal object as objFrom. The property transfer would fail and thus is aborted.')
                return
            }

            // is a regular object
            // copy new to objTo
            for (let prop in objFrom){
                if (typeof(objFrom[prop])=='object' && objFrom[prop] != null){ // null interestingly is an object...

                    if (!(prop in objTo)){
                        if (Array.isArray(objFrom[prop])){
                            objTo[prop] = [];
                        } else {
                            objTo[prop] = {};
                        }
                    } else {
                        // is it of the same type? otherwise reset the property in objTo
                        if ((typeof(objTo[prop])!='object' || objTo[prop]===null || Array.isArray(objTo[prop])) && !Array.isArray(objFrom[prop])){
                            objTo[prop] = {};
                        } else if ((typeof(objTo[prop])!='object' || objTo[prop]===null || !Array.isArray(objTo[prop])) && Array.isArray(objFrom[prop])){
                            objTo[prop] = [];
                        }
                    }
                    // transfer the property
                    this.propertyTransfer(objFrom[prop], objTo[prop], updateOnly);
                } else {
                    // just copy from/to
                    // the problem is that if properties are added in the property transfer, using the simple assignement does not raise any observer set by Vue. Thus vue will not be updated! 
                    objTo[prop] = objFrom[prop];

                    // TEST: if the property is not available in objTo, do not assign it to a property, but use a method that is observed
                    //objTo = Object.assign(objTo, {[prop]:objFrom[prop]}) // does not work

                }
            }
            // delete all properties in objTo, which are not present in objFrom
            if (!updateOnly){
                for (let prop in objTo){
                    if (!(prop in objFrom)){
                        delete objTo[prop];
                    }
                }
            }
        }


    }

    /**
     * Test functions for the propprty transfer
     */
    propertyTransferTest(){
        // each call either with/out delete

        // object on top level
        let from = {};
        let to = {};
        from = {hello:'world', 12:27, nestedArr: ['no', 'worries', ['another', 'one'], 54, {}], nestedObj: {doesIt: 'work?', b: true}, propWrongAvail1:{test:1}, propWrongAvail2:{test:2}, propWrongAvail3:[12,13], propWrongAvail4:[14,15]};
        to = {propWrongAvail1:1, propWrongAvail2:['array instead of object'], propWrongAvail3:3, propWrongAvail4:{obj:'instead of array'}, doesnt:'exist in from'};
        this.propertyTransfer(from, to, false);
        console.log(from, to); // result should be to=from (however, as there is a different sort order, the json stringify doesnt work)
        console.log(JSON.stringify(from)==JSON.stringify(to))
        from = {hello:'world', 12:27, nestedArr: ['no', 'worries', ['another', 'one'], 54, {}], nestedObj: {doesIt: 'work?', b: true}, propWrongAvail1:{test:1}, propWrongAvail2:{test:2}, propWrongAvail3:[12,13], propWrongAvail4:[14,15]};
        to = {propWrongAvail1:1, propWrongAvail2:['array instead of object'], propWrongAvail3:3, propWrongAvail4:{obj:'instead of array'}, doesnt:'exist in from'};
        this.propertyTransfer(from, to, true);
        console.log(from, to); // result should be to<>from
        console.log(JSON.stringify(from)==JSON.stringify(to))
        to = [1,2,3];
        from = {o:'changed'};
        this.propertyTransfer(from, to, false); 
        console.log(from, to); // result result in a console message and non working transfer
        console.log(JSON.stringify(from)==JSON.stringify(to))

        // this tests everything with objFrom=array:
        from = [['another', 'one'], 54, {o:'bject in array'}, {obj:'again'}, {some:'property'}, ['array']];
        to = [1,2,{o:'changed', to:'was already here'},4,['array instead of object'],{obj:'instead of array'},7, 8, 9,'the end'];
        this.propertyTransfer(from, to, false);
        console.log(from, to); // result should be to=from
        console.log(JSON.stringify(from)==JSON.stringify(to))
        from = [['another', 'one'], 54, {o:'bject in array'}, {obj:'again'}];
        to = [1,2,{o:'changed', to:'was already here'},4,5,6,7, 8,9,'the end'];
        this.propertyTransfer(from, to, true);
        console.log(from, to); // result should be to<>from
        console.log(JSON.stringify(from)==JSON.stringify(to))
        from = [1,2,3];
        to = {o:'changed'};
        this.propertyTransfer(from, to, false); 
        console.log(from, to); // result result in a console message and non working transfer
        console.log(JSON.stringify(from)==JSON.stringify(to))
        

    }

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

}

/**
 * A class to be "instantiated" for each Vue-instance.
 * @param {string} datasetName optional, The name of the dataset within this room
 * TODO: remove the automatic 'getRoom' stuff and storing "the" room in this.room. Make it more flexible to allow for multiple rooms, respectively delegate these decisions to the inheriting class of the roomClientVue.
 */
class roomClientVue{

    constructor(roomName, writing, storeInfos, path, className, datasetName=''){

        // getting a room must be async, since loading a new room requires dynamic importing of code, which is async!

        // get the room/startup the room (is async!)
        // (v, roomName, writing=false, storeInfos=true, path='', className='', datasetName='')
        rM.getRoom(this, roomName, writing, storeInfos, path, className, datasetName).then(room => {
            this.room = room;
            //this.roomData = room.data;

            // raise event that the room (and probably the data) is now present
            this.onRoomLinked();

        }).catch((err)=>{
            // logger does nto exist here
            console.log(`The vue could not get the requested room (${roomName}): ${err}`);
        })
    }

    // solution for the present problem: make sure that the undefined property is already present; otherwise it is not a change, but a new property. Eventually we also had to add the new property differenty than it is done, to make sure it raises an get/set event somehow. 

    onRoomLinked(){

    }

    onWritingTicketChange(){

    }

    afterFullreload(){

    }

    // called whenever a change is made, except at full reload (afterFullReload is called then)
    onChange(){

    }

    /**
     * dataArrived: Function called as soon as the data has arrived for the first time
     */
    dataArrived(){
        // raised as soon as the room has its data stored for the first time
        // by default, do the same as afterFullReload.
        this.afterFullreload()
    }

    // unregister this vue at the room. The room then will eventually automatically close itself.
    unregister(){
        this.room.unregisterVue(this); 
    }
}