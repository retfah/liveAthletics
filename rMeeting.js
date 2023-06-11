// room for each meeting, defining meeting wide settings
// this is a dynamic room, but it should always be open, since its data is used in other rooms

// stores most data in mongo and not mariadb

import roomServer from './roomServer.js';

import Sequelize  from 'sequelize';
const Op = Sequelize.Op;

/**
 * the room for a single meeting
 * The data stores an object: TODO
 */
class rMeeting extends roomServer{

    /** Constructor for the meeting-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     * @param {object} dynamicRoom An object with properties for a dynamic room
     * @param {object} meeting The data in the meetings room for this specific meeting
     * @param {object} rMeetings the reference to rMeetings; needed e.g. if we shall set the date from/to also in the main meeting room
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, meeting, rMeetings, baseModules){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false, dynamicRoom)

        // a subroom must have the full room name, e.g. "hello/world@meeting". Otherwise clients cannot process broadcasted changes appropriately, since they always store the full name and not shortened room name as it mihgt work for the server.

        let roomName = `meeting@${meetingShortname}`;

        super(eventHandler, mongoDb, logger, roomName, true, -1, false);

        this.meeting = meeting;
        this.rMeetings = rMeetings;
        this.baseModules = baseModules;

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        // data is an object of the following structure: 
        // data = {series:[], contest:{the contest data}, auxData:{}}
        // auxData = {xStartgroup:{"1": {athleteName, athleteForename, birthday, sex, clubName, clubSortvalue, countryCode, bib}, "15":{...}, ...}}

        // HowTo (in startsInGroup): 
        // - for every startsInGroup-entry, keep a corresponding dataset with the most 

        this.data = {}; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)


        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        this.functionsWrite.updateMeeting = this.updateMeeting.bind(this);
        this.functionsReadOnly.baseGetCompetitions = this.baseGetCompetitions.bind(this);
        this.functionsWrite.baseImportCompetition = this.baseImportCompetition.bind(this); 
        this.functionsReadOnly.baseLastUpdate = this.baseLastUpdate.bind(this);
        this.functionsWrite.baseUpdate = this.baseUpdate.bind(this);
        this.functionsReadOnly.renewStartgroups = this.renewStartgroups.bind(this); // renew all startgroups in all rooms

        // first create the date of today (UTC):
        let now = new Date();
        let defaultDate = new Date(0); // 1.1.1970 at midnight UTC
        defaultDate.setUTCFullYear(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()); // now defaultDate should be the current date in UTC

        this.defaultData = {
            name:this.meeting.name,
            location: '',
            stadium: '',
            organizer: '',
            dateFrom: defaultDate.toJSON(),
            dateTo: defaultDate.toJSON(),
            timezoneOffset: null, // in minutes, received by date.getTimezoneOffset(); will be set to the offset of the client at the specific date (including daylight saving times) when the user changes the startdate as soon as the client modifies this data for the first time
            isIndoor:false,
            feeModel: null,
            //importExportModel: null,
            feeOptions:{},
            baseSettings:{}, // store some data for each kind of base data that was imported which will be needed for exporting
            //importExportOptions: {}, 
        }

        // The fee schema and the importExportOptions can easily be replaced to suit the needs of a specific country

        this.schemaFeeSwiss = {
            type:'object',
            properties:{
                defaultFee: {type:'integer', default:0},
                defaultReduction2nd: {type:'integer', default:0},
                //defaultBailFee, ...
            },
            required:['defaultFee', 'defaultReduction2nd'],
            additionalProperties: false,
        }

        this.schemaImportExportSwiss = {
            type:'object',
            properties:{
                onlineId: {type:["string", "null"], default:null},
            },
            required:['onlineId'],
            additionalProperties: false,
        }



        /*const schemaServerReferencing = {
            type:'object',
            properties:{
                host: {type:'string'},
                port: {type:'integer'},
                path: {type:'string', default:'/ws'}, // currently this is not variied. 
                secure: {type:'boolean', default:true}
            },
            required:['host', 'port', 'path', 'secure'],
            additionalProperties: false,
        };*/
        
