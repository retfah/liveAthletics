import roomServer from "./roomServer";
import Net from 'net';

export default class rTiming extends roomServer{
    
    constructor(timingName, eventHandler, mongoDb, logger){
        
        // initialize the room
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false)
        super(eventHandler, mongoDb, logger, timingName, true, -1, false);

        this.data = {
            name: timingName,

        }

        // this room shall keep track of the connections to the server and to the timing-software
        // IMPORTANT: in this room we should handle only the connection to the server; each kind of timing-API shall then inherit from this class and implement its special things in this other class

        // the locally stored data should be stored fully in MongoDB and contain the following;
        // Server infos: host, path, port, token, secure
        // timing infos: for ALGE: path to meeting files, path to result files, tcp-connection settings to the OpiVersatileExchangeProtocol and to the ALGEDisplay (ideally only teh first would be required)

        // based on the settings that are made on the client, we first create a ws-connection to the server (even if it would be on the same server), then we create a rSiteClient instance, which connects to the site on the main server. 

    }
}

export class rTimingAlge extends rTiming {
    
    constructor (timingName, eventHandler, mongoDb, logger){

        super(timingName, eventHandler, mongoDb, logger)

        // NOTE: in the test, I activated every possible output in the four configurations !!!

        // ALGE DisplayBoard connection options (see Net.socket.connect)
        let optDisplayGaz = {
            port: 4445,
            host: 'localhost',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }
        let optDisplayDline = {
            port: 4446,
            host: 'localhost',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        // ALGE Output Port
        let optALGEOutputDline = {
            port: 4447,
            host: 'localhost',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

        // ALGE Versatile Exchange connection options (see Net.socket.connect)
        let optVersatileExchange = {
            port: 4448,
            host: 'localhost',
            keepAlive: true,
            keepAliveInitialDelay: 2000,
        }

    }

    // implement here all ALGE specific stuff (connection to timing) while the general stuff (connection to rSite via rSiteClient, etc) shall be handled in the parent class

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
                setTimeout(this.startConnection, this.retryInterval);
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
            setTimeout(this.startConnection, this.retryInterval);
            
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