




import { stringify } from 'ajv';
import roomServer from './roomServer.js';

/**
 * the room for club management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{club1}, {club2}]
 */
class rClubs extends roomServer{

    /** Constructor for the club-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false)
        super(eventHandler, mongoDb, logger, "clubs@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = {
            // main data:
            clubs:[],

            // auxilary data:

        }; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all clubs
        this.models.clubs.findAll().then(clubs=>{
            this.data.clubs = clubs;
            // aux data:
            //TODO
            this.ready = true;
        })

        // listen to ausxilary data events:
        // TODO

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addClub = this.addClub.bind(this);
        this.functionsWrite.deleteClub = this.deleteClub.bind(this);
        this.functionsWrite.updateClub = this.updateClub.bind(this);

        // define, compile and store the schemas:
        let schemaAddClub = {
            type: "object",
            properties: {
                xClub: {type: "integer"}, // should only be given by servers. Not checked yet
                name: {type: "string", maxLength:100},
                sortvalue: {type: "string", maxLength:100},
                deleted: {type:"boolean"},
                usercode: {type:"string", maxLength:30},
            },
            required: ['name', 'sortvalue'],
            additionalProperties: false
        };
        let schemaUpdateClub = {
            type: "object",
            properties: {
                xClub: {type: "integer"},
                name: {type: "string", maxLength:100},
                sortvalue: {type: "string", maxLength:100},
                deleted: {type:"boolean"},
                usercode: {type:"string", maxLength:30},
            },
            required: ['xClub', 'name', 'sortvalue'],
            additionalProperties: false
        };
        let schemaDeleteClub = {
            type: "integer"
        }
        this.validateAddClub = this.ajv.compile(schemaAddClub);
        this.validateUpdateClub = this.ajv.compile(schemaUpdateClub);
        this.validateDeleteClub = this.ajv.compile(schemaDeleteClub);
 
    }

    /**
     * add an club
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addClub(data){

        // validate the data based on the schema
        let valid = this.validateAddClub(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addClub, updateClub, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var club = await this.models.clubs.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: Club could not be created: ${err}`, code:22}})

            this.data.clubs.push(club); 

            // the data to be sent back to the client requesting the add is the full data
            let sendData = club.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addClub',
                data: club.dataValues // should have the same properties as data, but with added xClub
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteClub
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
            throw {message: this.ajv.errorsText(this.validateAddClub.errors), code:23};
        }
    }


    async deleteClub(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteClub(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, club] = this.findObjInArrayByProp(this.data.clubs, 'xClub', data)

            // delete the entry in the meetings table
            await this.models.clubs.destroy({where:{xClub: data}}).catch(()=>{
                throw {message: "Club could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data.clubs, 'xClub', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.clubs.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteClub',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addClub
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
            throw {message: this.ajv.errorsText(this.validateDeleteClub.errors), code:23};
        }
    }

    
    async updateClub(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateClub(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data.clubs, 'xClub', data.xClub);
            if (i<0){
                throw {code:24, message:"The club does not exist anymore on the server (should actually never happen)."};
            }

            let clubOld = o.dataValues;

            return o.update(data).then(async(clubChanged)=>{
                // the data should be updated in th DB by now.

                // set the local data
                this.data.clubs[i] = clubChanged;

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateClub', data: clubChanged.dataValues}, 
                    undoObj: {funcName: 'updateClub', data: clubOld, ID: this.ID},
                    response: clubChanged.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the club with the respective Id. Error: " + err};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateEventGroup.errors)}
        }
    }

}

export default rClubs;