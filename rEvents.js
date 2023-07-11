



import rdEventsWithGroups from './rdEventsWithGroups.js';
import roomServer from './roomServer.js';

/**
 * the room for event management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{event1}, {event2}]
 */
class rEvents extends roomServer{

    /** Constructor for the event-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, categories, baseDisciplines, startsInGroup, rMeeting, rEventGroups){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false)
        super(eventHandler, mongoDb, logger, "events@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = {
            // main data:
            events:[],

            // auxilary data:
            categories: categories.data,
            meeting: rMeeting.data,
        }; 

        // store the reference to baseDisciplines in order to be able to get the pre-created disciplines list for the given language
        this.baseDisciplines = baseDisciplines;
        this.startsInGroup = startsInGroup;
        this.rMeeting = rMeeting;
        this.rEventGroups = rEventGroups; // needed in a dataset

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all events
        this.models.events.findAll().then(events=>{
            this.data.events = events;
            // aux data:
            this.data.categories = categories.data;

            this.ready = true;
        })

        // listen to ausxilary data events:
                /*this.eH.eventSubscribe('disciplines@' + meetingShortname + ':ready', ()=>{
            this.data.disciplines = disciplines.data;
        })*/
        // not needed anymore, since the orginal references are kept now (2022-07)
        /*this.eH.eventSubscribe('categories@' + meetingShortname + ':ready', ()=>{
            this.data.categories = categories.data;
        })
        this.eH.eventSubscribe('meeting@' + meetingShortname + ':ready', ()=>{
            this.data.meeting = rMeeting.data;
        })*/

        // add (sub)-datasets:
        const rdForInscriptions = new rdEventsWithGroups(this, rEventGroups); // this will automatically add the roomDataset to this room.

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addEvent = this.addEvent.bind(this);
        this.functionsWrite.deleteEvent = this.deleteEvent.bind(this);
        this.functionsWrite.updateEvent = this.updateEvent.bind(this);

