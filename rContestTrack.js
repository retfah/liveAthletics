// generic room for a track contests; bases on the techHigh-room; to be created/started by the room manager on the server or rContests

// TODO: also the relatedGroups array must be updated when the association between groups and the contest change.
// TODO: changes within events and eventGroups (e.g. changed names and infos) are not updated yet (only on server restart). This must be done either automatically (by events) or at least when the client requests it 

import rContest from './rContest.js';

import Sequelize  from 'sequelize';
const Op = Sequelize.Op;

/**
 * the room for a single track contest
 * The data stores an object: data ={series: [], contest: {the contest object; to be modified in the rContests room}}
 */
class rContestTrack extends rContest{

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
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, contest, rContests, rStartsInGroup, rBaseDisciplines, rMeeting, rCategories, rInscriptions, rStart){

        super(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, contest, rContests, rStartsInGroup, rBaseDisciplines, rMeeting, rCategories, rInscriptions, rStart)


        // contest specific
        // we are provided two promises that we wait for until we start preparing the aux data and set this.ready=true
        // NOTE: actually there is currently no aux data for the room. The aux data per series is stored in the DB.
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

        // ATTENTION: the same (!) default data (for each series!) must be present in the client room as well!
        // TODO: 
        this.defaultAuxData = {};



        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        // TODO: activate one function after the other, when needed
        this.functionsWrite.updateHeatStarttimes = this.updateHeatStarttimes.bind(this);
        this.functionsWrite.updateContest2 = this.updateContest2.bind(this);
        this.functionsWrite.updatePresentState = this.updatePresentState.bind(this);
        this.functionsWrite.initialSeriesCreation = this.initialSeriesCreation.bind(this);
        this.functionsWrite.deleteAllSeries = this.deleteAllSeries.bind(this);
        this.functionsWrite.deleteSSR = this.deleteSSR.bind(this);
        this.functionsWrite.addSSR = this.addSSR.bind(this);
        this.functionsWrite.updateSSR = this.updateSSR.bind(this);
        this.functionsWrite.changePosition = this.changePosition.bind(this);
        this.functionsWrite.swapPosition = this.swapPosition.bind(this);
        this.functionsWrite.moveSeries = this.moveSeries.bind(this);
        this.functionsWrite.addResult = this.addResult.bind(this);
        this.functionsWrite.updateResult = this.updateResult.bind(this);
        this.functionsWrite.deleteResult = this.deleteResult.bind(this);
        this.functionsWrite.updateSeries = this.updateSeries.bind(this);
        // this.functionsWrite.updateAuxData = this.updateAuxData.bind(this);
        this.functionsWrite.addSeries = this.addSeries.bind(this);
        this.functionsWrite.deleteSeries = this.deleteSeries.bind(this); 
        this.functionsWrite.addUpdateResults = this.addUpdateResults.bind(this); // this is only used through rSite currently!

        // define, compile and store the schemas:
        // TODO: remove, since it is probably not needed for track. We store this information in MariaDB now!
        /*const schemaAuxDataPerSeries = {
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
                currentHeight: {type:"integer"},
                currentJumpoffHeightInd: {type:"integer"},
                attempt: {type:"integer"},
                attemptNext: {type:"integer"},
            }, 
            required:["positionNext", "attemptPeriod", "periodStartTime", "showAttemptPeriod", "position"],
            additionalProperties: false,
        }

        // the aux data must be separate for each series. The aux data object shall store an object for each series, referenced by xSeries.
        const schemaAuxData ={
            type:"object",
            additionalProperties: schemaAuxDataPerSeries
        }*/

        // the aux data is actually sent and stored as JSON/text with the series in the SQL DB; however, to check it, we define the structure here.
        const schemaAuxSql = {
            type: ["object", "null"],
            properties:{
                wind: {type: ['number', 'null']}, // does not exist, when the wind is not (yet) defined
                starttime: {type: ['string', 'null'], format: 'date-time'}, // the latest starttime, i..e the one, which was finally run; ISO8601, UTC
                finishtime: {type: ['integer', 'null']}, // the duration in the usual unit of 1/100000
                isFalseStart: {type:'boolean'}, // the latest start was a false start or not; the same data will be stored in the starts-array
                starts: {
                    type:'array',
                    items:{
                        type:'object',
                        properties:{
                            starttime: {type: ['string', 'null'], format: 'date-time'}, // should be the same as the
                            isFalseStart: {type:"boolean"},
                            reactionTimes: {
                                type:'array',
                                items:{
                                    type:'object',
                                    properties:{
                                        lane: {type:'integer'},
                                        reactionTime: {type: 'integer'}, // in ms
                                        //card: {type:'integer'}, // define who got disqualified; eventually as string and/or add another property with the rule leading to the disqualification
                                    },
                                    required:['lane', 'reactionTime'], // in ms
                                    additionalProperties: false,
                                }
                            },
                            
                        },
                        required: ['starttime', 'isFalseStart'],
                        additionalProperties: false,
                    }
                },
                splittimes: {
                    type:'array',
                    items:{
                        type:'object',
                        properties:{
                            splittime: {type: 'integer'},
                            distance: {type: 'integer'}, 
                        },
                        required:['splittime'],
                        additionalProperties: false,
                    }
                }
            },
            required: [], // none required
            additionalProperties:false,
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
                //xSite: {type: ["integer", "null"]},
                status: {type: "integer"},
                conf: {type:"string"},
                name: {type:"string", maxLength:50},
            },
            required: ["xContest", "xBaseDiscipline", "datetimeAppeal", "datetimeCall", "datetimeStart"]
        };

        const schemaUpdatePresentState = {
            type: "object",
            properties: {
                xStart: {type:"integer"},
                xStartgroup: {type:"integer"},
                newState: {type: "boolean"} // "present" state
            },
            required: ['xStart', 'xStartgroup', 'newState']
        }

        const propsResultsTrack = {
            xResultTrack: {type:'integer'},
            time: {type: "integer", minimum:0},
            timeRounded: {type: "integer", minimum:0},
            rank: {type: 'integer', minimum:1},
            official: {type: 'boolean'},
            reactionTime: {type:['null', 'integer']}, // in ms
        }

        const schemaResultsTrack = {
            type:['object', 'null'], // null to allow that there is no result yet; mainly when included in 
            properties: propsResultsTrack,
            additionalProperties: false,
            required:['time', 'timeRounded', 'rank', 'official'], // note: if there will be an addResult function, xResultTrack will be needed!
        }

        const ssrProperties = {
            xSeriesStart: {type:"integer"},
            xStartgroup: {type:"integer"},
            xSeries: {type:"integer"}, // reference to the respective series; must be equivalent to what is givne in the parent object, if handled like this
            position: {type:"integer"},
            resultOverrule: {type:"integer"},
            resultRemark: {type:"string", maxLength:100},
            resultstrack: {
                type:["object", "null"], 
                default:null,
                properties:propsResultsTrack,
                // probably it makes no sense to define a requirement here
                additionalProperties: false,
            }, // this default is needed to make sure that resultstrack is added to the returned object; otherwise, the object will not have tis property, evne if it is included in the model-includes!
            qualification: {type:"integer"}, 
            startConf: {type:["string", "integer"]}, // actually the length is limited to 65536 bytes, which means the same or less characters! This cannot be checked yet with JSON schema. Allow integers as well; they will be casted to string
        };

        const schemaSeriesStartsResults = {
            type:"object",
            properties:ssrProperties,
            required: ["xSeries", "xStartgroup", "position"],
            additionalProperties: false, 
        }

        // do we still use this? Probably not
        const schemaSeriestrack = {
            type:["object", "null"], 
            properties:{
                xSeries:{type:"integer"},
                wind:{type: "integer"},
                film: {type: "integer"},
                manual: {type: "boolean"},
            },
            required: ["xSeries", "wind", "film", "manual"],
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
                seriestrack: schemaSeriestrack,
                datetime: {type: ["null", "string"], format:"date-time", default:null}, // format gets only evaluated when string,
                id: {type: ["null", "string"], format:"uuid"}, // intended to be UUID, but might be anything else as well
                seriesstartsresults: {
                    type:"array",
                    items: schemaSeriesStartsResults,// reference to the seriesStartsResults,
                },
                aux: schemaAuxSql,
            },
            required: ["xContest", "status", "number", "xSite", "name", "datetime", "id", "seriesstartsresults", "aux"],
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
                seriestrack: schemaSeriestrack,
                name: {type:"string", maxLength:50},
                datetime: {type: ["null", "string"], format:"date-time", default:null}, // format gets only evaluated when string,
                id: {type: ["null", "string"], format:"uuid"}, // intended to be UUID, but might be anything else as well
                aux: schemaAuxSql,
            },
            required: ["xContest", "xSeries", "status", "number"],
            additionalProperties: false,
        }

        // can be used to update (part of) the series as well!
        const schemaAddUpdateResults = {
            type:"object",
            properties: {
                xSeries: {type:"integer"}, 
                xContest: {type:"integer"}, // MUST be the xContest of this room! To be checked!
                xSite: {type: ["integer", "null"]},
                status: {type:"integer"},
                number: {type:"integer"},
                seriestrack: schemaSeriestrack,
                name: {type:"string", maxLength:50},
                datetime: {type: ["null", "string"], format:"date-time", default:null}, // format gets only evaluated when string,
                id: {type: ["null", "string"], format:"uuid"}, // intended to be UUID, but might be anything else as well
                seriesstartsresults: {
                    type:"array",
                    items: {
                        type:"object",
                        properties:ssrProperties,
                        required: ["xSeries", "xStartgroup", "xSeriesStart"],
                        additionalProperties: false, 
                    }
                },
                aux: schemaAuxSql,
            },
            required: ["xSeries"],
            additionalProperties: false, // very important: since we simply copy al data, we must amke sure that the restricted data are not chnaged.
        }

        // actually, what we test here for is not that important, but it was implemented as a reference
        const schemaInitialSeriesCreation = {
            // must be based on the series schema, but some properties shall not be included, e.g. results
            type:"array",
            items: schemaSeries/*{
                // limit some stuff, e.g. no heights property in series and no
                allOf:[
                    // must fulfill the general schema (with al possible props)
                    schemaSeries, 
                    // prevent series from having already defined heights
                    {
                        type:"object",
                        properties: {
                            heights:{
                                type:'array',
                                maxItems:0,
                            }
                        }
                    },
                ]
            }*/
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
                seriestrack: schemaSeriestrack,
                datetime: {type: ["null", "string"], format:"date-time", default:null}, // format gets only evaluated when string,
                id: {type: ["null", "string"], format:"uuid", default:null}, // intended to be UUID, but might be anything else as well
                aux: schemaAuxSql,
            },
            required: ["xContest", "status", "number"],
            additionalProperties: false,
        }

        const schemaDeleteSSR = {
            type: "object",
            properties: {
                xSeriesStart: {type:"integer"},
                fromXSeries:  {type:"integer"} 
            },
            required: ["xSeriesStart", "fromXSeries"],
            additionalProperties: false
        }

        const schemaChangePosition = {
            type:"object",
            properties:{
                xSeriesStart: {type:"integer"},
                fromXSeries: {type:"integer"}, // actually for simplicity only
                toXSeries: {type:"integer"},
                toPosition: {type:"integer"}
            },
            required:["xSeriesStart", "fromXSeries", "toXSeries", "toPosition"],
            additionalProperties: false,
        };

        const schemaSwapPosition = {
            type:"object",
            properties:{
                xSeriesStart1: {type:"integer"},
                xSeries1: {type:"integer"}, // for simplification
                xSeriesStart2: {type:"integer"},
                xSeries2: {type:"integer"}, // for simplification (when not lane+pos)
                lane: {type: "integer"},
                position: {type: "integer"},
            },
            oneOf:[{
                required:["xSeriesStart1", "xSeries1", "xSeriesStart2", "xSeries2"]
            },{
                required:["xSeriesStart1", "xSeries1", "xSeries2", "lane", "position"],
            }],
            additionalProperties: false,
        }

        const schemaMoveSeries = {
            type: "object",
            properties: {
                xSeries: {type:"integer"},
                toNumber: {type:"integer"}
            },
            required:['xSeries', 'toNumber'],
            additionalProperties: false
        }

        const schemaAddResult = {
            type: "object",
            properties: {
                xSeries: {type:"integer"},
                xSeriesStart: {type: "integer"},
                time: {type:"integer"}, // in 1/100000 s (allows up to 11.9 hours)
                // timeRounded will be calculated here
                rank: {type:"integer"},
                official: {type:"boolean"},
                reactionTime : {type:["integer", "null"]}, // in ms
            },
            required: ["xSeriesStart", "xSeries", "time", "rank", "official"], // 
            additionalProperties: false,
        };

        const schemaDeleteResult = {
            type:"object",
            properties: {
                xSeriesStart: {type:"integer"},
                xSeries: {type:"integer"}
            },
            required: ['xSeries', 'xSeriesStart'],
            additionalProperties: false,
        }

        const schemaDeleteSeries = {type:"integer"};

        const schemaUpdateResult = {
            type:'object',
            properties:{
                xSeries: {type:'integer'},
                result:{
                    type:'object',
                    properties: propsResultsTrack,
                    required: ['xResultTrack', 'time', 'timeRounded', 'rank', 'official', 'reactionTime'],
                }
            },
            required:['xSeries', 'result'],
            additionalProperties: false,
        }; 

        const schemaUpdateSSR = {
            type:'object',
            properties: {
                xSeriesStart: {type:"integer"}, // used to indentify the right entry
                xSeries: {type:"integer"}, // used to indentify the right entry
                resultOverrule: {type:"integer"},
                resultRemark: {type:"string", maxLength:100},
                qualification: {type:"integer"},
                // xStartgroup, position, startConf are not allowed to be changed!
            },
            required:['xSeriesStart', 'xSeries', 'resultOverrule', 'resultRemark', 'qualification'],
            additionalProperties: false,
        }

        const schemaAddSSR = schemaSeriesStartsResults;

        this.validateChangePosition = this.ajv.compile(schemaChangePosition);
        this.validateSwapPosition = this.ajv.compile(schemaSwapPosition);
        this.validateDeleteSSR = this.ajv.compile(schemaDeleteSSR);
        this.validateAddSSR = this.ajv.compile(schemaAddSSR);
        this.validateUpdateContest2 = this.ajv.compile(schemaUpdateContest2);
        this.validateUpdatePresentState = this.ajv.compile(schemaUpdatePresentState);
        this.validateInitialSeriesCreation = this.ajv.compile(schemaInitialSeriesCreation);
        this.validateMoveSeries = this.ajv.compile(schemaMoveSeries);
        this.validateUpdateSSR = this.ajv.compile(schemaUpdateSSR);
        this.validateAddResult = this.ajv.compile(schemaAddResult);
        this.validateUpdateResult = this.ajv.compile(schemaUpdateResult);
        this.validateDeleteResult = this.ajv.compile(schemaDeleteResult);
        this.validateUpdateSeries = this.ajv.compile(schemaUpdateSeries);
        //this.validateAuxData = this.ajv.compile(schemaAuxData);
        this.validateAddSeries = this.ajv.compile(schemaAddSeries);
        this.validateDeleteSeries = this.ajv.compile(schemaDeleteSeries);
        this.validateUpdateHeatStarttimes = this.ajv.compile({type:'integer'});
        this.validateAddUpdateResults = this.ajv.compile(schemaAddUpdateResults);
        this.validateAuxSql = this.ajv.compile(schemaAuxSql);
    }

    async getSeries(){
        // get all series
        // it shall have the following structure: 
        // series : all series objects
        // series[0].seriesstartsresults : all athletes in this series
        // series[0].seriesstartsresults[0].resultstrack : the track specific result and position
        // 
        return this.models.series.findAll({where:{xContest:this.contest.xContest}, include:[{model:this.models.seriesstartsresults, as: "seriesstartsresults", include: [{model:this.models.resultstrack, as:"resultstrack"}]}, {model:this.models.seriestrack, as:"seriestrack"}]})
    }


    // internal function to store changed auxData.
    // returns the mongoDB.collection.updateOne-promise
    async _storeAuxDataUpdate(data){
        // store the data to DB
        return this.collection.updateOne({type:'auxData'}, {$set:{auxData: data}})
        /*try {
            await this.collection.updateOne({type:'auxData'}, {$set:{auxData: data}})
        } catch (e){
            this.logger.log(20, `Could not update auxData in room ${this.name}: ${e}`)
            throw {code: 23, message: `Could not update auxData in MongoDB: ${e}`};
        }*/
    }

    async updateAuxData(data){
        if (!this.validateAuxData(data)){
            throw {code:21, message: this.ajv.errorsText(this.validateAuxData.errors)}
        }

        // store the data to DB
        await this._storeAuxDataUpdate(data).catch(err=>{
            throw {code: 23, message: `Could not update auxData in MongoDB: ${JSON.stringify(err)}`}
        });
        /*try {
            this.collection.updateOne({type:'auxData'}, {$set:{auxData: data}})
        } catch (e){
            this.logger.log(20, `Could not update auxData in room ${this.name}: ${e}`)
            throw {code: 23, message: `Could not update auxData in MongoDB: ${e}`};
        }*/

        // replace the data locally
        this.data.auxData = data;

        // broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateAuxData', data: data},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true,
        };

        return ret;

    }

    async updateSeries(data){
        if (!this.validateUpdateSeries(data)){
            throw {code:21, message: this.ajv.errorsText(this.validateUpdateSeries.errors)}
        }

        // find the series
        let series = this.data.series.find(s => s.xSeries == data.xSeries);
        if (!series){
            throw {code:22, message:`Could not find series ${data.xSeries}.`};
        }

        let oldSite = series.xSite;

        // make sure the xContest is not changed!
        if (data.xContest != this.contest.xContest){
            throw {message:`xContest should be ${this.contest.xContest}, but was ${series[i].xContest}`, code:24}
        }

        await series.update(data).catch(err=>{throw {code: 23, message: `Could not update the series: ${err}`}; });

        // notify site about changes
        if (oldSite != series.xSite){
            if (oldSite != null){
                this.eH.raise(`sites/${oldSite}@${this.meetingShortname}:seriesDeleted`, {xSeries: series.xSeries, xContest:series.xContest});
            }
            if (series.xSite != null){
                let addData = {
                    contest: this.contest.dataValues, 
                    series: series.dataValues,
                    startgroups: this.data.startgroups,
                };
                this.eH.raise(`sites/${series.xSite}@${this.meetingShortname}:seriesAdded`, addData);
            }
        } else if (series.xSite != null){
            this.eH.raise(`sites/${series.xSite}@${this.meetingShortname}:seriesChanged`, {series, startgroups:this.data.startgroups});
        }

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateSeries', data: data},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret;

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

        let ssr = s.seriesstartsresults.find(ssr=>ssr.xSeriesStart == data.xSeriesStart);
        if (!ssr){
            throw {code:23, message: `Could not find the xSeriesStart with xSeriesStart=${data.xSeriesStart}.`}
        }

        /*let rankDeleted = ssr.resultstrack.rank;

        // try to delete the result
        // the following does not work; so we need to do it manually in two steps
        /*await ssr.setResultstrack(null).catch(err=>{
            throw {code: 25, message: `Could not delete the result (xSeriesStart=${data.xSeriesStart}, xSeries=${data.xSeries}): ${err}`}
        })
        await ssr.resultstrack.destroy().catch(err=>{
            throw {code: 25, message: `Could not delete the result (xSeriesStart=${data.xSeriesStart}, xSeries=${data.xSeries}): ${err}`}
        })
        // remove locally
        ssr.set('resultstrack', null); // would it be possible to delete the result in one request instead of detroying the model and deleting the reference manually? setResultstrack(null) does not work at all. 

        // decrease the rank of all other SSRs in the same heat
        for (let ssr2 of s.seriesstartsresults){
            if (ssr2.resultstrack !== null){
                if (ssr2.resultstrack.rank > rankDeleted){
                    ssr2.resultstrack.rank--;
                    await ssr2.resultstrack.save().catch(err=>{
                        throw {code: 26, message: `Could not update the rank of xSeriesStart=${data.xSeriesStart}, xSeries=${data.xSeries}). This error should not be possible. The data might be inconsistent now. ${err}`}
                    })
                }
            }
        }*/
        await this.deleteResultSub(ssr, s);

        // notify the site
        if (s.xSite != null){
            this.eH.raise(`sites/${s.xSite}@${this.meetingShortname}:resultDeleted`, {xContest: this.contest.xContest, xSeries: data.xSeries, xSeriesStart:data.xSeriesStart})
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

    // sub function to delete a result (since this part is used in updateSSR as well as in deleteResult)
    // ssr of the result to delete
    // s is the series, where the ssr is part of (not checked here if this is true!)
    async deleteResultSub(ssr, s){
        let rankDeleted = ssr.resultstrack.rank;

        // try to delete the result
        // the following does not work; so we need to do it manually in two steps
        /*await ssr.setResultstrack(null).catch(err=>{
            throw {code: 25, message: `Could not delete the result (xSeriesStart=${data.xSeriesStart}, xSeries=${data.xSeries}): ${err}`}
        })*/
        await ssr.resultstrack.destroy().catch(err=>{
            throw {code: 25, message: `Could not delete the result (xSeriesStart=${ssr.xSeriesStart}, xSeries=${ssr.xSeries}): ${err}`}
        })
        // remove locally
        ssr.set('resultstrack', null); // would it be possible to delete the result in one request instead of detroying the model and deleting the reference manually? setResultstrack(null) does not work at all. 

        // decrease the rank of all other SSRs in the same heat
        for (let ssr2 of s.seriesstartsresults){
            if (ssr2.resultstrack !== null){
                if (ssr2.resultstrack.rank > rankDeleted){
                    ssr2.resultstrack.rank--;
                    await ssr2.resultstrack.save().catch(err=>{
                        throw {code: 26, message: `Could not update the rank of xSeriesStart=${ssr.xSeriesStart}, xSeries=${ssr.xSeries}). This error should not be possible. The data might be inconsistent now. ${err}`}
                    })
                }
            }
        }
    }

    async addResult(data){
        if (!this.validateAddResult(data)){
            throw {code: 21, message:this.ajv.errorsText(this.validateAddResult.errors)};
        }

        // check that the result does not exist yet
        // not needed, since adding the result would fail because the key (xResultTrack=xSeriesStart) would be already used.

        // try to get the respective ssr
        let series = this.data.series.find(s=>s.xSeries==data.xSeries);
        if (!series){
            throw {code:22, message: `Could not find the series with xSeries=${data.xSeries}.`}
        }

        let ssr = series.seriesstartsresults.find(ssr=>ssr.xSeriesStart == data.xSeriesStart);
        if (!ssr){
            throw {code:23, message: `Could not find the xSeriesStart with xSeriesStart=${data.result.xResult}.`}
        }

        // NOTE: currently we do not check whether the given rank is reasonable. This is up to the client. This is eventually also "needed" to allow data from the timing be inserted out of the order.
        let resultData = {
            xResultTrack: data.xSeriesStart,
            time: data.time,
            timeRounded: Math.ceil(data.time/100)*100, // 1/1000s, as allowed to consider for the ranking/progress to next round
            rank: data.rank,
            official: data.official,
            reactionTime: data.reactionTime ?? null, // if reactionTime is null, it will still take the second argeument, but it does not matter here
        }

        // add the result
        let newRes = await this.models.resultstrack.create(resultData).catch(err=>{throw {code: 24, message: `new resulttrack could not be created (most likely because the result already exists): ${err}`}});
        
        // add the result to the ssr
        // Do not simply set resultstrack=result, since the JSON.stringify funciton would still send the old data, despite the changed data
        ssr.set('resultstrack', newRes);

        // change the rank of all other ssrs with a rank
        let currentResults = series.seriesstartsresults.filter(ssr2=>ssr2.resultstrack!==null && ssr2.xSeriesStart != data.xSeriesStart);
        for (let ssr2 of currentResults){
            if (ssr2.resultstrack.rank>=data.rank){
                ssr2.resultstrack.rank++;
                await ssr2.resultstrack.save().catch(err=>{throw{code: 25, message: `Could not store the changed rank of xSeriesStart ${ssr2.xSeriesStart} due to ${err}`}});
            }
        }

        // notify the site
        if (series.xSite != null){
            this.eH.raise(`sites/${series.xSite}@${this.meetingShortname}:resultChanged`, {xContest: this.contest.xContest, xSeries: data.xSeries, xSeriesStart:data.xSeriesStart, result: resultData})
        }

        let res = {
            xSeries: data.xSeries, 
            result: newRes.get({plain:true})
        }

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'addResult', data: res},
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

        let ssr = s.seriesstartsresults.find(ssr=>ssr.xSeriesStart == data.result.xResultTrack);
        if (!ssr){
            throw {code:23, message: `Could not find the xSeriesStart with xSeriesStart=${data.result.xResultTrack}.`}
        }

        if (ssr.resultstrack===null){
            throw {code:24, message: `There is no result yet for xSeriesStart=${data.result.xResultTrack}. Thus, update of data is not possible.`}
        }

        let rankBefore = ssr.resultstrack.rank;

        // update the result
        await ssr.resultstrack.update(data.result).catch(err=>{throw {code: 25, message: `track result could not be updated: ${err}`}})

        // if the rank is changed, update the necessary other ranks
        // what cases are possible and are they handled well?:
        // - regular time changes, where obviously the rank might change as well
        // - equal times, different rank to same (better) rank
        // - equal times, equal rank to worse rank.
        // if the better ranked result of two results with equal time is ranked down, then the other MUST be rnaked better. Otherwise we could end up having 1st, and twice third. However, the opposite way around is not true. 
        let currentResults = s.seriesstartsresults.filter(ssr2=>ssr2.resultstrack!==null && ssr2.xSeriesStart != data.result.xResultTrack);
        for (let ssr2 of currentResults){
            if (ssr2.resultstrack.rank <= rankBefore && ssr2.resultstrack.rank >= data.result.rank){
                // the rank of the changed result was lowered
                // if the rounded times are equal, we assume that having equal ranks is expected and no change is needed; otherwise, increase the rank
                // NOTE: currently we do no checks if the rank is realistic based on the times.
                if (ssr.resultstrack.timeRounded != ssr2.resultstrack.timeRounded || ssr2.resultstrack.rank != data.result.rank){ // NOTE: the last condition is needed in cases where >2 persons have the same time and the person of rank 3 is moved to 1 (together with the person that is already on 1; then, rank 2 must be increased to 3) 
                    ssr2.resultstrack.rank++;
                    await ssr2.resultstrack.save().catch(err=>{throw{code: 25, message: `Could not store the changed rank of xSeriesStart ${ssr2.xSeriesStart} due to ${err}`}});
                }
            } else if (ssr2.resultstrack.rank > rankBefore && ssr2.resultstrack.rank <= data.result.rank){
                // the rank of the changed result was increased
                ssr2.resultstrack.rank--;
                await ssr2.resultstrack.save().catch(err=>{throw{code: 25, message: `Could not store the changed rank of xSeriesStart ${ssr2.xSeriesStart} due to ${err}`}});
            }
        }

        // notify the site
        if (s.xSite != null){
            this.eH.raise(`sites/${s.xSite}@${this.meetingShortname}:resultChanged`, {xContest: this.contest.xContest, xSeries: data.xSeries, xSeriesStart:data.result.xResultTrack, result: ssr.resultstrack.get({plain:true})})
        }

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateResult', data: data},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret;

    }

    // update "all" possible data of a heat in one function (excluding xSeries, xContest, xSite and number; those must stay the same; and changing id could be stupid in many cases!)
    // the heat must exist, but the results can be add or update; however, they will NOT get deleted, except if the resultOverrule is changed to something >0
    // this is mainly used by rTiming through rSite
    async addUpdateResults(data){

        if (!this.validateAddUpdateResults(data)){
            throw {code:21, message: this.ajv.errorsText(this.validateAddUpdateResults.errors)}
        }
        // additionally check the aux data, if not null
        /*if (data.aux && data.aux!==null && data.aux!==''){
            if (!this.validateAuxSql(JSON.parse(data.aux))){
                throw {code:38, message: this.ajv.errorsText(this.validateAuxSql.errors)}
            }
        }*/ // is now (2023-10) included in ajv, since it can be transmitted as object

        // find the series
        let series = this.data.series.find(s => s.xSeries == data.xSeries);
        if (!series){
            throw {code:22, message:`Could not find series ${data.xSeries}.`};
        }

        // some properties are NOT allowed to be changed through this function
        if ('xContest' in data && data.xContest != series.xContest){
            throw {code: 31, message: `rContestTrack.addUpdateResults: xContest is not allowed to change (${data.xContest}!=${series.xContest})`}
        }
        if ('xSite' in data && data.xSite != series.xSite){
            throw {code: 32, message: `rContestTrack.addUpdateResults: xSite is not allowed to change (${data.xSite}!=${series.xSite})`}
        }
        if ('number' in data && data.number != series.number){
            throw {code: 33, message: `rContestTrack.addUpdateResults: number is not allowed to change (${data.number}!=${series.number})`}
        }

        // check that all seriesstartsresults are part of this room and some more things
        for (let ssrData of data.seriesstartsresults){
            let ssr = series.seriesstartsresults.find(s=>s.xSeriesStart == ssrData.xSeriesStart && s.xStartgroup==ssrData.xStartgroup && s.xSeries==ssrData.xSeries);
            if (!ssr){
                throw {code: 34, message: `rContestTrack.addUpdateResults: the seriesstartsresult with xSeriesStart=${ssrData.xSeriesStart} and xStartgroup=${ssrData.xStartgroup} does not exist.`}
            }
            // position and startConf are not allowed to change here
            if ('position' in ssrData && ssr.position != ssrData.position){
                throw {code: 35, message: `rContestTrack.addUpdateResults: position is not allowed to change (${ssrData.position}!=${ssr.position})`}
            }
            if ('startConf' in ssrData && ssr.startConf != ssrData.startConf){
                throw {code: 36, message: `rContestTrack.addUpdateResults: startConf is not allowed to change (${ssrData.startConf}!=${ssr.startConf})`}
            }

            // if there is a resultstrack, make sure that xResultTrack references the right xSeriesStart
            if (ssrData.resultstrack !==null && ssrData.resultstrack.xResultTrack != ssrData.xSeriesStart){
                throw {code: 37, message: `rContestTrack.addUpdateResults: resultstrack.xResultTrack is different from the xSeriesStart (${ssrData.resultstrack.xResultTrack}!=${ssrData.xSeriesStart})`}
            }
        }

        // create an object and copy all properties except the seriesstartsresults into it, to make sure they do not get updated in this first call.
        let dataCopy = {};
        Object.assign(dataCopy, data);
        delete dataCopy.seriesstartsresults;

        await series.update(dataCopy).catch(err=>{throw {code: 23, message: `Could not update the series: ${err}`}; });

        // update all seriesstartsresults
        for (let ssrData of data.seriesstartsresults){
            // since we checked it above, the ssr will exist
            let ssr = series.seriesstartsresults.find(s=>s.xSeriesStart == ssrData.xSeriesStart && s.xStartgroup==ssrData.xStartgroup);

            // create a copy of the ssr data and remove the resultstrack
            let ssrCopy = {};
            Object.assign(ssrCopy, ssrData);
            delete ssrCopy.resultstrack;
            await ssr.update(ssrCopy).catch(err=>{
                throw {code: 24, message: `Could not update ssr ${ssr.xSeriesStart}: ${err}`};
            })
            
            if (ssr.resultstrack != null){
                if (ssrData.resultOverrule>0){
                    // if resultOverrule>0: delete an existing result (if it exists)
                    await ssr.resultstrack.destroy().catch(err=>{
                        throw {code: 25, message: `Could not delete the result (xSeriesStart=${data.xSeriesStart}, xSeries=${data.xSeries}): ${err}`}
                    })
                    // remove locally
                    ssr.set('resultstrack', null); 

                } else {
                    // update the result
                    await ssr.resultstrack.update(ssrData.resultstrack).catch(err=>{
                        throw {code:25, message: `Could not update resultstrack of ssr ${ssr.xSeriesStart}: ${err}`};
                    })
                }
            } else if ('resultstrack' in ssrData && ssrData.resultstrack != null){
                // create result
                let newRes = await this.models.resultstrack.create(ssrData.resultstrack).catch(err=>{throw {code: 26, message: `new resulttrack could not be created (most likely because the result already exists): ${err}`}});
        
                // add the result to the ssr
                // Do not simply set resultstrack=result, since the JSON.stringify funciton would still send the old data, despite the changed data
                ssr.set('resultstrack', newRes);
            }

        }

        // notify site about changes
        if (series.xSite != null){
            this.eH.raise(`sites/${series.xSite}@${this.meetingShortname}:seriesChanged`, {series, startgroups:this.data.startgroups});
        }

        // use the regular updateSeries funciton to update the result; send the whole series
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateSeries', data: series.get({plain:true})},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret;

    }

    // the position is NOT alowed to be changed! Only do this through changePosition
    async updateSSR(data){
        
        // ONLY update changes in the SSR; changes in a result shall be handled separately; nevertheless, the client might send also the results array.

        if (!this.validateUpdateSSR(data)){
            throw {code:21, message: this.ajv.errorsText(this.validateUpdateSSR.errors)};
        }
        
        // find the corresponding series
        let series = this.data.series.find(s=>s.xSeries == data.xSeries);
        if (!series){
            throw {code:22, message:`xSeries ${data.xSeries} was not found in the respective contest. series start result cannot be changed.`}
        }

        // find the seriesStarStartResult
        let ssr = series.seriesstartsresults.find(ssr=>ssr.xSeriesStart==data.xSeriesStart);
        if (!ssr){
            throw {code:22, message:`seriesstartresult ${data.xSeriesStart} was not found in the respective series. series start result cannot be changed.`}
        }

        // if the participationState is changed from 0 to something else and if a result exists, delete the result and change the rank of all other persons that had a higher rank by one.
        if (data.resultOverrule>0 && ssr.resultOverrule==0 && ssr.resultstrack !==null){
            await this.deleteResultSub(ssr, series);
        }

        // make sure that position and startConf are not changed!
        // since position and startConf cannot be part of the change-data, there is no need to make sure that this is not changed

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

    // change the order of series
    async moveSeries(data){
        if (!this.validateMoveSeries(data)){
            throw {code: 21, message: this.ajv.errorsText(this.validateMoveSeries.errors)};
        }

        let changedSeries = this.data.series.find(s=>s.xSeries==data.xSeries);
        if (!changedSeries){
            let msg = "Series could not be moved, since the series was not found.";
            this.logger.log(15, msg)
            throw {code: 22, message:msg};
        }
        let oldIndex = changedSeries.number-1;
        let newIndex = data.toNumber-1;

        // all positions after the previous position of the moved series must be reduced by 1
        this.data.series.forEach(s =>{
            if (s.number > oldIndex){
                s.number--;
            }
        })

        // all positions in the new series must be increased by one after the inserted person.
        this.data.series.forEach(s=>{
            if (s.number>=newIndex+1){ // newIndex is zero-based, the number is one-based
                s.number++;
            }
        })

        // now change the actual series
        changedSeries.number = newIndex+1;

        // now sort the series
        this.data.series.sort((a,b)=>{return a.number - b.number});

        // store all changes
        let proms = [];
        for (let i=0;i<this.data.series.length; i++){
            proms.push(this.data.series[i].save());
        }

        await Promise.all(proms);

        // notify all rSite about the changes in the series
        for (let si = Math.min(oldIndex, newIndex); si<=Math.max(oldIndex, newIndex); si++){
            const s = this.data.series[si];
            if (s.xSite != null){
                this.eH.raise(`sites/${s.xSite}@${this.meetingShortname}:seriesChanged`, {series: s, startgroups:this.data.startgroups});
            }
        }

        // return broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'moveSeries', data: data},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret

    }

    // needed for contests that are started in lanes, where we always swap two athletes
    // TODO / Note: we currently allow that the person(s) moved already have results.
    async swapPosition(data){
        if (!this.validateSwapPosition(data)){
            throw {code: 21, message: this.ajv.errorsText(this.validateSwapPosition.errors)}
        }

        // TODO: eventually make sure that the change is only done when the contest and series state are accordingly

        const series1 = this.data.series.find(s=>s.xSeries == data.xSeries1);
        const series2 = this.data.series.find(s=>s.xSeries == data.xSeries2);
        if (!series1 || !series2){
            throw {code: 22, message: `Cannot find series1 (${data.xSeries1}) or series2 (${data.xSeries2}).`};
        }

        // first, find the affected SSR 1
        const SSR1 = series1.seriesstartsresults.find(ssr=>ssr.xSeriesStart == data.xSeriesStart1);
        if (!SSR1){
            throw {code: 23, message: `Cannot find ssr1 (${data.xSeriesStart1}).`};
        }

        // first, find the affected SSR 2 (if any)
        let SSR2;
        if ('xSeriesStart2' in data){
            SSR2 = series2.seriesstartsresults.find(ssr=>ssr.xSeriesStart == data.xSeriesStart2);
            if (!SSR2){
                throw {code: 24, message: `Cannot find ssr2 (${data.xSeriesStart2}).`};
            }
        }

        // TODO: eventually make sure that there are no results yet

        if ("xSeriesStart2" in data){
            // swap two persons; otherwise, one person is changed to an empty lane/pos
            let startConf1 = SSR1.startConf;
            let position1 = SSR1.position;
            let xSeries1 = SSR1.xSeries;
            let startConf2 = SSR2.startConf;
            let position2 = SSR2.position;
            let xSeries2 = SSR2.xSeries;

            SSR1.startConf = startConf2;
            SSR1.position = position2;
            SSR1.xSeries = xSeries2;
            await SSR1.save();
            SSR2.startConf = startConf1;
            SSR2.position = position1;
            SSR2.xSeries = xSeries1;
            await SSR2.save();

            if (data.xSeries2 != data.xSeries1){
                // also the series has changed
                let i1 = series1.seriesstartsresults.findIndex(ssr=>ssr.xSeriesStart == data.xSeriesStart1);
                series1.seriesstartsresults.splice(i1,1);
                series2.seriesstartsresults.push(SSR1);

                let i2 = series2.seriesstartsresults.findIndex(ssr=>ssr.xSeriesStart == data.xSeriesStart2);
                series2.seriesstartsresults.splice(i2,1);
                series1.seriesstartsresults.push(SSR2);
            }

            // not need to change positions of aother athltes

        } else {

            // ATTENTION: if the swap with an empty lane is within the same heat, we have to decrease the position by one if the moved athlete was before the targeted position
            let targetPosition = data.position;
            if (series1 == series2 && SSR1.position<data.position){
                targetPosition--;
            } 

            // just change the positions of all the others
            for (let ssr of series1.seriesstartsresults){
                if (ssr.position>SSR1.position){
                    ssr.position--;
                    await ssr.save();
                }
            }
            // already increase the positions if of the other athletes if the person was moved within the same series
            if (series1==series2){
                for (let ssr of series1.seriesstartsresults){
                    if (ssr.position >= targetPosition){
                        ssr.position++;
                        await ssr.save();
                    }
                } 
            }

            // just change that one person plus the positions of all other 
            SSR1.startConf = data.lane.toString();
            SSR1.position = targetPosition;
            SSR1.xSeries = series2.xSeries;
            await SSR1.save();

            if (data.xSeries2 != data.xSeries1){
                // also the series has changed

                // first increase the position of all athletes after the changed person +1
                for (let ssr of series2.seriesstartsresults){
                    if (ssr.position >= SSR1.position){
                        ssr.position++;
                        await ssr.save();
                    }
                }

                let i = series1.seriesstartsresults.findIndex(ssr=>ssr.xSeriesStart == data.xSeriesStart1);
                series1.seriesstartsresults.splice(i,1);
                series2.seriesstartsresults.push(SSR1);
            }
        }

        // notify the sites about the changes
        if (series1.xSite != null){
            this.eH.raise(`sites/${series1.xSite}@${this.meetingShortname}:seriesChanged`, {series: series1, startgroups:this.data.startgroups});
        }
        if (data.xSeries2 != data.xSeries1 && series2.xSite != null){
            this.eH.raise(`sites/${series2.xSite}@${this.meetingShortname}:seriesChanged`, {series: series2, startgroups:this.data.startgroups});
        }

        // return broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'swapPosition', data: data},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret

    }

    // Note that this funciton shall not be used when not run in lanes. 
    async changePosition(data){
        if (this.validateChangePosition(data)){

            // change position is only to be used when not started in lanes!
            const conf = JSON.parse(this.data.contest.conf)
            if (conf.startInLanes){
                throw {code: 27, message:'Cannot use "change position" when started in lanes! Use swap position instead.'};
            }

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
            if (ssr.resultstrack !== null){
                throw {code: 24, message: `Cannot change the position of an athlete with results.`};
            }

            let oldPosition = ssr.position;

            // all positions after the previous position of the moved person must be reduced by 1 
            for (let i=0; i<oldSeries.seriesstartsresults.length; i++){
                let ssr2 = oldSeries.seriesstartsresults[i];
                if (ssr2.position > oldPosition){
                    ssr2.position--;
                    ssr2.startConf = ssr2.position.toString();
                    await ssr2.save();
                }
            }

            // all position in the new series must be increased by one after the inserted person.
            for (let i=0; i<newSeries.seriesstartsresults.length; i++){
                let ssr2 = newSeries.seriesstartsresults[i];
                if (ssr2.position>=data.toPosition && ssr2.xSeriesStart != data.xSeriesStart){ 
                    ssr2.position++;
                    ssr2.startConf = ssr2.position.toString();
                    await ssr2.save();
                }
            }

            ssr.position = data.toPosition;
            ssr.startConf = ssr.position.toString();
            
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

            // we need to differentiate whether the contest is run in lanes or not; if run in lanes, we do not only change position, but also the lane (i..e startConf)
            const conf = JSON.parse(this.data.contest.conf)

            // the athlete is inserted before the athlete with the (currently) same position. (Its position will be increased by one)

            // check that xSeries and xStartgroup are valid (can be found in the available data)
            let series = this.data.series.find(el=>el.xSeries == ssr.xSeries);
            if (!series){
                throw {code: 22, message: `Cannot find the series ${ssr.xSeries}.` };
            }
            if (!this.data.startgroups.find(el=>el.xStartgroup == ssr.xStartgroup)){
                throw {code: 23, message: `xStartgroup ${ssr.xStartgroup} is not available in this contest.` };
            }

            // check that the position is realistic: all other SSRs with lower position must have a lower or equal lane; all SSRs with higher or equal position must have a high or equal lane.
            if (ssr.position>series.seriesstartsresults.length+1){
                throw {code: 25, message: `Position and lane are not compatible with the present seriesstartsresults.`};
            }
            for (let ssr2 of series.seriesstartsresults){
                if ((ssr2.position<ssr.position && parseInt(ssr2.startConf)>parseInt(ssr.startConf)) || (ssr2.position>=ssr.position && parseInt(ssr2.startConf)<parseInt(ssr.startConf))){
                    throw {code: 25, message: `Position and lane are not compatible with the present seriesstartsresults.`};
                }
            }

            // create SSR
            return this.models.seriesstartsresults.create(ssr, {include: [{model:this.models.resultstrack, as:"resultstrack"}]}).then(async (newSSR)=>{
                // move all positions that are >= the new position
                for (let i=0; i<series.seriesstartsresults.length; i++){
                    let currentSSR = series.seriesstartsresults[i];
                    if (currentSSR.position>=ssr.position){
                        currentSSR.position++;
                        if (!conf.startInLanes){
                            currentSSR.startConf = currentSSR.position.toString();
                        }
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

    // delete a single entry in seriesstartsresults
    async deleteSSR(data){
        if (this.validateDeleteSSR(data)){
            // get the series
            let series = this.data.series.find(s=>s.xSeries == data.fromXSeries);
            if (!series){
                throw {code: 22, message: `Could not find the series ${data.fromXSeries}`};
            }
            let ssrIndex = series.seriesstartsresults.findIndex(s=>s.xSeriesStart==data.xSeriesStart);
            let ssr = series.seriesstartsresults[ssrIndex];
            if (!ssr){
                throw {code: 23, message: `Could not find the seriesstartresult ${data.xSeriesStart}`};
            }
            let deletedPosition = ssr.position;

            await ssr.destroy().catch(err=>{
                throw {code: 24, message: `SSR could not be deleted, probably because the athlete already has results: ${err}`};
            }); // delete from DB
            series.seriesstartsresults.splice(ssrIndex, 1); // delete from local data

            // change the position of the seriesstartsresults after the deleted position
            for (let i=0; i<series.seriesstartsresults.length; i++){
                let ssr2 = series.seriesstartsresults[i];
                if (ssr2.position>deletedPosition){
                    ssr2.position--;
                    await ssr2.save();
                }
            }

            // notify rSite
            if (series.xSite != null){
                this.eH.raise(`sites/${series.xSite}@${this.meetingShortname}:seriesChanged`, {series, startgroups:this.data.startgroups});
            }

            // broadcast the change
            let ret = {
                isAchange: true, 
                doObj: {funcName: 'deleteSSR', data: data},
                undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
                response: true, 
                preventBroadcastToCaller: true
            };

            return ret

        } else {
            throw {code: 21, message: this.ajv.errorsText(this.validateDeleteSSR.errors)}
        }
    }

    /**
     * create all related groups/rounds/eventGroups/events
     * returns a promise with the result of sequelize 
     */
    async _getRelatedGroups(){
        return this.models.groups.findAll({attributes:['xRound', 'number', 'name'], where:{"xContest":{[Op.eq]:this.contest.xContest}}, include: [{model:this.models.rounds, as:'round', include: [{model:this.models.eventgroups, as:"eventgroup", include:[{model:this.models.events, as:"events"}]}]}]})
    }

    async deleteAllSeries(data){
        // data is simply true

        // deletes all series
        // nothing to validate

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

            // TODO: check whether we really use auxData here in the same way as with techHigh
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

    async deleteSeries(xSeries){
        if (!this.validateDeleteSeries(xSeries)){
            throw {code: 21, message: this.ajv.errorsText(this.validateDeleteSeries.errors)}
        }

        // first find the respective number
        const iSeries = this.data.series.findIndex(s=>s.xSeries == xSeries);
        const series = this.data.series[iSeries];
        const delNumber = series.number;

        // check that there are no results yet
        let hasResults = false;
        series.seriesstartsresults.forEach(ssr=>{
            if (ssr.resultstrack){
                hasResults = true;
            }
        }) 
        if (hasResults){
            throw {code: 22, message: `The series ${xSeries} has already results and can not be deleted.`}
        }

        // first, try to delete the seriesstartsresults. (This should not fail since we tested before that there are no results yet.)
        for (let ssr of series.seriesstartsresults){
            await ssr.destroy().catch(err=>{
                throw {code: 23, message: `Could not delete the seriesstartresult (xSeriesStart=${ssr.xSeriesStart}). ${err}`};
            });
        }

        // second try to delete the series (since this has a small potential to fail)
        await series.destroy().catch(err=>{
            throw {code: 24, message: `Could not delete the series (xSeries=${xSeries}). ${err}`};
        });
        this.data.series.splice(iSeries,1);

        // then update all other series, which should never fail
        const seriesToMove = this.data.series.filter(s=>s.number>delNumber);
        for (let s of seriesToMove){
            s.number--;
            await s.save().catch(err=>{
                throw {code: 25, message: `Could not save the changed series (xSeries=${s.xSeries}). This should never happen. ${err}`};
            });
            if (s.rSite != null){
                this.eH.raise(`sites/${s.xSite}@${this.meetingShortname}:seriesChanged`, {s, startgroups:this.data.startgroups});
            }
        };
        if (series.xSite != null){
            this.eH.raise(`sites/${series.xSite}@${this.meetingShortname}:seriesDeleted`, {xSeries: series.xSeries, xContest:series.xContest});
        }

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'deleteSeries', data: xSeries},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret

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
            await this.models.series.create(series, {include:[
                {model:this.models.seriesstartsresults, as: "seriesstartsresults", include: [{model:this.models.resultstrack, as:"resultstrack"}]}, {model:this.models.seriestrack, as:"seriestrack"}
                ]}).then(async (s)=>{

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

            }).catch(ex=>{throw {message: `Could not create series: ${ex}.`, code:24}})

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

            // check that the positions are correct
            for (let s of series){
                for (let i=1; i<=s.seriesstartsresults.length; i++){
                    if (!s.seriesstartsresults.find(ssr=>ssr.position==i)){
                        throw {message:'Every position must occur exactly once.', code:25}
                    }
                }
            }

            // eager-insert the data, series by series (since it seems like sequelize has no "multi-create" method)
            for (let i=0; i<series.length; i++){
                // IMPORTANT: there MUST be no sorting at all! The order of seriesstartsresults must stay the same to ensure the requesting client gets the correct order of the indices!

                await this.models.series.create(series[i], {include:[
                    {model:this.models.seriesstartsresults, as: "seriesstartsresults", include: [{model:this.models.resultstrack, as:"resultstrack"}]}, {model:this.models.seriestrack, as:"seriestrack"}
                    ]}).then((s)=>{

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

                    // eventually raise an event

                }).catch(ex=>{throw {message: `Could not create series and/or seriesstartsresults: ${ex}.`, code:24}})
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

    async updatePresentState(data){
        if (this.validateUpdatePresentState(data)){

            // security check: check first that the affected row is indeed from this room
            let SG = this.data.startgroups.find(el=> (el.xStartgroup==data.xStartgroup && el.xStart==data.xStart))
            if (!SG){
                throw {code: 42, message: 'xStartgroup and/or xStart not valid in this contest!'}
            }

            // if everything is fine, call the update function on the contests room
            return this.rStartsInGroup.serverFuncWrite('updateStartsInGroup', {xStartgroup: data.xStartgroup, present: data.newState}).then(result=>{
                // status changed in startsingroup and, thus, in DB; update the status in the local data as well
                SG.present = data.newState;

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updatePresentState', data: {xStartgroup: data.xStartgroup, present: data.newState}}, 
                    undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
                    response: true, // no need for data to the calling client
                    preventBroadcastToCaller: true
                };

                return ret;

            }).catch(err=> {throw err})

        } else {
            throw {code: 41, message: this.ajv.errorsText(this.validateUpdatePresentState.errors)}
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

            const confBeforeRaw = this.data.contest.conf;
            let confBefore = JSON.parse(this.data.contest.conf);
            let confAfter;
            if ('conf' in data) { // conf is not necessarily in data!
                confAfter = JSON.parse(data.conf);
            }

            // if everything is fine, call the update function on the contests room
            return this.rContests.serverFuncWrite('updateContest', data).then(async result=>{
                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateContest2', data: data}, 
                    undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
                    response: true, // no need for data to the calling client
                    preventBroadcastToCaller: true
                };

                // notify all involved sites about the changes in the contest
                let xSites = [];

                // if conf.startInLanes was changed to false, change all startConf in all series.seriesstartsresutls to position.toString()
                if (confAfter !== undefined && confBeforeRaw != data.conf && 'startInLanes' in confBefore && 'startInLanes' in confAfter && confBefore.startInLanes == true && confAfter.startInLanes == false){
                    for (let s of this.data.series){
                        // change occured
                        let change = false;
                        for (let ssr of s.seriesstartsresults){
                            if (ssr.position.toString() != ssr.startConf){
                                change = true;
                                ssr.startConf = ssr.position.toString()
                                await ssr.save();
                            }
                        }
                        if (change && s.xSite !== null){
                            // notify rSite
                            this.eH.raise(`sites/${s.xSite}@${this.meetingShortname}:seriesChanged`, {series: s, startgroups:this.data.startgroups});
                        }
                    }
                }

                for (let s of this.data.series){
                    if (s.xSite && xSites.indexOf(s.xSite)==-1){
                        xSites.push(s.xSite);
                    }
                }
                for (let xSite of xSites){
                    this.eH.raise(`sites/${xSite}@${this.meetingShortname}:contestChanged`, this.data.contest);
                }

                return ret;

            }).catch(err=> {throw err})

        } else {
            throw {code: 42, message: this.ajv.errorsText(this.validateUpdateContest2.errors)}
        }

    }

    /**
     * return a personalized data object, providing the precreated merged list of disciplines (merged with baseDisciplines and the translated stuff) and add also the current time on the server (to know the offset of the clients clock)
     */
    getPersonalizedData(client){

        // we cannot add the dynamic auxilary data to the data directly, but we need to create a new object with the same properties and then add the data there
        let data = {};
        for (let o in this.data){
            data[o] = this.data[o];
        }

        data.disciplines = this.rBaseDisciplines.getTranslatedDisciplines(client.session.lang);

        data.serverTime = new Date();

        return data;
    }

    async prepareAuxData(){

        // try to get the meeting document:
        /*let cursor = this.collection.find({type:'auxData'});
        let len = await cursor.count();*/ // deprecated 2022-05
        let len = await this.collection.countDocuments({type:'auxData'});
        if (len==0){

            // create a default document (default data for each series)
            let aux = {};
            this.data.series.forEach(s=>{
                aux[s.xSeries] = this.defaultAuxData;
            })

            await this.collection.updateOne({type:'auxData'},{$set:{auxData: aux}},{upsert:true}) //update with upsert=insert when not exists
            this.data.auxData = aux

        } else if (len>1){
            this.logger.log(10, `Cannot initialize mongoData in ${this.name} since there is more than one mongo document.`)
            return;
        } else {
            let cursor = this.collection.find({type:'auxData'});
            let raw = await cursor.next();
            this.data.auxData = raw.auxData;
        }

        // now the room is ready:
        this.ready = true;
    }

    async onMongoConnected(){

        // resolve the prepared promise:
        this.mongoConnected()

    }

}

export default rContestTrack;