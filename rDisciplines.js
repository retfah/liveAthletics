// TODO: currently, we create a list with the full names of the disciplines on the client and the client gets the full disciploines data, including all translations. This is actually a little bit overkill. Addiationally, it is actually also not absolutely necessary that the client has a regular room-connection, since there will not be any changes during a typical meeting. Therefore, implement creating translated lists on the server and provide them e.g. via a ws-request or add it as auxilar data to other rooms.

import roomServer from './roomServer.js';

/**
 * the room for baseDiscipline/discipline/baseDisciplinesLocalizations management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{baseDiscipline1}, {baseDiscipline2}]
 */
class rDisciplines extends roomServer{

    /** Constructor for the baseDiscipline-room
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

        // get all baseDisciplines
        this.models.basedisciplines.findAll({include: [{model:this.models.disciplines, as:"disciplines"}, {model:this.models.basedisciplinelocalizations, as:"basedisciplinelocalizations"}]}).then(baseDisciplines=>{
            this.data = baseDisciplines;
            this.ready = true;
        }).catch(err=>{
            throw err;
        })

        // the disciplines room shall provide pre-baked discipline arrays for all languages to be easily used as auxilary data in other rooms (dynamically injected on fullreload)
        // an object holding all translated lists of disciplines
        this.translations = {};


        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        // TODO: the functions for adding, deleting and updating are still the templated ones for baseDisciplines, not including disciplines and the localizaitons 

        //this.functionsWrite.addBaseDiscipline = this.addBaseDiscipline.bind(this);
        //this.functionsWrite.deleteBaseDiscipline = this.deleteBaseDiscipline.bind(this);
        //this.functionsWrite.updateBaseDiscipline = this.updateBaseDiscipline.bind(this);

        // define, compile and store the schemas:
        let baseDiscipline={
            xBaseDiscipline: {type:"integer"},
            type: {type:"integer", minimum:0, maximum:255},
            //relay: {type:"boolean"},
            nameStd: {type:"string", maxLength:50}, // used if there is no translation
            shortnameStd: {type:"string", maxLength:20}, // used if there is no translation
            timeAppeal: {type:"string", format:"time"},
            timeCall: {type:"string", format:"time"},
            baseConfiguration: {type:"string"},
            indoor: {type:'boolean'},
        }
        let schemaAddBaseDiscipline = {
            type: "object",
            properties: baseDiscipline,
            required: ["type", "nameStd", "shortnameStd"],
            additionalProperties: false,
        };
        let schemaUpdateBaseDiscipline = {
            type: "object",
            properties: baseDiscipline,
            required: ["xBaseDiscipline"],
            additionalProperties: false,
        };
        let schemaDeleteBaseDiscipline = {
            type: "integer"
        }
        this.validateAddBaseDiscipline = this.ajv.compile(schemaAddBaseDiscipline);
        this.validateUpdateBaseDiscipline = this.ajv.compile(schemaUpdateBaseDiscipline);
        this.validateDeleteBaseDiscipline= this.ajv.compile(schemaDeleteBaseDiscipline);
 
    }

    getTranslatedDisciplines(lang){
        // check whether the translation already exists, otherwise translate and return it
        return (lang in this.translations) ? this.translations[lang] : this.createTranslation(lang);
    }

    createTranslation(lang='base'){
        // create a discipline-dataset providing everything needed for vue's: xDiscipline, xBaseDiscipline, sortorder, type, relay, name, shortname (before 2021-09 also timeAppeal and timeCall)
        // if lang='base', always the standard name and shortname are used as defined in baseDisciplines. Otherwise it will be tried to find a translation in the basedisciplinelocalizations
        
        let disciplines = [];

        // loop over all baseDisicplines:
        for (let bd of this.data){

            let name, shortname;
            // get the name and shortname: 
            if (lang=='base'){
                // use the default value
                name = bd.nameStd;
                shortname = bd.shortnameStd;
            } else {
                // try to get a translation: 
                let local = bd.basedisciplinelocalizations.find(bdl=>bdl.language==lang);
                if (local){
                    name = local.name;
                    shortname = local.shortname;
                }else {
                    // use the default value
                    name = bd.nameStd;
                    shortname = bd.shortnameStd;
                }
            }

            // loop over the linked disciplines
            for (let d of bd.disciplines){
                // add the discipline when active
                if (d.active){

                    // TODO: some disciplines need further modifications to the names and shortnames based on d.configuration (e.g. hurdle heights, weights)
                    // if we really make modules for different types of disciplines, then wach module should provide a "translator" function doing these modifications
                    if (d.xDiscipline==123){
                        name = name + "";
                        shortname = shortname + "";
                    }

                    // xDiscipline, xBaseDiscipline, sortorder, timeAppeal, timeCall, type, name, shortname 
                    disciplines.push({
                        xDiscipline: d.xDiscipline,
                        xBaseDiscipline: bd.xBaseDiscipline,
                        sortorder: d.sortorder,
                        indoor: bd.indoor,
                        /*timeAppeal: d.timeAppeal,
                        timeCall: d.timeCall,*/
                        type: bd.type,
                        //relay: bd.relay,
                        name: name,
                        shortname: shortname,
                        configuration:d.configuration,
                        baseConfiguration: bd.baseConfiguration,
                        info: d.info,
                    })
                }
            }
        }

        // sort the disciplines:
        disciplines.sort((el1, el2)=>{return el1.sortorder-el2.sortorder})

        this.translations[lang] = disciplines;
        return disciplines;
    }

    /**
     * add an baseDiscipline
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addBaseDiscipline(data){

        // validate the data based on the schema
        let valid = this.validateAddBaseDiscipline(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addBaseDiscipline, updateBaseDiscipline, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var baseDiscipline = await this.models.basedisciplines.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: BaseDiscipline could not be created: ${err}`, code:22}})

            this.data.push(baseDiscipline); 

            // the data to be sent back to the client requesting the add is the full data
            let sendData = baseDiscipline.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addBaseDiscipline',
                data: baseDiscipline.dataValues // should have the same properties as data, but with added xBaseDiscipline
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteBaseDiscipline
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
            throw {message: this.ajv.errorsText(this.validateAddBaseDiscipline.errors), code:23};
        }
    }


    async deleteBaseDiscipline(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteBaseDiscipline(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, baseDiscipline] = this.findObjInArrayByProp(this.data, 'xBaseDiscipline', data)

            // delete the entry in the meetings table
            await this.models.basedisciplines.destroy({where:{xBaseDiscipline: data}}).catch(()=>{
                throw {message: "BaseDiscipline could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data, 'xBaseDiscipline', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteBaseDiscipline',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addBaseDiscipline
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
            throw {message: this.ajv.errorsText(this.validateDeleteBaseDiscipline.errors), code:23};
        }
    }

    
    async updateBaseDiscipline(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateBaseDiscipline(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data, 'xBaseDiscipline', data.xBaseDiscipline);
            if (i<0){
                throw {code:24, message:"The baseDiscipline does not exist anymore on the server (should actually never happen)."};
            }

            let baseDisciplineOld = o.dataValues;

            return o.update(data).then(async(baseDisciplineChanged)=>{
                // the data should be updated in th DB by now.

                // set the local data
                this.data[i] = baseDisciplineChanged;

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateBaseDiscipline', data: baseDisciplineChanged.dataValues}, 
                    undoObj: {funcName: 'updateBaseDiscipline', data: baseDisciplineOld, ID: this.ID},
                    response: baseDisciplineChanged.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the baseDiscipline with the respective Id. Error: " + err};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateEventGroup.errors)}
        }
    }

}

export default rDisciplines;