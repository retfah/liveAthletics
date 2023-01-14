

export class rTimingClient extends roomClient{


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

        let failCB = (msg, code)=>{};
        let successCB = ()=>{};
        
        // the room name must include the meeting name (club@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('updateInfo', this.updateInfoExe);
        this._addFunction('updateSiteConf', this.updateSiteConfExe);
        this._addFunction('updateTimingOptions', this.updateTimingOptionsExe);
        this._addFunction('updateSiteData', this.updateSiteDataExe);
    }

    // TODO: eventually include all rSiteClient functions here as well

    updateInfoExe(infos){
        this.propertyTransfer(infos, this.data.infos);
    }

    updateSiteConfInit(siteConf){
        this.addToStack('updateSiteConf', siteConf);
    }

    updateSiteConfExe(siteConf){
        this.propertyTransfer(siteConf, this.data.siteConf);
    }

    updateTimingOptionsInit(timingOptions){
        this.addToStack('updateTimingOptions', timingOptions);
    }

    updateTimingOptionsExe(timingOptions){
        this.propertyTransfer(timingOptions, this.data.timingOptions);
    }
    updateSiteDataExe(contests){
        this.propertyTransfer(contests, this.data.contests, false);
    }
}