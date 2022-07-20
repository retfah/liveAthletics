
// TODO: include disciplineLocalizations!

import roomServer from './roomServer.js';


/**
 * the room for discipline management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{discipline1}, {discipline2}]
 */
class rDisciplines extends roomServer{

    /** Constructor for the discipline-room
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
        super(eventHandler, mongoDb, logger, "disciplines@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = []; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all disciplines
        this.models.disciplines.findAll().then(disciplines=>{
            this.data = disciplines;
            this.ready = true;
        })

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addDiscipline = this.addDiscipline.bind(this);
        this.functionsWrite.deleteDiscipline = this.deleteDiscipline.bind(this);
        this.functionsWrite.updateDiscipline = this.updateDiscipline.bind(this);

        // define, compile and store the schemas:
        let schemaAddDiscipline = {
            type: "object",
            properties: {
                xTODO: {type: "integer"}
            },
            required: []
        };
        let schemaUpdateDiscipline = {
            type: "object",
            properties: {
                xTODO: {type: "integer"}
            },
            required: ["TODO"]
        };
        let schemaDeleteDiscipline = {
            type: "integer"
        }
        this.validateAddDiscipline = this.ajv.compile(schemaAddDiscipline);
        this.validateUpdateDiscipline = this.ajv.compile(schemaUpdateDiscipline);
        this.validateDeleteDiscipline= this.ajv.compile(schemaDeleteDiscipline);
 
    }

    /**
     * add an discipline
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addDiscipline(data){

        // validate the data based on the schema
        let valid = this.validateAddDiscipline(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addDiscipline, updateDiscipline, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var discipline = await this.models.disciplines.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: Discipline could not be created: ${err}`, code:22}})

            this.data.push(discipline); 

            // the data to be sent back to the client requesting the add is the full data
            let sendData = discipline.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addDiscipline',
                data: discipline.dataValues // should have the same properties as data, but with added xDiscipline
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteDiscipline
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
            throw {message: this.ajv.errorsText(this.validateAddDiscipline.errors), code:23};
        }
    }


    async deleteDiscipline(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteDiscipline(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, discipline] = this.findObjInArrayByProp(this.data, 'xDiscipline', data)

            // delete the entry in the meetings table
            await this.models.disciplines.destroy({where:{xDiscipline: data}}).catch(()=>{
                throw {message: "Discipline could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data, 'xDiscipline', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteDiscipline',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addDiscipline
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
            throw {message: this.ajv.errorsText(this.validateDeleteDiscipline.errors), code:23};
        }
    }

    
    async updateDiscipline(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateDiscipline(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data, 'xDiscipline', data.xDiscipline);
            if (i<0){
                throw {code:24, message:"The discipline does not exist anymore on the server (should actually never happen)."};
            }

            let disciplineOld = o.dataValues;

            return o.update(data).then(async(disciplineChanged)=>{
                // the data should be updated in th DB by now.

                // set the local data
                this.data[i] = disciplineChanged;

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateDiscipline', data: disciplineChanged.dataValues}, 
                    undoObj: {funcName: 'updateDiscipline', data: disciplineOld, ID: this.ID},
                    response: disciplineChanged.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the discipline with the respective Id. Error: " + err};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateEventGroup.errors)}
        }
    }

}

export default rDisciplines;