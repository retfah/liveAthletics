




import roomServer from './roomServer.js';

/**
 * the room for region management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{region1}, {region2}]
 */
class rRegions extends roomServer{

    /** Constructor for the region-room
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
        super(eventHandler, mongoDb, logger, "regions@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = []; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all regions
        this.models.regions.findAll().then(regions=>{
            this.data = regions;
            this.ready = true;
            //this.eH.raise(`${this.name}:initialized`)
        })

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addRegion = this.addRegion.bind(this);
        this.functionsWrite.deleteRegion = this.deleteRegion.bind(this);
        this.functionsWrite.updateRegion = this.updateRegion.bind(this);

        // define, compile and store the schemas:
        const region = {
            xRegion: {type:"integer"},
            country: {type:"string", maxLength:3},
            countryName: {type:"string", maxLength:100},
            countrySortvalue:{type:"integer"},
            regionName: {type:"string", maxLength:100},
            regionShortname: {type:"string", maxLength: 6},
            regionSortvalue: {type:"integer"}
        }
        let schemaAddRegion = {
            type: "object",
            properties: region,
            required: ["country"],
            additionalProperties:false,
        };
        let schemaUpdateRegion = {
            type: "object",
            properties: region,
            required: ["xRegion"]
        };
        let schemaDeleteRegion = {
            type: "integer"
        }
        this.validateAddRegion = this.ajv.compile(schemaAddRegion);
        this.validateUpdateRegion = this.ajv.compile(schemaUpdateRegion);
        this.validateDeleteRegion= this.ajv.compile(schemaDeleteRegion);
 
    }

    /**
     * add an region
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addRegion(data){

        // validate the data based on the schema
        let valid = this.validateAddRegion(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addRegion, updateRegion, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var region = await this.models.regions.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: Region could not be created: ${err}`, code:22}})

            this.data.push(region); 

            // the data to be sent back to the client requesting the add is the full data
            let sendData = region.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addRegion',
                data: region.dataValues // should have the same properties as data, but with added xRegion
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteRegion
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
            throw {message: this.ajv.errorsText(this.validateAddRegion.errors), code:23};
        }
    }


    async deleteRegion(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteRegion(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, region] = this.findObjInArrayByProp(this.data, 'xRegion', data)

            // delete the entry in the meetings table
            await this.models.regions.destroy({where:{xRegion: data}}).catch(()=>{
                throw {message: "Region could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data, 'xRegion', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteRegion',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addRegion
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
            throw {message: this.ajv.errorsText(this.validateDeleteRegion.errors), code:23};
        }
    }

    
    async updateRegion(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateRegion(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data, 'xRegion', data.xRegion);
            if (i<0){
                throw {code:24, message:"The region does not exist anymore on the server (should actually never happen)."};
            }

            let regionOld = {};
            this.propertyTransfer(o.dataValues, regionOld);

            return o.update(data).then(async(regionChanged)=>{
                // the data should be updated in th DB by now.

                // set the local data
                this.data[i] = regionChanged;

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateRegion', data: regionChanged.dataValues}, 
                    undoObj: {funcName: 'updateRegion', data: regionOld, ID: this.ID},
                    response: regionChanged.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the region with the respective Id. Error: " + err};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateEventGroup.errors)}
        }
    }

}

export default rRegions;