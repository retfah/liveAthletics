/**
 * the room for manipulating server-users 
 * 
 * IMPORTANT: 
 * - in this room we do not want that by default, any user that connects to this room gets the full list of users, especially not with the hashed passwords. Thus we must have kind of an override of what happens in the parents function, when somebody gets connected to the room. 
 * - in roomServer we should anyway implement possibilities for checking accessing rights. It is required that we have different views with different datasets that are shared. 
 */

/**
 * Error codes:
 * Must only be unique within a function
 * 21:  validation of data failed.
 * 22-..: function specific
 * 
 */

const roomServer = require('./roomServer');

class rUsersServer extends roomServer{

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
        
        super(eventHandler, mongoDb, logger, 'usersServer', true, -1, false);//, roomManager, wsProcessor);
        
        // the reference to the sequelizeAdmin connection
        this.seq = sequelizeAdmin;
        this.models = modelsAdmin;

        // the data is not stored in this class, but the parent; in the property 'data'
        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)
        
        // load all the users
        this.loadNew().catch((err)=>{throw new Error('Could not load server-users: '+err)})

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST (!!!!!) be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        this.functionsWrite.addUser = this.addUser.bind(this); 
        this.functionsWrite.changePassword = this.changePassword.bind(this);
        /*this.functionsWrite.updateMeeting = this.updateMeeting.bind(this);
        this.functionsWrite.deleteMeeting = this.deleteMeeting.bind(this); */
        //this.functionsReadOnly.TODO = this.TODO.bind(this);
        //this.functionsWrite.TODO2 = this.TODO2.bind(this);
        
        // define, compile and store the schemas:
        let schemaAddUser = {
            type: "object",
            properties: {
                username: {type: "string", maxLength:45}, 
                password: {type: "string"}
            },
            required: ["username", "password"]
        };
        let schemaChangePassword = {
            type: "object",
            properties: {
                xUser: {type: "integer"},
                newPassword: {type: "string"}
            },
            required: [xUser, newPassword]
        }
        /*
        let schemaUpdateMeeting = {
            type: "object",
            properties: {
                xMeeting: {type: "integer"},
                code: {type: "string", maxLength:50},
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
        */
        this.validateAddUser = this.ajv.compile(schemaAddUser);
        this.validateChangePassword = this.ajv.compile(schemaChangePassword);
        /*this.validateUpdateMeeting = this.ajv.compile(schemaUpdateMeeting);
        this.validateDeleteMeeting = this.ajv.compile(schemaDeleteMeeting);
        */
    }

    /**
     * add a User
     * @param {object} data This data shall already be in the format as can be used by Sequalize to insert the data. It will be checked with the schema first.
     */
    async addUser(data){

        // check if the client has the right to add a User:
        // TODO !!!

        // validate the data based on the schema
        //let valid = this.ajv.validate(schema, data); 
        let valid = this.validateAddUser(data);
        if (valid) {

            // we first have to hash the password appriopriately:

            return bcrypt.hash(data.password, 10).then((hash)=>{
                data.password = hash;

                // now try to add the user to the DB
                return this.models.users.create(data).then((user)=>{

                    // send the new created user to the clients
                    let sendData = user.dataValues;
    
                    // we must update here the current data model stored in the room and not only transmit the change to the clients. otherwise a reload of a client would still show him the data on the server at its startup and only a restart of the server would result in sending the correct, actual data again!
                    this.data.push(user); 
    
                    // object storing all data needed to DO the change
                    let doObj = {
                        funcName: 'addUser',
                        data: user.dataValues // should have the same properties as data, but with added userID (xUser)
                        // the ID will be added on resolve
                    }
    
                    // object storing all data needed to UNDO the change
                    // Not needed yet / TODO...
                    let undoObj = {
                        funcName: 'TODO', // deleteUser
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
    
                }).catch(()=>{throw {message: "User could not be created!", code:23}}) 

            }).catch(()=>{throw {message: "password hashing failed", code=22}})


        } else {
            throw {message: this.ajv.errorsText(this.validateAddUser.errors), code:21};
        }
    }

    async changePassword(data){
        // TODO

        // validate

        // check if the requesting user is the same as xUser in the request. As we are not allowed to change the password for other users!
        if (true){

            // hash the new password

            // update the data in the DB

            // prepare data for the stack and for the other clients (respectively: here, nothing shall be sent to other clients!)

        }else {
            throw {message: "Not allowed to change this users password.", code:123}
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
            throw {message: this.ajv.errorsText(this.validateDeleteMeeting.errors), code:21};
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

    



    /**
     * Load all users from new (=load or reload)
     * @method loadNew 
     */
    async loadNew(){ // if we wanted to use await, the function must be declared async --> async loadNew()
            return this.models.users.findAll({include: [this.models.usersgroups, this.models.usersmeetings]}).then((users)=>{
				// store the data to the parant's class property 'data'
				this.data = users;
				// create an object with properties = shortname and value=meeting
				this.usersAssoc = fetchAssoc(users, 'xUser'); 
	
				this.ready = true;
				this.logger.log(99, 'Users initially loaded!');
            }).catch((err)=>{throw console.log(err)})
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
module.exports = rUsersServer;