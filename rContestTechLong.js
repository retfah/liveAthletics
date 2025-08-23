// generic room for a tech-long contest; to be created/started by the room manager on the server or rContests

// TODO: also the relatedGroups array must be updated when the association between groups and the contest change.
// TODO: changes within events and eventGroups (e.g. changed names and infos) are not updated yet (only on server restart). This must be done either automatically (by events) or at least when the client requests it 

import rContest from './rContest.js';

import Sequelize  from 'sequelize';
const Op = Sequelize.Op;

/**
 * the room for a single tech long contest
 * The data stores an object: data ={series: [], contest: {the contest object; to be modified in the rContests room}}
 */
class rContestTechLong extends rContest{

    /** Constructor for the contest-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     * @param {object} dynamicRoom An object with properties for a dynamic room
     * @param {object} contest The data-object of the contest (contest-table) as stored in the contest-room 
     * @param {object} rContests The contests room
     * @param {object} rStartsInGroup
     * @param {object} rBaseDisciplines
     * @param {object} rMeeting
     * @param {object} rMeetingAdmin
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, contest, rContests, rStartsInGroup, rBaseDisciplines, rMeeting, rCategories, rInscriptions, rStart, rEventGroups){

        super(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, contest, rContests, rStartsInGroup, rBaseDisciplines, rMeeting, rCategories, rInscriptions, rStart, rEventGroups)

        // NOTE: the contest must set this.ready=true !!! this is not done in the parent

        // contest specific
        // we are provided two promises that we wait for until we start preparingthe aux data and set this.ready=true
        Promise.all([this.pMongoLoaded, this.pMysqlDataLoaded]).then(()=>{

            // start the aux preparation
            this.prepareAuxData();
            // this will finally also set this.ready=true
        })

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        // data is an object of the following structure: 
        // data = {series:[], contest:{the contest data}, auxData:{}}
        // auxData = {xStartgroup:{"1": {athleteName, athleteForename, birthday, sex, clubName, clubSortvalue, countryCode, bib}, "15":{...}, ...}}

        // HowTo (in startsInGroup): 
        // - for every startsInGroup-entry, keep a corresponding dataset with the most 

        // ATTENTION: the same (!) default data must be present in the client room as well!
        this.defaultAuxData = {
            positionNext: [],
            position: [],
            attemptPeriod: 60, // s; mainly related to the next athlete
            periodStartTime: null, // date-string of the server time when the attempt period started
            showAttemptPeriod: false, 
            currentAttempt: -1,
        }

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        this.functionsWrite.updateContest2 = this.updateContest2.bind(this);
        this.functionsWrite.initialSeriesCreation = this.initialSeriesCreation.bind(this);
        this.functionsWrite.deleteAllSeries = this.deleteAllSeries.bind(this);
        this.functionsWrite.addSSR = this.addSSR.bind(this);
        this.functionsWrite.changePosition = this.changePosition.bind(this);
        this.functionsWrite.updateSSR = this.updateSSR.bind(this);
        this.functionsWrite.addResult = this.addResult.bind(this);
        this.functionsWrite.updateResult = this.updateResult.bind(this);
        this.functionsWrite.deleteResult = this.deleteResult.bind(this);
        this.functionsWrite.addSeries = this.addSeries.bind(this);
        // TODO: delete series; also copy this funciton to rContestTechHigh

        // define, compile and store the schemas:
        const schemaAuxDataPerSeries = {
            type:"object",
            properties:{
                positionNext:{
                    type:'array',
                    items: {type:"integer"},
                },
                position:{
                    type: 'array',
                    items: {type:"integer"},
                },
                attemptPeriod: {type:"integer", minimum:0}, // s; mainly related to the next athlete
                periodStartTime: {type:["null", "string"]}, // date-string of the server time when the attempt period started
                showAttemptPeriod: {type:"boolean"}, 
                currentAttempt: {type:"integer"},
            }, 
            required:[],//["positionNext", "attemptPeriod", "periodStartTime", "showAttemptPeriod", "position"],
            additionalProperties: false,

        }

        // the aux data must be separate for each series. The aux data object shall store an object for each series, referenced by xSeries.
        const schemaAuxData ={
            type:"object",
            additionalProperties: schemaAuxDataPerSeries
        }

        const schemaUpdateContest2 = {
            type: "object",
            properties: {
                // the xContest and the base discipline MUST NOT be changed!
                xContest: {type: "integer"},
                xBaseDiscipline: {type:"integer"},
                datetimeAppeal: {type:["string"], format:"date-time"},
                datetimeCall: {type:["string"], format:"date-time"},
                datetimeStart: {type:["string"], format:"date-time"},
                xSite: {type: ["integer", "null"]},
                status: {type: "integer"},
                conf: {type:"string"},
                name: {type:"string", maxLength:50},
            },
            required: ["xContest", "xBaseDiscipline", "datetimeAppeal", "datetimeCall", "datetimeStart"]
        };

        // also check in ajv that the result is valid:
        // - maximum 3 failed attempts 
        // - if 3 failed attempts: passed=false and valid=false
        // - valid and passed cannot be true at the same time
        // checked with online validator: the specification below should work
        const schemaResultsLong = {
            type: "object",
            properties: {
                xResult: {type:"integer"}, // reference to xSeriesStart! 
                attempt: {type:"integer", minimum:1}, 
                result:{type:["null", "integer"]},
                wind:{type:['null', 'integer'], default:null},
                status:{type:"integer", minimum:0, maximum:255},
            },
            additionalProperties: false,
            required:["xResult", "attempt", "result"],
        }

        const schemaSeriesStartsResults = {
            type:"object",
            properties:{
                xSeriesStart: {type:"integer"},
                xStartgroup: {type:"integer"},
                xSeries: {type:"integer"}, // reference to the respective series; must be equivalent to what is givne in the parent object, if handled like this
                position: {type:"integer"},
                resultOverrule: {type:"integer"},
                resultRemark: {type:"string", maxLength:100},
                qualification: {type:"integer"}, 
                startConf: {type:["string", "integer"]}, // actually the length is limited to 65536 bytes, which means the same or less characters! This cannot be checked yet with JSON schema. Allow integers as well; they will be casted to string
                resultstech: {
                    type:"array",
                    items: schemaResultsLong,
                }
            },
            required: ["xSeries", "xStartgroup", "position"],
            additionalProperties: false, 
        }

        const schemaSeries = {
            type:"object",
            properties: {
                xSeries: {type:"integer"}, // must be undefined sometimes
                xContest: {type:"integer"}, // MUST be the xContest of this room! To be checked!
                xSite: {type: ["integer", "null"], default: null},
                status: {type:"integer", default: 10},
                number: {type:"integer"},
                name: {type:"string", maxLength:50, default:''},
				datetime: {type: ["null", "string"], format:"date-time", default:null}, // format gets only evaluated when string,
                id: {type: ["null", "string"], format:"uuid"}, // intended to be UUID, but might be anything else as well,
                seriesstartsresults: {
                    type:"array",
                    items: schemaSeriesStartsResults,// reference to the seriesStartsResults,
                },
                aux: {
                    type:["null", "object"], // currently always null
                    default:null,
                },
            },
            required: ["xContest", "status", "number", "xSite", "name", "datetime", "id", "seriesstartsresults"],
            additionalProperties: false,
            // neither required nor additional propertzies are defined herein
        }

        const schemaUpdateSeries = {
            type:"object",
            properties: {
                xSeries: {type:"integer"}, // must be undefined sometimes
                xContest: {type:"integer"}, // MUST be the xContest of this room! To be checked!
                xSite: {type: ["integer", "null"]},
                status: {type:"integer"},
                number: {type:"integer"},
                name: {type:"string", maxLength:50},
                datetime: {type: ["null", "string"], format:"date-time", default:null}, // format gets only evaluated when string,
                id: {type: ["null", "string"], format:"uuid"}, // intended to be UUID, but might be anything else as well
                aux: {type:["null", "object"], default:null}, // not used yet for techlong
            },
            required: ["xContest", "xSeries", "status", "number"],
            additionalProperties: false,
        }

        // actually, what we test here for is not that important, but it was implemented as a reference
        const schemaInitialSeriesCreation = {
            // must be based on the series schema, but some properties shall not be included, e.g. results
            type:"array",
            items: schemaSeries
        }

        const schemaAddSeries = {
            type: "object",
            properties: {
                xSeries: {type:"integer"}, // must be undefined sometimes
                xContest: {type:"integer"}, // MUST be the xContest of this room! To be checked!
                xSite: {type: ["integer", "null"]},
                status: {type:"integer", default:10},
                number: {type:"integer"},
                name: {type:"string", maxLength:50},
                seriesstartsresults: {
                    type:"array",
                    items: schemaSeriesStartsResults,// reference to the seriesStartsResults,
                },
                datetime: {type: ["null", "string"], format:"date-time", default:null}, // format gets only evaluated when string,
                id: {type: ["null", "string"], format:"uuid"}, // intended to be UUID, but might be anything else as well
            },
            required: ["xContest", "status", "number"],
            additionalProperties: false,
        }

        const schemaAddResult = {
            type: "object",
            properties: {
                result: schemaResultsLong,
                xSeries: {type:"integer"}
            },
            required: ["result", "xSeries"],
            additionalProperties: false,
        };

        const schemaDeleteResult = {
            type:"object",
            properties: {
                xResult: {type:"integer"},
                attempt: {type:"integer"},
                xSeries: {type:"integer"}
            }
        }

        const schemaUpdateResult = schemaAddResult;

        const schemaAddSSR = schemaSeriesStartsResults;

        this.validateAddSSR = this.ajv.compile(schemaAddSSR);
        this.validateUpdateContest2 = this.ajv.compile(schemaUpdateContest2);
        this.validateInitialSeriesCreation = this.ajv.compile(schemaInitialSeriesCreation);
        this.validateUpdateSSR = this.ajv.compile(schemaSeriesStartsResults);
        this.validateAddResult = this.ajv.compile(schemaAddResult);
        this.validateUpdateResult = this.ajv.compile(schemaUpdateResult);
        this.validateDeleteResult = this.ajv.compile(schemaDeleteResult);
        this.validateUpdateSeries = this.ajv.compile(schemaUpdateSeries);
        this.validateAuxData = this.ajv.compile(schemaAuxData);
        this.validateAddSeries = this.ajv.compile(schemaAddSeries);

    }

    // for debugging only
    /*enter(tabId, wsProcessor, responseFunc, opt, session){
        super.enter(tabId, wsProcessor, responseFunc, opt, session)
    }*/

