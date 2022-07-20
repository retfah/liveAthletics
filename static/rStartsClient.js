




export class rStartsClient extends roomClient{


    /**
     * 
     * @param {roomClientVue} v The vue that should be linked first (can be undefined)
     * @param {wsProcessor} wsHandler websocket handler
     * @param {eventHandler} eventHandler The event handler
     * @param {roomManager} rM The roomManager instance
     * @param {boolean} writing Whether writing rights shall be requested or not
     * @param {string} datasetName The name of the dataset to get from the server (surrently either ''=room data or 'meetingSelection')
     * @param {string} roomName The name of the room; within a meeting, the room name is not automatically given by the class, but contains the meeting-shortname and therefore must be given
     */
    constructor(v, wsHandler, eventHandler, rM, writing=false, storeInfos='', datasetName='', roomName){

        let failCB = (msg, code)=>{}
        let successCB = ()=>{}

        // call the parent constructor
        //(v, name, wsHandler, eventHandler, onlineOnly, writing, success, failure, storeInfos=false, rM, datasetName='', writingChangedCB)
        
        // the room name must include the meeting name (start@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('addStart', this.addStartExe);
        this._addFunction('deleteStart', this.deleteStartExe);
        this._addFunction('updateStart', this.updateStartExe);
    }

    addStartInit(start){
        // start should contain all mandatory properties except the index...
        this.addToStack('addStart', start)
    }

    addStartExe(start){
        // the data should contain the complete object
        this.data.starts.push(start);
    }

    deleteStartInit(startId){
        this.addToStack('deleteStart', startId);
    }

    deleteStartExe(startId){
        let ind = this.data.starts.findIndex(el=>el.xStart == startId);
        this.data.starts.splice(ind, 1);
    }

    updateStartInit(start){
        this.addToStack('updateStart', start);
    }

    updateStartExe(startUpdated){
        let start = this.data.starts.find(el=>el.xStart == startUpdated.xStart);
        this.propertyTransfer(startUpdated, start, true)
    }
}