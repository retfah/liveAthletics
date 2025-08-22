

// started with the basic inscriptions file; extended to eager load athletes, relays and relayAthletes
// - inscription
//   - athletes
//   - relays
//     - relayAthletes


import conf from './conf.js';
import roomServer from './roomServer.js';

/**
 * the room for inscription management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{inscription1}, {inscription2}]
 */
class rInscriptions extends roomServer{

    /** Constructor for the inscription-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, categories, regions, meeting, baseModules){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false)
        super(eventHandler, mongoDb, logger, "inscriptions@" + meetingShortname, true, -1, false);

        // reference to meeting data. TODO: not finalized yet: Currently it is a reference to the main meeting with all the references to its rooms etc. Actually we just need the background information for this meeting (start and end dates, where, organized by, etc.)
        this.meeting = meeting;

        // keep an object with all baseModules to ask for base data.
        this.baseModules = baseModules;

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = {
            // main data:
            inscriptions: [],
            // auxilary data (since thes objects always reference the current data, a simple reload on the client will also provide the newest data.)
            categories: categories.data, // might be empty at that time
            regions: regions.data, // might be empty at that time
            meeting: meeting.data, // backgroundinformation about the meeting (e.g. dates)
        }; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all inscriptions
        this.models.inscriptions.findAll({include: [
            {model:this.models.athletes, as:"athlete"}, 
            {model:this.models.relays, as:"relay", include:[ // relays are currently loaded but there are no functions yet for CUD. 
                {model:this.models.relayathletes, as:"relayathletes"}]}
            ]}).then(inscriptions=>{
                this.data.inscriptions = inscriptions;
                this.ready = true;
        })

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addInscription = this.addInscription.bind(this);
        this.functionsWrite.deleteInscription = this.deleteInscription.bind(this);
        this.functionsWrite.updateInscription = this.updateInscription.bind(this);
        this.functionsWrite.setBib = this.setBib.bind(this);
        this.functionsReadOnly.getBaseData = this.getBaseData.bind(this);
        this.functionsReadOnly.getBasePerformances = this.getBasePerformances.bind(this);

        // define, compile and store the schemas:
        let schemaAddInscription = {
            // TODO: as soon as we have relays, we need to update this schema!
            type: "object",
            properties: {
                xInscription: {type: "integer"},
                athlete: {
                    type: "object",
                    properties: {
                        xAthlete: {type:"integer"}, // used in the sideChannel
                        lastname: {type:"string", maxLength:100},
                        forename: {type:"string", maxLength:100},
                        birthdate: {type:"string", format:"date"},
                        sex: {type:"string", enum:conf.sexes},
                        xClub: {type:"integer"},
                        identifier: {type:["string", "null"], maxLength:36, default:null},
                        nationalBody: {type:["string", "null"], maxLength:3, default:null},
                        xRegion: {type: "integer"},
                        xInscription: {type: "integer"}, // used in the sideChannel
                    },
                    required:["lastname", 'forename', 'birthdate', "sex", "xClub", "xRegion"],
                    additionalProperties:false,
                },
                relay: {
                    type:"object",
                    properties:{
                        todo:{type:"string"}, // TODO
                    },
                    //required:["notExisting"]
                },
                number: {type:"integer"},
                xCategory: {type:"integer"},
            },
            oneOf:[
                {required: ["athlete"]},
                {required: ["relay"]}
            ],
            required:["xCategory"],
            additionalProperties:false,
        };
        let schemaUpdateInscription = {
            // TODO: as soon as we have relays, we need to update this schema!
            type: "object",
            properties: {
                xInscription: {type: "integer"},
                athlete: {
                    type: "object",
                    properties: {
                        xAthlete: {type:"integer"},
                        lastname: {type:"string", maxLength:100},
                        forename: {type:"string", maxLength:100},
                        birthdate: {type:"string", format:"date"},
                        sex: {type:"string", enum:conf.sexes},
                        xClub: {type:"integer"},
                        identifier: {type:["string", "null"], maxLength:36},
                        nationalBody: {type:["string", "null"], maxLength:3},
                        xRegion: {type: "integer"},
                        xInscription: {type: "integer"},
                    },
                    required:["lastname", 'forename', 'birthdate', "sex", "xClub", "xRegion"],
                    additionalProperties:false,
                },
                relay: {
                    type:"object",
                    properties:{
                        todo:{type:"string"}, // TODO
                    },
                    //required:["notExisting"]
                },
                number:{type:"integer"},
                xCategory: {type:"integer"},
            },
            oneOf:[
                {required: ["xInscription", "athlete"]},
                {required: ["xInscription", "relay"]}
            ],
            required:["xCategory"],
            additionalProperties:false,
        };
        let schemaDeleteInscription = {
            type: "integer"
        };
        let schemaSetBib = {
            type: "array",
            items: {
                type: "object",
                properties: {
                    xInscription: {type: "integer"},
                    number: {type:"integer"},
                },
                required:['xInscription', 'number'],
                additionalProperties: false,
            }
        };
        const schemaGetBaseData = {
            type:'object',
            properties: {
                base: {type:'string'},
                search: {type: 'string'},
            },
            required: ['base', 'search'],
            additionalProperties: false,
        };
        const schemaGetBasePerformances = {
            type:'object',
            properties: {
                base: {type:'string', maxLength:3},
                identifier: {type:"string"},
            }
        };
        this.validateGetBaseData = this.ajv.compile(schemaGetBaseData);
        this.validateGetBasePerformances = this.ajv.compile(schemaGetBasePerformances);
        this.validateAddInscription = this.ajv.compile(schemaAddInscription);
        this.validateUpdateInscription = this.ajv.compile(schemaUpdateInscription);
        this.validateDeleteInscription= this.ajv.compile(schemaDeleteInscription);
        this.validateSetBib = this.ajv.compile(schemaSetBib);
    }

    async getBasePerformances(request){
        if (!this.validateGetBasePerformances(request)){
            throw {message:this.ajv.errorsText(this.validateGetBasePerformances.errors), code:21}
        }

        if (!(request.base in this.baseModules)){
            throw {message: `There is no base module named ${request.base}`, code:22};
        }

        const data = await this.baseModules[request.base].getPerformances(request.identifier).catch(err=>{ throw {message: `Error while getting performances for athlete: ${JSON.stringify(err)}`, code:23}});

        return data;

    }

    async getBaseData(request){
        if (!this.validateGetBaseData(request)){
            throw {message: this.ajv.errorsText(this.validateGetBaseData.errors), code:21};
        } 

        if (!(request.base in this.baseModules)){
            throw {message: `There is no base module named ${request.base}`, code:22};
        }

        const data = await this.baseModules[request.base].getAthlete(request.search).catch(err=>{ 
            throw {message: `Error while searching for athletes: ${JSON.stringify(err)}`, code:23}
        });

        
        // TODO: get the real data based on the proeprties "base" and "search"
        /*const data = {
            entriesNum: 10,
            entries: [
                {identifier:'123', lastname: 'Doe', firstname: 'John'},
                {identifier:'456', lastname: 'Doe', firstname: 'Jane'},
                {identifier:'789', lastname: 'Famos', firstname: 'Jasmine'},
                {identifier:'007', lastname: 'Famos', firstname: 'Reto'},
            ],
        }*/

