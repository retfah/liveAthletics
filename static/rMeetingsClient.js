// this is the implementation for the meetings room on the client

//import {roomClient} from './roomClient.js' // this way of import has the advantage that we do not have to remember to import it in every html file. However, we actually have a root.ejs file, which is mostly part of the html and we can simply put the reference there. This include here would probably have the drawback, that multiple room-class-files would import it multiple times, which is unnecessary and costs time.

// 2019-12-23: we need to split the Vue-part from the room-part to allow having multiple, different vue instances relying on the same room data. 

export class rMeetingsClient extends roomClient{

/**
 * 
 * @param {roomClientVue} v The vue that should be linked first (can be undefined)
 * @param {wsProcessor} wsHandler websocket handler
 * @param {eventHandler} eventHandler The event handler
 * @param {roomManager} rM The roomManager instance
 * @param {boolean} writing Whether writing rights shall be requested or not
 * @param {string} datasetName The name of the dataset to get from the server (surrently either ''=room data or 'meetingSelection')
 * @param {string} roomName The name of teh room; within a meeting, the room name is not automatically given by the class, but contains the meeting-shortname and therefore must be given; not needed for the meetings 
 */
    constructor(v, wsHandler, eventHandler, rM, writing=false, storeInfos='', datasetName='', roomName=''){


        let successCB = ()=>{
            // success callback:

            // sort the meetings:
            this.sortMeetings();            

        }

        let failCB = (msg, code)=>{
            // failure callback:

        }

        // call the parent constructor
        //(v, name, wsHandler, eventHandler, onlineOnly, writing, success, failure, storeInfos=false, rM, datasetName='', writingChangedCB)
        
        super(v, 'meetings', wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('addMeeting', this.addMeeting_exe);
        this._addFunction('deleteMeeting', this.deleteMeeting_exe);
        this._addFunction('updateMeeting', this.updateMeeting_exe);
        this._addFunction('activateMeeting', this.activateMeeting_exe);
        this._addFunction('deactivateMeeting', this.deactivateMeeting_exe);
        this._addFunction('runMeeting', this.runMeeting_exe);
        this._addFunction('stopMeeting', this.stopMeeting_exe);

    }


    addMeeting_init2(shortname, location, name, active, dateFrom, dateTo){
        
        /*let schema = {
            type: "object",
            properties: {
                xMeeting: {type: "integer"}, // for sideChannel
                shortname: {type: "string", maxLength:10, pattern:'^((?!\\s).)*$'}, // no whitespace in the whole string!
                name:{type: "string", maxLength:75},
                location: {type: "string", maxLength:50},
                active: {type: "boolean"}, 
                dateFrom: {type: "string", format:"date"},
                dateTo: {type: "string", format:"date"},
            },
            required: [shortname, active, code]
        };*/

        // prepare the object to be sent to the server:
        let data = {
            shortname,
            name,
            location, 
            active, 
            dateFrom, 
            dateTo,
        };

        // try to send this to the server
        this.addToStack('addMeeting', data)

    }


    /**
     * addMeeting_exe: execute adding the meeting: add the meeting to the meetings list
     */
    addMeeting_exe(meeting){
        // add the created meeting to the meetings array
        //this.data.push(meeting.meeting);
        
        // new as of 2019-08-19: the returned data itself finally is the meeting itself and not an object!
        this.data.push(meeting);

        // if the array is sorted with array.sort((a,b)=>{return a-b}) (a<0 --> a is before b; a>0 --> a is after b) then Vue will take this into account according to https://vuejs.org/v2/guide/list.html
        this.sortMeetings();

    }

    deleteMeeting_init(meeting){
        let data = meeting.xMeeting;

        this.addToStack('deleteMeeting', data);
    }

    deleteMeeting_init2(xMeeting){
        let data = xMeeting;

        this.addToStack('deleteMeeting', data);
    }

    /**
     * execute the meeting deletion
     * @param {*} data The data passed from the server
     */

    // it does not work that we have the data from the Server and from the client, as we wont have data from the client when the change happened on an other client!
    deleteMeeting_exe(data){

        let meetingId = data;

        // delete the meeting from the list
        let [ind, it] = this.findObjInArrayByProp(this.data, 'xMeeting', meetingId);

        if (ind>=0){
            this.data.splice(ind,1);

        }else{
            console.log(50, 'Meeting could not be deleted, as it was deleted before. Should never happen!')
        }

    }

    /**
     * activate a meeting (startup all desired rooms and connect to slave servers if requested)
     * @param {*} xMeeting 
     */
    activateMeeting_init2(xMeeting, failureWarning){
        
        // undefined: use the standard execution function
        this.addToStack('activateMeeting', xMeeting, undefined, failureWarning);
    }

    /**
     * To keep it simple, this funciton is called on the client that sent the activation request as well as on all the others.
     * @param {object} data Which meeting was activated 
     */
    activateMeeting_exe(xMeeting){
        //console.log(`activate meeting ${xMeeting}`);

        let [i,meeting] = this.findObjInArrayByProp(this.data, 'xMeeting', xMeeting);

        if (i>=0){
            meeting.active = true;
        }
        
    }

    /**
     * deactivate the meeting (i.e. destroy all rooms, disconnect all clients, free resources on the server)
     * @param {integer} xMeeting 
     */
    deactivateMeeting_init2(xMeeting, failureWarning){
        
        // undefined: use the standard execution function
        this.addToStack('deactivateMeeting', xMeeting, undefined, failureWarning);
    }

    /**
     * To keep it simple, this funciton is called on the client that sent the activation request as well as on all the others.
     * @param {object} data Which meeting was deactivated 
     */
    deactivateMeeting_exe(xMeeting){
        let [i,meeting] = this.findObjInArrayByProp(this.data, 'xMeeting', xMeeting);

        if (i>=0){
            meeting.active = false;
        }
        
    }

    runMeeting_exe(xMeeting){
        let [i,meeting] = this.findObjInArrayByProp(this.data, 'xMeeting', xMeeting);

        if (i>=0){
            meeting.running = true;
        }
    }

    stopMeeting_exe(xMeeting){
        let [i,meeting] = this.findObjInArrayByProp(this.data, 'xMeeting', xMeeting);

        if (i>=0){
            meeting.running = false;
        }
    }

    /**
     * 
     * @param {object} meeting 
     * @param {object} meetingBeforeUpdate the meeting as it was before the update. Needed for undo if there is an error on the server.
     */
    updateMeeting_init(meeting, meetingBeforeUpdate){

        // set the data
        let data = {
            xMeeting: meeting.xMeeting,
            name: meeting.name,
            shortname: meeting.shortname,
            location: meeting.location,
            dateFrom: meeting.dateFrom,
            dateTo: meeting.dateTo,
            active: meeting.active,
        };

        // on failure on the server, undo the changes (as they are applied in the vue-model automatically)
        let rollback = ()=>{
            // find the correct meetingIndex
            let [meetingIndex, m] = this.findObjInArrayByProp(this.data, 'xMeeting', meetingBeforeUpdate.xMeeting);

            // undo:
            this.data[meetingIndex] = meetingBeforeUpdate;
        };

        // make sure we use the function override, as we do not need to do anything on success on the server, since, everything is done already and updateMeeting_exe is only used on broadcast to the other clients. 

        this.addToStack('updateMeeting', data, ()=>{}, rollback);
    }

    updateMeeting_exe(data){
        // only called when update-broadcast from another client

        // get the meetingIndex
        let [meetingIndex, meeting] = this.findObjInArrayByProp(this.data, 'xMeeting', data.xMeeting);

        if (meetingIndex>=0){
            // update!
            this.propertyTransfer(data, meeting, false)
            
        } else {
            console.log('Cannot update meeting.')
        }
    }

    

    sortMeetings(){
        this.data.sort((a,b)=>{ 
            let A = a.shortname.toUpperCase();
            let B = b.shortname.toUpperCase();
            if (A==B){
                return 0
            } else if (A<B){
                return -1
            } else {
                return 1
            }
        })
    }

}
