

export class rMeetingClient extends roomClient{


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
        
        // the room name must include the meeting name (meeting@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('updateMeeting', this.updateMeetingExe);
    }

    renewStartgroupsInit(){
        const opt = {
            readOnly:true,
        }
        // actually there is no data to transmit; transmit true
        this.addToStack('renewStartgroups', true, ()=>{}, ()=>{}, opt)
    }

    updateMeetingInit(meeting, funcOverride=undefined, rollBack=()=>{}){
        // meeting should contain all mandatory properties except the index...
        this.addToStack('updateMeeting', meeting, funcOverride, rollBack)
    }

    updateMeetingExe(meeting){
        // the data should contain the complete object
        this.propertyTransfer(meeting, this.data);
    }


    baseFunctionInit(baseName, functionName, data, succFunc, errFunc, timeout=30){
        const req = {
            baseName,
            functionName,
            data,
        }
        const opt = {
            readOnly:true, // set to false to make sure the error is shown.
            requestTimeout: timeout, // default would be 10s, allow some more time for processing before the request is deemed failed.
            errorHandling:[{from: 20, to: 99, rule:'deleteRollback', customErrMsg:errFunc}],
        }
        this.addToStack('baseFunction', req, succFunc, ()=>{}, opt);
    }

}