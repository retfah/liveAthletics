

export class rEventsClient extends roomClient{


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
        let successCB = ()=>{
            // TODO: eventually some sorting...
        }

        // call the parent constructor
        //(v, name, wsHandler, eventHandler, onlineOnly, writing, success, failure, storeInfos=false, rM, datasetName='', writingChangedCB)
        
        // the room name must include the meeting name (event@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('addEvent', this.addEventExe);
        this._addFunction('deleteEvent', this.deleteEventExe);
        this._addFunction('updateEvent', this.updateEventExe);
        // this._addFunction('updateMeeting', this.updateMeeting_exe);
        // this._addFunction('activateMeeting', this.activateMeeting_exe);
        // this._addFunction('deactivateMeeting', this.deactivateMeeting_exe);
        // this._addFunction('runMeeting', this.runMeeting_exe);
        // this._addFunction('stopMeeting', this.stopMeeting_exe);
    }

    addEventInit(event){
        // event should contain all mandatory properties except the index...
        this.addToStack('addEvent', event)
    }

    addEventExe(event){
        // the data should contain the complete object
        this.data.push(event);
    }

    deleteEventInit(eventId){
        this.addToStack('deleteEvent', eventId);
    }

    deleteEventExe(eventId){
        let ind = this.data.findIndex(el=>el.xEvent == eventId);
        this.data.splice(ind, 1);
    }

    //updateEventInit(){}

    updateEventExe(eventUpdated){
        let event = this.data.find(el=>el.xEvent == eventUpdated.xEvent);

        this.propertyTransfer(eventUpdated, event, true)
    }
}