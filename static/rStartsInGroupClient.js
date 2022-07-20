




export class rStartsInGroupsClient extends roomClient{


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
        
        // the room name must include the meeting name (startsInGroup@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('addStartsInGroup', this.addStartsInGroupExe);
        this._addFunction('deleteStartsInGroup', this.deleteStartsInGroupExe);
        this._addFunction('updateStartsInGroup', this.updateStartsInGroupExe);
        this._addFunction('deleteMultiStartsInGroup', this.deleteMultiStartsInGroupExe);
        this._addFunction('addMultiStartsInGroup', this.addMultiStartsInGroupExe);
        this._addFunction('deleteGroup', this.deleteGroupExe);
    }

    /**
     * A group is deleted; reset all startsInGroup of this group to group 1
     * @param {object} data xRound and number (=number of the group)
     */
    deleteGroupExe(data){
        let sigs = this.data.startsInGroups.filter(sig=>sig.xRound==data.xRound && sig.number==data.number);
        sigs.forEach(sig=>{
            sig.number = 1;
        })
    }

    addStartsInGroupInit(startsInGroup){
        // startsInGroup should contain all mandatory properties except the index...
        this.addToStack('addStartsInGroup', startsInGroup)
    }

    addStartsInGroupExe(startsInGroup){
        // the data should contain the complete object
        this.data.startsInGroups.push(startsInGroup);
    }

    deleteMultiStartsInGroupExe(IDs){
        for (let j=this.data.startsInGroups.length-1; j>=0; j--){
            if (this.data.startsInGroups[j].xStartgroup in IDs){
                this.data.startsInGroups.splice(j,1);
            }
        }
    }

    addMultiStartsInGroupExe(data){
        data.forEach(element => {
            this.data.startsInGroups.push(element);
        });
    }

    deleteStartsInGroupInit(startsInGroupId){
        this.addToStack('deleteStartsInGroup', startsInGroupId);
    }

    deleteStartsInGroupExe(startsInGroupId){
        let ind = this.data.startsInGroups.findIndex(el=>el.xStartgroup == startsInGroupId);
        this.data.startsInGroups.splice(ind, 1);
    }

    updateStartsInGroupInit(startsInGroup){
        this.addToStack('updateStartsInGroup', startsInGroup);
    }

    updateStartsInGroupExe(startsInGroupUpdated){
        let startsInGroup = this.data.startsInGroups.find(el=>el.xStartgroup == startsInGroupUpdated.xStartgroup);
        this.propertyTransfer(startsInGroupUpdated, startsInGroup, true)
    }
}