
// the room for the meetings 

// TODO: implement a view for a list of active meetings

/*const roomServer = require('./roomServer.js');
const fs = require('fs');
const {promisify} = require('util');
const rdMeetings1 = require('./rdMeetings1');
const rEvents = require('./rEvents');
const correctAssociations = require('./sequelize-mod.js');
const SAI = require('sequelize-auto-import');
const initModels = require("./modelsMeeting/init-models.js");
const conf = require ('./conf'); */
import Sequelize  from 'sequelize';
//import initModels from "./modelsMeeting/init-models.js"; // original es6 with classes
import initModelsDefine from "./modelsMeetingDefine/init-models.js"; // es6 with define syntax (based on modified sequelize-auto functions, run as es5 but creating es6-import with define)

import roomServer from './roomServer.js';
import fs from 'fs';
import {promisify} from 'util';

import rdMeetings1 from './rdMeetings1.js';
import rEvents from './rEvents.js';
import rEventGroups from './rEventGroups.js';
import rDisciplines from './rDisciplines.js';
import rCategories from './rCategories.js';
import rClubs from './rClubs.js';
//import rAthletes from './rAthletes.js'; // I think it is all included in rInscription
import rInscriptions from './rInscriptions.js';
import rContests from './rContests.js';
import rRegions from './rRegions.js';
import rStarts from './rStarts.js';
import rStartsInGroup from './rStartInGroup.js';
import rContestsOverview from './rContestsOverview.js';
import rBackup from './rBackup.js';
import rSideChannel from './rSideChannel.js';
import rMeeting from './rMeeting.js';

//import correctAssociations from './sequelize-mod.js';
//import SAI from 'sequelize-auto-import';
import conf from './conf.js'; 
/*const vMeetingsSelection = require('./vMeetingsSelection');*/


/**
 * the room for the meeting management (adding, deletign, starting, stopping, configurations, ...)
 * The data stores a list of objects with the meeting data: data =[{meeting1}, {meeting2}]
 */
class rMeetings extends roomServer{

    /** Constructor for the meetings-room
     * @method constructor
     * @param {sequelize} sequelizeAdmin sequelize The sequelize connection to the Admin-DB
     * @param {sequelizeModels} modelsAdmin sequelize-models The sequelize models of the Admin-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {mongoClient} mongoClient the connected mongoClient instance, used to get Db instances for each meeting
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     * @param {wsManager} wsManager Manages ws connections of the server, e.g. to secondary servers.
     * @param {object} baseModules An object storing the base modules (key=country three code letter), which may be accessed by some rooms.
     */
    constructor(sequelizeAdmin, modelsAdmin, mongoDb, mongoClient, eventHandler, logger, wsManager, baseModules){

        // NOTE: when debugging, the variable 'this' is undefined when the debugger passes here on construction. Don't know why, but it works anyway.

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false, dynamicRoom=undefined, reportToSideChannel=true)
        super(eventHandler, mongoDb, logger, 'meetings', true, 1, false, undefined, false);//, roomManager, wsProcessor);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = []; 

        // the reference to the sequelizeAdmin connection
        this.seq = sequelizeAdmin;
        this.models = modelsAdmin;

        this.wsManager = wsManager;
        this.baseModules = baseModules;
        this.mongoClient = mongoClient;

