
// a room per site; 

import roomServer from './roomServer.js';

/**
 * the room for site management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{site1}, {site2}]
 */
class rSite extends roomServer{

    /** Constructor for the site-room
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
        super(eventHandler, mongoDb, logger, "sites@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = {
            // main data:
            sites:[],

            // auxilary data:

        }; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all sites
        this.models.sites.findAll().then(sites=>{
            this.data.sites = sites;
            // aux data:
            //TODO
            this.ready = true;
        })

        // listen to ausxilary data events:
        // TODO

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addSite = this.addSite.bind(this);
        this.functionsWrite.deleteSite = this.deleteSite.bind(this);
        this.functionsWrite.updateSite = this.updateSite.bind(this);

        // define, compile and store the schemas:
        let schemaAddSite = {
            type: "object",
            properties: {
                xTODO: {type: "integer"}
            },
            required: [],
            additionalProperties: false
        };
        let schemaUpdateSite = {
            type: "object",
            properties: {
                xTODO: {type: "integer"}
            },
            required: ["TODO"],
            additionalProperties: false
        };
        let schemaDeleteSite = {
            type: "integer"
        }
        this.validateAddSite = this.ajv.compile(schemaAddSite);
        this.validateUpdateSite = this.ajv.compile(schemaUpdateSite);
        this.validateDeleteSite = this.ajv.compile(schemaDeleteSite);
 
    }

    /**
     * add an site
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addSite(data){

        // validate the data based on the schema
        let valid = this.validateAddSite(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addSite, updateSite, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var site = await this.models.sites.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: Site could not be created: ${err}`, code:22}})

            this.data.sites.push(site); 

            // the data to be sent back to the client requesting the add is the full data
            let sendData = site.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addSite',
                data: site.dataValues // should have the same properties as data, but with added xSite
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteSite
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
            throw {message: this.ajv.errorsText(this.validateAddSite.errors), code:23};
        }
    }


    async deleteSite(data){

        // data must be an integer (the xSite id)
        let valid = this.validateDeleteSite(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, site] = this.findObjInArrayByProp(this.data.sites, 'xSite', data)

            // delete the entry in the sites table
            await this.models.sites.destroy({where:{xSite: data}}).catch(()=>{
                throw {message: "Site could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data.sites, 'xSite', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.sites.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteSite',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addSite
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
            throw {message: this.ajv.errorsText(this.validateDeleteSite.errors), code:23};
        }
    }

    
    async updateSite(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateSite(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data.sites, 'xSite', data.xSite);
            if (i<0){
                throw {code:24, message:"The site does not exist anymore on the server (should actually never happen)."};
            }

            let siteOld = o.dataValues;

            return o.update(data).then(async(siteChanged)=>{
                // the data should be updated in th DB by now.

                // set the local data
                this.data.sites[i] = siteChanged;

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateSite', data: siteChanged.dataValues}, 
                    undoObj: {funcName: 'updateSite', data: siteOld, ID: this.ID},
                    response: siteChanged.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the site with the respective Id. Error: " + err};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateEventGroup.errors)}
        }
    }

}

export class rSiteTrack extends rSite{
    // implement here the track specific stuff for the rSite

    // 2022-09: basically, this shall be a room that collects all series of all contests that take place on this site. it must keep a list of the  
}

export default rSite;