        // define, compile and store the schemas:
        // NOTE: the schema is NOT necessarily always the same as is checked in 'validateMeeting', since the 'createValidator' will change the object, but the updated ajv-validator does not necessarily get stored as validateMeeting, e.g. because there is an error in the sent data
        this.schemaMeeting = {
            type:'object',
            properties:{
                name: {type:"string"},
                location: {type:"string"},
                stadium: {type:"string", default:''}, // TODO: remove the default as soon as all meetings have a value (probably as of 2024)
                organizer: {type:"string"},
                dateFrom: {type:["string"], format:"date-time"},
                dateTo: {type:["string"], format:"date-time"},
                timezoneOffset: {type:"integer"}, // in minutes
                isIndoor: {type:"boolean"},
                /*secondaryToken: {type:['string', 'null']}, // if null, then this is a primary server
                secondaryPullServer: {
                    type:'object',
                    properties:{
                        host: {type:'string'},
                        port: {type:'integer'},
                        path: {type:'string', default:'/ws'}, // currently this is not variied. 
                        secure: {type:'boolean', default:true}
                    },
                    required:['host', 'port', 'path', 'secure'],
                    additionalProperties: false,
                },
                secondaryPushServers: {
                    type:'array',
                    items: {
                        type:'object',
                        properties:{
                            host: {type:'string'},
                            port: {type:'integer'},
                            path: {type:'string', default:'/ws'}, // currently this is not variied. 
                            secure: {type:'boolean', default:true},
                            token: {type:'string'}, // the token used to prove to the secondary server that this server is allowed to push.
                        },
                        required:['host', 'port', 'path', 'secure', 'token'],
                        additionalProperties: false,
                    },
                },*/
                // store the chosen models; their data is to be stored within "feeOptions" and "importExportOptions", respectively
                feeModel: {type:['null',"string"]},
                //importExportModel: {type:['null',"string"]},
                // will be overriden as soon as there is a model chosen: 
                feeOptions:{type:'object'}, // in a separate object to make it replaceable e.g. for different countries
                baseSettings: {type:'object'},
            },
            required:['name', 'location', 'organizer', 'dateFrom', 'dateTo', 'isIndoor', 'feeModel',  'feeOptions'],
            required:['name', 'location', 'stadium', 'organizer', 'dateFrom', 'dateTo', 'isIndoor', 'feeModel',  'feeOptions'],
            additionalProperties:false ,
        }

        const schemaBaseImportCompetition = {
            type: 'object',
            properties: {
                baseName: {type:"string"},
                identifier: {type:'string'},
                opts: {type:'object'}, // the exact properties opts should have is probably specified by the actual base implementation 
            },
            additionalProperties:false ,
            required: ['baseName', 'identifier', 'opts'],
        }

        const schemaBaseGetCompetitions = {
            type: 'object',
            properties: {
                baseName: {type:"string"},
                opts: {type:'object'}, // the exact properties opts should have is probably specified by the actual base implementation (e.g. password and username)
            },
            additionalProperties:false ,
            required: ['baseName', 'opts'],
        }
        
        const schemaBaseUpdate = {
            type:'object',
            properties: {
                baseName: {type:"string"},
                opts: {type:'object'}, // the exact properties opts should have is probably specified by the actual base implementation (e.g. password and username)
            },
            additionalProperties:false ,
            required: ['baseName', 'opts'],
        }

        const schemaBaseLastUpdate = {
            type:'object',
            properties: {
                baseName: {type:"string"},
            },
            additionalProperties:false ,
            required: ['baseName'],
        }
        
