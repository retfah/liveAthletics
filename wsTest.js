import WebSocket from  'ws'
import wsProcessor from 'wsprocessor'; // acknowledged websocket messages

// what happens if the connection cannot be found? When does it raise what event?
const conn = new WebSocket('ws://really.noexistant.com');
//const conn = new WebSocket('ws://rfjm.myqnapcloud.com');

conn.addEventListener('open',()=>{
    console.log('open')
})

conn.addEventListener('close', (code, reason)=>{
    console.log(`Closed; code: ${JSON.stringify(code)}; reason: ${reason}`)
})

conn.addEventListener('error', (error)=>{
    console.log(`Error: ${JSON.stringify(error)}`)
})

conn.addEventListener('message', (message)=>{
    console.log(`Message: ${message}`)
})

console.log('here');

// if the hostname is not found (DNS requst failed), first the error event is raised with errno="-3008" and code="ENOTFOUND"; then the close event is raised and error the error occurs very rapidly. This happens instantly as soon as the DNS request return "not found"
// if the hostname is found, but no server answers on the given IP/port, first an error with errno="-4039" and code=ETIMEDOUT is raised, then the closure event. It takes approximately 22s until the event is raised. 


const wsManager = {
    connections: {}, // object for each connection; name of the properties is host/port/path

    returnConnection: function(meetingName, host, port, path='/ws', secure=true){

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
        logger.log(20, `Could not unregister the meeting ${meetingName} from the server2server ws-connection ${connectionName}`)
        return false;
    },

    /**
     * 
     * @param {string} meetingName The name of the meeting requesting the connection
     * @param {string} host 
     * @param {string} port 
     * @param {string} path 
     * @param {boolean} secure use https instead of http
     */
    getConnection: function(meetingName, host, port, path='/ws', secure=true){
        
        let connectionName = `${host}/${port}/${path}/${secure.toString()}`;
        if (connectionName in this.connections){

            // register the meeting
            this.connections[connectionName].meetings.push(meetingName);
            return this.connections[connectionName].conn;

        } else {
            // try to create the connection
            var conn;

            // first, prepare the request and note handler
            let noteHandler = (note)=>{
                // probably we need to differentiate here mainly the different meetings and let the sidechannel in each room handle the rest.
                
                // every broadcasted change will arrive here.

                console.log(note)
            }

            let requestHandler = (request)=>{
                // probably we need to differentiate here mainly the different meetings and let the sidechannel in each room handle the rest.
                
                // a request could e.g. be a secondary server that wants all the changes since a certain ID (when it was connected last)

                console.log(request);
            }

            let eventHandler = {raise:()=>{}};
            let logger = {log: (code, msg)=>{console.log(`${code}: ${msg}`)}};

            conn = new websocketServer2Server(host, port, path, eventHandler, logger, noteHandler, requestHandler, secure) 
            
            this.connections[connectionName] = {
                conn,
                meetings:[meetingName],
            }
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
    constructor(host, port=3000, path='/ws', eventHandler, logger, noteHandling, requestHandling, secure=true){

        this.host = host;
        this.path = path;
        this.port = port;
        this.logger = logger;
        this.eH = eventHandler;
        this.secure = secure; 
        this.noteHandling = noteHandling;
        this.requestHandling = requestHandling;


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
            this.wsProcessor = new wsProcessor((mess)=>{this.wsconn.send(mess);}, ()=>{this.wsconn.close()}, this.noteHandling, this.requestHandling, logTranslate, {heartbeatMinInterval: 6});

            // new: the sid should already be known to the server directly via the cookie. But we need to report a tabID. The tabID should persist as long as no http-(re)load occurs. 
            this.logger.log(90, `wsProcessor started for ${fullPath}; report tabID`)

            // report the tabId 
            const setTabId = ()=>{

                this.emitRequest('setTabId', this.tabId, (data)=>{
                    if (data){
                        this.tabIdReported=true;
                        this.eH.raise(`TabIdSet/${this.tabId}`, this.tabId); // event is needed e.g. for connecting rooms
                        this.logger.log(99,`tabId reported for ${fullPath}`);
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
            // did not find exactly when this is raised...
            // simply always officially close the old connection and start a new one (if autoReconnect=true)

            // first already set the connection as closing in the wsProcessor. Then it wont try to send more data over this connection and calls failure on every connection. 
            if (this.wsProcessor){
                this.wsProcessor.closing = true;
            }
            
            this.wsconn.close();
            // TODO
            // eventually call all failure callbacks of the current stacks in wsProcessor..?

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


// test the websocketServer2Server
//let wsS2S = new websocketServer2Server('localhost', 3000, '/ws', {raise:()=>{}},{log: (code, msg)=>{console.log(`${code}: ${msg}`)}}, (note)=>{console.log(note)}, (request)=>{console.log(request)}, false)

let connection = wsManager.getConnection('test', 'localhost', 3000, '/ws', false)

setTimeout(()=>{

    wsManager.returnConnection('test', 'localhost', 3000, '/ws', false)
    console.log('connection left');
}, 10000)


function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
    });
}

// BACKUP OLD CODE

// so far there are no notes sent from the server to the clients. Might be the case e.g. to report errors on the server to (all/Admin) clients.
    /**
     * noteHandling: handling the incoming notes. Must have one argument, so it can be used in the wsProcessor directly. Currently this is unused yet, as so far everything is a request...
     * IMPORTANT TODO: make sure that notes of the wrong data type do not crash the server!
     * @param {any} note The data that was sent. could be any datatype, as defined on client and server as soon it is used. 
     */
     function noteHandling(note){
        this.logger.log(99, note);

        // TODO: check the input format first.
        if (!('name' in note && 'data' in note)){
            this.logger.log(5, 'Each note must have a name and a data argument! note: ' + JSON.stringify(note));
            return;
        }

        let name = note.name;
        let data = note.data;

        if (name=='room'){

            // further stuff handled in the roomManager
            rM.wsNoteIncoming(data);

        } else if (name='something else'){
            // TODO
        } else {
            let errMsg = '"'+ name +'" does not exist as keyword for Websocket notes.';
            this.logger.log(5, errMsg);
        }
    }
    

    // so far there are no requests from the server to the client. 
    /**
     * requestHandling: handles the incoming requests. Must ave two arguments, so it can be used in the wsProcessor directly. 
     * IMPORTANT TODO: make sure that requests of the wrong data type do not crash the server!
     * @param {json} request The request as a json: first the name of the function to call with the given data 
     * @param {string} request.name The name of the request
     * @param {any} request.data The data that needs to be given to the function handling the request of this name
     * @param {function(message, failure=false)} responseFunc The function that has to be called with the response as the first argument. If an error shall be reported, the second argument must be true and the first parameter is the error-message.
     */
    function requestHandling(request, responseFunc){
        
        // TODO: add checks for the datatype, where needed
        // request must be a json with two properties name and data
        // idea: write a general data-type testing function or download such a function from the internet (tell it in some way, how the file must look like (what properties of what data type) and let it proof it; must work for any depth of json --> recursive programming)

        // we assume for now that the input has the right format..:
        // e.g. request={name='preloadpage', data='the workload, which could be a json again with arbitrary depth'}
        
        let name = request.name;
        let data = request.data;

        // TODO: eventually put all the following single parts in separate function. An general event system can hardly be used here as we do not simply call an event, but we also need to send back something, which would (1) not be guaranteed through the event system and (2) it would not be clear how to work with it when there are multiple listeners.

        
        if (name=='someNameOfARequest'){
            /**
             * do something with the received data.
             */

        }
        else { 
            let errMsg = '"'+ name +'" does not exist as keyword for Websocket requests.';
            this.logger.log(5, errMsg);
            // send something back, that there was an error on the server.
            responseFunc(errMsg, 1);
        }
    }
