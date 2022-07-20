
// this is the backupClient for browsers; for the sideChannelClient for secondary servers see in the main folder for the same filename



export class rBackupClient extends roomClient{


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
        
        // the room name must include the meeting name (backup@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('updateBackup', this.updateBackupExe);
        this._addFunction('updateStatus', this.updateStatusExe);
    }

    // addToStack(funcName, data, functionOverride=undefined, funcRollback=()=>{}, opt={}, info={})

    updateStatusExe(newStatus){
        this.propertyTransfer(newStatus, this.data.status, true);
    }

    updateBackupInit(backup, responseFunc){
        this.addToStack('updateBackup', backup, responseFunc);
    }

    updateBackupExe(backupUpdated){
        this.propertyTransfer(backupUpdated, this.data.backup, true)
    }

    updateStatusExe(statusUpdated){
        // only raised by the server
        this.propertyTransfer(statusUpdated, this.data.status, true)
    }

    createBackupInit(data, responseFunc){
        // always define a responseFunc, since there is no default exe for this 
        this.addToStack('createBackup', data, responseFunc);
    }

    restoreBackupInit(data, successCB, failCB){
        // always define a responseFunc, since there is no default exe for this 
        let opt = {
            readOnly: true,
            errorHandling: [{from:20, to:1000, rule:'user', function:failCB}],
            requestTimeout: 20, // wait 20s before sending again
            errorHandling: [ {rule:'deleteRollback', from:1, to:3.5}],
        };
        this.addToStack('restoreBackup', data, successCB, ()=>{}, opt);
    }


}