        return data;
        
    }

    /**
     * Change the bib number for multiple inscriptions
     * @param {array} data The array of inscritions to change the number for
     */
    async setBib(data){
        // validate the data based on the schema
        let valid = this.validateSetBib(data);
        if (valid) {
            // loop over all inscriptions to be changed

            for (let i=0; i<data.length; i++){
                let el = data[i];
                //data.forEach(el=>{
                let [ind, inscription] = this.findObjInArrayByProp(this.data.inscriptions, 'xInscription', el.xInscription);
                if (ind==-1){
                    throw {message: `The inscription ${el.xInscription} does not exist.` , code:25}
                }
                // change the data and save it to DB
                inscription.number = el.number;
                await inscription.save().catch(err=>{
                    throw {message: `Bib-change for xInscription=${el.xInscription} could not be stored: ${err}`, code:26};
                });

            }

            // the data we send back to the client here is simply what he sent us, applying the change that was requested
            let sendData = data;

            // make sure that all contests recreate their startgroups !
            this.eH.raise(`general@${this.meetingShortname}:renewStartgroups`);

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'setBib',
                data: data // data unchanged
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteInscription
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
            throw {message: this.ajv.errorsText(this.validateSetBib.errors), code:23};
        }

    }

    /**
     * add an inscription
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addInscription(data){

        // validate the data based on the schema
        let valid = this.validateAddInscription(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addInscription, updateInscription, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            // since we do nested create, we need to use a transaction. Otherwise, it could be that the nested create fails, but the outer element persists!
            var inscription = await this.seq.transaction(async t=>{

            return await this.models.inscriptions.create(dataTranslated, {transaction:t, include: [
                {model:this.models.athletes, as:"athlete"}, 
                {model:this.models.relays, as:"relay", include:[ // relays are currently loaded but there are no functions yet for CUD. 
                    {model:this.models.relayathletes, as:"relayathletes"}]}
                ]})

            }).catch((err)=>{throw {message: `Sequelize-problem: Inscription could not be created: ${err}`, code:22}})

            this.data.inscriptions.push(inscription); 

            // the data to be sent back to the client requesting the add is the full data
            let sendData = inscription.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addInscription',
                data: inscription.dataValues // should have the same properties as data, but with added xInscription
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteInscription
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
            throw {message: this.ajv.errorsText(this.validateAddInscription.errors), code:23};
        }
    }


    async deleteInscription(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteInscription(data);

        if (valid){
            // difficulty: actually we should first delete inscription to check whether there are starts of this athlete/relay (i.e. we cannot delete the inscription) before we delete the athlete/relay, to prevent that only the athlete/relay would be deleted. However, since the athletes/relay also depend on the inscription, not only possible starts would prevent the inscription deletion, but also the athlete/relay. Thus there are the following options: 
            // 1: recreate athelete/relay if deleting the inscription fails
            // 2: set CASCADE in the DB for athletes, relays and relayAthletes, which should automatically delete those entries when the inscription is deleted. IMPLEMENTED for athlete, relay and relayAthletes. IMPORTANT: such a cascade should only be implemented between tables that are handles by the same room, so that it is easy to keep our seqeulize models consistent with the DB!
            // 3: manually check that there are no starts assigned to the inscription and then start deleting; this should prevent an inconsistency. 

            // IMPORTANT: we must first delete the inscription, which has the critical dependencies, before we delete 

            // get the entry from the data (respectively its index first):
            let [ind, inscription] = this.findObjInArrayByProp(this.data.inscriptions, 'xInscription', data)

            // athlete should be automatically deleted
            /*if ('athlete' in inscription){
                await inscription.athlete.destroy().catch((err)=>{ throw {message:`Athlete could not be deleted: ${err}`, code:26}})

            } else if ('relay' in inscription){
                let relay = inscription.relay;
                if ('relayAthletes' in relay){
                    for (let relAth of relay.relayathletes){
                        await relAth.detroy().catch((err)=>{ throw {message:`Relay athlete could not be deleted: ${err}`, code:24}})
                    }
                }
                await relay.destroy().catch((err)=>{ throw {message:`Relay could not be deleted: ${err}`, code:25}})
            }*/

            // delete the entry in the inscriptions table
            await inscription.destroy({where:{xInscription: data}}).catch(()=>{
                throw {message: "Inscription could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data.inscriptions, 'xInscription', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.inscriptions.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteInscription',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addInscription
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
            throw {message: this.ajv.errorsText(this.validateDeleteInscription.errors), code:23};
        }
    }

    
    async updateInscription(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateInscription(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data.inscriptions, 'xInscription', data.xInscription);
            if (i<0){
                throw {code:24, message:"The inscription does not exist anymore on the server (should actually never happen)."};
            }

            // check/make sure that all keys are consistent
            data.athlete.xInscription = data.xInscription;
            // xAthlete is not allowed to be changed!
            if ("xAthlete" in data?.athlete && data.athlete.xAthlete != o.athlete.xAthlete){
                throw {code:25, message: "The xAthlete-property is not allowed to change!"};
            }

            let inscriptionOld = {};
            this.propertyTransfer(o.dataValues, inscriptionOld);

            // for nested changes it is probably best if we manually change all properties and call save instead of using update, which has some shortcomings currently (e.g. does not save changes of nested entries (here: athlete), returns only the properties that were aprt of the update-object, ...)
            this.propertyTransfer(data, o, true);

            // save all (if saving to DB is not necessary, sequelize will not do it and directly resolve the promise)
            await o.save().catch((err)=>{throw {code:26, message: `The changed inscription could not be stroed: ${err}`};})
            if ('athlete' in o){
                await o.athlete.save().catch((err)=>{throw {code:26, message: `The changed athlete could not be stored: ${err}`};})
            } else if ('relay' in o) {
                // TODO

                // also update relayAthletes!
            }

            // notify all rooms about the change (e.g. to update startgroups)
            this.eH.raise(`inscriptions@${this.meetingShortname}:inscriptionChanged${data.xInscription}`)

            let ret = {
                isAchange: true, 
                doObj: {funcName: 'updateInscription', data: o.dataValues}, 
                undoObj: {funcName: 'updateInscription', data: inscriptionOld, ID: this.ID},
                response: o.dataValues,
                preventBroadcastToCaller: true
            };
            
            // the rest is done in the parent
            return ret;

            /*return o.update(data, {include: [
                {model:this.models.athletes, as:"athlete"}, 
                {model:this.models.relays, as:"relay", include:[ // relays are currently loaded but there are no functions yet for CUD. 
                    {model:this.models.relayathletes, as:"relayathletes"}]}
                ]}).then(async(inscriptionChanged)=>{
                // the data should be updated in th DB by now.

                // set the local data
                // it seems like the sub-data is NOT stored to DB
                this.data.inscriptions[i] = await inscriptionChanged;//.reload();

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateInscription', data: inscriptionChanged.dataValues}, 
                    undoObj: {funcName: 'updateInscription', data: inscriptionOld, ID: this.ID},
                    response: inscriptionChanged.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the inscription with the respective Id. Error: " + err};
            });*/

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateInscription.errors)}
        }
    }

}

export default rInscriptions;