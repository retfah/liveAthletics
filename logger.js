

// localLogger

/**
 * localLogger: logs everything that happens locally and might send some stuff to the clients in the future (not implemented)
 * 
 * writes to the console and to clients (TODO)
 * currently does nothing else than write to console.log(), but is here already so that the rest of the code does not need to be changed in the future
 * has 100 log levels (see below) from 0=nothing to 99=debug
 * @class localLogger
 */

/*  ---TODO---
 - send errors to the client
 - write errors to a file together with a timestamp
*/
class localLogger{

    /**
     * logging levels:
     * 0: nothing
     * 1: Error, application crash
     * 3: Error, application partially crashed, might not work as expected anymore
     * 7: Warning, something did not work as expected, but should worke anyway
     * 10: Warning, temporary, e.g. connection temporarily lost
	 * 80: informational, e.g. startup done
	 * 89: informational, but very detailed
     * 90-99: debugging level, show (nearly) every message
     */

    /**
     * Constructor of the logger
     * @constructor
     * @param {socketIO} ws The websocket class, to send and receive messages to log on the server or locally 
     * @param {Number} level Optional, define the level to be logged (default=10, 0=nothing, 99=debug)
     */
    constructor(ws, level=10){

        this.wsConnected = false;
        if (ws){
            this.ws = ws;
            this.wsConnected = true; 

            // TODO: add socket-listener and process it here...

        }
        this.logLevel = level;

        // TODO: hide the log-message-bar (Athletica1=at the bottom) when logLevel=1
    }

    /**
     * Log a message with the given level; TODO: currently only local logging
     * @method log 
     * @param {Number} level logLevel, between 1 and 99
     * @param {String} msg The message to be logged
     */
    log(level, msg){
        if (this.wsConnected){
            // send message to client(s)
            // TODO
        }
        if (level<=this.logLevel && level>0){ // make sure nobody fools the system by setting level=0, when logLevel=0
            const d = new Date();
            console.log(d.toISOString() + ": " + msg);
        }
    }
}

export default localLogger;