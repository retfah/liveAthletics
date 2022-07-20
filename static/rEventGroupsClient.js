

export class rEventGroupsClient extends roomClient{


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
        
        // the room name must include the meeting name (eventGroup@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('addEventGroup', this.addEventGroupExe);
        this._addFunction('deleteEventGroup', this.deleteEventGroupExe);
        this._addFunction('updateEventGroup', this.updateEventGroupExe);

        this._addFunction('addRound', this.addRoundExe);
        this._addFunction('updateRound', this.updateRoundExe);
        this._addFunction('deleteRound', this.deleteRoundExe);
    }

    addEventGroupInit(eventGroup){
        // eventGroup should contain all mandatory properties except the index...
        this.addToStack('addEventGroup', eventGroup)
    }

    addEventGroupExe(eventGroup){
        // the data should contain the complete object
        this.data.push(eventGroup);
    }

    deleteEventGroupInit(eventGroupId){
        this.addToStack('deleteEventGroup', eventGroupId);
    }

    deleteEventGroupExe(eventGroupId){
        let ind = this.data.findIndex(el=>el.xEventGroup == eventGroupId);
        this.data.splice(ind, 1);
    }

    updateEventGroupInit(eventGroup){
        this.addToStack('updateEventGroup', eventGroup);
    }

    updateEventGroupExe(eventGroupUpdated){
        let eventGroup = this.data.find(el=>el.xEventGroup == eventGroupUpdated.xEventGroup);
        this.propertyTransfer(eventGroupUpdated, eventGroup, true)
    }

    addRoundInit(round){
        this.addToStack('addRound', round)
    }
    addRoundExe(round){
        // first get the corresponding eventGroup
        let eG = this.data.find(eg=>eg.xEventGroup==round.xEventGroup)
        if (!eG){
            return 
        }
        eG.rounds.push(round)
    }

    updateRoundInit(round){
        this.addToStack('updateRound', round);
    }
    updateRoundExe(round){
        // first get the corresponding eventGroup
        let eG = this.data.find(eg=>eg.xEventGroup==round.xEventGroup)
        // find the corresponding round
        let r = eG.rounds.find(r=>r.xRound==round.xRound);
        this.propertyTransfer(round, r, true);
    }

    deleteRoundInit(xRound, xEventGroup){
        this.addToStack('deleteRound', {xRound:xRound, xEventGroup:xEventGroup});
    }
    deleteRoundExe(data){
        // data contains xEventGroup and xRound
        // first get the corresponding eventGroup
        let eG = this.data.find(eg=>eg.xEventGroup==data.xEventGroup)
        let i = eG.rounds.findIndex(r=>r.xRound==data.xRound)

        eG.rounds.splice(i,1)
    }


}