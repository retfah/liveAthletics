
// TODO: this class should probably also handle the contest-specific rooms which are opened on request (or kept open all the time)
// TODO: check the conf for correrctness before storing them! (it should be possible to have that dependent on the disciplineType, therefore it can probably not be incorporated in the ajv-check, but must be in a separate check in the add/update function itself)

// TODO: create a separate room which includes the necessary information of event, eventGroups, rounds and groups to be used in the list to select a competition. (It should not be necessary just for displaying such a list that the client connects to multiple rooms.) For the administrator's view, we still connect to all rooms, at least for the moment. 

import roomServer from './roomServer.js';
import rContestTechHigh from './rContestTechHigh.js';
import rContestTrack from './rContestTrack.js';

/**
 * the room for contest management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{contest1}, {contest2}]
 */
class rContests extends roomServer{

    /** Constructor for the contest-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, rEvents, rEventGroups, rStarts, rStartsInGroup, rBaseDisciplines, rMeeting, rCategories, rInscriptions){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false)
        super(eventHandler, mongoDb, logger, "contests@" + meetingShortname, true, -1, false);

        //refrerence to other rooms
        this.rStarts = rStarts;
        this.rEvents = rEvents;
        this.rEventGroups = rEventGroups;
        this.rStartsInGroup = rStartsInGroup;
        this.rBaseDisciplines = rBaseDisciplines;
        this.rMeeting = rMeeting;// needed e.g. to print the header/footer with meeting information on the client
        this.rCategories = rCategories;
        this.rSites = {data:{sites:[]}}; // will be overwritten as soon as the sites room is created
        this.rInscriptions = rInscriptions;

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = []; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all contests
        this.models.contests.findAll().then(contests=>{
            this.data = contests;
            this.ready = true;
        })

        // data we need to store for the subrooms:
        this.meetingShortname = meetingShortname;

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addContest = this.addContest.bind(this);
        this.functionsWrite.deleteContest = this.deleteContest.bind(this);
        this.functionsWrite.updateContest = this.updateContest.bind(this);

        // define, compile and store the schemas:
        let contest={
            xContest: {type: "integer"},
            xBaseDiscipline: {type:"integer"},
            datetimeAppeal: {type:["string"], format:"date-time"},
            datetimeCall: {type:["string"], format:"date-time"},
            datetimeStart: {type:["string"], format:"date-time"},
            //xSite: {type: "integer"},
            status: {type: "integer"},
            name:{type:'string', maxLength:50},
            conf: {type:"string"}
        };
        let schemaAddContest = {
            type: "object",
            properties: contest,
            required: ["xBaseDiscipline", "datetimeAppeal", "datetimeCall", "datetimeStart"],
            additionalProperties: false,
        };
        let schemaUpdateContest = {
            type: "object",
            // the base discipline MUST NOT be changed!
            properties: contest,
            required: ["xContest", "datetimeAppeal", "datetimeCall", "datetimeStart"],
            additionalProperties: false,
        };
        let schemaDeleteContest = {
            type: "integer"
        }
        this.validateAddContest = this.ajv.compile(schemaAddContest);
        this.validateUpdateContest = this.ajv.compile(schemaUpdateContest);
        this.validateDeleteContest= this.ajv.compile(schemaDeleteContest);
    }

    /**
     * add an contest
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addContest(data){

        // validate the data based on the schema
        let valid = this.validateAddContest(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addContest, updateContest, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            if (!data.conf){
                // add the default (for this baseDiscipline/type) contest.conf(iguration)
                // get the baseDiscipline
                const bd = this.rBaseDisciplines.data.find(x=>x.xBaseDiscipline == data.xBaseDiscipline);
                if (bd?.type == 1){
                    // tech high
                    data.conf = JSON.stringify({heightIncreases:[], jumpoff:false});
                } else if (bd?.type == 2){
                    // tech long
                    // TODO
                } else if (bd?.type == 3){
                    // track
                    // try to get default values for number of persons per heat first from a track site and second from the discipline

                    // try to get the default from the discipline; 
                    const dConf = JSON.parse(bd.baseConfiguration);
                    
                    // try to get a site for track (type==0)
                    const site = this.rSites.data.sites.find(s=>s.type==0);
                    // get the configuration for the site
                    let heatSizeRuns = dConf.groupSize ?? 1;
                    let lanes = 8;
                    if (site){
                        const siteConf = JSON.parse(site.conf);
                        // differentiate lanes straight and lanes around
                        if ('straight' in dConf){
                            if (dConf.straight){
                                lanes = siteConf.lanesStraight ?? lanes;
                            } else {
                                lanes = siteConf.lanesAround ?? lanes;
                                heatSizeRuns = siteConf.heatSizeRuns ?? heatSizeRuns;
                            }
                        } else {
                            lanes = siteConf.lanesStraight ?? lanes;
                        }
                    }

                    const c = {
                        startInLanes: dConf.startInLanes ?? true,
                        groupSize: heatSizeRuns, // number of persons per lane (when startInLanes) or persons per group (when startInLanes==false) 
                        lanes, 
                    }
                    data.conf = JSON.stringify(c);
                }
            }

            var contest = await this.models.contests.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: Contest could not be created: ${err}`, code:22}})

            this.data.push(contest); 

            // the data to be sent back to the client requesting the add is the full data
            let sendData = contest.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addContest',
                data: contest.dataValues // should have the same properties as data, but with added xContest
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteContest
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
            throw {message: this.ajv.errorsText(this.validateAddContest.errors), code:23};
        }
    }


    async deleteContest(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteContest(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, contest] = this.findObjInArrayByProp(this.data, 'xContest', data)

            // delete the entry in the meetings table
            await this.models.contests.destroy({where:{xContest: data}}).catch(()=>{
                throw {message: "Contest could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data, 'xContest', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteContest',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addContest
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
            throw {message: this.ajv.errorsText(this.validateDeleteContest.errors), code:23};
        }
    }

    
    async updateContest(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateContest(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data, 'xContest', data.xContest);
            if (i<0){
                throw {code:24, message:"The contest does not exist anymore on the server (should actually never happen)."};
            }

            let contestOld = {};
            this.propertyTransfer(o.dataValues, contestOld);

            // additionally make sure that xBaseDiscipline is not changed!
            if ('xBaseDiscipline' in data && data.xBaseDiscipline != contestOld.xBaseDiscipline){
                throw {code:25, message:"xBaseDiscipline shall not be changed. If this is really needed, create a new contest and delete the old."};
            }

            return o.update(data).then(async(contestChanged)=>{
                // the data should be updated in th DB by now.

                // set the local data
                this.data[i] = contestChanged;

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateContest', data: contestChanged.dataValues}, 
                    undoObj: {funcName: 'updateContest', data: contestOld, ID: this.ID},
                    response: contestChanged.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the contest with the respective Id. Error: " + err};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateContest.errors)}
        }
    }

    /**
     * Try to start a dynamic subroom. This function shall be overriden by the inheriting class if needed. 
     * @param {string} subroomName The name of the subroom
     * @returns {boolean} returns the room on success, and false if it could not be created.
     */
    startDynamicSubroom(subroomName){
        // if we are here, then we can be sure that the room does not yet exist.

        // return false if the room cannot be generated.

        let xContest = Number(subroomName);
        if (isNaN(xContest)){
            return false;
        }

        // the subroom should be xContest; try to get the contest
        let contest = this.data.find(c=>c.xContest==xContest);
        if (!contest){
            return false;
        }

        // TODO: differentiate techHigh, techLong, track
        const bd = this.rBaseDisciplines.data.find(bd=>bd.xBaseDiscipline == contest.xBaseDiscipline);
        if (!bd){
            return false;
        }
        let type = bd.type; //1: techHigh, 2: techLong, 3: track

        // start the room
        let dynamicRoom = {
            parentRoom: this,
            timeout: -1 // keep the room open forever; to be changed in the future, when we have a timeout function (without the timeout, I think it's better to keep the room open)
        }
        try{
            let subroom;
            if (type==1){
                subroom = new rContestTechHigh(this.meetingShortname, this.seq, this.models, this.mongoDB, this.eH, this.logger, dynamicRoom, contest, this, this.rStartsInGroup, this.rBaseDisciplines, this.rMeeting, this.rCategories, this.rInscriptions, this.rStarts, this.rEventGroups)
            } else if (type==3) {
                subroom = new rContestTrack(this.meetingShortname, this.seq, this.models, this.mongoDB, this.eH, this.logger, dynamicRoom, contest, this, this.rStartsInGroup, this.rBaseDisciplines, this.rMeeting, this.rCategories, this.rInscriptions, this.rStarts, this.rEventGroups)
            /*} else if (type==2){
                subroom = new rContestTechLong(this.meetingShortname, this.seq, this.models, this.mongoDB, this.eH, this.logger, dynamicRoom, contest, this, this.rStartsInGroup, this.rBaseDisciplines, this.rMeeting, this.rCategories, this.rInscriptions, this.rStarts, this.rEventGroups)*/
            } else {
                this.logger.log(22, `Could not create the subroom for contest ${xContest} in meeting ${this.meetingShortname} since the contest type ${type} is not supported.`);
                return false;
            }
            // save the room: 
            this.subrooms[subroomName] = subroom;

            return subroom;
        }catch (ex) {
            this.logger.log(22, `Could not create the subroom ${xContest} in meeting ${this.meetingShortname}: ${ex}`)
            return false;
        }
        
    }

}

export default rContests;