    // read all series from mysql and return the sequelize models as an array
    async getSeries(){
        // get all series
        // it shall have the following structure: 
        // series : all series objects
        // series[0].seriesstartsresults : all athletes in this series
        // series[0].seriesstartsresults[0].resultstech : the attempts of the athletes
        // 
        return this.models.series.findAll({where:{xContest:this.contest.xContest}, include:[{model:this.models.seriesstartsresults, as: "seriesstartsresults", include: [{model:this.models.resultstech, as:"resultstech"}]}]})
    }


    // for debugging only:
    _startWriteFunctionServer(funcName, data, resolve, reject, id=undefined, tabIdExclude=undefined){

        console.log(`DEBUG ${this.name}, function: ${funcName}, id: ${id}`);

        super._startWriteFunctionServer(funcName, data, resolve, reject, id, tabIdExclude);
    }

    _startWriteFunction(tabId, respFunc, request, ID=''){

        console.log(`DEBUG ${this.name}, function: ${request.funcName}, id: ${ID}`);

        super._startWriteFunction(tabId, respFunc, request, ID);
    }

    async deleteResult(data){
        if (!this.validateDeleteResult(data)){
            throw {code:21, message:this.ajv.errorsText(this.validateDeleteResult.errors)};
        }

        // try to get the respecitve series, ssr, result
        let s = this.data.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            throw {code:22, message: `Could not find the series with xSeries=${data.xSeries}.`}
        }

