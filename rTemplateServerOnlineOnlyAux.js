<% roomUpper = room[0].toUpperCase() + room.substring(1) %>
<% roomPlural = roomPlural || room + "s" %>
<% models = models || roomPlural %>
<% roomUpperPlural = roomPlural[0].toUpperCase() + roomPlural.substring(1)  %>

import roomServer from './roomServer.js';

/**
 * the room for <%= room %> management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{<%= room %>1}, {<%= room %>2}]
 */
class r<%= roomUpperPlural %> extends roomServer{

    /** Constructor for the <%= room %>-room
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
        super(eventHandler, mongoDb, logger, "<%= roomPlural %>@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = {
            // main data:
            <%= roomPlural %>:[],

            // auxilary data:

        }; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all <%= roomPlural %>
        this.models.<%= models %>.findAll().then(<%= roomPlural %>=>{
            this.data.<%= roomPlural %> = <%= roomPlural %>;
            // aux data:
            //TODO
            this.ready = true;
        })

        // listen to ausxilary data events:
        // TODO

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.add<%= roomUpper %> = this.add<%= roomUpper %>.bind(this);
        this.functionsWrite.delete<%= roomUpper %> = this.delete<%= roomUpper %>.bind(this);
        this.functionsWrite.update<%= roomUpper %> = this.update<%= roomUpper %>.bind(this);

        // define, compile and store the schemas:
        let schemaAdd<%= roomUpper %> = {
            type: "object",
            properties: {
                xTODO: {type: "integer"}
            },
            required: [],
            additionalProperties: false
        };
        let schemaUpdate<%= roomUpper %> = {
            type: "object",
            properties: {
                xTODO: {type: "integer"}
            },
            required: ["TODO"],
            additionalProperties: false
        };
        let schemaDelete<%= roomUpper %> = {
            type: "integer"
        }
        this.validateAdd<%= roomUpper %> = this.ajv.compile(schemaAdd<%= roomUpper %>);
        this.validateUpdate<%= roomUpper %> = this.ajv.compile(schemaUpdate<%= roomUpper %>);
        this.validateDelete<%= roomUpper %> = this.ajv.compile(schemaDelete<%= roomUpper %>);
 
    }

    /**
     * add an <%= room %>
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async add<%= roomUpper %>(data){

        // validate the data based on the schema
        let valid = this.validateAdd<%= roomUpper %>(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like add<%= roomUpper %>, update<%= roomUpper %>, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var <%= room %> = await this.models.<%= models %>.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: <%= roomUpper %> could not be created: ${err}`, code:22}})

            this.data.<%= roomPlural %>.push(<%= room %>); 

            // the data to be sent back to the client requesting the add is the full data
            let sendData = <%= room %>.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'add<%= roomUpper %>',
                data: <%= room %>.dataValues // should have the same properties as data, but with added x<%= roomUpper %>
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // delete<%= roomUpper %>
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
            throw {message: this.ajv.errorsText(this.validateAdd<%= roomUpper %>.errors), code:23};
        }
    }


    async delete<%= roomUpper %>(data){

        // data must be an integer (the <%= primary %> id)
        let valid = this.validateDelete<%= roomUpper %>(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, <%= room %>] = this.findObjInArrayByProp(this.data.<%= roomPlural %>, '<%= primary %>', data)

            // delete the entry in the <%= roomPlural %> table
            await this.models.<%= models %>.destroy({where:{<%= primary %>: data}}).catch(()=>{
                throw {message: "<%= roomUpper %> could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data.<%= roomPlural %>, '<%= primary %>', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.<%= roomPlural %>.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'delete<%= roomUpper %>',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // add<%= roomUpper %>
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
            throw {message: this.ajv.errorsText(this.validateDelete<%= roomUpper %>.errors), code:23};
        }
    }

    
    async update<%= roomUpper %>(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdate<%= roomUpper %>(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data.<%= roomPlural %>, '<%= primary %>', data.<%= primary %>);
            if (i<0){
                throw {code:24, message:"The <%= room %> does not exist anymore on the server (should actually never happen)."};
            }

            let <%= room %>Old = {};
            this.propertyTransfer(o.dataValues, <%= room %>Old);

            return o.update(data).then(async(<%= room %>Changed)=>{
                // the data should be updated in th DB by now.

                // set the local data
                this.data.<%= roomPlural %>[i] = <%= room %>Changed;

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'update<%= roomUpper %>', data: <%= room %>Changed.dataValues}, 
                    undoObj: {funcName: 'update<%= roomUpper %>', data: <%= room %>Old, ID: this.ID},
                    response: <%= room %>Changed.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the <%= room %> with the respective Id. Error: " + err};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdate<%= roomUpper %>.errors)}
        }
    }

}

export default r<%= roomUpperPlural %>;