        // the data is not stored in this class, but the parent; in the property 'data'. It will be set initially in loadNew()
        // this.data
        this.meetingsAssoc={} // the same content as in data, but as an object where the property is the shortname

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)
        

        // if possible, all running meetings and their DB and room-handles shall be stored centrally in the meetings-room (maybe there is a better way to do so, but currently I think thats ok).
        // the difference to meetingsAssoc is that here we do not only store the meeting data, but also all rooms etc and here we have only running meetings while in meetingsAssoc all existing meetings on the server are listed
        this.activeMeetings = {}; // the shortname is the property name

        // load all the meetings
        this.loadNew().then(async ()=>{

            this.logger.log(99, 'Meetings initially loaded.');

            // start the meetings that are 'active'
            await this.meetingStartupAll();
            this.ready = true;
            
            this.logger.log(99, 'Meetings started.');

            // after all data is loaded, we have to recreate all datasets! (Otherwise they are empty until something is added)
            this.recreateRoomDatasets();
            
            this.eH.raise('meetingsReady');

        }
        ).catch((err)=>{
            this.logger.log(2,"loading/starting meeting failed: "+ err)
        }) 
        
        // add (sub)-datasets:
        // meetingSeelection:
        let rdMeetingSelection = new rdMeetings1(this); // this will automatically add the roomDataset to this room.

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST (!!!!!) be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        this.functionsWrite.addMeeting = this.addMeeting.bind(this); 
        this.functionsWrite.updateMeeting = this.updateMeeting.bind(this);
        this.functionsWrite.deleteMeeting = this.deleteMeeting.bind(this); 
        this.functionsWrite.activateMeeting = this.activateMeeting.bind(this);
        this.functionsWrite.deactivateMeeting = this.deactivateMeeting.bind(this);
        this.functionsReadOnly.backupMeeting = this.backupMeeting.bind(this);
        this.functionsReadOnly.schemaRestoreMeeting = this.restoreMeeting.bind(this); // note: despite the fact that we change a lot of data during restore, we do not change anything related to this room, as all the changes are within the DB of the meeting and not in the admin_meetings table
        //this.functionsReadOnly.TODO = this.TODO.bind(this);
        //this.functionsWrite.TODO2 = this.TODO2.bind(this);

        // define, compile and store the schemas:
        let schemaAddMeeting = {
            type: "object",
            properties: {
                xMeeting: {type: "integer"}, // for sideChannel
                shortname: {type: "string", maxLength:10, pattern:'^((?!\\s).)*$'}, // no whitespace in the whole string!
                name:{type: "string", maxLength:75},
                code: {type: "string", maxLength:50},
                active: {type: "boolean"}, 
                isSlave: {type: "boolean"},
                masterAddress: {type: "string", maxLength:100}, // not used anymore
                masterUsername: {type:"string", maxLength:45},  // not used anymore
                masterPassword: {type:"string", maxLength:45}, // not used anymore
            },
            required: ["shortname", "active", "code"],
            additionalProperties: false,
        };
        let schemaUpdateMeeting = {
            type: "object",
            properties: {
                xMeeting: {type: "integer"},
                code: {type: "string", maxLength:50},
                name:{type: "string", maxLength:75},
                shortname: {type: "string", maxLength:10},  
                active: {type: ["boolean", "integer"]}, 
                //active: {type: ["boolean"]}, 
                isSlave: {type: ["boolean", "integer"]},
                masterAddress: {type: "string", maxLength:100}, // not used anymore
                masterUsername: {type:"string", maxLength:45},  // not used anymore
                masterPassword: {type:"string", maxLength:45}, // not used anymore
            },
            required: ["xMeeting", "shortname", "active", "isSlave"],
            additionalProperties: false,
        };
        let schemaDeleteMeeting = {
            type: "integer"
        }
        let schemaBackupMeeting = {
            type: "integer"
        }
        let activateMeeting = {
            type: "integer"
        }
        let deactivateMeeting = {
            type: "integer"
        }
        let schemaRestoreMeeting = {
            type: "object",
            properties: {
                xMeeting: {type: 'integer'},
                backup: {type: 'string'} // is likely encoded as base64
            }
        }
        this.validateAddMeeting = this.ajv.compile(schemaAddMeeting);
        this.validateUpdateMeeting = this.ajv.compile(schemaUpdateMeeting);
        this.validateDeleteMeeting = this.ajv.compile(schemaDeleteMeeting);
        this.validateBackupMeeting = this.ajv.compile(schemaBackupMeeting);
        this.validateRestoreMeeting = this.ajv.compile(schemaRestoreMeeting);
        this.validateActivateMeeting = this.ajv.compile(activateMeeting);
        this.validateDeactivateMeeting = this.ajv.compile(deactivateMeeting);

        // fs.readfile is async, but not with promises; only callbacks --> make it a promise
        this.readFileAsync = promisify( fs.readFile);

        // CREATE THE VIEWS (DISCONTINUED, but worked do far)
        // view for the meeting selection, i.e. stores only the most important stuff for every meeting, and not all the security-criticel stuff.
        //new vMeetingsSelection(this); // the view automatically adds itself to the room.  
    }

    /**
     * add a meeting
     * @param {object} data This data shall already be in the format as can be used by Sequalize to insert the data. It will be checked with the schema first.
     */
    async addMeeting(data){

        // validate the data based on the schema
        //let valid = this.ajv.validate(schema, data); 
        let valid = this.validateAddMeeting(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every funciton like addMeeting, updateMeeting, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var meeting = await this.models.meetings.create(dataTranslated).catch(()=>{throw {message: "Sequelize-problem: Meeting could not be created!", code:22}})
            this.logger.log(99, "Meeting added in meetings-DB.")

            // name of the database
            var name = this.getDbNameSql(meeting.shortname);

            // function to undo the changes done, when an error occurs at a later stage.
            var undo = async ()=>{
                try {
                    // delete the meeting again
                    await meeting.destroy();

                    // delete the meeting DB, if it exists
                    await mysqlConn.query(`drop database if exists ${name}`)
                }catch(e){
                    throw{message: `Something failed. Unfortunately rolling back failed as well and thus the data might be inconsistent now!: ${e}`, code:99}
                }
                this.logger.log(20,'Changes during meeting-add undone due to error');
            };

            // create the database for that meeting:
            await mysqlConn.query(`create database if not exists ${name}`).catch(async (error)=>{await undo(); throw {message: `Database could not be created: ${error}`, code:24};})
            // for unknown reasons, we cannot use the prepared statement syntax here; probably because it would introduce quotes around the DBname, which is not allowed?
            //await mysqlConn.execute("create database if not exists ?", [name]).catch((error)=>{this.logger.log(`ERROR here: ${error}`); throw {message: `Database could not be created: ${error}`, code:24};})

            
            this.logger.log(99, "Meeting-specific DB created.")

            // create sequelize connection to new DB
            var sequelizeMeeting = new Sequelize(name, conf.database.username, conf.database.password, {
                dialect: 'mariadb', // mysql, mariadb
                dialectOptions: {
                    multipleStatements: true, // attention: we need this option for creating meetings; however, it is dangerous as it allows SQL-injections! TODO: do all queries with multiple statements on the mysqlBaseConn and use sequelize only for ingle queries!
                    timezone: 'local', // sequelize would define an other default otherwise!
                },
                host: conf.database.host,
                port: conf.database.port,
                //operatorsAliases: false, no option anymore
                logging: false,
                // application wide model options: 
                define: {
                    timestamps: false // we generally do not want timestamps in the database in every record, or do we?
                }
            })
            
                
            // copy the standard DB into the new DB 
            // the sql code to create the tables must be in a separate file. This code is then run on the DB. We cannot use mysqldump here, as e.g. there is no import option yet for it.
            var emptyDbCode = await this.readFileAsync(conf.database.emptyDbPath, 'utf8').catch(async (error)=>{await undo(); throw {message: `emptyDbPath-file could not be read: ${error}`, code:25 }}) // if the encoding is ommitted, a buffer is returned whcih CANNOT be read by sequelize

            this.logger.log(99, "emptyDB code loaded")

            // run the query in raw mysql
            //await mysqlConn.query(`use ${name}`).catch(async (error)=>{await undo(); throw {message: `using db failed: ${error}`, code:37 }});
            //await mysqlConn.query(emptyDbCode).catch(async (error)=>{await undo(); throw {message: `emptyDbPath-code failed running in mysql: ${error}`, code:36 }});

            // run the query in sequelize
            await sequelizeMeeting.query(emptyDbCode, {raw:true, type:'RAW'}).catch(async (error)=>{await undo(); throw {message: `emptyDbPath-code failed running in sequelize: ${error}`, code:26 }});
            
            this.logger.log(99, "meeting-specific DB filled with tables.")

            // continue the promise chain with the next file read
            var importDataCode = await this.readFileAsync(conf.database.defaultDataDbPath, 'utf8').catch(async (error)=>{await undo(); throw {message: `defaultDataDbPath-file could not be read: ${error}`, code:27 }});

            this.logger.log(99, "default data code loaded")

            // run the query in sequelize
            await sequelizeMeeting.query(importDataCode, {raw:true, type:'RAW'}).catch(async (error)=>{await undo(); throw {message: `defaultDataDbPath-code failed running in sequelize: ${error}`, code:28 }});

            this.logger.log(99, "meeting-specific DB filled with default data.")
            // database is set up

            // we must update here the current data model stored in the room and notonly transmit the change to the clients. otherwise a reload of a client would still show him the data on the server at its startup and only a restart of the server would result in sending the correct, actual data again!
            // add the additional property "running"
            meeting.running = false;
            this.data.push(meeting); // TODO: try!
            this.meetingsAssoc[data.shortname]= meeting;

            if (meeting.active){

                // start all rooms, reuse the sequelizeMeeting connection
                await this.meetingStartupOne(data.shortname, sequelizeMeeting)
            } else {
                // stop the DB connections, as we dont need them anymore.
                await sequelizeMeeting.close().catch((error)=>{throw {message: `The sequelize connection of the meeting could not be closed: ${error}`, code: 29}});
            }

            // the data to be sent back to the client requesting the add
            /*let sendData = {
                meeting: meeting.dataValues // stringify is done later and can only be done once!
                //meeting: JSON.stringify(meeting.dataValues)
                // the ID will be added on resolve
            }*/

            // new 2019-08-19: is not an object, but the data itself
            let sendData = meeting.dataValues;

            // answer the calling client. it needs the same data as if it was an update, since we actually do an update for the id
            //responseFunc(sendData); --> done on resolve

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addMeeting',
                data: meeting.dataValues // should have the same properties as data, but with added meetingID
                //data: JSON.stringify(meeting.dataValues) // should have the same properties as data, but with added meetingID
                // the ID will be added on resolve
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
            throw {message: this.ajv.errorsText(this.validateAddMeeting.errors), code:23};
        }
    }


    async deleteMeeting(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteMeeting(data);

        if (valid){

            // get the meeting form the data (respectively its index first):
            let [ind, meeting] = this.findObjInArrayByProp(this.data, 'xMeeting', data)

            // check if the meeting is running (i.e. is it in meetings)
            if (meeting.shortname in this.activeMeetings){
                // first stop the meeting (includes all its rooms, the sequelize connection, deletes it from the meetings list, etc)
                await this.meetingShutdownOne(meeting.shortname)
            } 

            // delete the meeting-entry in the meetings table
            await this.models.meetings.destroy({where:{xMeeting: data}}).catch(()=>{
                throw {message: "Meeting could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the meeting actually did not exist (anymore!); However, should always exist!

            // delete the meeting locally from the data:
            [ind, meeting] = this.findObjInArrayByProp(this.data, 'xMeeting', data) // must be reqpeated, since the index could have changed due to the asny call.
            if (ind>=0){
                this.data.splice(ind,1);
            }

            // delete the shortname-reference to the meeting-data
            delete  this.meetingsAssoc[meeting.shortname]

            // delete the meeting-database (this actually should never fail; otherwise it's likely the admins fault and thus the admin should be able to delete the DB by himself too.)
            let name = this.getDbNameSql(meeting.shortname);
            await mysqlConn.query(`drop database if exists ${name}`).catch((err)=>{
                this.logger.log(`Database '${name}' could not be deleted: ${err}`);
            })  

            // delete the mongoDB database
            name = this.getDbNameMongo(meeting.shortname)
            await this.mongoClient.db(name).dropDatabase().catch(err=>{
                this.logger.log(`Mongo Database '${name}' could not be deleted: ${err}`);
            });

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteMeeting',
                data: data
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
                response: data,
                preventBroadcastToCaller: true
            };
            return ret;
            
        }else {
            throw {message: this.ajv.errorsText(this.validateDeleteMeeting.errors), code:23};
        }
    }

    async updateMeeting(data){

        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateMeeting(data);
        if (valid) {

            return this.models.meetings.findByPk(data.xMeeting).then((meeting)=>{

                // store the old data for the undo-object
                let meetingOld = meeting.dataValues;

                // get the index of the meeting in the list of meetings
                let [i,o] = this.findObjInArrayByProp(this.data, 'xMeeting', data.xMeeting);
                if (i<0){
                    throw {code:24, message:"The meeting does not exist anymore on the server (should actually never happen)."};
                }

                // currently the function to change the shortname is untested; do not use it
                if (data.shortname!=this.data[i].shortname){
                    throw {code:28, message: "The shortname is not allowed to change, since the function is nto tested yet!"};
                }

                // update it
                return meeting.update(data).then(async(meetingChanged)=>{
                    // the data should be updated in th DB by now.

                    // undo the changes on error
                    var undo = async()=>{
                        // untested: 
                        return meetingChanged.update(meetingOld);
                    } 

                    // NOTE: the shortname currently (2021-01) is not changable after it was set!
                    // if the shortname changes, we need to rename the DB
                    if (meetingOld.shortname != meetingChanged.shortname){

                        // conneciton to the old DB
                        var DBconnOld;

                        // name of DBs
                        let nameOld = this.getDbNameSql(meetingOld.shortname);
                        let nameNew = this.getDbNameSql(meetingChanged.shortname);

                        // stop the meeting, if it was started
                        if (this.data[i].running){ // we need to read the property from the data-object since the meeting-variable is from the DB, where running does not exist! 
                            // store the old DB connection
                            DBconnOld = this.activeMeetings[meetingOld.shortname].seq;
                            await this.meetingShutdownOne(meetingOld.shortname);
                        } else {
                            // open a DB connection to the old meetingDB
                            DBconnOld = new Sequelize(nameOld, conf.database.username, conf.database.password, {
                                dialect: 'mariadb', // mysql, mariadb
                                dialectOptions: {
                                    multipleStatements: true, // attention: we need this option for creating meetings; however, it is dangerous as it allows SQL-injections!
                                    timezone: 'local', // sequelize would define an other default otherwise!
                                },
                                host: conf.database.host,
                                port: conf.database.port,
                                //operatorsAliases: false, no option anymore
                                logging: false,
                                // application wide model options: 
                                define: {
                                    timestamps: false // we generally do not want timestamps in the database in every record, or do we?
                                }
                            })
                        }
                        

                        // a DB cannot simply be renamed, unfortunately...
                        // so we need to create first the new DB
                        await mysqlConn.query(`create database if not exists ${nameNew}`).catch(async (error)=>{await undo(); throw {message: `Database could not be created: ${error}`, code:24};})

                        // get a connection to the new DB
                        try {
                            var DBconnNew = new Sequelize(nameNew, conf.database.username, conf.database.password, {
                                dialect: 'mariadb', // mysql, mariadb
                                dialectOptions: {
                                    multipleStatements: true, // attention: we need this option for creating meetings; however, it is dangerous as it allows SQL-injections!
                                    timezone: 'local', // sequelize would define an other default otherwise!
                                },
                                host: conf.database.host,
                                port: conf.database.port,
                                //operatorsAliases: false, no option anymore
                                logging: false,
                                // application wide model options: 
                                define: {
                                    timestamps: false // we generally do not want timestamps in the database in every record, or do we?
                                }
                            })
                        } catch (error) {
                            await undo();
                            throw {message: `Error on creating new DB connection: ${error}`, code:25}
                        }

                        // then we move all tables to the new DB
                        // ATTENTION: this might work differently with different DBs. For mariaDB showAllSchemas returns the names of the tables
                        await DBconnOld.showAllSchemas().then(schemas =>{
                            // schemas = ["table1", "table2", ...]
                            schemas.forEach(async(tableName, index)=>{
                                await DBconnOld.query(`rename table ${meeting.shortname}.${tableName} to ${meetingChanged.shortname}.${tableName}`)
                            })

                        }).catch(err=>{
                            undo();
                            throw({message: 'Something went wrong when transferring tables form the old to the new DB: '+err, code: 26});
                        })

                        // finally delete the old DB
                        await mysqlConn.query(`drop database if exists ${nameOld}`).catch((err)=>{this.logger.log(`Database '${nameOld}' could not be deleted: ${err}`);}).catch(err=>{
                            this.logger.log(20, `update shortname: old database could not be deleted: ${err}. All other things were successful.`)
                        }) 

                        // change the entry in the associated list
                        delete this.meetingsAssoc[meetingOld.shortname]
                        this.meetingsAssoc[meetingChanged.shortname] = meetingChanged;

                        
                        // add the additional proeprty "running"
                        meetingChanged.running = false; 

                        // if the meeting shall be active, start the meeting
                        if (meetingChanged.active){
                            this.meetingStartupOne(meetingChanged.shortname, DBconnNew)
                        }
                    } else {

                        // check whether the active state should have changed and add the running property accordingly
                        if (meetingChanged.active){
                            if (this.data[i].running){
                                // was already runnign before, so just set the running property
                                meetingChanged.running = true;
                            } else {
                                // we need to start it up
                                meetingChanged.running = false;
                                this.meetingStartupOne(meetingChanged.shortname, DBconnNew); // will change 'running' to true
                            }

                        } else {
                            if (this.data[i].running){
                                // was runnign before, should be shut down now
                                meetingChanged.running = true; 
                                this.meetingShutdownOne(meetingChanged.shortname)
                            } else {
                                // it is and should be not running
                                meetingChanged.running = false;
                            }
                        }

                    }

                    // set the local data
                    this.data[i] = meetingChanged;

                    let ret = {
                        isAchange: true, 
                        doObj: {funcName: 'updateMeeting', data: data}, 
                        undoObj: {funcName: 'updateMeeting', data: meetingOld, ID: this.ID},
                        response: true,
                        preventBroadcastToCaller: true
                    };
                    
                    // the rest is done in the parent
                    return ret;

                }).catch((err)=>{
                    throw {code: 22, message: "Could not update the meeting with the respective Id. Error: " + err};
                });
            }).catch((err)=>{
                throw {code:21, message: "Could not load the meeting with the respective Id. Error: " + err}
            });


        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateMeeting.errors)}
        }
    }

    // activates the meeting, i.e. sets meeting.active=true, such that also after restart of the server it will be started. This will already result in sending the response. Then it tries to start the meeting and will report this to all clients after success.
    async activateMeeting(xMeeting){

        if (!this.validateActivateMeeting(xMeeting)){
            throw {code: 23, message: this.ajv.errorsText(this.validateActivateMeeting.errors)};
        }

        // try to get the shortname for the meeting
        let [i,meeting] = this.findObjInArrayByProp(this.data, 'xMeeting', xMeeting); // index and object
        if(i==-1){
            throw {code: 24, message:'Could not find meeting for the given xMeeting.'};
        }

        // set the active state, such that it will also be automatically started on server restart
        meeting.active = true;
        await meeting.save(); // save to DB

        // (async) start the meeting (if it is already started, an error 53 will be raised)
        this.meetingStartupOne(meeting.shortname).catch(()=>{}); // make sure that errors are not unhandled.

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'activateMeeting', data: xMeeting}, 
            undoObj: {funcName: 'deactivateMeeting', data: xMeeting, ID: this.ID},
            response: xMeeting,
            preventBroadcastToCaller: true
        };

        return ret;
        
    }

    async deactivateMeeting(xMeeting){
        if(!this.validateDeactivateMeeting(xMeeting)){
            throw {code: 23, message: this.ajv.errorsText(this.validateDeactivateMeeting.errors)};
        }

        // try to get the shortname for the meeting
        let [i,meeting] = this.findObjInArrayByProp(this.data, 'xMeeting', xMeeting); // index and object
        if(i==-1){
            throw {code: 24, message:'Could not find meeting for the given xMeeting.'};
        }

        // set the active state
        meeting.active = false;
        await meeting.save(); // save to DB

        // async shutdown of the meeting:
        this.meetingShutdownOne(meeting.shortname).catch(()=>{this.logger.log(10, `The meeting ${meeting.shortname} could not be shut down. No message could be sent to the requesting client, since the request was already resolved.`)}); // make sure that errors are not unhandled.

        let ret = {
            isAchange: true,
            doObj: {funcName: 'deactivateMeeting', data: xMeeting}, 
            undoObj: {funcName: 'activateMeeting', data: xMeeting, ID: this.ID}, 
            response: xMeeting,
            preventBroadcastToCaller: true
        }

        return ret;

    }

    async backupMeeting(data){
        // validate
        let valid = this.validateBackupMeeting(data);
        if (valid){
            let xMeeting = data;

            // get the array index
            let [i,o] = this.findObjInArrayByProp(this.data, 'xMeeting', xMeeting);

            let sql = await mysqldump({
                connection:{
                    host: conf.database.host,
                    port: conf.database.port,
                    user: conf.database.user,
                    password: conf.database.password,
                    database: 'foreign-athletes' // TODO: change this to the correct database after testing: conf.database.dbMeetingPrefix + this.data[i].shortname
                    // attention: if we use the shortname of the meeting for the DB-name (which makes debugging easy), then we have to change the db name when the shortname is changed, which also requires a restart of all rooms, i.e. changing the shortname only works when the meeting is not active.
                }
            })

            // store the sql together with some background info (e.g. version of DB) in a compressed file
            // the raw-file is just text in a similar structure as a http header, i.e. one named param per line, the content starts after an empty line
            // the raw-file is then gzipped and base64 encoded for sending.
            let backupRaw = '';

            // parameters:
            backupRaw += "version="+conf.database.version+"\r\n";
            backupRaw += "timestamp="+Date.now()+"\r\n";
            // eventually we need more parameters, e.g. to say what is stored, for example with/out base data

            // data to follow
            backupRaw += "\r\n"; // empty row
            backupRaw += sql;

            let buffer = Buffer.from(backupRaw);

            // currently zlib uses callbacks instead of promises, thus we need to promisify the call... TODO: change to proper promises syntax as soon as it is supported
            return new Promise((resolve, reject)=>{
                zlib.gzip(buffer, (err, gzBuffer)=>{
                    if (err){
                        reject({code: 24, message: 'gzip-error: '+err})
                    }
                    let backup =  gzBuffer.toString('base64');
                    
                    resolve(backup);
                })
            })


            /**
             * NOTE: it is actually not intended that the browser creates its own files and stores it, but which is what we actually do here when we transfer the file via Websockets. The following way we can store the data in the browser through javascript (copied from)
             * function download(filename, text) {
                var element = document.createElement('a');
                element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
                // data:application/gzip;base64,<the data> for gzip stuff
                element.setAttribute('download', filename);

                element.style.display = 'none';
                document.body.appendChild(element);

                element.click();

                document.body.removeChild(element);
                }

                // Start file download.
                download("hello.txt","This is the content of my file :)");

             */

        }else {
            throw {code: 23, message: this.ajv.errorsText(this.validateBackupMeeting.errors)}
        }

    }

    async restoreMeeting(data){
        let valid = this.validateRestoreMeeting(data);
        if (valid){

            let xMeeting = data.xMeeting;
            let backup = data.backup;

            // get the array index
            let [i,o] = this.findObjInArrayByProp(this.data, 'xMeeting', xMeeting);

            // check first that the meeting is not running and is not getting started!
            if (this.data[i].running || this.data[i].active){
                throw {code: 24, message: 'The meeting is running or is getting started up. No restoring possible.'}
            }

            // parse the backup:

            
            // reset in EVERY room the stack and stackId's; all clients and other servers will have to reload everything!
            // create a new ID for every room


        }else {
            throw {code: 23, message: this.ajv.errorsText(this.validateRestoreMeeting.errors)}
        }
    }


    /**
     * Load all meetings from new (=load or reload)
     * @method loadNew 
     */
    async loadNew(){ // if we wanted to use await, the function must be declared async --> async loadNew()
        //await this.models.meetings.findAll().then((meetings)=>{
        await this.models.meetings.findAll().then((meetings)=>{

            // store the data to the parant's class property 'data'
            this.data = meetings;

            // add the property running (the property "active" is used and denotes: shall be activated. Running means, all the rooms of the meeting are running on the server)
            this.data.forEach(el=>{el.running=false});

            // create an object with properties = shortname and value=meeting
            this.meetingsAssoc = fetchAssoc(meetings, 'shortname'); 

        }).catch((err)=>{this.logger.log(1, `Could not load the meetings: ${err}`)})
    }

    // TODO: rewrite this funciton (if needed), in order not to use a mysql call for this but rather search through the objects (if this is faster..?)
    /**
     * Get the shortname of the meeting with the given xMeeting
     * @param {înteger} id xMeeting
     */
