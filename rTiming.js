import roomServer from "./roomServer";


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

    }

    // implement here all ALGE specific stuff (connection to timing) while the general stuff (connection to rSite via rSiteClient, etc) shall be handled in the parent class

}