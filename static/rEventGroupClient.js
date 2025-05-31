

export class rEventGroupClient extends roomClient{


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
        
        // the room name must include the meeting name (club@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('updateData', this.updateDataExe);
        this._addFunction('updateRound', this.updateRoundExe);
        this._addFunction('updateQualification', this.updateQualificationExe);
    }

    updateDataExe(data){
        this.propertyTransfer(data, this.data, true);
    }

    // same as in rEventGroupsClient; use the functionOverride to know when the change has been applied successfully; call the default function first!
    updateRoundInit(round, functionOverride=undefined){

        // make sure that round does only contain the properties as required by rEventGroups.updateRound, and not the additional properties added in rEventGroup (note: plural/singular)
        // order is not allowed to be transmitted
        delete round.order;
        // the contests must be removed
        for (let group of round.groups){
            delete group.contest;
        }

        this.addToStack('updateRound', round, functionOverride, ()=>{}, {readOnly:true});
    }
    updateRoundExe(round){

        // this might not be needed for pure data updating, since the change should arrive via updateData as well. However, the change there might arrive after the answer to the call here; Thus, we still need to apply the actual change here to make sure that the function called in the vue after changing the data is run with the right props. 

        // find the corresponding round
        let r = this.data.rounds.find(r=>r.xRound==round.xRound);
        this.propertyTransfer(round, r, true);
    }

    updateQualificationInit(data){
        this.addToStack('updateQualification', data);
    }
    updateQualificationExe(data){
        // nothing to do.
    }
}