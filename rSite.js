
// a room per site; 

import roomServer from './roomServer.js';
import { findSubroom } from './findRoom.js';


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
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, rSites, site, rContests, rDisciplines, rMeeting){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false, dynamicRoom, reportToSideChannel, keepWritingTicket)
        super(eventHandler, mongoDb, logger, `sites/${site.xSite}@${meetingShortname}`, true, -1, false, dynamicRoom, false, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = {
            site: site, // add here the data from the parentRoom, as an info
            contests: [],
            meeting: rMeeting.data,
            disciplines: rDisciplines.data,// not translated, since the langauge used is not known 
        }; 

        this.site = site; // the site object from rSites
        this.rSites = rSites;
        this.rContests = rContests;
        this.rDisciplines = rDisciplines;
        this.meetingShortname = meetingShortname;
        this.rMeeting = rMeeting;

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

    // required functions (mostly equivalent with event listeners: contestChange (e.g. status changed), seriesAdded, seriesChanged, seriesDeleted)
    
    /** Constructor for the site-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, rSites, site, rContests, rDisciplines, rMeeting){

        // call parent constructor
        super(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, rSites, site, rContests, rDisciplines, rMeeting);

        this.rDisciplines = rDisciplines;

        // register events to listen to changes of the series
        // TODO:

        this.createData().then(()=>{this.ready = true}).catch(ex=>{
            this.logger.log(5, `Could not start rSite ${site.xSite}: ${ex}`);});

        // add the functions to the respective object of the parent
        // the name of the functions must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        // Note: I think the heat-data-functions called through the event system are actually not needed as room functions; (they are always called this way and not through the side channel)  
        // however, the results functions must obviously exist, since the client will send those changes
        this.functionsWrite.addUpdateHeatAux = this.addUpdateHeatAux.bind(this);
        this.functionsWrite.addUpdateResult = this.addUpdateResult.bind(this);
        this.functionsWrite.addUpdateResultsHeat = this.addUpdateResultsHeat.bind(this);
        this.functionsWrite.deleteResult = this.deleteResult.bind(this);
        this.functionsWrite.deleteResultsHeat = this.deleteResultsHeat.bind(this);

        // sites/xSite@meetingShortname:...
        this.eH.eventSubscribe(`${this.name}:seriesAdded`, (data)=>{
            // do a quick check
            if (data.series.xSite == this.site.xSite){
                this.addSeries(data);
            }
        });

        this.eH.eventSubscribe(`${this.name}:seriesDeleted`, (series)=>{
            this.deleteSeries(series);
        })
        
        this.eH.eventSubscribe(`${this.name}:seriesChanged`, (data)=>{
            this.changeSeries(data);
        })

        this.eH.eventSubscribe(`${this.name}:contestChanged`, (contest)=>{
            this.changeContest(contest);
        })

        // do we really need all those functions? (especially the fact of re-ranking costs some effort!); it would be less effort if we simply used seriesChanged; However, the drawback is that if times are created by the timing, we get only the full series object on the server and somehow need to find out what has changed to call the respective function in the right contest-room --> thus, I think I keep having that many functions.
        this.eH.eventSubscribe(`${this.name}:resultChanged`, (data)=>{

            // data contains: xContest, xSeries, xSeriesStart, result
            this.addUpdateResult(data).catch(err=>{
                this.logger.log(10, `Error during addUpdateResult in room ${this.name}: ${err}`);
            });
        })

        // probably not needed, since manual results come in one by one
        this.eH.eventSubscribe(`${this.name}:resultsHeatChanged`, (data)=>{
            this.addUpdateResultsHeat(data).catch(err=>{
                this.logger.log(10, `Error during addUpdateResultsHeat in room ${this.name}: ${err}`);
            });
        })

        this.eH.eventSubscribe(`${this.name}:heatAuxChanged`, (data)=>{
            this.addUpdateHeatAux(data).catch(err=>{
                this.logger.log(10, `Error during addUpdateHeatAux in room ${this.name}: ${err}`);
            });
        })

        this.eH.eventSubscribe(`${this.name}:resultDeleted`, (data)=>{
            // data contains: xContest, xSeries, xSeriesStart
            this.deleteResult(data).catch(err=>{
                this.logger.log(10, `Error during deleteResult in room ${this.name}: ${err}`);
            });
        })

        this.eH.eventSubscribe(`${this.name}:resultsHeatDeleted`, (data)=>{
            this.deleteResultsHeat(data).catch(err=>{
                this.logger.log(10, `Error during deleteResultsHeat in room ${this.name}: ${err}`);
            });
        })



    }

    async addUpdateResult(data){
        // data contains: xContest, xSeries, xSeriesStart, result
        // add or update a single result

        // get the contest
        let c = this.data.contests.find(contest=>contest.xContest == data.xContest);
        if (!c){
            throw {code:21, message: `Could not find the contest with xContest=${data.xContest}.`}
        }

        // partially copied form rContestTrack
        // try to get the respecitve series, ssr, result
        let s = c.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            throw {code:22, message: `Could not find the series with xSeries=${data.xSeries}.`}
        }

        let ssr = s.SSRs.find(ssr=>ssr.xSeriesStart == data.xSeriesStart);
        if (!ssr){
            throw {code:23, message: `Could not find the xSeriesStart with xSeriesStart=${data.xSeriesStart}.`}
        }

        let rankBefore;
        if (ssr.resultstrack===null){
            // add result
            ssr.resultstrack = data.result;

            rankBefore = Infinity;
        } else {
            // update result
            rankBefore = ssr.resultstrack.rank;
            ssr.resultstrack = data.result;
        }

        // if the rank is changed, update the necessary other ranks
        // what cases are possible and are they handled well?:
        // - regular time changes, where obviously the rank might change as well
        // - equal times, different rank to same (better) rank
        // - equal times, equal rank to worse rank.
        // if the better ranked result of two results with equal time is ranked down, then the other MUST be rnaked better. Otherwise we could end up having 1st, and twice third. However, the opposite way around is not true. 
        let currentResults = s.SSRs.filter(ssr2=>ssr2.resultstrack!==null && ssr2.xSeriesStart != data.result.xResultTrack);
        for (let ssr2 of currentResults){
            if (ssr2.resultstrack.rank <= rankBefore && ssr2.resultstrack.rank >= data.result.rank){
                // the rank of the changed result was lowered
                // if the rounded times are equal, we assume that having equal ranks is expected and no change is needed; otherwise, increase the rank
                // NOTE: currently we do no checks if the rank is realistic based on the times.
                if (ssr.resultstrack.timeRounded != ssr2.resultstrack.timeRounded || ssr2.resultstrack.rank != data.result.rank){ // NOTE: the last condition is needed in cases where >2 persons have the same time and the person of rank 3 is moved to 1 (together with the person that is already on 1; then, rank 2 must be increased to 3) 
                    ssr2.resultstrack.rank++;
                }
            } else if (ssr2.resultstrack.rank > rankBefore && ssr2.resultstrack.rank <= data.result.rank){
                // the rank of the changed result was increased
                ssr2.resultstrack.rank--;
            }
        }

        // nothing to save here, since rSite is a dynamically created room

        // notify the clients
        const doObj = {
            funcName:'addUpdateResult',
            data,
        } 
        const undoObj = {
            funcName:'TODO',
            data: null,
        }
        this.processChange(doObj, undoObj)

    }

    async addUpdateResultsHeat(data){
        // add or update the results of a heat, including aux data of the heat

    }

    async addUpdateHeatAux(data){
        // add or update the aux data of a heat
        // this also somehow includes delete, since the data is an object anyway, wich can simply be "{}" for deleting.
    }

    async deleteResult(data){
        // data contains: xContest, xSeries, xSeriesStart

        // get the contest
        let c = this.data.contests.find(contest=>contest.xContest == data.xContest);
        if (!c){
            throw {code:21, message: `Could not find the contest with xContest=${data.xContest}.`}
        }

        // try to get the respecitve series, ssr, result
        let s = c.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            throw {code:22, message: `Could not find the series with xSeries=${data.xSeries}.`}
        }

        let ssr = s.SSRs.find(ssr=>ssr.xSeriesStart == data.xSeriesStart);
        if (!ssr){
            throw {code:23, message: `Could not find the xSeriesStart with xSeriesStart=${data.xSeriesStart}.`}
        }

        let rankDeleted = ssr.resultstrack.rank;

        // remove locally
        ssr.resultstrack=null; 

        // decrease the rank of all other SSRs in the same heat
        for (let ssr2 of s.SSRs){
            if (ssr2.resultstrack !== null){
                if (ssr2.resultstrack.rank > rankDeleted){
                    ssr2.resultstrack.rank--;
                }
            }
        }

        // nothing to save here, since rSite is a dynamically created room

        // notify the clients
        const doObj = {
            funcName:'deleteResult',
            data,
        } 
        const undoObj = {
            funcName:'TODO',
            data: null,
        }
        this.processChange(doObj, undoObj)

    }

    async deleteResultsHeat(data){

    }

    async createData (){

        // initially get all series that use this site. Then, get all aux-information from the respective contests
        // when the site of a series is changed this shall be notified with an event, so that above process only needs to be started once
        
        /**  data structure:
        * the data must contain the series as well as the contest (at least as a background information). Two options:
        * 1) series = [{heat1 status:1, number: 1, datetime:..., contest:{contest-object}}, {heat2}]
        * 2) contests = [{contest1, contestStatus, heats:[{heat1 status:1, number:1, datetime:...}]}] // include any contest which has at least one heat on this site 
        * Option 2 is chosen, since it avoids that the contest information is transferred multiple times.
        */

        // TODO: test everything
        // TODO: eventually move this to rSite instead of rSiteTrack
        const series = await this.models.series.findAll({where:{xSite:this.site.xSite}});

        // create the data in a new array
        const data = [];

        for (let i = series.length-1; i>=0; i--){
            let s = series[i];

            // try to get the contest
            let rContest = await findSubroom(this.rContests, s.xContest.toString(), this.logger, true)

            // a series without contest can actually not exist
            if (!rContest){
                throw({code: 1, message:`The contest ${s.xContest} for series ${s.xSeries} does not exist. This should never happen!`})
            }

            // get the same series from the contest (since this includes the ssr)
            const sDetail = rContest.data.series.find(s2=>s.xSeries==s2.xSeries);
            
            // now only have to add other series:
            const addData = {
                contest: rContest.contest,
                startgroups: rContest.data.startgroups,
                series: sDetail,
                reportChange: false,
            }
            this.addSeries(addData);

        }

        // finally:
        this.ready = true;
    }

    /**
     * called when a series was deleted
     * @param {object} series the deleted series model (must still contain xContest and xSeries)
     */
    deleteSeries(series){
        // search the contest first
        const c = this.data.contests.find(c=>c.xContest==series.xContest);
        if (c){
            // search the series
            const si = c.series.findIndex(s=>s.xSeries == series.xSeries);

            // delete it
            c.series.splice(si,1);

            // delete the contest if it has no series anymore
            if (c.series.length == 0){
                let i = this.data.contests.findIndex(c=>c.xContest==series.xContest);
                if (i>=0){
                    // should always be the case
                    this.data.contests.splice(i,1);
                }
            }
        } else {
            this.logger.log(20, `Could not delete xSeries=${series.xSeries} from xContest=${series.xContest} because this contest has no series on xSite=${this.site.xSite}.`)
        }

        const doObj = {
            funcName:'deleteSeries',
            data:series,
        } 
        const undoObj = {
            funcName:'TODO',
            data: null,
        }
        this.processChange(doObj, undoObj)
    }

    // create the object for the series as used in this room. Called by addSeries and changeSeries
    createSeriesObj(series, startgroups){
        // create an array with all athletes and their positions
        const SSRs = [];
        for (let ssr of series.seriesstartsresults){
            // get the auxilariy data for this person
            const SG = startgroups.find(sg=>sg.xStartgroup == ssr.xStartgroup);

            // put all data for this person into one object and add it to the list of athletes
            // OLD (resultstrack were not reasonably copied):
            //const ssrDetail = {};
            //this.propertyTransfer(ssr.dataValues, ssrDetail, true); // number, lane, etc
            // NEW:
            const ssrDetail = ssr.get({plain:true});

            this.propertyTransfer(SG, ssrDetail, true); // name, club, birthdate, ...

            // add the category
            ssrDetail.category = this.rContests.rCategories.data.find(c=>c.xCategory == ssrDetail.xCategory)?.shortname // contests references the categories

            SSRs.push(ssrDetail);
        }

        // add information about the discipline
        // part of the info is in discipline (e.g. distance, runInLanes etc) and a part is in baseDisciplines; however, we only know the baseDiscipline... --> we must change the place of some data!!!

        // add the series to the main data object
        return {
            SSRs: SSRs,
            xSeries: series.xSeries,
            status: series.status,
            number: series.number,
            name: series.name,
            datetime: series.datetime,
            id: series.id,
            xContest: series.xContest,
        }
    }

    /**
     * add a series which is taking place on this site. Function called through the event system only; sends change to all connected clients
     * @param {object} data.contest the contest (model) object
     * @param {object} data.series the series (model) object
     * @param {object} data.startgroup all startgroups of the contest. provided to allow this function to create the correct local data. 
     */
    addSeries(data){

        const contest = data.contest;
        const series = data.series;
        const startgroups = data.startgroups
        const reportChange = data.reportChange ?? true;

        // get (or create) the contest in the data of this room 
        const c = this.getOrCreateContest(contest.xContest, contest);

        // make sure that the discipline is of the right type
        const d = this.rDisciplines.data.find(d2=>d2.xBaseDiscipline == contest.xBaseDiscipline); 
        // TODO: adapt allowed values of type if there are mutiple types in the future (e.g. if we need separate types for wind yes/no, start in lanes yes/no, # persons per lane)
        if (d.type!=3){
            // remove the series from the series of this site, since we cannot process this data
            this.logger.log(33, `rSite/${this.site.xSite}: The baseDiscipline (${contest.xBaseDiscipline}) of xSeries ${series.xSeries} in contest ${contest.xContest} has a type (${d.type}) which cannot be processed for this site. Ignoring this series.`);
            series.splice(i,1);
        }

        // create an array with all athletes and their positions
        // const SSRs = [];
        // for (let ssr of series.seriesstartsresults){
        //     // get the auxilariy data for this person
        //     const SG = startgroups.find(sg=>sg.xStartgroup == ssr.xStartgroup);

        //     // put all data for this person into one object and add it to the list of athletes
        //     const ssrDetail = {};
        //     this.propertyTransfer(ssr.dataValues, ssrDetail, true); // number, lane, etc
        //     this.propertyTransfer(SG, ssrDetail, true); // name, club, birthdate, ...

        //     SSRs.push(ssrDetail);
        // }

        // // add the series to the main data object
        // const s = {
        //     SSRs: SSRs,
        //     xSeries: series.xSeries,
        //     status: series.status,
        //     number: series.number,
        //     name: series.name,
        //     datetime: series.datetime,
        //     id: series.id,
        // }
        const s = this.createSeriesObj(series, startgroups);
        c.series.push(s)

        if (reportChange){
            // send the change to the client
            const doObj = {
                funcName:'addSeries',
                data: {
                    contest,
                    series: s,
                }
            } 
            const undoObj = {
                funcName:'TODO',
                data: null,
            }
            this.processChange(doObj, undoObj)
        }
    }

    /**
     * Event called when a series is changed (e.g. new starttime, new number, added/removed athlete) This will be called for every series, when a change affects multiple series. 
     * @param {object} data The data providede with the changeSeries-event
     * @param {} data.series
     * @param {} data.startgroups
     */
    changeSeries(data){
        // we simple create the series from scratch as in addSeries, but simply do not add it, but replace it.

        // first try to get the contest. If the contest does not exist, then something is wrong, e.g. contest is not meant to take place on the track.
        const c = this.data.contests.find(c=>c.xContest == data.series.xContest);
        if (!c){
            this.logger.log(50, `Series ${data.series.xSeries} cannot be changed since the constest ${data.series.xContest} is not present on this site.`)
            return;
        }

        // create the new seriesObj
        const s = this.createSeriesObj(data.series, data.startgroups);
        
        // replace the series object
        const si = c.series.findIndex(s2=>s2.xSeries == data.series.xSeries);
        c.series[si] = s;
        
        // send the change to the client
        const doObj = {
            funcName:'changeSeries',
            data: s, // send only the series; this is enough for the client
        } 
        const undoObj = {
            funcName:'TODO',
            data: null,
        }
        this.processChange(doObj, undoObj);
    }

    /**
     * Try to get the object of the specified contest
     * @param {integer} xContest 
     * @param {object} contest the contest data object for 
     */
    getOrCreateContest(xContest, contest){
        let c = this.data.contests.find(contest=>contest.xContest == xContest);
        if (!c){
            // add the contest
            c = this.createContestObj(contest);
            this.data.contests.push(c);
        }
        return c;
    }

    changeContest(contest){
        // first try to find the contest
        let ic = this.data.contests.findIndex(c=>c.xContest == contest.xContest);
        if (ic<0){
            this.logger.log(50, `The contest ${contest.xContest} is not part of rSite ${this.site.xSite}. Thus, changeContest cannot continue.`);
            return;
        }
        const series = this.data.contests[ic].series;

        // create a new contest object. Copy then the present series to the object and store the newly created object
        let newContest = this.createContestObj(contest);

        // send the changes to the client here (and not at the end) to avoid that the series are also sent again
        const doObj = {
            funcName:'changeContest',
            data: newContest, 
        } 
        const undoObj = {
            funcName:'TODO',
            data: null,
        }
        this.processChange(doObj, undoObj);

        // replace the present object
        newContest.series = series;
        this.data.contests[ic] = newContest
    }

    createContestObj(c2){
        const baseDiscipline = this.rDisciplines.data.find(d=>d.xBaseDiscipline == c2.xBaseDiscipline);
        const baseConfStr = baseDiscipline?.baseConfiguration;
        const baseConfiguration = baseConfStr ? JSON.parse(baseConfStr) : '';
        return {
            conf: c2.conf,
            datetimeAppeal: c2.datetimeAppeal,
            datetimeCall: c2.datetimeCall,
            datetimeStart: c2.datetimeStart,
            name: c2.name,
            status: c2.status,
            xBaseDiscipline: c2.xBaseDiscipline,
            xContest: c2.xContest,
            series:[],
            baseConfiguration,
        }
    }
}

export default rSite;