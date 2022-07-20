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


        // TODO: remove all vue stuff:
        // the vueApp
        /*var vueServerAdmin;
        
        vueServerAdmin = new Vue({
            el:'#vueDiv',
            data:{isSlave:false, updateMeeting:-1, meetings:[{name: 'Meeting 1', date:'01-01-1995'}, {name: 'Meeting 2', date:'28-03-1992'}], readOnly: true,
            deleteWindowShown: false, deleteMeetingObj: {}},
            methods:{

                // TODO: check: If the following is written with function(){}, this will be the vue-object. If written as an arrow function ()=>{}, this will be the room-object

                deleteMeeting:(meeting)=>{
                    this.deleteMeeting_init(meeting);
                },

                // ATTENTION: in the worst case, the meetingIndex might have (-->test it!) changed since the update was started (when another client added or deleted a meeting)!. Thus we always have to check whether the  xMeeting is still te right. 
                // --> actually I think the ID does change in the background, as a new meeting will result in redrawing of the elements
                // TODO: check

                startUpdating:function(meeting){
                    // show the input fields
                    this.updateMeeting = meeting.xMeeting;

                    // store the old data (used on abort)
                    this.meetingBeforeUpdate = JSON.parse(JSON.stringify(meeting));
                },
                abortUpdate: function(meetingIndex){
                    // check that the meeting stored behind the index is still the correct!
                    
                    // index is not the same meeting anyore --> get the actual index of the meeting

                    // reset the meeting
                    this.meetings[meetingIndex] = this.meetingBeforeUpdate;

                    // disable update mode
                    this.updateMeeting=-1;
                },
                saveUpdate: (meeting)=>{
                    // meetingBeforeUpdate is needed for the reset function when there was an error on the server.
                    
                    // start storing the update
                    this.updateMeeting_init(meeting, this.vueServerAdmin.meetingBeforeUpdate);

                    // disable update mode
                    this.vueServerAdmin.updateMeeting=-1;
                }
            }
        });*/


        let successCB = ()=>{
            // success callback:

            // sort the meetings:
            this.sortMeetings();

            // new: on success, 'dataArrvied' is called automatically
            
            // TODO: delete the following
            // link the data to Vue
            /*vueServerAdmin.meetings = this.data;

            if (this.writingTicketID){
                vueServerAdmin.readOnly = false;
            }else{
                vueServerAdmin.readOnly = true;
            }*/
            

        }

        let failCB = (msg, code)=>{
            // failure callback:
            // writing to the logger was already done in the parent
            
            // 2020-01: code==18 (no writing ticket) does not exist anymore; success is also called when there is no writing ticket
            /*if (code==18) {
                // no writing tickets anymore:
                // connect without writing ticket and try to get one every 5 seconds.
                this.connect(false, ()=>{
                    // could connect to server without writing rights
                    vueServerAdmin.readOnly = true;

                    // sort the meetings:
                    this.sortMeetings();

                    // the data object will be replaced and not changed, thus we have to assign it again to the vueObject
                    vueServerAdmin.meetings = this.data;

                    // success CB --> now try to gather a writing ticket every 5s
                    //setTimeout(TODO, 5000); // TODO: in 'TODO' set readONly =false when got writing ticket

                }, (msg, code)=>{
                    // fail CB
                    logger.log('something went completely wrong while connecting to the server-room. Not even without writing rights it was possible to connect. Msg: '+ msg + '; Code: '+code);
                })
            }*/

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

    // TODO: REMOVE
    /*afterFullreload(){
        // set the changed data-property as data of the vue-instance
        this.vueServerAdmin.meetings = this.data;
    }*/

    /*
    randomTakeOverCode() {
        let length           = 8;
        var result           = '';
        var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        var charactersLength = characters.length;
        for ( var i = 0; i < length; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * charactersLength));
        }

        document.getElementById('code').value = result 
    }*/

    /**
     * addMeeting_init: initiate adding a Meeting. First checks if the input is compete (if necessary), then creates the data object from the input and calls the sendingFunction on the parent. The parent will then do the rest. The big part (adding the meeting to the meeting list) of the UI-reaction to this addMmeeting is in addMeeting_exe and is called only if the request was properly handled on the server. Here we only reset the form to default values after the requst was sent. 
     */
    addMeeting_init(){
        
        /*let schema = {
            type: "object",
            properties: {
                //xMeeting: {type: "integer"},
                shortname: {type: "string", maxLength:10}, 
                code: {type: "string", maxLength:50},
                active: {type: "boolean"}, 
                isSlave: {type: "boolean"},
                masterAddress: {type: "string", maxLength:100},
                masterUsername: {type:"string", maxLength:45}, 
                masterPassword: {type:"string", maxLength:45} 
            },
            required: [shortname, active, code]
        };*/

        // check that important fields are not empty:
        let sn = document.getElementById('shortname').value;
        let code = document.getElementById('code').value;
        if (sn=='' || code==''){
            document.getElementById('incomplete').style.display = 'inline';
            setTimeout(()=>{document.getElementById('incomplete').style.display = 'none';}, 10000) // after 10 seconds remove the note
            return;
        }

        // prepare the object to be sent to the server:
        let data = {};
        data.shortname = sn;
        data.name = document.getElementById('name').value;
        data.code = code;
        data.active = document.getElementById('active').checked;
        data.isSlave = document.getElementById('isSlave').checked;
        data.masterAddress = document.getElementById('masterAddress').value;
        data.masterUsername = document.getElementById('masterUsername').value;
        data.masterPassword = document.getElementById('masterPassword').value;

        // try to send this to the server
        this.addToStack('addMeeting', data)

    }

    addMeeting_init2(sn, code, name, active, isSlave, masterAddress, masterUsername, masterPassword){
        
        /*let schema = {
            type: "object",
            properties: {
                //xMeeting: {type: "integer"},
                shortname: {type: "string", maxLength:10}, 
                code: {type: "string", maxLength:50},
                active: {type: "boolean"}, 
                isSlave: {type: "boolean"},
                masterAddress: {type: "string", maxLength:100},
                masterUsername: {type:"string", maxLength:45}, 
                masterPassword: {type:"string", maxLength:45} 
            },
            required: [shortname, active, code]
        };*/

        // prepare the object to be sent to the server:
        let data = {};
        data.shortname = sn;
        data.name = name;
        data.code = code;
        data.active = active;
        data.isSlave = isSlave;
        data.masterAddress = masterAddress;
        data.masterUsername = masterUsername;
        data.masterPassword = masterPassword;

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
     * @param {object} meetingIndex the index in the array of meetings
     */
    updateMeeting_init(meeting, meetingBeforeUpdate, meetingIndex){

        // set the data
        let data = meeting;

        // on failure on the server, undo the changes (as they are applied in the vue-model automatically)
        let rollback = ()=>{
            // check if the meetingIndex has not changed (could be if meanwhile another client has added/deleted a meeting or just the sorting has changed)
            if (this.data[meetingIndex].xMeeting != meetingBeforeUpdate.xMeeting){
                // find the correct meetingIndex
                meetingIndex = this.findObjInArrayByProp(this.data, 'xMeeting', meetingBeforeUpdate.xMeeting);
            }

            // undo:
            this.data[meetingIndex] = meetingBeforeUpdate;
        };

        // make sure we use the function override, as we do not need to do anything on success on the server, since, everything is done already and updateMeeting_exe is only used on broadcast to the other clients. 

        this.addToStack('updateMeeting', data, ()=>{}, rollback);
    }

    /**
     * 
     * @param {object} meeting 
     * @param {object} meetingBeforeUpdate the meeting as it was before the update. Needed for undo if there is an error on the server.
     * @param {object} meetingIndex the index in the array of meetings
     */
    updateMeeting_init2(meeting, meetingBeforeUpdate, meetingIndex){

        // set the data
        let data = meeting;

        // on failure on the server, undo the changes (as they are applied in the vue-model automatically)
        let rollback = ()=>{
            // check if the meetingIndex has not changed (could be if meanwhile another client has added/deleted a meeting or just the sorting has changed)
            if (this.data[meetingIndex].xMeeting != meetingBeforeUpdate.xMeeting){
                // find the correct meetingIndex
                meetingIndex = this.findObjInArrayByProp(this.data, 'xMeeting', meetingBeforeUpdate.xMeeting);
            }

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
