
import {open} from 'fs/promises';

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

    // object-format for each logger
    // type: required, supported types: "console", "file"
    // maxLevel: optional, highest logged level (if not given, the setting given in the logger constructor is used)
    // minLevel: optional, lowest logged level (default=0=no min)
    // path: required if type='file'; must not contain any strings that cannot be part of filenames, e.g. ':'; NOTE: it might happen that a few logs during the start of the server are not logged, since the file is opened asynchronously!

    /**
     * Constructor of the logger
     * @constructor
     * @param {Array} loggers an array of objects defining where to write the log. 
     * @param {Number} level Optional, define the level to be logged (default=10, 0=nothing, 99=debug). If a level is set in the specific configuration of each logger, then this general level is disregarded.
     */
    constructor(loggers, level=100){

        // provide a list of all allowed logger types
        const loggerTypes = ['file', 'console'];

        // check that all loggers have a type; otherwise delete them
        for (let i=loggers.length-1;i>=0;i--){
            if (!('type' in loggers[i])){
                console.log(`Logger '${JSON.stringify(loggers[i])}' lacks the 'type' property. Neglecting this logger.`)
                loggers.splice(i,1);
                continue;
            }
            if (loggerTypes.indexOf(loggers[i].type)==-1){
                console.log(`'${loggers[i].type}' is not a valid logger type. Neglecting this logger.`)
                loggers.splice(i,1);
                continue;
            }
            
            // check and init for the different options
            if (loggers[i].type=='file'){
                // try to open the file
                open(loggers[i].path,'a').then((fileHandle) => {
                    loggers[i].fileHandle=fileHandle;
                }).catch(err=>{
                    console.log(`Cannot open the file for logging: ${err}.`);
                })
            }
        }

        // store a list of loggers
        this.loggers = loggers;
        this.logLevel = level;

    }

    /**
     * Log a message with the given level; TODO: currently only local logging
     * @method log 
     * @param {Number} level logLevel, between 1 and 99
     * @param {String} msg The message to be logged
     */
    log(level, msg){

        if (level>0){ // make sure nobody fools the system by setting level=0, when logLevel=0
            const d = new Date();
            let str = d.toISOString() + " " + level.toString().padStart(2,0) + ": " + msg;

            // loop over all loggers (here we can be sure that the logger should exist)
            for (let logger of this.loggers){
                let maxLevel = logger.maxLevel ?? this.logLevel;
                let minLevel = logger.minLevel ?? 0;
                if (minLevel > level || maxLevel < level){
                    continue;
                }
                if (logger.type=='console'){
                    console.log(str);
                } else if (logger.type=='file'){
                    // if the file could be opened (no failure and the promise has already settled), then we can actually log to file
                    if (logger.fileHandle){
                        logger.fileHandle.appendFile(str + '\n').catch((err)=>{
                            console.log(err);
                        });
                    }
                }
            }
        }
    }
}

export default localLogger;