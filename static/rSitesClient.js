




export class rSitesClient extends roomClient{


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
        
        // the room name must include the meeting name (site@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('addSite', this.addSiteExe);
        this._addFunction('deleteSite', this.deleteSiteExe);
        this._addFunction('updateSite', this.updateSiteExe);
    }

    addSiteInit(site){
        // site should contain all mandatory properties except the index...
        this.addToStack('addSite', site)
    }

    addSiteExe(site){
        // the data should contain the complete object
        this.data.sites.push(site);
    }

    deleteSiteInit(siteId){
        this.addToStack('deleteSite', siteId);
    }

    deleteSiteExe(siteId){
        let ind = this.data.sites.findIndex(el=>el.xSite == siteId);
        this.data.sites.splice(ind, 1);
    }

    updateSiteInit(site){
        this.addToStack('updateSite', site);
    }

    updateSiteExe(siteUpdated){
        let site = this.data.sites.find(el=>el.xSite == siteUpdated.xSite);
        this.propertyTransfer(siteUpdated, site, true)
    }
}