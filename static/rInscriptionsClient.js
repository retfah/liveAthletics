




export class rInscriptionsClient extends roomClient{


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
        
        // the room name must include the meeting name (inscription@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('addInscription', this.addInscriptionExe);
        this._addFunction('deleteInscription', this.deleteInscriptionExe);
        this._addFunction('updateInscription', this.updateInscriptionExe);
        this._addFunction('setBib', this.setBibExe);
    }

    // do not send the request if another request is going on
    getBaseData(request, funcOverride){
        if (this.stack.length==0){
            const opt = {
                readOnly: true,
            }
            this.addToStack('getBaseData', request, funcOverride, ()=>{}, opt)
        } else {
            this.logger.log(50, 'Could not send request, since another request is going on.')
        }
    }

    getBasePerformancesInit(baseName, identifier, funcOverride){
        const request = {
            base: baseName, 
            identifier,
        };

        const opt = {
            readOnly: true,
        };
        this.addToStack('getBasePerformances', request, funcOverride, ()=>{}, opt)
    }

    addInscriptionInit(inscription){
        // inscription should contain all mandatory properties except the index...
        this.addToStack('addInscription', inscription)
    }

    addInscriptionExe(inscription){
        // the data should contain the complete object
        this.data.inscriptions.push(inscription);
    }

    deleteInscriptionInit(inscriptionId){
        this.addToStack('deleteInscription', inscriptionId);
    }

    deleteInscriptionExe(inscriptionId){
        let ind = this.data.inscriptions.findIndex(el=>el.xInscription == inscriptionId);
        this.data.inscriptions.splice(ind, 1);
    }

    updateInscriptionInit(inscription){
        this.addToStack('updateInscription', inscription);
    }

    updateInscriptionExe(inscriptionUpdated){
        let inscription = this.data.inscriptions.find(el=>el.xInscription == inscriptionUpdated.xInscription);
        this.propertyTransfer(inscriptionUpdated, inscription, true)
    }

    setBibInit(bibAssignments){
        this.addToStack('setBib', bibAssignments);
    }

    setBibExe(bibAssignments){
        bibAssignments.forEach(bibAssignment => {
            let inscription = this.data.inscriptions.find(el=>el.xInscription == bibAssignment.xInscription);
            inscription.number = bibAssignment.number;
        });
        
    }
}