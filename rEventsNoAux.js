
// the room for events

import roomServer from './roomServer.js';


/**
 * the room for event management (adding, deletign, updating,  ...)
 * The data stores a list of objects with the meeting data: data =[{event1}, {event2}]
 */
class rEvents extends roomServer{

    /** Constructor for the meetings-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     * //@param {socketProcessor2} wsProcessor UNUSED The websocket processor instance; needed obviously for the  
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger){

        // NOTE: when debugging, the variable 'this' is undefined when the debugger passes here on construction. Don't know why, but it works anyway.

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false)
        super(eventHandler, mongoDb, logger, "events@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = []; 

        // the reference to the sequelizeAdmin connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all events
        this.models.events.findAll().then(events=>{
            // old: 
            this.data = events;

            // main data:
            //this.data.events = events;

            // auxilary data:
            // TODO
            this.ready = true;
        })

        // the other rooms might actually not be ready yet (since getting their data is async); thus we need to listen to their events
        /*this.eH.eventSubscribe('disciplines@' + meetingShortname + ':ready', ()=>{
            this.data.disciplines = disciplines.data;
        })*/


        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST (!!!!!) be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addEvent = this.addEvent.bind(this);
        this.functionsWrite.deleteEvent = this.deleteEvent.bind(this);
        this.functionsWrite.updateEvent = this.updateEvent.bind(this);
        //this.functionsReadOnly.TODO = this.TODO.bind(this);
        //this.functionsWrite.TODO2 = this.TODO2.bind(this);

        // define, compile and store the schemas:
        let schemaAddEvent = {
            type: "object",
            properties: {
                //xEvent: {type: "integer"},
                xDiscipline: {type: "integer"},
                xCategory: {type: "integer"},
                xEventGroup: {type: ["integer", "null"], default:null}, // setting a default of "null" also translate "undefined" to null
                //xEventGroup: {type: "integer"}, 
                entryFee: {type: "integer"}, 
                bailFee: {type: "integer"}, // not used so far!
                onlineId: {type: "integer"},
                //date: {type:"string", format:"date-time"},
                date: {type:["string", "null"], format:"date-time", default:null},
                info: {type: "string", maxLength: 50}
            },
            required: ["xDiscipline", "xCategory", "entryFee", "info"] // xEventGroup should be present, but as it might be undefined, it is treated as not present!
        };
        let schemaUpdateEvent = {
            type: "object",
            properties: {
                xEvent: {type: "integer"},
                // the discipline MUST NOT be changed
                //xDiscipline: {type: "integer"},
                xCategory: {type: "integer"},
                xEventGroup: {type: "integer"},
                entryFee: {type: "integer"}, 
                bailFee: {type: "integer"}, // not used so far!
                onlineId: {type: "integer"},
                date: {type:"string", format:"date-time"},
                info: {type: "string", maxLength: 50}
            },
            required: ["xEvent", "xDiscipline", "xCategory", "entryFee", "info"]
        };
        let schemaDeleteEvent = {
            type: "integer"
        }
        this.validateAddEvent = this.ajv.compile(schemaAddEvent);
        this.validateUpdateEvent = this.ajv.compile(schemaUpdateEvent);
        this.validateDeleteEvent = this.ajv.compile(schemaDeleteEvent);

 
    }

    /**
     * add an event
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addEvent(data){

        // validate the data based on the schema
        //let valid = this.ajv.validate(schema, data); 
        let valid = this.validateAddEvent(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every funciton like addMeeting, updateMeeting, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);
            //, {returning:true}
            var event = await this.models.events.create(data).catch((err)=>{throw {message: `Sequelize-problem: Event could not be created: ${err}`, code:22}})

            this.data.push(event); 

            // the data to be sent back to the client requesting the add is teh full data
            let sendData = event.dataValues;

            // answer the calling client. it needs the same data as if it was an update, since we actually do an update for the id
            //responseFunc(sendData); --> done on resolve

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addEvent',
                data: event.dataValues // should have the same properties as data, but with added xEvent
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteMeeting
                data: {}
                // the ID will be added on resolve
            };
            
            // do the rest (put on stack and report to other clients etc)
            let ret = {
                isAchange: true, 
                doObj: doObj, 
                undoObj: undoObj,
                response: sendData,
                preventBroadcastToCaller: true
            };
            return ret;
            
        } else {
            throw {message: this.ajv.errorsText(this.validateAddEvent.errors), code:23};
        }
    }


    async deleteEvent(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteEvent(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, event] = this.findObjInArrayByProp(this.data, 'xEvent', data)

            // delete the entry in the meetings table
            await this.models.events.destroy({where:{xEvent: data}}).catch(()=>{
                throw {message: "Event could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data, 'xEvent', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteEvent',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addEvent
                data: {}
                // the ID will be added on resolve
            };
            
            // do the rest (put on stack and report to other clients etc)
            let ret = {
                isAchange: true, 
                doObj: doObj, 
                undoObj: undoObj,
                response: data,
                preventBroadcastToCaller: true
            };
            return ret;
            
        }else {
            throw {message: this.ajv.errorsText(this.validateDeleteEvent.errors), code:23};
        }
    }

    async updateEvent(data){

        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateEvent(data);
        if (valid) {

            return this.models.events.findByPk(data.xEvent).then((event)=>{

                // store the old data for the undo-object
                let eventOld = event.dataValues;

                // get the index of the event in the list of events
                let [i,o] = this.findObjInArrayByProp(this.data, 'xEvent', data.xEvent);
                if (i<0){
                    throw {code:24, message:"The event does not exist anymore on the server (should actually never happen)."};
                }

                // update it
                return event.update(data).then(async(eventChanged)=>{
                    // the data should be updated in th DB by now.

                    // set the local data
                    this.data[i] = eventChanged;

                    let ret = {
                        isAchange: true, 
                        doObj: {funcName: 'updateEvent', data: eventChanged.dataValues}, 
                        undoObj: {funcName: 'updateEvent', data: eventOld, ID: this.ID},
                        response: eventChanged.dataValues,
                        preventBroadcastToCaller: true
                    };
                    
                    // the rest is done in the parent
                    return ret;

                }).catch((err)=>{
                    throw {code: 22, message: "Could not update the event with the respective Id. Error: " + err};
                });
            }).catch((err)=>{
                throw {code:21, message: "Could not get the event with the respective Id. Error: " + err}
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateEvent.errors)}
        }
    }

}


// the way of exporting for node (currently 03.2019)
//module.exports = rEvents;
export default rEvents;