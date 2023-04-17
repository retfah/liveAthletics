
import Net from 'net';

/**
 * create a tcp client connection and automatically try to reopen it as soon as the connection has failed.
 * Data is merge together until the end sign has arrived (by default carriage retrun / ASCII 13)
 */
export default class tcpClientAutoReconnect {

    /**
     * 
     * @param {object} connectionOptions The connection options for the socketClient. See node.js Net.client documentation
     * @param {function} onError callback(Error) called on error (right before the close event will be fired; )
     * @param {function} onClose callback(hadErrors) called after closing 
     * @param {function} onConnect callback() called when tcp connection is established 
     * @param {function} onData callback(data) called for every datapackage, separated by the endCharacter. I.e. data is not equivalent the chunks that arrive. This class will put together all chunks until the endCharacter is found and will send all text up to the endCharacter as data to the callback.   
     * @param {string} endCharacter The endCharacter(s) separating one message form the next. Default: CR carriage return (ASCII 13)
     * @param {integer} retryInterval After which timeout (in ms) it should be tried again to establish a connection. Default: 5000 ms.
     * @param {logger} logger a logger object, with a .log(code, msg) function; by default logs everything to command line
     */
    constructor(connectionOptions, onError, onClose, onConnect, onData, endCharacter='\r', retryInterval=5000, logger={log:(code, msg)=>{console.log(msg)}}){

        this.connectionOptions = connectionOptions;
        this.onError = onError;
        this.onClose = onClose;
        this.onConnect = onConnect;
        this.onData = onData;
        this.endCharacter = endCharacter; // default carriage return /ASCII 13
        this.retryInterval = retryInterval; // in ms
        this.logger = logger;

        // arrived data:; temporary storage, if data arirves in multiple chunks
        this.tempData = '';

        // at the end, do nto restart the connection 
        this.ending = false;

        this.startConnection();
    }

    startConnection(){
        // create a new connection and set the connect event handler (NOTE: the "ready" event is useless since it is anyway called right after the "connect" event)
        this.connection = Net.createConnection(this.connectionOptions, ()=>{
            let prom = this.onConnect();
            if (prom instanceof Promise){
                prom.catch((err)=>{this.logger.log(20, `Error in "onConnect" function in tcpClientAutoConntect: ${err}`)});
            }
        });
        this.connection.setEncoding('utf8'); // make sure strings are returned and not buffers (this should be fine for the small portions of text that are arriving)

        this.connection.on('close', (hadError)=>{
            let prom = this.onClose(hadError);
            if (prom instanceof Promise){
                prom.catch((err)=>{this.logger.log(20, `Error in "onClose" function in tcpClientAutoConntect: ${err}`)});
            }
            
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
                    let prom = this.onData(this.tempData.slice(0,endCharPos));
                    if (prom instanceof Promise){
                        prom.catch((err)=>{this.logger.log(20, `Error in "onData" function in tcpClientAutoConntect: ${err}`)});
                    }
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
            let prom = this.onError(err);
            if (prom instanceof Promise){
                prom.catch((err)=>{this.logger.log(20, `Error in "onError" function in tcpClientAutoConntect: ${err}`)});
            }

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
export class tcpToFile extends tcpClientAutoReconnect{
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