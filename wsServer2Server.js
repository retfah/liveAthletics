import WebSocket from  'ws'
import wsProcessor from 'wsprocessor'; // acknowledged websocket messages
import {uuidv4} from './common.js';

// if the hostname is not found (DNS requst failed), first the error event is raised with errno="-3008" and code="ENOTFOUND"; then the close event is raised and error the error occurs very rapidly. This happens instantly as soon as the DNS request return "not found"
// if the hostname is found, but no server answers on the given IP/port, first an error with errno="-4039" and code=ETIMEDOUT is raised, then the closure event. It takes approximately 22s until the event is raised. 


export default class wsManager{

    constructor(logger = {log: (code, msg)=>{}}, eH, requestHandlerCreator, noteHandlerCreator){
        this.connections = {}; // object for each connection; name of the properties is host/port/path
        this.logger = logger;
        this.eH = eH;

        this.requestHandlerCreator = requestHandlerCreator;
        this.noteHandlerCreator = noteHandlerCreator;

        // create the validator for all kinds of messages:
        // Note: compile (i.e. translate the schema to a validation function) the message valoidator only once instaed of using ajv.validate(schema, message), where the schema must be compiled at every check!
        /*let messageSchema = {
            type: "object",
            properties: {
                name:{type:'string', description:'name of the function to call'},
                data: {type:"object"} // i dont know yet how we can have type: any or denpent on the name...
            },
            "required":['name']
        };
        this.validateMessage = ajv.compile(messageSchema);*/
    }

    returnConnection(meetingName, host, port, path='/ws', secure=true){

        // assuming that the rooms are no linked anymore. So simply destroy the connection, if it is not used by another room. 

        let connectionName = `${host}/${port}/${path}/${secure.toString()}`;
        if (connectionName in this.connections){
            let ind = this.connections[connectionName].meetings.indexOf(meetingName);
            if (ind>=0){
                this.connections[connectionName].meetings.splice(ind,1);

                // if there are no connections anymore, close the ws-connection
                if (this.connections[connectionName].meetings.length==0){
                    this.connections[connectionName].conn.close();
                    delete this.connections[connectionName];
                }

                return true;
            }
        }
        this.logger.log(20, `Could not unregister the meeting ${meetingName} from the server2server ws-connection ${connectionName}`)
        return false;
    }

    /**
     * 
     * @param {string} meetingName The name of the meeting requesting the connection
     * @param {string} host 
     * @param {string} port 
     * @param {string} path 
     * @param {boolean} secure use https instead of http
     */
    getConnection(meetingName, host, port, path='/ws', secure=true){
        
        let connectionName = `${host}/${port}/${path}/${secure.toString()}`;
        if (connectionName in this.connections){

            // register the meeting
            this.connections[connectionName].meetings.push(meetingName);
            return this.connections[connectionName].conn;

        } else {
            // try to create the connection
            var conn;

            conn = new websocketServer2Server(host, port, path, this.eH, this.logger, this.noteHandlerCreator, this.requestHandlerCreator, secure) 
            
            this.connections[connectionName] = {
                conn,
                meetings:[meetingName],
            }

            return conn;
        }

    }

}



/**
 * Handles everything with the websocket connection
 * - create and stop the connection
 * - register for broadcasts (can be understood as events)
 * - continuouly test the connection and react when it is lost
 * - process the events to their recipients
 * - currently receiving requests/broadcasts is NOT coded!
 * 
 * @class websocketServer2Server, bases on socketProcessor2 for the client
 */
class websocketServer2Server{
    // as the first one, but for bare Websockets, without io.js 

    /**
     * constructor
     * TODO: probably noteHandling and requestHandling should be given as arguments and not programmed in this function here
     * @param 
     */

    /**
     * 
     * @param {string} host 
     * @param {integer} port default:3000
     * @param {object} logger The logger object to log errors etc
     * @param {boolean} secure default: true; whether or not to use https/wss (encryption) instead of http/ws
     */
    constructor(host, port=3000, path='/ws', eventHandler, logger, noteHandlerCreator, requestHandlerCreator, secure=true){

        this.host = host;
        this.path = path;
        this.port = port;
        this.logger = logger;
        this.eH = eventHandler;
        this.secure = secure; 

        //this.rMeetings = rMeetings;

        // we need some "strange" circle reference: the requestHandling must be a parameter in the creation of the wsProcessor, but the wsProcessor itself is part of the requestHandler... Additionally, the handlers must have access to the rooms in the main (Server.js) file.
        // Therefore, the handlers are functions defined in the main room, but which get access to the necessary stuff here.
        this.noteHandlerCreator = noteHandlerCreator;
        this.requestHandlerCreator = requestHandlerCreator;


        // currently not yet connected
        this.connected = false;
        this.tabIdReported = false; 

        // create a new tabId (used on the server to identify the ws-connection)
        this.tabId = uuidv4();
        console.log(this.tabId);

        this.autoReconnect = true;

        // as of 22.04.2019, the wsconnection is set in its own function, allowing the wsconnection-object to change, which is needed when the connection fails and a new one has to be opened. 

        // create the empty object for the connection and then start a new one
        this.wsconn = undefined;
        this._startConnection();

        // use the tabId as the identifier for events for the connection to this server. Therefore return the tabId
        return this;

    }

