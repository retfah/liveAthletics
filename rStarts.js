
// manage all starts of the athletes. 
// IMPORTANT: many things depend on starts; most important the assignment to a group for each round in each assigned eventGroup

// ATTENTION: if an event is changed from one to another eventGroup, the entries in startsInGroup need to be changed! TODO: implement this in eventGroups respectively in the respective room for the startsInGroup!

import roomServer from './roomServer.js';

/**
 * the room for start management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{start1}, {start2}]
 */
class rStarts extends roomServer{

    /** Constructor for the start-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, startsInGroup, rDisciplines){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false)
        super(eventHandler, mongoDb, logger, "starts@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = {
            // main data:
            starts:[],
            disciplines:[], // needed in athletes.ejs, since it cannot be transitted in rEvents, since there we use a dataset
            // auxilary data:

        }; 

        // reference to other rooms, needed to inscribe athletes to a group
        this.startsInGroup = startsInGroup;
        this.rDisciplines = rDisciplines; // needed in athletes.ejs
        //this.eventGroups = eventGroups;

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all starts
        this.models.starts.findAll().then(starts=>{
            this.data.starts = starts;
            // aux data:
            //TODO
            this.ready = true;
        })

        // listen to ausxilary data events:
        // TODO

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addStart = this.addStart.bind(this);
        this.functionsWrite.deleteStart = this.deleteStart.bind(this);
        this.functionsWrite.updateStart = this.updateStart.bind(this);

        // define, compile and store the schemas:
        const start = {
            xStart: {type: "integer"}, 
            xInscription: {type: "integer"},
            xEvent: {type: "integer"},
            paid: {type: "boolean"},
            notificationPerf: {type: "integer"},
            bestPerf: {type: "integer"},
            bestPerfLast: {type: "integer"},
            competitive: {type: "boolean"}, // if non-competitive, an athlete will not automatically be qualified for the next round and will not get a rank in the rankinglist.
        };
        let schemaAddStart = {
            type: "object",
            properties: Object.assign({},start, {groupNum:{type:"integer", default:1}}),
            required: ["xInscription", "xEvent"],
            additionalProperties: false,
        };
        let schemaUpdateStart = {
            type: "object",
            // inscription and event cannot be changed!
            properties: start,
            required: ["xStart"],
            additionalProperties: false,
        };
        let schemaDeleteStart = {
            type: "integer"
        }
        this.validateAddStart = this.ajv.compile(schemaAddStart);
        this.validateUpdateStart = this.ajv.compile(schemaUpdateStart);
        this.validateDeleteStart = this.ajv.compile(schemaDeleteStart);
 
    }

    /**
     * add an start
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addStart(data){

        // validate the data based on the schema
        let valid = this.validateAddStart(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addStart, updateStart, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var start = await this.models.starts.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: Start could not be created: ${err}`, code:22}})

            // try to create the entry in "startsInGroup" (requires that (1) the event is linked with an eventGroup, (2) the eventGroup has a first round and (3) assume that the person shall be added in group 1)
            await this.startsInGroup.serverFuncWrite('addedStart', {xStart:start.xStart, xEvent: data.xEvent, groupNum: data.groupNum}).catch(async err=>{
                if (err.code != 25 && err.code != 27){
                    await start.destroy(); // delete the entry again
                    throw(err);
                } else {
                    this.logger.log(25, `Could not create entry in startsInGroup: ${err.message}` )
                }
            });

            this.data.starts.push(start); 

            // the data to be sent back to the client requesting the add is the full data
            let sendData = start.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addStart',
                data: start.dataValues // should have the same properties as data, but with added xStart
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteStart
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
            throw {message: this.ajv.errorsText(this.validateAddStart.errors), code:23};
        }
    }


    async deleteStart(data){

        // data must be an integer (the xStart id)
        let valid = this.validateDeleteStart(data);

        if (valid){

            // first try to delete the entry in startsInGroup; if this is not possible then this is because the athlete is assigned to a series already and the start can thus not be deleted anymore!

            await this.startsInGroup.serverFuncWrite('deleteStart', data).catch(err=>{
                // if the error was 24 (no startsInGroup), then silently continue
                if (err.code!=24){
                    throw(err);
                } else {
                    this.logger.log(25, `No startsInGroup was found for xStart=${data}.`)
                }
            });


            // get the entry from the data (respectively its index first):
            let [ind, start] = this.findObjInArrayByProp(this.data.starts, 'xStart', data)

            // delete the entry in the meetings table
            await this.models.starts.destroy({where:{xStart: data}}).catch(()=>{
                throw {message: "Start could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data.starts, 'xStart', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.starts.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteStart',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addStart
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
            throw {message: this.ajv.errorsText(this.validateDeleteStart.errors), code:23};
        }
    }

    
    async updateStart(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateStart(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data.starts, 'xStart', data.xStart);
            if (i<0){
                throw {code:24, message:"The start does not exist anymore on the server (should actually never happen)."};
            }

            // check that the xEvent and xInscription did not change!
            if (('xEvent' in data && data.xEvent != o.dataValues.xEvent) || ('xInscription' in data && data.xInscription != o.dataValues.xInscription)){
                throw {code:25, message:"The start cannot be updated, since xEvent and/or xInscription are not allowed to change."};
            }

            let startOld = {};
            this.propertyTransfer(o.dataValues, startOld);

            this.propertyTransfer(data, o, true);

            // save all (if saving to DB is not necessary, sequelize will not do it and directly resolve the promise)
            await o.save().catch((err)=>{throw {code:26, message: `The changed start could not be stored: ${err}`};})
            
            if (startOld.bestPerf != o.bestPerf || startOld.bestPerfLast != o.bestPerfLast|| startOld.notificationPerf != o.notificationPerf){
                // notify all rooms about the change (e.g. to update startgroups)
                this.eH.raise(`inscriptions@${this.meetingShortname}:inscriptionChanged${o.xInscription}`);
            }

            let ret = {
                isAchange: true, 
                doObj: {funcName: 'updateStart', data: o.dataValues}, 
                undoObj: {funcName: 'updateStart', data: startOld, ID: this.ID},
                response: o.dataValues,
                preventBroadcastToCaller: true
            };
            
            // the rest is done in the parent
            return ret;

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateStart.errors)}
        }
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

        data.disciplines = this.rDisciplines.getTranslatedDisciplines(client.session.lang);

        return data;
    }

}

export default rStarts;