        let ssr = s.seriesstartsresults.find(ssr=>ssr.xSeriesStart == data.xResult);
        if (!ssr){
            throw {code:23, message: `Could not find the xSeriesStart with xSeriesStart=${data.xResult}.`}
        }

        let res = ssr.resultstech.find(r=>r.attempt==data.attempt && r.xResult == data.xResult); // actually the latter check should always be true; otherwise, we have a result added to the wrong ssr
        if (!res){
            throw {code:24, message: `Could not find the result to update (xResult=${data.xResult}, attempt=${data.attempt})`}
        }

        // try to delete the result
        await res.destroy().catch(err=>{
            throw {code: 25, message: `Could not delete the result (xResult=${data.xResult}, attempt=${data.attempt})`}
        })

        // remove it locally
        let ind = ssr.resultstech.indexOf(res);
        if (ind>=0){
            // should always be the case
            ssr.resultstech.splice(ind, 1);
        }

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'deleteResult', data: data},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret;

    }

    async addResult(data){
        if (!this.validateAddResult(data)){
            throw {code: 21, message:this.ajv.errorsText(this.validateAddResult.errors)};
        }

        // check that the result does not exist yet
        // not needed, since adding the result would fail because the key (xResult=xSweriesStart + attempt) would be already used.

        // try to get the respecitve ssr
        let s = this.data.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            throw {code:22, message: `Could not find the series with xSeries=${data.xSeries}.`}
        }

        let ssr = s.seriesstartsresults.find(ssr=>ssr.xSeriesStart == data.result.xResult);
        if (!ssr){
            throw {code:23, message: `Could not find the xSeriesStart with xSeriesStart=${data.result.xResult}.`}
        }

        // add the result
        let newRes = await this.models.resultstech.create(data.result).catch(err=>{throw {code: 24, message: `new resulttech could not be created (most likely because there is already a result for this attempt/person): ${err}`}})
        
        // add the result to the ssr
        ssr.resultstech.push(newRes);

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'addResult', data: data},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret;

    }

    async updateResult(data){
        if (!this.validateUpdateResult(data)){
            throw {code: 21, message:this.ajv.errorsText(this.validateUpdateResult.errors)};
        }

        // try to get the respecitve series, ssr, result
        let s = this.data.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            throw {code:22, message: `Could not find the series with xSeries=${data.xSeries}.`}
        }

        let ssr = s.seriesstartsresults.find(ssr=>ssr.xSeriesStart == data.result.xResult);
        if (!ssr){
            throw {code:23, message: `Could not find the xSeriesStart with xSeriesStart=${data.result.xResult}.`}
        }

        let res = ssr.resultstech.find(r=>r.xResult==data.result.xResult && r.attempt == data.result.attempt); // actually the latter check should always be true; otherwise, we have a result added to the wrong ssr
        if (!res){
            throw {code:24, message: `Could not find the result to update (xResult=${data.result.xResult}, attempt=${data.result.attempt})`}
        }

        // update the result
        let newRes = await res.update(data.result).catch(err=>{throw {code: 25, message: `resulttech could not be updated: ${err}`}})

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateResult', data: data},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret;

    }

    // the position is NOT alowed to be changed! Only do this through changePosition
    async updateSSR(data){
        
        // ONLY update changes in the SSR; changes in a result shall be handled separately; nevertheless, the client may send also the results array.

        if (!this.validateUpdateSSR(data)){
            throw {code:21, message: this.ajv.errorsText(this.validateUpdateSSR.errors)};
        }
        
        // find the corresponding series
        let series = this.data.series.find(s=>s.xSeries == data.xSeries);
        if (!series){
            throw {code:22, message:`xSeries ${data.xSeries} was not found in the respective contest. series start result cannot be changed.`}
        }

        // find the seriesStarStartResult
        let ssr = series.seriesstartsresults.find(ssr=>ssr.xSeriesStart==data.xSeriesStart && ssr.xStartgroup==data.xStartgroup);
        if (!ssr){
            throw {code:22, message:`seriesstartresult ${data.xSeriesStart} was not found in the respective series. series start result cannot be changed.`}
        }

        // make sure the position has not changed! (This is important since we always need to make sure that each position integer only exists once. This is currently only ensured when the changePosition function is used)
        if (ssr.position != data.position){
            throw {code:23, message:`The position cannot be changed in the update SSR function! Use 'changePosition'.`}
        }

        // remove results
        delete data.resultstech;

        await ssr.update(data).catch(err=>{
            throw {code: 24, message: `Could not update the seriesstartresult: ${err}`}
        })

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateSSR', data: data},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret

    }

    async changePosition(data){
        if (this.validateChangePosition(data)){
            // get the old and new series:
            let oldSeries = this.data.series.find(el=>el.xSeries == data.fromXSeries);
            let newSeries = this.data.series.find(el=>el.xSeries == data.toXSeries);
            if (!oldSeries || !newSeries){
                throw {code: 22, message: `Cannot find the old (${data.fromXSeries}) or new (${data.toXSeries}).`};
            }

            let ssrIndex = oldSeries.seriesstartsresults.findIndex(s=>s.xSeriesStart==data.xSeriesStart);
            let ssr = oldSeries.seriesstartsresults[ssrIndex];
            if (!ssr){
                throw {code: 23, message: `Could not find the seriesstartresult ${data.xSeriesStart}`};
            }

            // you cannot change the position when there are already results
            // it does not make a lot of sense, but from a DB point of view the position and series can be changed even when there are results.
            
            let oldPosition = ssr.position;

            // all positions after the previous position of the moved person must be reduced by 1 
            for (let i=0; i<oldSeries.seriesstartsresults.length; i++){
                let ssr2 = oldSeries.seriesstartsresults[i];
                if (ssr2.position > oldPosition){
                    ssr2.position--;
                    await ssr2.save();
                }
            }

            // all position in the new series must be increased by one after the inserted person.
            for (let i=0; i<newSeries.seriesstartsresults.length; i++){
                let ssr2 = newSeries.seriesstartsresults[i];
                if (ssr2.position>=data.toPosition && ssr2.xSeriesStart != data.xSeriesStart){ 
                    ssr2.position++;
                    await ssr2.save();
                }
            }

            ssr.position = data.toPosition;
            
            // if the series changes as well:
            if (oldSeries != newSeries){
                ssr.xSeries = newSeries.xSeries; 
                
                oldSeries.seriesstartsresults.splice(ssrIndex,1);
                newSeries.seriesstartsresults.push(ssr);
            }

            // save change
            await ssr.save();

            // notify rSite
            if (newSeries.xSite != null){
                this.eH.raise(`sites/${newSeries.xSite}@${this.meetingShortname}:seriesChanged`, {series:newSeries, startgroups:this.data.startgroups});
            }
            if (newSeries != oldSeries && oldSeries.xSite !== null){
                this.eH.raise(`sites/${oldSeries.xSite}@${this.meetingShortname}:seriesChanged`, {series:oldSeries, startgroups:this.data.startgroups});
            }

            // return broadcast
            let ret = {
                isAchange: true, 
                doObj: {funcName: 'changePosition', data: data},
                undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
                response: true, 
                preventBroadcastToCaller: true
            };

            return ret

        } else {
            throw {code: 21, message: this.ajv.errorsText(this.validateChangePosition.errors)}
        }
    }

    async addSSR(ssr){
        if (this.validateAddSSR(ssr)){

            // check that xSeries and xStartgroup are valid (can be found in the available data)
            let series = this.data.series.find(el=>el.xSeries == ssr.xSeries);
            if (!series){
                throw {code: 22, message: `Cannot find the series ${ssr.xSeries}.` };
            }
            if (!this.data.startgroups.find(el=>el.xStartgroup == ssr.xStartgroup)){
                throw {code: 23, message: `xStartgroup ${ssr.xStartgroup} is not available in this contest.` };
            }

            // if resultstech is not present in the data to create, it will not be part of the returned ned ssr-model. So simply add it here
            if (!('resultstech' in ssr)){
                ssr.resultstech = [];
            }

            // create SSR
            return this.models.seriesstartsresults.create(ssr, {include: [{model:this.models.resultstech, as: "resultstech"}]}).then(async (newSSR)=>{
                // move all positions that are >= the new position
                for (let i=0; i<series.seriesstartsresults.length; i++){
                    let currentSSR = series.seriesstartsresults[i];
                    if (currentSSR.position>=ssr.position){
                        currentSSR.position++;
                        await currentSSR.save();
                    }
                }
                // add to the list of seriesstartsresults
                series.seriesstartsresults.push(newSSR);

                // notify rSite
                if (series.xSite != null){
                    this.eH.raise(`sites/${series.xSite}@${this.meetingShortname}:seriesChanged`, {series, startgroups:this.data.startgroups});
                }
                
                // return broadcast
                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'addSSR', data: newSSR.dataValues},
                    undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
                    response: newSSR.xSeriesStart, 
                    preventBroadcastToCaller: true
                };
    
                return ret;

            }).catch(err=>{
                throw {code:24, message: `Error when creating new seriesstartsresults for series ${series.xSeries}: ${err}` };
            })

        } else {
            throw {code: 21, message: this.ajv.errorsText(this.validateAddSSR.errors)}
        }
    }

    async deleteSeries(data){
        return super.deleteSeries(data).then((ret)=>{
            
            // if needed, update the aux data for the merged series
            this.mergedFinalAuxData();
            
            return ret;
        })
    }

    async deleteAllSeries(data){
        // data is simply true

        // deletes all series
        // nothing to validate

        // check that the seriesstatus and conteststatus are correct!
        // This should also ensure that there are no results yet.
        // TODO

        // destroy all at once (looping over the array and do it one by one)
        
        // first delete all seriesstartsresults
        for (let i=0; i<this.data.series.length; i++){
            // first try to delete the seriesstarts results; this only works when there are no results yet/anymore!
            await this.models.seriesstartsresults.destroy({where:{xSeries:this.data.series[i].xSeries}}).catch(err=>{
                throw {message:`Could not delete the seriesstartsresults of series ${this.data.series[i].xSeries}: ${err}` ,code:22}
            })
            this.data.series[i].seriesstartsresults = [];

        }

        // keep a reference to the series for later events to rSite
        let seriesDeleted = this.data.series;

        // then delete all series
        return this.models.series.destroy({where:{xContest: this.contest.xContest}}).then(async ()=>{
            // sucessfully deleted everything in the DB; now also delete the auxData

            for (let key in this.data.auxData){
                delete this.data.auxData[key];
            }
            // store the change to DB
            await this._storeAuxDataUpdate(this.data.auxData).catch(err=>{
                // I decided not to raise an error if this does not work, since otherwise I would have to revert the mysql-DB changes as well, which i do not want. An error should actually anyway not occure.
                this.logger.log(5, `Critical error: Could not update the auxData. The previous auxData will remain in the DB and the mysql and mongoDBs are now out of sync! ${err}`);
            })

            // notify the site(s) that about the deleted series
            for (let s of seriesDeleted){
                if (s.xSite != null){
                    this.eH.raise(`sites/${s.xSite}@${this.meetingShortname}:seriesDeleted`, {xSeries: s.xSeries, xContest:s.xContest})
                }
            }

            // if needed, update the aux data for the merged series
            this.mergedFinalAuxData();

            let ret = {
                isAchange: true, 
                doObj: {funcName: 'deleteAllSeries', data: true},
                undoObj: {funcName: 'TODO', data: {}, ID: this.ID}, 
                response: true, 
                preventBroadcastToCaller: true
            };

            // delete the local data
            this.data.series = [];

            return ret
            
        }).catch(err=>{
            throw {message:`Could not delete all series: ${err}`, code:23};
        })

    }

    async addSeries(series){
        //
        if (this.validateAddSeries(series)){
            
            series.seriesstartsresults = [];

            // check that xContest is correct
            if (series.xContest != this.contest.xContest){
                throw {message:`xContest should be ${this.contest.xContest}, but was ${series.xContest}`, code:22}
            }

            // make sure the number is correct
            if (series.number != this.data.series.length+1){
                throw {message: `the series number should have been ${this.data.series.length+1} but was ${series.number}`, code:23};
            }

            let dataReturn, dataBroadcast;

            // since series may contain ssrs already which causes a nested create, we should use a transaction
            const s = await this.seq.transaction(async t=>{
                return await this.models.series.create(series, {transaction:t, include:[
                {model:this.models.seriesstartsresults, as: "seriesstartsresults", include: [{model:this.models.resultstech, as:"resultstech"}]}
                ]})
            }).catch(ex=>{throw {message: `Could not create series: ${ex}.`, code:24}})

            // broadcast the new series object
            dataBroadcast = s.get({plain:true}); // gets only the object, without the model stuff; otherwise the serialization of mongodb would crash!

            // notify the site, if given
            if (s.xSite != null){
                let addData = {
                    contest: this.contest.dataValues, 
                    series: s.dataValues,
                    startgroups: this.data.startgroups,
                };
                this.eH.raise(`sites/${s.xSite}@${this.meetingShortname}:seriesAdded`, addData);
            }

            // return the xSeries
            dataReturn = s.xSeries;

            // create the auxData for the series 
            // note: we do not need to send this to the clients, since the same default data is known to them as well.
            this.data.auxData[s.xSeries] = JSON.parse(JSON.stringify(this.defaultAuxData));
            // store the change to DB
            await this._storeAuxDataUpdate(this.data.auxData).catch(err=>{
                // I decided not to raise an error if this does not work, since otherwise I would have to revert the mysql-DB changes as well, which i do not want. An error should actually anyway not occure.
                this.logger.log(5, `Critical error: Could not update the auxData. The previous auxData will remain in the DB and the mysql and mongoDBs are now out of sync! ${err}`);
            })

            // add to the local data
            this.data.series.push(s);


            // if needed, update the aux data for the merged series
            this.mergedFinalAuxData();

            let ret = {
                isAchange: true, 
                doObj: {funcName: 'addSeries', data: dataBroadcast},
                undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
                response: dataReturn, 
                preventBroadcastToCaller: true
            };

            return ret

        } else {
            throw {code: 21, message: this.ajv.errorsText(this.validateAddSeries.errors)}
        }
    }

    async initialSeriesCreation(series){
        if (this.validateInitialSeriesCreation(series)){

            // check that xContest in every series is set correctly
            for (let i=0; i< series.length; i++){
                if (series[i].xContest != this.contest.xContest){
                    throw {message:`xContest should be ${this.contest.xContest}, but was ${series[i].xContest}`, code:22}
                }
            }

            // there must not have been any other series yet.
            if (this.data.series.length>0){
                throw{message:'Initial series creation is only possible when there are no series yet!', code:23}
            }

            // create datasets to be returned
            let dataBroadcast = [];
            let dataReturn = [];

            // eager-insert the data, series by series (since it seems like sequelize has no "multi-create" method)
            for (let i=0; i<series.length; i++){
                // IMPORTANT: there MUST be no sorting at all! The order of seriesstartsresults must stay the same to ensure the requesting client gets the correct order of the indices!

                // since series contain ssrs already which causes a nested create, we should use a transaction
                const s = await this.seq.transaction(async t=>{
                    return await this.models.series.create(series[i], {transaction:t, include:[
                    {model:this.models.seriesstartsresults, as: "seriesstartsresults", include: [{model:this.models.resultstech, as:"resultstech"}]}
                    ]})
                }).catch(ex=>{throw {message: `Could not create series and/or seriesstartsresults: ${ex}.`, code:24}});

                // add the series to the broadcast array 
                dataBroadcast.push(s.get({plain:true})); // gets only the object, without the model stuff; otherwise the serialization of mongodb would crash!

                // create the auxData for the series 
                // note: we do not need to send this to the clients, since the same default data is known to them as well.
                this.data.auxData[s.xSeries] = JSON.parse(JSON.stringify(this.defaultAuxData));

                // add only the indices to the return object; they must have the same order as in the input!
                dataReturn.push({
                    xSeries:s.xSeries,
                    seriesstartsresults: s.seriesstartsresults.map((el)=>el.xSeriesStart)
                });

                // add to the local data
                this.data.series.push(s);
            }

            // store the change to DB
            await this._storeAuxDataUpdate(this.data.auxData).catch(err=>{
                // I decided not to raise an error if this does not work, since otherwise I would have to revert the mysql-DB changes as well, which i do not want. An error should actually anyway not occure.
                this.logger.log(5, `Critical error: Could not update the auxData. The previous auxData will remain in the DB and the mysql and mongoDBs are now out of sync! ${err}`);
            })

            // notify the sites (if chosen) about the added series
            for (let s of this.data.series){
                if (s.xSite !=null){
                    let addData = {
                        contest: this.contest.dataValues, 
                        series: s.dataValues,
                        startgroups: this.data.startgroups,
                    }
                    this.eH.raise(`sites/${s.xSite}@${this.meetingShortname}:seriesAdded`, addData)
                }
            }

            // if needed, update the aux data for the merged series
            this.mergedFinalAuxData();

            // return the xSeries and xSeriesStart to the calling client; 
            // broadcast the full data to all other clients

            // TODO: the broadcast does not work! We cannot use dataBroadcast here, but we must make sure that it somehowe works without...
            console.log(JSON.stringify(dataBroadcast));
            let ret = {
                isAchange: dataBroadcast.length > 0, 
                doObj: {funcName: 'initialSeriesCreation', data: dataBroadcast},
                undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
                response: dataReturn, 
                preventBroadcastToCaller: true
            };

            return ret

        } else {
            throw {code: 21, message: this.ajv.errorsText(this.validateInitialSeriesCreation.errors)}
        }
    }

    // add/delete auxdata for the merged final, if it is now needed or not anymore needed
    mergedFinalAuxData(){
        if ('merged' in this.data.auxData && this.data.series.length<2){
            // delete auxData for merged series
            delete this.data.auxData['merged'];
            // store the change to DB
            this._storeAuxDataUpdate(this.data.auxData).catch(err=>{
                // I decided not to raise an error if this does not work, since otherwise I would have to revert the mysql-DB changes as well, which i do not want. An error should actually anyway not occure.
                this.logger.log(5, `Critical error: Could not update the auxData. The previous auxData will remain in the DB and the mysql and mongoDBs are now out of sync! ${err}`);
            })
        } else if (!('merged' in this.data.auxData) && this.data.series.length>1){
            // add auxData for merged series
            this.data.auxData['merged'] = JSON.parse(JSON.stringify(this.defaultAuxData));
            // store the change to DB
            this._storeAuxDataUpdate(this.data.auxData).catch(err=>{
                // I decided not to raise an error if this does not work, since otherwise I would have to revert the mysql-DB changes as well, which i do not want. An error should actually anyway not occure.
                this.logger.log(5, `Critical error: Could not update the auxData. The previous auxData will remain in the DB and the mysql and mongoDBs are now out of sync! ${err}`);
            })
        }
    }

    /**
     * update a contest's properties (but not the contest itself!)
     */
    async updateContest2(data){
        
        // data validation
        if (this.validateUpdateContest2(data)){
            // make sure that the main properties of the contest (xContest, xBaseDiscipline) are not changed!
            if (data.xContest != this.contest.xContest || data.xBaseDiscipline != this.contest.xBaseDiscipline){
                throw {message: "xContest and xBaseDiscipline are not allowed to be changed via the subroom!", code: 41};
            }

            // TODO: check that a status change is allowed:
            // - need at least one series to allow series defined
            // - must not have results to go back from the competition part to series definition

            // if needed, update the aux data for the merged series
            this.mergedFinalAuxData();

            /*const confBeforeRaw = this.data.contest.conf;
            let confBefore = JSON.parse(this.data.contest.conf);
            let confAfter = JSON.parse(data.conf);*/

            // if everything is fine, call the update function on the contests room
            return this.rContests.serverFuncWrite('updateContest', data).then(result=>{
                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateContest2', data: data}, 
                    undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
                    response: true, // no need for data to the calling client
                    preventBroadcastToCaller: true
                };
			// TODO: here we would have to notify rSites about changed rContest; see rContestTrack for reference
                return ret;

            }).catch(err=> {throw err})

        } else {
            throw {code: 42, message: this.ajv.errorsText(this.validateUpdateEventGroup.errors)}
        }

    }

    hasResults(ssr){
        return ssr.resultstech && ssr.resultstech.length>0;
    }

}

export default rContestTechLong;