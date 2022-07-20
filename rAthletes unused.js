




import conf from './conf.js';
import roomServer from './roomServer.js';

/**
 * the room for athlete management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{athlete1}, {athlete2}]
 */
class rAthletes extends roomServer{

    /** Constructor for the athlete-room
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
        super(eventHandler, mongoDb, logger, "athletes@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = []; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all athletes
        this.models.athletes.findAll().then(athletes=>{
            this.data = athletes;
            this.ready = true;
        }).catch((err)=>{
            let msg = `Could not start room athletes: ${JSON.stringify(err)}`;
            this.logger.log(10, msg);
        })

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addAthlete = this.addAthlete.bind(this);
        this.functionsWrite.deleteAthlete = this.deleteAthlete.bind(this);
        this.functionsWrite.updateAthlete = this.updateAthlete.bind(this);

        // define, compile and store the schemas:

        // all athlete properties:
        let athleteProperties = {
            xAhlete: {type: "integer"}, // only for server2server
            lastname: {type:"string", maxLength: 100},
            forename: {type:"string", maxLength: 100},
            birthdate: {type:"string", format:"date"},
            sex: {type:"string", enum:conf.sexes}, // to be changed whenever changed in the DB
            xClub: {type:"integer"},
            license: {type:"integer"},
            licenseType: {type:"integer"},
            xRegion: {type:"integer"},
            xInscription: {type:"integer"},
        };

        let schemaAddAthlete = {
            type: "object",
            properties: athleteProperties,
            required: ['lastname', 'forename', "birthdate", "sex"],
            additionalProperties: false,
        };
        let schemaUpdateAthlete = {
            type: "object",
            properties: athleteProperties,
            required: ['xAthlete'],
            additionalProperties: false,
        };
        let schemaDeleteAthlete = {
            type: "integer"
        }
        this.validateAddAthlete = this.ajv.compile(schemaAddAthlete);
        this.validateUpdateAthlete = this.ajv.compile(schemaUpdateAthlete);
        this.validateDeleteAthlete= this.ajv.compile(schemaDeleteAthlete);
 
    }

    /**
     * add an athlete
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addAthlete(data){

        // validate the data based on the schema
        let valid = this.validateAddAthlete(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addAthlete, updateAthlete, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var athlete = await this.models.athletes.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: Athlete could not be created: ${err}`, code:22}})

            this.data.push(athlete); 

            // the data to be sent back to the client requesting the add is the full data
            let sendData = athlete.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addAthlete',
                data: athlete.dataValues // should have the same properties as data, but with added xAthlete
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteAthlete
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
            throw {message: this.ajv.errorsText(this.validateAddAthlete.errors), code:23};
        }
    }


    async deleteAthlete(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteAthlete(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, athlete] = this.findObjInArrayByProp(this.data, 'xAthlete', data)

            // delete the entry in the meetings table
            await this.models.athletes.destroy({where:{xAthlete: data}}).catch(()=>{
                throw {message: "Athlete could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data, 'xAthlete', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteAthlete',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addAthlete
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
            throw {message: this.ajv.errorsText(this.validateDeleteAthlete.errors), code:23};
        }
    }

    
    async updateAthlete(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateAthlete(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data, 'xAthlete', data.xAthlete);
            if (i<0){
                throw {code:24, message:"The athlete does not exist anymore on the server (should actually never happen)."};
            }

            let athleteOld = o.dataValues;

            return o.update(data).then(async(athleteChanged)=>{
                // the data should be updated in th DB by now.

                // set the local data
                this.data[i] = athleteChanged;

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateAthlete', data: athleteChanged.dataValues}, 
                    undoObj: {funcName: 'updateAthlete', data: athleteOld, ID: this.ID},
                    response: athleteChanged.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the athlete with the respective Id. Error: " + err};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateEventGroup.errors)}
        }
    }

}

export default rAthletes;