    close(){
        // close this connection; 
        this.autoReconnect = false; // prevent instant reconnection...
        this.wsconn.close();
    }

    // this funciton shall initialize a new connection. It will overwrite the old connection handle. The auto-restart is handled in the onclose- and onerror-events. 
    _startConnection(){

        // start the new connection
        // open the connection
        let fullPath = '';
        if (this.secure){
            fullPath = `wss://${this.host}:${this.port}${this.path}`;
        } else {
            fullPath = `ws://${this.host}:${this.port}${this.path}`;
        }

        this.wsconn = new WebSocket(fullPath); 
        this.wsconn.addEventListener('open', (event)=>{
            this.logger.log(90, `Websocket successfully connected to ${fullPath}; start wsProcessor`);

            this.connected = true;
            this.eH.raise(`wsConnected/${this.tabId}`, true);

            var logTranslate = (errCode, errMsg)=>{
                if (errCode==0){ // unrepoerted errors (e.g. unprocessable packages)
                    this.logger.log(10, errMsg)
                } else if (errCode==1){ // errors reported already through callback
                    this.logger.log(20, errMsg)
                } else if (errCode==2){ //unused
                    this.logger.log(50, errMsg)
                } else if (errCode==3){ //every message sent/arriving, except ping
                    this.logger.log(90, errMsg)
                } else if (errCode==4){ //even ping/pong
                    this.logger.log(99, errMsg)
                } else {
                    this.logger.log(99, errMsg)
                }
            }

            // new wsProcessor
            //this.wsProcessor = new wsExtensionClass((mess)=>{this.wsconn.send(mess);}, ()=>{this.wsconn.close()}, this.noteHandling, this.requestHandling, logTranslate);
            const wsProcessorInstance = new wsProcessor((mess)=>{this.wsconn.send(mess);}, ()=>{this.wsconn.close()}, noteHandler.bind(this), requestHandler.bind(this), logTranslate, {heartbeatMinInterval: 6});
            
            // create a fake ws object with tabID and session.id to make sure roomServer does not crash
            let ws = {
                tabID: this.tabId,
                session:{
                    id: uuidv4(),
                }
            } 

            // we  need to put this here and not directly in the wsProcessor creation, since then the wsProcessorInstance would be undefined at the time of calling the creator function and it owuld not be "updated" later, as it is the case for the requestHandler here.
            // A functino is hoisted; but we have to bind this to make it work
            function requestHandler(request, responseFunc){

                // The following usage of the tabId is not very proper: we define the tabId here and use it as if it was the tabId of the client that sends the requests. Why is this required? In the regular client=browser to server connection, of course only the browser has a tabId. So here with server2server connection, it is a little strange: The server that initiates the connection defines the tabId, which is then however used on both servers!
                // ATTENTION: this could lead to strange behavior when we have multiple meetings connected between two servers, since the same tabId will be used in all meetings.

                this.requestHandlerCreator(wsProcessorInstance, ws)(request, responseFunc);
            }
            function noteHandler(note){
                this.noteHandlerCreator(wsProcessorInstance, ws)(note);
            }
            this.wsProcessor = wsProcessorInstance;
            

            // new: the sid should already be known to the server directly via the cookie. But we need to report a tabID. The tabID should persist as long as no http-(re)load occurs. 
            this.logger.log(90, `wsProcessor started for ${fullPath}; report tabID`)

            // report the tabId 
            const setTabId = ()=>{

                this.emitRequest('setTabId', this.tabId, (data)=>{
                    if (data){
                        this.tabIdReported=true;
                        this.eH.raise(`TabIdSet/${this.tabId}`, this.tabId); // event is needed e.g. for connecting rooms
                        this.logger.log(90,`tabId reported for ${fullPath}`);
                    }
                }, (errCode, errMsg)=>{
                    //TODO: error-handling
                    console.log(`error setting tabId: ${errMsg} ${errCode}`)
                }); 

                // make sure the token+tabId get set --> test every two seconds if it worked already or start over 
                let timeout = 2000;
                setTimeout(()=>{
                    if (!this.tabIdReported){
                        this.logger.log(30, `tabId for ${fullPath} not reported yet. Try again in ${timeout/1000}s.`)
                        setTabId();
                    }
                }, timeout)
            }
            setTabId();

            // must set the wsProcessor to handle the incoming messages. 
            this.wsconn.addEventListener('message', (mess)=>{
                this.wsProcessor.onMessage(mess.data);
            });

        });
        this.wsconn.addEventListener('close', (code, reason)=>{
            // it's important that first the connection is declared closed and then the autoReconnect is started (if requested)

            // old: this.wsProcessor.closing = true;
            if (this.wsProcessor){
                this.wsProcessor.close();
            }
            this.connected = false;
            this.tabIdReported = false;
            
            this.eH.raise(`wsClosed/${this.tabId}`, true);
            
            this.logger.log(95,`(former) ws-connection (${fullPath}) closing.`); // this can either by by the server or by the client

            if (this.autoReconnect){
                setTimeout(()=>{
                    this._startConnection();

                }, 2000); // do not  instantly retry, but after some time
            }
        });
        
        this.wsconn.addEventListener('error', (error)=>{
            // raised e.g. when the connection is lost
            // simply always officially close the old connection and start a new one (if autoReconnect=true)

            // first already set the connection as closing in the wsProcessor. Then it wont try to send more data over this connection and calls failure on every connection. 
            if (this.wsProcessor){
                this.wsProcessor.closing = true;
            }
            
            this.wsconn.close();

            // raise the failure event
            this.eH.raise(`wsError/${this.tabId}`, error);

        });


        // both TODO!
    }

    