/*     async getShortnameById(id){
        this.models.meetings.findByPk(id).then((meeting)=>{
            return meeting.shortname;
        }).catch((error)=>{
            throw {message: `Could not find shortname for xMeeting=${id}: ${error}`, code:51};
        })
    } */

    // --------------------------------------------------------------
    // maybe the following functions should be outside this function

    /**
     * start up all meetings. (generate the necessary rooms, register the path, ...)
     * @method meetingStartupAll
     */
    async meetingStartupAll(){
        for (let i=0;i<this.data.length;i++){
            let m = this.data[i];
            if (m.active){
                await this.meetingStartupOne(m.shortname);
            }
        }
    }

    getDbNameSql(shortname){
        return conf.database.dbMeetingPrefix + shortname;
    }

    getDbNameMongo(shortname){
        return `${conf.databaseMongo.dbMeetingPrefix}${shortname}`;
    }

    createRoomsForMeeting(shortname, seq, modelsMeeting, meetingMongoDb){
        // get the respective meeting
        let meeting = this.meetingsAssoc[shortname];
        
        // startup the rooms and store them to activeMeetings[shortname].rooms
        // 1) load all the associated rooms for this meeting
        // 2) connect all push-clients (slaves) to these rooms

        // room with meeting-wide settings; stored actually in mongoDb and not MariaDb
        let meetingAdmin = new rMeeting(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, meeting, this, this.baseModules) 
        this.activeMeetings[shortname].rooms.meeting = meetingAdmin;
        let disciplines = new rDisciplines(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger);
        this.activeMeetings[shortname].rooms.disciplines = disciplines;
        // clubs
        this.activeMeetings[shortname].rooms.clubs = new rClubs(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger);
        // athletes
        //this.activeMeetings[shortname].rooms.athletes = new rAthletes(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger);
        // categories
        let categories = new rCategories(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger);
        this.activeMeetings[shortname].rooms.categories = categories;
        // starts in group
        let startsInGroup = new rStartsInGroup(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger)
        this.activeMeetings[shortname].rooms.startsInGroup = startsInGroup;
        // events:
        let events = new rEvents(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, categories, disciplines, startsInGroup, meetingAdmin);
        this.activeMeetings[shortname].rooms.events = events;
        startsInGroup.events = events;
        // eventGroups
        let eventGroups = new rEventGroups(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, startsInGroup);
        this.activeMeetings[shortname].rooms.eventGroups = eventGroups;
        startsInGroup.eventGroups = eventGroups;
        // regions
        let regions = new rRegions(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger);
        this.activeMeetings[shortname].rooms.regions = regions;
        // inscriptions (including athletes, relays and relayAthletes)
        this.activeMeetings[shortname].rooms.inscriptions = new rInscriptions(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, categories, regions, meetingAdmin, this.baseModules);
        // starts
        let starts = new rStarts(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, startsInGroup) // eventually add here the events as auxilary data; 
        this.activeMeetings[shortname].rooms.starts = starts;
        startsInGroup.starts = starts; // set reference;
        // contests
        let contests = new rContests(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, events, eventGroups, starts, startsInGroup, disciplines, meetingAdmin, categories);
        this.activeMeetings[shortname].rooms.contests = contests;
        this.activeMeetings[shortname].rooms.contestsOverview = new rContestsOverview(shortname, meetingMongoDb, this.eH, this.logger, contests, events, eventGroups, disciplines, categories);
    }

    /**
     * start up one meeting (generate the necessary rooms, register the path, ...)
     * @method meetingStartupOne
     * @param {string} shortname The shortname of the meeting
     */
    async meetingStartupOne(shortname, seq=undefined){
        // get the respective meeting
        let meeting = this.meetingsAssoc[shortname];

        if (shortname in this.activeMeetings){
            throw {message: `Cannot start meeting, as it already exists/is started`, code:53}
        } else {
            this.activeMeetings[shortname] = {};
            this.activeMeetings[shortname].meeting = meeting;
        }

        // start the sequelize connection
        // if seq is given, this was done already (e.g. when the meeting was created)
        var name = this.getDbNameSql(shortname);

        if (!seq){
            seq = new Sequelize(name, conf.database.username, conf.database.password, {
                dialect: 'mariadb', // mysql, mariadb
                dialectOptions: {
                    multipleStatements: true, // attention: we need this option for creating meetings; however, it is dangerous as it allows SQL-injections!
                    timezone: 'local',
                },
                host: conf.database.host,
                port: conf.database.port,
                //operatorsAliases: false, no option anymore
                logging: false,
                // application wide model options: 
                define: {
                    timestamps: false // we generally do not want timestamps in the database in every record, or do we?
                }
            })
            // check if everything worked well:
            await seq.authenticate().catch((err)=>{throw {message: `Connection to meeting DB (through sequelize) could not be established: ${err}`, code: 52}})
        }

        // store the sequelize connection
        this.activeMeetings[shortname].seq = seq;

        // set up the sequelize-models
        // ATTENTION: there are two ways how the sequelize-models can be initialized and according to the docs they are equivalent (but are not!) https://sequelize.org/master/manual/model-basics.html#model-definition:
        // traditional: call sequelize.define(...) on the sequelize instance
        // modern: extend the Model class and provide a static method called init
        // BUT: since these are static methods, the init function would store the sequelize instance to the static class, i.e. there is no instance of it, but the class. This results in a problem, when the same models are used together with several sequelize instances, as it is the case here with one instance per active meeting/database! The problem results in having the models for all meetings referencing the database of the last started/actived meeting! The problem can also not be solved by just dynamically including the models; javascript is smart and deduplicates the second/third... import. 
        // --> the only working way is to use the sequelize.define syntax, since this clearly defines the models just for this sequelize instance and does not override the other models.
        // This lead to the problem, that sequelize-auto was not able to produce model-files with .define syntax in conjunction with es6 modules (import instead of require). Therefore, I modified sequelize-auto to procide the combination of .define syntax (i.e. not classes) and es6 modules. The pull request via github to the main branch of sequelize-auto is hanging. 
        // With the modified sequelize-auto (option "-l esmd") the models in the folder "modelsMeetingDefine" were created and are used now instad of the ones created with -l esm. 

        //var modelsMeeting = initModels(seq);
        var modelsMeeting = initModelsDefine(seq);
        
        this.activeMeetings[shortname].models = modelsMeeting;

        // MongoDB: since 2022-01, all meetings must have their own database (needed for backup/restore)
        // create or get the respective DB
        let DBname = this.getDbNameMongo(shortname);
        let meetingMongoDb = this.mongoClient.db(DBname);
        this.activeMeetings[shortname].meetingMongoDb = meetingMongoDb;

        this.activeMeetings[shortname].rooms = {}; // store a list of open rooms in this meeting

        // startup the rooms and store them to activeMeetings[shortname].rooms
        // 1) load all the associated rooms for this meeting
        // 2) connect all push-clients (slaves) to these rooms

        // first create all general rooms
        this.createRoomsForMeeting(shortname, seq, modelsMeeting, meetingMongoDb);

        // room with meeting-wide settings; storen actaully in mongoDb and not MariaDb
        /*let meetingAdmin = new rMeeting(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, meeting, this) 
        this.activeMeetings[shortname].rooms.meeting = meetingAdmin;
        let disciplines = new rDisciplines(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger);
        this.activeMeetings[shortname].rooms.disciplines = disciplines;
        // clubs
        this.activeMeetings[shortname].rooms.clubs = new rClubs(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger);
        // athletes
        this.activeMeetings[shortname].rooms.athletes = new rAthletes(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger);
        // categories
        let categories = new rCategories(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger);
        this.activeMeetings[shortname].rooms.categories = categories;
        // starts in group
        let startsInGroup = new rStartsInGroup(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger)
        this.activeMeetings[shortname].rooms.startsInGroup = startsInGroup;
        // events:
        let events = new rEvents(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, categories, disciplines, startsInGroup);
        this.activeMeetings[shortname].rooms.events = events;
        startsInGroup.events = events;
        // eventGroups
        let eventGroups = new rEventGroups(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, startsInGroup);
        this.activeMeetings[shortname].rooms.eventGroups = eventGroups;
        startsInGroup.eventGroups = eventGroups;
        // regions
        let regions = new rRegions(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger);
        this.activeMeetings[shortname].rooms.regions = regions;
        // inscriptions (including athletes, relays and relayAthletes)
        this.activeMeetings[shortname].rooms.inscriptions = new rInscriptions(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, categories, regions, this.activeMeetings[shortname]);
        // starts
        let starts = new rStarts(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, startsInGroup) // eventually add here the events as auxilary data; 
        this.activeMeetings[shortname].rooms.starts = starts;
        startsInGroup.starts = starts; // set reference;
        // contests
        let contests = new rContests(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, events, eventGroups, starts, startsInGroup);
        this.activeMeetings[shortname].rooms.contests = contests;
        this.activeMeetings[shortname].rooms.contestsOverview = new rContestsOverview(shortname, meetingMongoDb, this.eH, this.logger, contests, events, eventGroups, disciplines, categories);
        */

        // TODO: start the side channel room; eventually as the first room, when we need to reference it in all other rooms

        // then start the backup room
        // IMPORTANT: keep this after the main rooms, because it assumes that the other rooms were already added to activeMeeting[shortname].rooms!
        let backup = new rBackup(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, this, this.wsManager);
        this.activeMeetings[shortname].rooms.backup = backup;

        let sideChannel = new rSideChannel(shortname, seq, modelsMeeting, meetingMongoDb, this.eH, this.logger, this, this.wsManager, backup);
        this.activeMeetings[shortname].rooms.sideChannel = sideChannel;
        this.activeMeetings[shortname].rooms.backup.rSideChannel = sideChannel;
        
        // initiate connections of the side channel (just the connections that are started on the main server, e.g. because the main server has no public IP and/or DNS entry, but the secondary server has.)
        //this.activeMeetings[shortname].sideChannels = {};
        //this.meetingCreateSideChannelConnections(shortname);

        // define that the meeting is running. 
        //this.activeMeetings[shortname].running = true;
        meeting.running = true;

        // when the room was already ready, then clients might already have received data, where meeting.running=false was set. Thus now set this to true and report it to all clients
        if (this.ready){

            let doObj = {funcName: 'runMeeting', data:meeting.xMeeting}
            let undoObj = {}; // nothing to undo; when the undo-function of activateMeeting (=deactivateMeeting) is called, also running will be changed. 
            
            this.processChange(doObj, undoObj)   
        }

        // TODO:
        // 0) TODO: what must be done for modules? Note: if modules have dependecies, the order must be correct!
        // 1) load all the associated rooms for this meeting
        // 2) connect all push-clients (slaves) to these rooms

        // true=success
        return true;

    }

    /**
     * create the ws side channels to all secondary servers
     * @param {string} shortname 
     */
    // NEITHER FINISHED NOR USED!!! All that stuff is now done in the backup and sideChannel room
    meetingCreateSideChannelConnections(shortname){
        // try to connect all sideChannels
        for (let SCP of this.activeMeetings[shortname].data.sideChannelPush){
            let conn = this.wsManager.getConnection(shortname, SCP.host, SCP.port, SCP.path, SCP.secure);
            
            // store the connection

            let sideChannel = {
                conn,
                shortname, // shortname of the meeting
                host: SCP.host,
                port: SCP.port,
                path: SCP.path,
                secure: SCP.secure,
                status: 0, // 0) no connection; 1) ws-connection established; 2) tabIdReported; 3) 'connectToMainServer' returned succeess
            }

            this.activeMeetings[shortname].sideChannels[conn.tabId] = sideChannel;

            // the events raised by the connection are as follows:
            // - `wsConnected/${this.tabId}`
            // - `TabIdSet/${this.tabId}`
            // - `wsClosed/${this.tabId}`

            // prepare a function that shall be called whenever the connection is (re-)established, which then sends a note to the client so that the client will 
            let connectRoom = ()=>{

                sideChannel.status = 2;

                let sendData = {arg: 'connectToMainServer', roomName: "sideChannel@" + shortname, opt:{
                    token: "TODO", // TODO!
                }}; 

                let success = (response)=>{
                    // need to do something here? I think the secondary server  initiates the rest.
                    // the response should be true;
                    if (response==true){
                        sideChannel.status = 3;
                    }
                };
                let failure = (errCode, errMsg)=>{

                    // stop this side channel completely:
                    this.meetingCloseSideChannelConnection(shortname, conn.tabId);
                    
                    this.logger.log(10, `Could not connect the side channel to ${host}:${port}/${path}/${secure.toString()}. Code: ${errCode}. Message: ${errMsg}`);
                    // TODO: report the problem somehow to the user

                };
                let opt = {}; // no special options at the moment

                conn.emitRequest("room", sendData, success, failure, opt)
                
            }

            // if the connection is lost, the wsManager and wsServer2Sever, respectively, will try to reconnect; listen to those events to instantly reconnect the sideChannel-rooms
            this.eH.eventSubscribe(`TabIdSet/${this.tabId}`, connectRoom, shortname); // we use the shortname of the meeting as an identifier for the eventHandler 

            this.eH.eventSubscribe(`wsConnected/${this.tabId}`, ()=>{sideChannel.status=1;}, shortname);

            this.eH.eventSubscribe(`wsClosed/${this.tabId}`, ()=>{
                // not a lot to do when the connection was closed, sicne we are already waiting for the reconnect
                // simply reset the status to unconnected/0
                sideChannel.status = 0;
            }, shortname);

        }
    }

    // NEITHER USED NOT FINISHED!
    meetingCloseSideChannelConnection(shortname, tabId){

        let SC = this.activeMeetings[shortname].sideChannels[tabId];

        // unregister the connect event for the side channel
        this.eH.eventUnsubscribe(`wsConnected/${tabId}`, shortname);
        this.eH.eventUnsubscribe(`TabIdSet/${tabId}`, shortname);
        this.eH.eventUnsubscribe(`wsClosed/${tabId}`, shortname);

        // close the connection when no other meeting is using it
        this.wsManager.returnConnection(shortname, SC.host, SC.port, SC.path, SC.secure)

        delete this.activeMeetings[shortname].sideChannels[tabId];

        // more stuff to do? probably not. On the secondary server, the roomClient instance will be closed and another one will be opened as soon as the connection is reestablished.
    }

    meetingCloseSideChannelConnections(shortname){

        for (let tabId in this.activeMeetings[shortname].sideChannels){

            this.meetingCloseSideChannelConnection(shortname, tabId);
        }
    }

    /**
     * shut down all meetings. stop the rooms, unregister the path, ...)
     * @method meetingShutdownAll
     */
    meetingShutdownAll(){
        return;
    }

    /**
     * shut down one meeting (stop the rooms, unregister the path, ...)
     * @method meetingShutdownOne
     * @param {string} shortname The shortname of the meeting
     */
    async meetingShutdownOne(shortname){

        // get the respective meeting
        let meeting = this.meetingsAssoc[shortname]; // data

        if (!(shortname in this.activeMeetings)){
            throw {message: `Cannot stop meeting, as it is not started`, code:53}
        } 
        let activeMeeting = this.activeMeetings[shortname]; // contains the sequelize connection, the rooms, etc
    
        // stop all rooms etc
        let mainRoomClosurePromise = this.closeMainRoomsForMeeting(shortname);
        let backupClosurePromise = activeMeeting.rooms.backup.closeRoom();
        
        await Promise.all([mainRoomClosurePromise, backupClosurePromise]).catch(err=>{
            this.logger.log(5,`Could not correctly close all rooms. Continue anyway. Error:  ${err}`)
        });

        // stop the side channels
        // TODO: remove; implemented in sideChannel now!
        //this.meetingCloseSideChannelConnections(shortname);

        // stop the sequelize-DB-connection
        await activeMeeting.seq.close() 

        // remove the meeting from the activeMeetings-array
        delete this.activeMeetings[shortname];

        // set the meeting as not running:
        meeting.running = false;

        // report the clients that the meeting was stopped. 
        if (this.ready){
            let doObj = {funcName: 'stopMeeting', data:meeting.xMeeting}
            let undoObj = {}; // nothing to undo; when the undo-function of deactivateMeeting (=activateMeeting) is called, also stopping will be changed. 
            this.processChange(doObj, undoObj)   
        }

        return true;
    }

    /**
     * Stop all rooms except the side channel
     * @param {string} shortname Name of the meeting
     */
    async closeMainRoomsForMeeting(shortname){

        let activeMeeting = this.activeMeetings[shortname]; // contains the sequelize connection, the rooms, etc
    
        // stop all rooms etc
        let closePromises = [];
        for (let roomName in activeMeeting.rooms){
            let r = activeMeeting.rooms[roomName];
            if (!r.name=="backup"){
                closePromises.push(r.closeRoom());
                
                delete activeMeeting.rooms[roomName];
            }
        }
        return Promise.all(closePromises).catch(err=>{
            this.logger.log(5,`Could not correctly close all rooms. Continue anyway. Error:  ${err}`)
        });
    }


}

// TODO: move the following function into a file with general methods like this
/**
 * @method fetchAssoc Returns an object with properties given by the 'property' in each object of the array and the object itself as the value. The property must be unique. Otherwise the method returns false. 
 * @property {object array} a  The array with the objects, where the property 'property' must exist in every object and must be unique.
 * @property {string} property The property to be used for the associations
 */

function fetchAssoc(a, property){
    try {
        let oAssoc = {};
        for (let i=0;i<a.length;i++){
            let el = a[i];
            if (property in el && !(el[property] in oAssoc)){
                oAssoc[el[property]] = el;
            }else{
                return false;
            }
        }
        return oAssoc;
    }catch(ex){
        // all errors such as "a is not an array", "property does not exist" will end up here 
        return false;
    }

} 




// ECMAScript export
export default rMeetings;