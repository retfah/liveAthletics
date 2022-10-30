
// a room per site; 

import roomServer from './roomServer.js';
import { findSubroom } from './findRoom.js';
import { ssrContextKey } from 'vue';


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
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, rSites, site, rContests){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false)
        super(eventHandler, mongoDb, logger, `sites/${site.xSite}@${meetingShortname}`, true, -1, false, dynamicRoom);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = {
            site: {}, // add here the data from the parentRoom, as an info

        }; 

        this.site = site; // the site object from rSites
        this.rSites = rSites;
        this.rContests = rContests;
        this.meetingShortname = meetingShortname;

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; 

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        /*this.functionsWrite.addSite = this.addSite.bind(this);*/

        // define, compile and store the schemas:
        /*let schemaAddSite = {
            type: "object",
            properties: {
                xTODO: {type: "integer"}
            },
            required: [],
            additionalProperties: false
        };
        this.validateAddSite = this.ajv.compile(schemaAddSite);*/
 
    }

    /**
     * add an site
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    // TODO: remove/adapt
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

}

export class rSiteTrack extends rSite{
    // implement here the track specific stuff for the rSite

    // 2022-09: basically, this shall be a room that collects all series of all contests that take place on this site. it must keep a list of the
    
    /** Constructor for the site-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, rSites, site, rContests, rDisciplines){

        // call parent constructor
        super(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, rSites, site, rContests);

        this.rDisciplines = rDisciplines;

        // register events to listen to changes of the series
        // TODO:

        this.createData.then(()=>{this.ready = true});

    }

    async createData (){

        // initially get all series that use this site. Then, get all aux-information from the respective contests
        // when the site of a series is changed this shall be notified with an event, so that above process only needs to be started once

        // TODO: test everything
        // TODO: eventually move this to rSite instead of rSiteTrack
        const series = this.models.series.findAll({where:{xSite:xSite}});

        // create the data in a new array
        const data = [];

        for (let i = series.length-1; i>=0; i--){
            let s = series[i];

            // try to get the contest
            let contest = findSubroom(this.rContests, s.xContest.toString(), this.logger, true)

            // a series without contest can actually not exist
            if (!contest){
                throw({code: 1, message:`The contest ${s.xContest} for series ${s.xSeries} does not exist. This should never happen!`})
            }

            // get the same series from the contest (since this includes the ssr)
            const sDetail = contest.series.find(s2=>s.xSeries==s2.xSeries);
            
            // make sure that the discipline is of the right type
            const d = this.rDisciplines.data.find(d2=>d2.xBaseDiscipline == contest.xBaseDiscipline); 

            // TODO: adapt allowed values of type if there are mutiple types in the future (e.g. if we need separate types for wind yes/no, start in lanes yes/no, # persons per lane)
            if (d.type!=3){
                // remove the series from the series of this site, since we cannot process this data
                this.logger.log(33, `rSite/${this.site.xSite}: The baseDiscipline (${contest.xBaseDiscipline}) of xSeries ${series.xSeries} in contest ${contest.xContest} has a type (${d.type}) which cannot be processed for this site. Ignoring this series.`);
                series.splice(i,1);
            }

            // create an array with all athletes and their positions
            const SSRs = [];
            for (let ssr in sDetail.seriesstartsresults){
                // get the auxilariy data for this person
                const SG = contest.startgroups.find(sg=>sg.xStartgroup == ssr.xStartgroup);

                // put all data for this person into one object and add it to the list of athletes
                const ssrDetail = {};
                this.propertyTransfer(ssr, ssrDetail, true);
                this.propertyTransfer(SG, ssrDetail, true);

                SSRs.push(ssrDetail);
            }

            // add the series to the main data object
            data.push({
                SSRs: SSRs,
                xSeries: sDetail.xSeries,
                status: sDetail.status,
                number: sDetail.number,
                name: sDetail.name,
                datetime: sDetail.datetime,
                id: sDetail.id,
            })

        }
        // TODO: continue here, as soon as series creation with track events is done!

        // finally:
        this.data = data
        this.ready = true;
    }
}

export default rSite;