    /**
     * emit: while the sendRequest of the processor simply sends a message, we implement here the counterpart of 'requestHandling', that will be called with the data we constitute here. Our data simply consists of the name of the event to be called and the data itself
     * @param {String} eventName the name of the event, defines the funciton called on the server
     * @param {Object} data Optional (default={}), can be of any type; Server simply must expect the same under that eventName
     * @param {Function} success Optional, a function with max one parameter (data) that is called when the data is acknowledged by the server 
     * @param {Function} failure Optional, a function with two parameters: errMsg and errCode; called when the websocket request failed (either due to problems on the server or in the transmission)
     * @param {object} opt See wsProcessor for options
     * @param {Function} cbAck Optional, a function with two parameters which reports the acknowledgement status (only if requested in opt)
     */
    emitRequest(eventName, data={}, success=(response)=>{}, failure=(errCode, errMsg)=>{}, opt={}, cbAck=(statusCode, statusMsg)=>{}){
        // should actually been checked already
        if (this.connected){
            //request, cbSuccess=(response)=>{}, cbFailure=(errCode, errMsg)=>{}, opt={}, cbAck=(statusCode, statusMsg)=>{}
            this.wsProcessor.sendRequest({name:eventName, 'data':data}, success, failure, opt, cbAck)
        } else {
            // directly call the failure callback
            failure(3, 'Connection was closed before the reqeust could be sent.');
        }
    }

    /**
     * surround the actual note with the eventName and send it
     * @param {*} eventName 
     * @param {*} data 
     * @param {object} opt See wsProcessor for options (sendNote)
     * @param {Function} cbAck Optional, a function with two parameters which reports the acknowledgement status (only if requested in opt)
     */
    emitNote(eventName, data={}, opt={}, cbAck=(statusCode, statusMsg)=>{}){
        // should actually been checked already
        if (this.connected){
            // note, opt={}, cbAck=(errCode, errMsg)=>{}
            this.wsProcessor.sendNote({name:eventName, 'data':data}, opt, cbAck)
        } else {
            if (opt.sendAck){
                cbAck(3, 'Connection was closed before the note could be sent.')
            }
        }
    }


    /**
     * emitRequestPromise: send a request; the responce is passed via a promise. Rejection happens when either the request times out or if an error occurs either on the server or during transmission.
     * @param {string} eventName the name of the event used; the reply is assumed to be the same, but with 'R' in front
     * @param {object} data the data to be sent
     * @param {milliseconds} timeout the timeout (ms) after which the request is deemed failed, default=2000 ms, put to zero for no timeout
     * @returns {Promise} On resolve/success, the data is returned, noting if the the Promise is rejected
     */
    emitRequestPromise(eventName, data={}, timeout=2000){

        // create a promise
        const res = new Promise((resolve, reject)=>{

            this.wsProcessor.sendRequest({name:eventName, 'data':data}, (data)=>{resolve(data);}, ()=>{reject()});
        
            // what happens if we reject if the Promise was already successful? if nothing, tho following works
            // TODO: check this!!!!!
            if (timeout>0){
                setTimeout(() => {reject(); }, timeout);
            }
        });

        // return the promise
        return res; 
    }

}


export {websocketServer2Server as wsServer2Server, wsManager};
