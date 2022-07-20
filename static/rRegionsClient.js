




export class rRegionsClient extends roomClient{

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
        
        // the room name must include the meeting name (region@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('addRegion', this.addRegionExe);
        this._addFunction('deleteRegion', this.deleteRegionExe);
        this._addFunction('updateRegion', this.updateRegionExe);
    }

    addRegionInit(region){
        // region should contain all mandatory properties except the index...
        this.addToStack('addRegion', region)
    }

    addRegionExe(region){
        // the data should contain the complete object
        this.data.push(region);
    }

    deleteRegionInit(regionId){
        this.addToStack('deleteRegion', regionId);
    }

    deleteRegionExe(regionId){
        let ind = this.data.findIndex(el=>el.xRegion == regionId);
        this.data.splice(ind, 1);
    }

    updateRegionInit(region){
        this.addToStack('updateRegion', region);
    }

    updateRegionExe(regionUpdated){
        let region = this.data.find(el=>el.xRegion == regionUpdated.xRegion);
        this.propertyTransfer(regionUpdated, region, true)
    }
}