        // this will actually be overriden when the mongo-data was read and the schemaMeeting is extended with the fee and the importExportModel schemas.
        this.validateMeetingNoOptions = this.ajv.compile(this.schemaMeeting);
        this.validateBaseGetCompetitions = this.ajv.compile(schemaBaseGetCompetitions);
        this.validateBaseImportCompetition = this.ajv.compile(schemaBaseImportCompetition);
        this.validateBaseUpdate = this.ajv.compile(schemaBaseUpdate);
        this.validateBaseLastUpdate = this.ajv.compile(schemaBaseLastUpdate);

    }

    /**
     * Called as soon this.collection is set, i.e. when the collection of this room is ready.
     * Overrides the empty parent
     */
    async onMongoConnected(){
        
        // try to get the meeting document:
        let data = {};
        /*let cursor = this.collection.find({type:'meeting'});
        let len = await cursor.count();  */ // deprecated 2022-05
        let len = await this.collection.countDocuments({type:'meeting'});
        if (len==0){

            // create the document
            await this.collection.updateOne({type:'meeting'},{$set:{meeting: this.defaultData}},{upsert:true}) //update with upsert=insert when not exists
            data = this.defaultData;

        } else if (len>1){
            this.logger.log(10, `Cannot initialize rMeeting for xMeeting=${this.meeting.xMeeting} shortname=${this.meeting.shortname} since there is more than one mongo document.`)
            return;
        } else {
            let cursor = this.collection.find({type:'meeting'});
            let raw = await cursor.next();
            data = raw.meeting;
        }

        // do not simply override the default empty data-object, but copy the properties in it to not change the reference
        this.propertyTransfer(data, this.data)
        //this.data = data;

        // define the new validation:
        this.validateMeeting = this.createValidator(data);

        this.ready = true;

    }

    /**
     * Create a validator for the overall data object with the models specified in data.
     * @param {object} data The data object for the meeting; needed to get teh chosen models
     */
    createValidator(data){
        // first reset all models
        this.schemaMeeting.feeOptions = {};
        this.schemaMeeting.importExportOptions = {};

        // based on the model settings for fees and importExport, set the correct schema
        if (data.feeModel=='swiss'){
            this.schemaMeeting.feeOptions = this.schemaFeeSwiss;
        }

        /*if (data.importExportModel=='swiss'){
            this.schemaMeeting.importExportOptions = this.schemaImportExportSwiss;
        }*/
        // define the new validation:
        return this.ajv.compile(this.schemaMeeting);
    }

    // notify all rooms to renew the startgroups; this is needed e.g. when the base data were updated in another meeting, since the automatucally raised event is only received in this room 
    renewStartgroups(data){
        // make sure that all contests recreate their startgroups !
        this.eH.raise(`general@${this.meetingShortname}:renewStartgroups`);
        return true;
    }

    async updateMeeting(data){

        // first we need to do some prevalidation without the model options; if the model options have changed, we need to update the schema first, before we do the final validation
        if (!this.validateMeetingNoOptions(data)){
            throw {code: 21, message: `The sent data is not valid (without checking the models): ${this.ajv.errorsText(this.validateMeetingNoOptions.errors)}.`}
        }

        // always recreate the schema and the validation
        let tempValidator = this.createValidator(data);


        if (!tempValidator(data)){
            throw {code: 22, message: `The sent data of the option-models is not valid:  ${this.ajv.errorsText(tempValidator.errors)}.`}
        }

        let oldData = this.data; 

        // store the data to DB
        try {
            await this.collection.updateOne({type:'meeting'}, {$set:{meeting: data}})
        } catch (e){
            this.logger.log(20, `Could not update meeting in MongoDB: ${e}`)
            throw {code: 23, message: `Could not update meeting in MongoDB: ${e}`};
        }

        // if all was ok, store the new validator and the data
        // IMPORTANT: transfer the data and do not simply replace the data; otherwise, all rooms referring to the rMeeting data will not deliver the updated data!
        this.propertyTransfer(data, this.data, false);
        this.validateMeeting = tempValidator;

        // return broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateMeeting', data: data},
            undoObj: {funcName: 'updateMeeting', data: oldData, ID: this.ID},
            response: data, 
            preventBroadcastToCaller: true
        };

        return ret;

    }
    
    async baseGetCompetitions(data){
        if (!this.validateBaseGetCompetitions(data)){
            throw {code: 21, message: `The sent data is not valid: ${this.ajv.errorsText(this.validateBaseGetCompetitions.errors)}.`}
        }

        if (!(data.baseName in this.baseModules)){
            throw {code:22, message:`Module ${data.baseName} does not exist.`}
        }

        const response = {
            err:0, 
        };

        const base = this.baseModules[data.baseName];
        response.competitions = await base.getCompetitions(data.opts).catch((errObj)=>{
            if (errObj.code==1){
                // connection error
                response.err = 2;

            } else if (errObj.code==2) {
                // error during processing of the server's answer
                throw {code:23, message:`There was an error on the server while processing the received list of meetings: ${JSON.stringify(errObj)}`}

            } else if (errObj.code==3) {
                // no meetings
                response.err = 1;
            } else if(errObj.code==4){
                // login credentials wrong
                response.err=3;
            }
        });

        // return
        return response;

    }

    async baseImportCompetition(data){

        if (!this.validateBaseImportCompetition(data)){
            throw {code: 21, message: `The sent data is not valid: ${this.ajv.errorsText(this.validateBaseImportCompetition.errors)}.`}
        }

        if (!(data.baseName in this.baseModules)){
            throw {code:22, message:`Module ${data.baseName} does not exist.`}
        }

        const response = {
            err:0, 
            notes:'',
            hello:123,
        };

        // reference to the rooms of this meeting
        const roomRef = this.rMeetings.activeMeetings[this.meeting.shortname].rooms;

        const base = this.baseModules[data.baseName];
        const importResult = await base.importCompetition(data.identifier, roomRef, data.opts).catch((errObj)=>{
            if (errObj?.code==1){
                // connection error
                response.err = 2;

            } else if (errObj?.code==2) {
                // error during processing of the server's answer
                throw {code:23, message:`There was an error on the server while processing the competition: ${JSON.stringify(errObj)}`}

            } else if (errObj?.code==3) {
                // meeting does not exist
                response.err = 1;
            } else if(errObj?.code==4){
                // login credentials wrong
                response.err=3;
            } else {
                throw {code:25, message:`Error occured during processing: ${JSON.stringify(errObj)}`};
            }
        });

        if (response.err==0){
            // store the information about the import
            this.data.baseSettings['SUI'] = importResult.baseSettings;

            // store this data to DB
            try {
                await this.collection.updateOne({type:'meeting'}, {$set:{meeting: this.data}})
            } catch (e){
                this.logger.log(20, `Could not update meeting in MongoDB: ${e}`)
                throw {code: 24, message: `Could not update meeting in MongoDB: ${e}`};
            }

            response.notes = importResult.statsForClient.notes;
            response.failCount = importResult.statsForClient.failCount;
            response.newCount = importResult.statsForClient.newCount;
            response.updateCount = importResult.statsForClient.updateCount;
            
        }

        // return
        let ret = {            
            isAchange: false, 
            doObj: {funcName: 'updateMeeting', data: this.data},
            //undoObj: {funcName: '', data: oldData, ID: this.ID},
            response: response, 
            preventBroadcastToCaller: true
        };

        return ret;
    }

    async baseLastUpdate(data){
        if(!this.validateBaseLastUpdate(data)){
            throw{code:21, message:`The sent data is not valid: ${this.ajv.errorsText(this.validateBaseLastUpdate.errors)}.`}
        }

        if (!(data.baseName in this.baseModules)){
            throw {code:22, message:`Module ${data.baseName} does not exist.`}
        }

        const response = {
            err:0, 
            lastUpdate: this.baseModules[data.baseName].lastBaseUpdateDate,
        };

        // return
        return response;
        
    }

    async baseUpdate(data){
        if(!this.validateBaseUpdate(data)){
            throw{code:21, message:`The sent data is not valid: ${this.ajv.errorsText(this.validateBaseUpdate.errors)}.`}
        }

        if (!(data.baseName in this.baseModules)){
            throw {code:22, message:`Module ${data.baseName} does not exist.`}
        }

        const response = {
            err:0, 
        };

        const base = this.baseModules[data.baseName];
        response.notes = await base.updateBaseData(data.opts).catch((errObj)=>{
            if (errObj.code==1){
                // connection error
                response.err = 2;

            } else if (errObj.code==2) {
                // error during processing of the server's answer
                throw {code:23, message:`There was an error on the server while processing the update: ${JSON.stringify(errObj)}`}

            } else if(errObj.code==4){
                // login credentials wrong
                response.err=3;
            } else {
                throw {code:24, message:`There was an error on the server while processing the update: ${JSON.stringify(errObj)}`}
            }
        });

        // make sure that all contests recreate their startgroups !
        this.eH.raise(`general@${this.meetingShortname}:renewStartgroups`);

        // return
        let ret = {
            isAchange: false, 
            //doObj: {funcName: '', data: data},
            //undoObj: {funcName: '', data: oldData, ID: this.ID},
            response: response, 
            //preventBroadcastToCaller: true
        };

        return ret;

    }

}

export default rMeeting;