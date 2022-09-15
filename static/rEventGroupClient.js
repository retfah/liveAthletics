




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
        /*this._addFunction('addClub', this.addClubExe);
        this._addFunction('deleteClub', this.deleteClubExe);
        this._addFunction('updateClub', this.updateClubExe);*/
    }

    /*addClubInit(club){
        // club should contain all mandatory properties except the index...
        this.addToStack('addClub', club)
    }

    addClubExe(club){
        // the data should contain the complete object
        this.data.clubs.push(club);
        this.sort();
    }

    deleteClubInit(clubId){
        this.addToStack('deleteClub', clubId);
    }

    deleteClubExe(clubId){
        let ind = this.data.clubs.findIndex(el=>el.xClub == clubId);
        this.data.clubs.splice(ind, 1);
        this.sort();
    }

    updateClubInit(club){
        this.addToStack('updateClub', club);
    }

    updateClubExe(clubUpdated){
        let club = this.data.clubs.find(el=>el.xClub == clubUpdated.xClub);
        this.propertyTransfer(clubUpdated, club, true)
        this.sort();
    }
    
    sort(){
        // sort the data; should be done after every change
        this.data.clubs.sort((el1, el2)=>{
            let v1 = el1.sortvalue.toLowerCase();
            let v2 = el2.sortvalue.toLowerCase();
            if (v1<v2){
                return -1;
            } else if (v1==v2){
                return 0;
            } else {
                return 1;
            }
        })
    }*/

}