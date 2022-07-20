class socketProcessor2{
    // as the first one, but for bare Websockets, without io.js 

    /**
     * constructor
     * TODO: probably noteHandling and requestHandling should be given as arguments and not programmed in this function here
     */
    constructor(){

        // currently not yet connected
        this.connected = false;
        this.sidReported = false;

        var self = this;

        // open the connection
        var wsconn = new WebSocket("ws://" +window.location.hostname+":3001");
        wsconn.onopen = (event)=>{
            logger.log(90, 'websocket successfully connected; start wsProcessor');

            this.connected = true;
            eH.raise('wsConnected', true);

            // new wsExtensionClass
            this.wsProcessor = new wsExtensionClass((mess)=>{wsconn.send(mess);}, this.noteHandling, this.requestHandling, logger);

            logger.log(90, 'wsProcessor started; report sid')

            var sid = getCookie('connect.sid'); // connect.sid is the default name used by express-session--> make sure this is the same as set on its initialization
            if (sid){
                setSid()
            }else{
                logger.log(1, 'Severe error: Client did not get a session ID. Preloading and most websocket-stuff is not possible!'); 
            }

            function setSid(){

                self.emitRequest('setSid', sid, (data)=>{
                    if (data){
                        self.sidReported=true;
                        eH.raise('SIDset', true); // event is needed e.g. for connecting rooms
                    }
                }, (errMsg, errCode)=>{}); //TODO: error-handling

                // make sure the language gets set --> test every two seconds if it worked already or start over 
                setTimeout(()=>{
                    if (!self.sidReported){
                        setSid()
                    }
                }, 2000)
            }


            // must set the wsProcessor to handle the incoming messages. 
            wsconn.onmessage = (mess)=>{this.wsProcessor._onMessage(mess.data);};

            // TESTING: 
            // send a note with acknowledgement --> works
            // wsProcessor.sendNoteAck("This note with ack is sent.", ()=>{console.log("success!");}, ()=>{console.log("failed!");})

            // send a request
            this.wsProcessor.sendRequest("This request is sent.", (response)=>{console.log(response);}, ()=>{console.log('request failed.');})

        };
        wsconn.onclose = (event)=>{
            // TODO: handle this event appropriately

            this.connected = false;
            this.sidReported = false;
            eH.raise('wsClosing', true);

            logger.log(95,'ws-connection closed. Trying to reconnect every second.'); // this can either by by the server or by the client

            // or does it anyway try ton reconnect automatically when there is a WebSocket object?
            setTimeout(cb,1000, args);
        }

        wsconn.onerror = (event)=>{
            // did not find exactly when this is raised...
            // simply always officially close the old connection an start a new one.
            wsconn.close();
            // TODO
            // eventually call all failure callbacks of the current stacks in wsProcessor..?

        }







        
        
        /**
         * EVENTS (Socket internal):
         */
        // this is how all incoming messages were handled before:
        /*
        this._ws.on('*', (event, data)=>{
            // every event is processed here:
            logger.log(99, 'Event ' + event + ' with data '+ data + ' is recieved.')

            // we simply send every event from the server to our local event handler, that will distribute the event to the listening function, that we dont know here yet
            eH.raise(event, data);
        })*/

    }

    // so far there are no notes sent from the server to the clients. Might be the case e.g. to report errors on the server to (all/Admin) clients.
    /**
     * noteHandling: handling the incoming notes. Must have one argument, so it can be used in the wsProcessor directly. Currently this is unused yet, as so far everything is a request...
     * IMPORTANT TODO: make sure that notes of the wrong data type do not crash the server!
     * @param {any} note The data that was sent. could be any datatype, as defined on client and server as soon it is used. 
     */
    noteHandling(note){
        logger.log(1, note);
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
    requestHandling(request, responseFunc){
        
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
            logger.log(5, errMsg);
            // send something back, that there was an error on the server.
            responseFunc(errMsg, true);
        }
    }



    /**
     * emit: while the sendRequest of the processor simply sends a message, we implement here the counterpart of 'requestHandling', that will be called with the data we constitute here. Our data simply consists of the name of the event to be called and the data itself
     * @param {String} eventName the name of the event, defines the funciton called on the server
     * @param {Object} data Optional (default={}), can be of any type; Server simply must expect the same under that eventName
     * @param {Function} success Optional, a function with max one parameter (data) that is called when the data is acknowledged by the server 
     * @param {Function} failure Optional, a function with two parameters: errMsg and errCode; called when the websocket request failed (either due to problems on the server or in the transmission)
     * @param {Number} retryCount If there is no connection, how many times shall it be tried to send this message?
     * @param {Number} retryInterval If there is no connection, after what interval in ms it is retried to send the message
     */

    emitRequest(eventName, data={}, success=undefined, failure=undefined, retryCount=0, retryInterval=1000){
        if (this.connected){
            this.wsProcessor.sendRequest({name:eventName, 'data':data}, success, failure)
        } else {
            if (retryCount>0) {
                logger.log(98,retryCount);
                setTimeout(this.emitRequest.bind(this), retryInterval, eventName, data, success, failure, retryCount-1, retryInterval) // note: by using bind, we do not only 'give' setTimeout the funciton that it should call, but also the context it shall be called in
            } else {
                logger.log(3, 'emmitting websocket request not possible, no connection.')
            }
        }
    }

    emitNote(eventName, data={}, retryCount=0, retryInterval=1000){
        if (this.connected){
            this.wsProcessor.sendNote({name:eventName, 'data':data})
        } else {
            if (retryCount>0) {
                logger.log(98,retryCount);
                setTimeout(this.emitNote.bind(this), retryInterval, eventName, data, retryCount-1, retryInterval) // note: by using bind, we do not only 'give' setTimeout the funciton that it should call, but also the context it shall be called in
            } else {
                logger.log(3, 'emmitting websocket note not possible, no connection.')
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

    /*joinRoom(id){
        if(this.connected){
            // TODO...
        } else {
            logger.log(3, 'joining websocket room not possible, no connection.')
        }
    }*/


}