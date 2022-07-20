
// the room for the meetings 

// TODO: implement a view for a list of active meetings

const roomServer = require('./roomServer');
const fs = require('fs');
const {promisify} = require('util');

class rMeetings extends roomServer{

    /** Constructor for the meetings-room
     * @method constructor
     * @param {sequelize} sequelizeAdmin sequelize The sequelize connection to the Admin-DB
     * @param {sequelizeModels} modelsAdmin sequelize-models The sequelize models of the Admin-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     * //@param {socketProcessor2} wsProcessor UNUSED The websocket processor instance; needed obviously for the  
     * //@param {roomManager} roomManager UNUSED The room manager instance. Needed for showing the status information to the user.
     */
    constructor(sequelizeAdmin, modelsAdmin, mongoDb, eventHandler, logger, wsProcessor, roomManager){

        // NOTE: when debugging, the variable 'this' is undefined when the debugger passes here on construction. Don't know why, but it works anyway.

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        
        super(eventHandler, mongoDb, logger, 'meetings', true, 1, false);//, roomManager, wsProcessor);
        
        // the reference to the sequelizeAdmin connection
        this.seq = sequelizeAdmin;
        this.models = modelsAdmin;

        // the data is not stored in this class, but the parent; in the property 'data'
        //this.meetings = []; --> this.data
        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)
        

        // if possible, all running meetings and their DB and room-handles shall be stored centrally in the meetings-room (maybe there is a better way to do so, but currently I think thats ok)
        this.meetings = {}; // the shortname is the property name


        // load all the meetings
        this.loadNew().then(()=>{
            // start the meetings that are 'active'
            this.meetingStartupAll();
            }
        )

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST (!!!!!) be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        this.functionsWrite.addMeeting = this.addMeeting.bind(this); 
        this.functionsWrite.updateMeeting = this.updateMeeting.bind(this);
        this.functionsWrite.deleteMeeting = this.deleteMeeting.bind(this); 
        this.functionsReadOnly.backupMeeting = this.backupMeeting.bind(this);
        this.functionsReadOnly.schemaRestoreMeeting = this.restoreMeeting.bind(this); // note: despite the fact that we change a lot of data during restore, we do not change anything related to this room, as all the changes are within the DB of the meeting and not in the admin_meetings table
        //this.functionsReadOnly.TODO = this.TODO.bind(this);
        //this.functionsWrite.TODO2 = this.TODO2.bind(this);