        // define, compile and store the schemas:
        let schemaAddEvent = {
            type: "object",
            properties: {
                xEvent: {type: "integer"}, // used in the sideChannel
                xDiscipline: {type: "integer"},
                xCategory: {type: "integer"},
                xEventGroup: {type: ["integer", "null"], default:null}, // setting a default of "null" also translate "undefined" to null
                //xEventGroup: {type: "integer"}, 
                entryFee: {type: "number"}, 
                bailFee: {type: "number"}, // not used so far!
                onlineId: {type: "string", maxLength:36},
                //date: {type:"string", format:"date-time"},
                date: {type:["string", "null"], format:"date-time", default:null},
                info: {type: "string", maxLength: 50},
                nationalBody: {type:['string', "null"], default:null},
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
                xEventGroup: {type: ["integer", "null"], default:null},
                entryFee: {type: "number"}, 
                bailFee: {type: "number"}, // not used so far!
                onlineId: {type: "string", maxLength:36},
                date: {type:"string", format:"date-time"},
                info: {type: "string", maxLength: 50},
                nationalBody: {type:['string', "null"], default:null},
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
     * return a personalized data object, providing the precreated merged list of disciplines (merged with baseDisciplines and the translated stuff) 
     */
    getPersonalizedData(client){

        // we cannot add the dynamic auxilary data to the data directly, but we need to create a new object with the same properties and then add the data there
        let data = {};
        for (let o in this.data){
            data[o] = this.data[o];
        }

        data.disciplines = this.baseDisciplines.getTranslatedDisciplines(client.session.lang);

        return data;
    }

    /**
     * add an event
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addEvent(data){

        // validate the data based on the schema
        let valid = this.validateAddEvent(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addEvent, updateEvent, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var event = await this.models.events.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: Event could not be created: ${err}`, code:22}})

            this.data.events.push(event); 

            // if the added event is related to an eventGroup: 
            if (event.xEventGroup != undefined) {
                // create startsInGroup for all starts of that event (it will fail with error ):
                let data = {
                    xEvent: event.xEvent,
                    xEventGroup: event.xEventGroup
                }
                await this.startsInGroup.serverFuncWrite('addedEventToEventgroup', data).catch(err=>{
                    // if the error was 24 (no rounds), then silently continue
                    if (err.code!=24){
                        throw(err);
                    }
                });

                // raise an event to notify the eventGroup
                this.eH.raise(`eventAddedToEventGroup${event.xEventGroup}`, event)
            }


            // the data to be sent back to the client requesting the add is the full data
            let sendData = event.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addEvent',
                data: event.dataValues // should have the same properties as data, but with added xEvent
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteEvent
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
            let [ind, event] = this.findObjInArrayByProp(this.data.events, 'xEvent', data)
            if (ind==-1){
                throw {message: "Event did not exist and thus cannot be deleted!", code:22}
            }

            // if the event was linked to an eventGroup, delete all startsInGroup first
            if (event.xEventGroup != undefined){
                let data = {
                    xEvent: event.xEvent,
                    xEventGroup: event.xEventGroup
                }
                await this.startsInGroup.serverFuncWrite('deleteEventFromEventGroup', data).catch(err=>{
                    throw(err);
                });
            }

            // delete the entry in the meetings table
            await this.models.events.destroy({where:{xEvent: data}}).catch(()=>{
                throw {message: "Event could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data.events, 'xEvent', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.events.splice(ind,1);
            }

            if (event.xEventGroup){
                // raise an event to notify the eventGroup
                this.eH.raise(`eventDeletedFromEventGroup${event.xEventGroup}`, null)
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
            
        } else {
            throw {message: this.ajv.errorsText(this.validateDeleteEvent.errors), code:23};
        }
    }

    
    async updateEvent(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateEvent(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data.events, 'xEvent', data.xEvent);
            if (i<0){
                throw {code:24, message:"The event does not exist anymore on the server (should actually never happen)."};
            }

            // check whether the eventGroup changes
            let eventGroupChanges = "xEventGroup" in data && data.xEventGroup != o.xEventGroup;
            if (eventGroupChanges && o.xEventGroup!=undefined){
                // delete all startsInGroup for the old EventGroup rounds
                let data = {
                    xEvent: o.xEvent,
                    xEventGroup: o.xEventGroup
                }
                await this.startsInGroup.serverFuncWrite('deleteEventFromEventGroup', data).catch(err=>{
                    throw(err);
                });

                // raise an event to notify the eventGroup
                this.eH.raise(`eventDeletedFromEventGroup${o.xEventGroup}`, null)
            }

            let eventOld = o.dataValues;

            return o.update(data).then(async(eventChanged)=>{
                // the data should be updated in th DB by now.

                // set the local data
                this.data.events[i] = eventChanged;

                if (eventGroupChanges && eventChanged.xEventGroup != undefined){
                    // add entries in startsInGroup (there is no reason why this should fail; and if it does, just continue)
                    // create startsInGroup for all starts of that event (it will fail with error ):
                    let data = {
                        xEvent: eventChanged.xEvent,
                        xEventGroup: eventChanged.xEventGroup
                    }
                    await this.startsInGroup.serverFuncWrite('addedEventToEventgroup', data).catch(err=>{
                        // if the error was 23 (no rounds), then silently continue; otherwise, log that there was an unexpected error
                        if (err.code!=23){
                            this.logger.log(20, `There was an unexpected error when adding the startsInGroup entry after a change of xEventGroup: ${JSON.stringify(err)}`);
                        }
                    });

                    // raise an event to notify the eventGroup
                    this.eH.raise(`eventAddedToEventGroup${eventChanged.xEventGroup}`, eventChanged)
                    }

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
                throw {code: 22, message: "Could not update the event with the respective Id. Error: " + JSON.stringify(err)};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateEvent.errors)}
        }
    }

}

export default rEvents;