        // define, compile and store the schemas:
        let schemaAddMeeting = {
            type: "object",
            properties: {
                //xMeeting: {type: "integer"},
                shortname: {type: "string", maxLength:10}, 
                name:{type: "string", maxLength:75},
                code: {type: "string", maxLength:50},
                active: {type: "boolean"}, 
                isSlave: {type: "boolean"},
                masterAddress: {type: "string", maxLength:100},
                masterUsername: {type:"string", maxLength:45}, 
                masterPassword: {type:"string", maxLength:45} 
            },
            required: ["shortname", "active", "code"]
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
                masterAddress: {type: "string", maxLength:100},
                masterUsername: {type:"string", maxLength:45}, 
                masterPassword: {type:"string", maxLength:45} 
            },
            required: ["xMeeting", "shortname", "active", "isSlave", "masterAddress", "masterUsername", "masterPassword"]
        };
        let schemaDeleteMeeting = {
            type: "integer"
        }
        let schemaBackupMeeting = {
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

        // fs.readfile is async, but not with promises; only callbacks --> make it a promise
        this.readFileAsync = promisify( fs.readFile);

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

            
            return this.models.meetings.create(dataTranslated).then(async (meeting)=>{

                // create the database for that meeting:
                var name = conf.database.dbMeetingPrefix + meeting.shortname;
                await mysqlConn.execute("create database if not exists ?", name).catch((error)=>{throw {message: `Database could not be created: ${error}`, code:24};})
                
                // create sequelize connection to new DB
                var sequelizeMeeting = new Sequelize(name, conf.database.username, conf.database.password, {
                    dialect: 'mysql',
                    host: conf.database.host,
                    port: conf.database.port,
                    operatorsAliases: false,
                    // application wide model options: 
                    define: {
                      timestamps: false // we generally do not want timestamps in the database in every record, or do we?
                    }
                    })
                
                // copy the standard DB into the new DB 
                // the sql code to create the tables must be in a separate file. This code is then run on the DB. We cannot use mysqldump here, as e.g. there is no import option yet for it.
                this.readFileAsync(conf.emptyDbPath).then(async (empytDbCode)=>{

                    // run the query in sequelize
                    return sequelizeMeeting.query(emptyDbCode);

                }).then(([results, metadata])=>{

                    // continue the promise chain with the next file read
                    return this.readFileAsync(conf.defaultDataDbPath);

                }).then(async (importDataCode)=>{

                    // run the query in sequelize
                    return sequelizeMeeting.query(importDataCode);

                }).then(([results, metadata])=>{
                    // database is set up

                    // TODO: start the meeting if requested
                    if (meeting.active){
                        // TODO
                    }

                    // the data to be sent back to the client requesting the add
                    /*let sendData = {
                        meeting: meeting.dataValues // stringify is done later and can only be done once!
                        //meeting: JSON.stringify(meeting.dataValues)
                        // the ID will be added on resolve
                    }*/

                    // new 2019-08-19: is not an object, but the data itself
                    let sendData = meeting.dataValues;

                    // we must update here the current data model stored in the room and notonly transmit the change to the clients. otherwise a reload of a client would still show him the data on the server at its startup and only a restart of the server would result in sending the correct, actual data again!
                    this.data.push(meeting); // TODO: try!

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
                        response: sendData
                    };
                    return ret;

                }).catch((error)=>{
                    // TODO: 
                    throw {message: "Something went wrong during database creation: " + error, code:23}
                })

            }).catch(()=>{throw {message: "Meeting could not be created!", code:22}}) 
        } else {
            throw {message: this.ajv.errorsText(this.validateAddMeeting.errors), code:23};
        }
    }


    async deleteMeeting(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteMeeting(data);

        if (valid){
            // first stop the meeting
            // TODO

            return this.models.meetings.destroy({where:{xMeeting: data}}).then(()=>{

                // NOTE: also arrives here when the meeting actually did not exist (anymore!); However, should always exist!
                // delete the meeting locally from the data:
                
                let [ind, el] = this.findObjInArrayByProp(this.data, 'xMeeting', data)
                if (ind>=0){
                    this.data.splice(ind,1);
                }

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
                    response: data
                };
                return ret;

            }).catch(()=>{
                throw {message: "Meeting could not be deleted!", code:22}
            });
            
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

            // TODO: if changes affect the started meeting, we have to restart it

            /**
             * 
             * Does NOT save the model. The calling funciton chal decide.
             * Returns true if changes were merged, false if nothing has changed or if no property matched a property in the sequelize model.
             * @param {model} sequelizeModel 
             * @param {object} data The data to merge. Must be an object with the properties equal to the properties in the model. If the model does not have the 
             */
            function mergeChanges(sequelizeModel, data){
                // check if the sequelizeModel is a sequelize model

                // IMPORTANT for safety:
                // check that none of the properties in data is a property of the sequelize model itself (!)
                // dataValues, alles mit _, isNewRecord, sequelize, 

                // try to copy all data to the sequelizeModel

                // return true if changes were applied, false otherwise
                return 
            }


            return this.models.meetings.findById(data.xMeeting).then((meeting)=>{

                // store the old data for the undo-object
                let meetingOld = meeting.dataValues;

                // update the local data representation
                let [i,o] = this.findObjInArrayByProp(this.data, 'xMeeting', data.xMeeting);
                if (i<0){
                    throw {code:24, message:"The meeting does not exist anymore on the server (should actually never happen)."};
                }

                // set the local data
                this.data[i] = data;

                // update it
                return meeting.update(data).then((meeting)=>{

                    let ret = {
                        isAchange: true, 
                        doObj: {funcName: 'updateMeeting', data: data}, 
                        undoObj: {funcName: 'updateMeeting', data: meetingOld, ID: this.ID},
                        response: true
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

            // add the property running (the property "active" is used and denotes: shall be activated.)
            this.data.forEach(el=>{el.running=false});

            // create an object with properties = shortname and value=meeting
            this.meetingsAssoc = fetchAssoc(meetings, 'shortname'); 

            this.ready = true;
            this.logger.log(99, 'Meetings initially loaded!');
        }).catch((err)=>{this.logger.log(1, `Could not load the meetings: ${err}`)})
    }

    // --------------------------------------------------------------
    // maybe the following functions should be outside this function

    /**
     * start up all meetings. (generate the necessary rooms, register the path, ...)
     * @method meetingStartupAll
     */
    meetingStartupAll(){
        for (let i=0;i<this.data.length;i++){
            let m = this.data[i];
            if (m.active){
                this.meetingStartupOne(m.shortname);
            }
        }
    }

    /**
     * start up one meeting (generate the necessary rooms, register the path, ...)
     * @method meetingStartupOne
     * @param {string} shortname The shortname of the meeting
     */
    meetingStartupOne(shortname){
        // get the respective meeting
        let meeting = this.meetingsAssoc[shortname];

        // TODO:
        // 0) TODO: what must be done for modules? Note: if modules have dependecies, the order must be correct!
        // 1) load all the associated rooms for this meeting
        // 2) connect all push-clients (slaves) to these rooms
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
    meetingShutdownOne(shortname){
        return;
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

// TODO: while a json can easily be created out of a sequelize model representation, the opposite is obviously not so easily possible. Write a generic function that can backpropagate changes in a json into the model and save it. Including all the checks that need to be done. Possibly they are not made manually in this function, but in the sequlize framework.


// the way of exporting for node (currently 03.2019)
module.exports = rMeetings;