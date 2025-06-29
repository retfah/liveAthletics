/** 
 * this shall be the parent class for all discipline specific rooms and provides disciplin independent functions.
 * 
 */ 
import roomServer from './roomServer.js';

import Sequelize  from 'sequelize';
const Op = Sequelize.Op;

class rContest extends roomServer{

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
     * @param {object} rCategories
     * @param {object} rInscriptions
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, contest, rContests, rStartsInGroup, rBaseDisciplines, rMeeting, rCategories, rInscriptions, rStarts, rEventGroups){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false, dynamicRoom)

        // a subroom must have the full room name, e.g. "hello/world@meeting". Otherwise clients cannot process broadcasted changes appropriately, since they always store the full name and not shortened room name as it might work for the server.

        //let roomName = `${contest.xContest}`;
        let roomName = `contests/${contest.xContest}@${meetingShortname}`

        super(eventHandler, mongoDb, logger, roomName, true, 1, false, dynamicRoom);
        
        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.contest = contest;
        this.rContests = rContests;
        this.rStartsInGroup = rStartsInGroup;
        this.rBaseDisciplines = rBaseDisciplines;
        this.rMeeting = rMeeting;
        this.rCategories = rCategories;
        this.rInscriptions = rInscriptions;
        this.rStarts = rStarts;
        this.rEventGroups = rEventGroups;

        /**
         * The data needed:
         * - all from series to seriesStartsResults with all results etc
         * - a list of all startsInGroup, so that we can now what athletes must/can be assigned to a series
         * - auxilary data with all athletes/relays (name etc) of the participants.
         * - (eventually the two latter are in one structure)
         * - etc
         */ 
        this.data = {
            startgroups:[],
            relatedGroups:[],
            auxData:{},
            series:[],
            contest:{},
            disciplines:[], // personalized data added in getPersonalizedData
            meeting: rMeeting.data, // date of the meeting to/from
            categories: rCategories.data, // category names
        }; 

        this.data.contest = contest.dataValues;

        let promiseSeries = this.getSeries().then(series=>this.data.series = series);

        // startsingroup: 
        // get this data directly as a DB-query and have events to listen to changes
        let promiseStartsInGroup = this.createStartgroups();

        // get all groups assigned to this contest; include also the information until the events
        //let promiseGroups = this.models.groups.findAll({attributes:['xRound', 'number', 'name'], where:{"xContest":{[Op.eq]:this.contest.xContest}}, include: [{model:this.models.rounds, as:'round', include: [{model:this.models.eventgroups, as:"eventgroup", include:[{model:this.models.events, as:"events"}]}]}]})
        let promiseGroups = this._getRelatedGroups().then(data=>{

            // store all related groups/rounds/eventGroups/events
            this.data.relatedGroups = data;

            /**  
             * we must update some aux data on the following changes in other rooms: 
             * - startsingroup added/deleted related to this contest
             * - groups associated to this contest are added/deleted
             **/
            // add athlete here when he was added to the startsingroup; Problem: how we can make sure a disconnected client realizes that his aux data with the startingroups is outdated, but without changing the main UUID (to make sure an offline client with writing rights will still think it is up to date to not delete his changes; but present the new data as soon as possible ?
                // Solution 1: split the information into two rooms: one just for reading this aux data, the other for the series. --> too complicated
                // SOLUTION 2: neglect the very rare problem that a client might have outdated aux data, since it only occurs when 1) a client is offline during 2) a seldom broadcast of an added/deleted athlete . The client shall be able to do a full reload of the aux data (TODO: implement such a button). (There is only one very unlikely problem: A client is generating the series, but is unfortunately offline while one start gets deleted (i.e. also the startInGroup), when the athlete later should be assigned a series the entry in seriesStartsResults cannot be made) But this is only a very rare case where the client unfortunately was offline during the broadcast.

            let listenerAddAth = async (xStartgroup)=>{
                // get the aux data for the added person, add it ot the local data and finally broadcast it
                let dataFlat = await this.createStartgroupSingle(xStartgroup).catch(err=>{this.logger.log(`Unexpected error in adding the startgroup ${xStartgroup}: ${err}`)});

                this.data.startgroups.push(dataFlat);

                // listen to events when the data of this person changes
                this.eH.eventSubscribe(`inscriptions@${this.meetingShortname}:inscriptionChanged${dataFlat.xInscription}`, ()=>{listenerUpdateAth(xStartgroup)}, this.name, true)

                // broadcast the change (without creating a new UUID!)
                // broadcast for room clients (not in a dataset)
                let broadcastData={
                    // the roomName is added in broadcast
                    arg: 'function',
                    opt: { // this is the doObj
                        ID: null, // null is kept on stringify, undefined wouldnt
                        funcName: 'addStartsInGroup', 
                        data:dataFlat,
                    }
                }
                this.broadcast(broadcastData); 

            }

            let listenerDeleteAth = (xStartgroup)=>{
                // find the athlete and delete it from the startgroups
                let index = this.data.startgroups.findIndex(el=>el.xStartgroup==xStartgroup);
                if (index>=0){

                    // unregister from the athlete change event
                    this.eH.eventUnsubscribe(`inscriptions@${this.meetingShortname}:inscriptionChanged${this.data.startgroups[index].xInscription}`, this.name)
                    
                    this.data.startgroups.splice(index, 1);

                    // broadcast the deletion
                    // broadcast for room clients (not in a dataset)
                    let broadcastData={
                        // the roomName is added in broadcast
                        arg: 'function',
                        opt: { // this is the doObj
                            ID: null, // null is kept on stringify, undefined wouldnt
                            funcName: 'deleteStartsInGroup', 
                            data:xStartgroup,
                        }
                    }
                    this.broadcast(broadcastData); 
                }
            }

            let listenerContestUnlink = (data)=>{
                // remove the given xRound / number (=group) from "relatedGroups" and remove all startgroups entries related to this group
                // (it was already ensured that there are no entries in seriesStartsResults of all involved athletes)
                let i = this.data.relatedGroups.findIndex(el=>el.number==data.number && el.xRound==data.xRound)
                if (i>=0){
                    // should always come here
                    this.data.relatedGroups.splice(i,1);
                }

                // remove startgroups and unregister the events
                for (let SG of this.data.startgroups.filter(el=> el.xRound != data.xRound || el.number != data.number)){
                    // unregister from the athlete change event
                    this.eH.eventUnsubscribe(`inscriptions@${this.meetingShortname}:inscriptionChanged${SG.xInscription}`, this.name);
                }
                this.data.startgroups = this.data.startgroups.filter(el=> el.xRound != data.xRound || el.number != data.number);

                // remove event listeners: 
                this.eH.eventUnsubscribe(`startsInGroup@${this.meetingShortname}:addedAthleteForRound/GrpNbr${data.xRound}/${data.number}`, this.name)
                this.eH.eventUnsubscribe(`startsInGroup@${this.meetingShortname}:deletedAthleteForRound/GrpNbr${data.xRound}/${data.number}`, this.name)

                // broadcast the unlink
                // broadcast for room clients (not in a dataset)
                let broadcastData={
                    // the roomName is added in broadcast
                    arg: 'function',
                    opt: { // this is the doObj
                        ID: null, // null is kept on stringify, undefined wouldnt
                        funcName: 'groupUnlinked', 
                        data:data,
                    }
                }
                this.broadcast(broadcastData); 
            }

            let listenerContestLink = (data)=>{
                // add the group to "relatedGroups" and add all startgroups entries related to this group

                // the new data to be broadcasted:
                let broadcastData = {
                    group: undefined,
                    startgroups: []
                };

                // get group etc object and add it to relatedGroups
                let promGroup = this.models.groups.findOne({attributes:['xRound', 'number', 'name'], where:{"xRound":data.xRound, number:data.number}, include: [{model:this.models.rounds, as:'round', include: [{model:this.models.eventgroups, as:"eventgroup", include:[{model:this.models.events, as:"events"}]}]}]}).then((group)=>{
                    this.data.relatedGroups.push(group);
                    broadcastData.group = group.dataValues;
                }).catch(err=>{throw err})

                // get athlete info and add it to startgroups
                let promSGs = this.models.startsingroup.findAll({
                    //where: {"xStartgroup":{[Op.in]:startsInGroups}}, // TODO: include
                    attributes: ['xStartgroup', ['number', 'groupNumber'], 'xRound', 'xStart', 'present'], // array instead of one value: the first is the actual attribute, the second is how it should be named in the output
                    include: [{model:this.models.groups, as:"group", // the association does not only check "xRound", but also "number" (thank to a special association-scope)
                    where:{"xRound": data.xRound, number: data.number}
                    }, {model:this.models.starts, as:"start", attributes:['notificationPerf','bestPerf', 'bestPerfLast', 'competitive', 'paid'], include:[{model:this.models.events, as:'event', attributes:['xEvent', 'xDiscipline', ['xCategory', 'eventXCategory'], 'info', 'xEventGroup'], include:[{model:this.models.eventgroups, as:'eventgroup', attributes:[['name', 'eventGroupName'], 'combined']}]}, {model:this.models.inscriptions, as:'inscription', attributes:[['number', 'bib'], 'xInscription', 'xCategory'], include:[{model:this.models.athletes, as:'athlete', attributes:['xAthlete', ['forename', 'athleteForename'], ['lastname', 'athleteName'], 'birthdate', 'sex'], include:[{model:this.models.clubs, as:'club', attributes:[['name', 'clubName'], ['sortvalue', 'clubSortvalue'], 'xClub']}, {model:this.models.regions, as:'region'}]}]}]}],
                    raw: true, // makes the data flat; but do the replacements still work?
                    //logging: console.log,
                    }).then(SIGs=>{

                        SIGs = this.flattenAttributes(SIGs);
                        
                        for (let i=0;i<SIGs.length; i++){
                            // manually convert bit (which are buffers) to boolean
                            this.bufferToBooleansStartsingroup(SIGs[i]);

                            // listen to events when the data of this person changes
                            this.eH.eventSubscribe(`inscriptions@${this.meetingShortname}:inscriptionChanged${SIGs[i].xInscription}`, ()=>{listenerUpdateAth(xStartgroup)}, this.name, true)
                        }

                        this.data.startgroups = this.data.startgroups.concat(SIGs);

                        broadcastData.startgroups = SIGs; 
                    }).catch(err=>{throw err});

                Promise.all([promGroup, promSGs]).then(()=>{
                    // broadcast all the new data
                    // broadcast for room clients (not in a dataset)
                    let bcD={
                        // the roomName is added in broadcast
                        arg: 'function',
                        opt: { // this is the doObj
                            ID: null, // null is kept on stringify, undefined wouldnt
                            funcName: 'groupLinked', 
                            data: broadcastData,
                        }
                    }
                    this.broadcast(bcD); 
                });

                // add listener for this group
                this.eH.eventSubscribe(`startsInGroup@${this.meetingShortname}:addedAthleteForRound/GrpNbr${data.xRound}/${data.number}`, listenerAddAth, this.name, true)
                this.eH.eventSubscribe(`startsInGroup@${this.meetingShortname}:deletedAthleteForRound/GrpNbr${data.xRound}/${data.number}`, listenerDeleteAth, this.name, true)
            }

            // for every group associated to this contest, we have to listen for added and deleted athletes
            for (let [index, group] of data.entries()){
                // events for adding/deleting single athletes and changing group-contest assignments
                this.eH.eventSubscribe(`startsInGroup@${this.meetingShortname}:addedAthleteForRound/GrpNbr${group.xRound}/${group.number}`, listenerAddAth, this.name, true)
                this.eH.eventSubscribe(`startsInGroup@${this.meetingShortname}:deletedAthleteForRound/GrpNbr${group.xRound}/${group.number}`, listenerDeleteAth, this.name, true)
            }
            this.eH.eventSubscribe(`eventGroups@${this.meetingShortname}:contestUnlink${contest.xContest}`, listenerContestUnlink, this.name, true)
            this.eH.eventSubscribe(`eventGroups@${this.meetingShortname}:contestLink${contest.xContest}`, listenerContestLink, this.name, true)
            
        })

        // resolve Promise for all mysql data loaded
        Promise.all([promiseSeries, promiseStartsInGroup, promiseGroups]).then(()=>{
            this.mysqlDataLoaded()
        })


        // we provide two promises to the inheriting class that will be set to true when the respective parts are ready
        this.mongoConnected;
        this.mysqlDataLoaded;
        this.pMongoLoaded = new Promise((res, rej)=>{
            this.mongoConnected = ()=>{res();}
        })
        this.pMysqlDataLoaded = new Promise((res, rej)=>{
            this.mysqlDataLoaded = ()=>{res();}
        })


        // create several event listeners and their functions
        let listenerUpdateAth = async (xStartgroup)=>{
            // get the aux data for the added person, add it ot the local data and finally broadcast it
            let dataFlat = await this.createStartgroupSingle(xStartgroup).catch(err=>{this.logger.log(15, `Unexpected error in adding the startgroup ${xStartgroup}: ${err}`)});

            let i = this.data.startgroups.findIndex(sg=>sg.xStartgroup==xStartgroup);

            if (i>=0) {
                this.data.startgroups[i] = dataFlat;

                // broadcast the change (without creating a new UUID!)
                // broadcast for room clients (not in a dataset)
                let broadcastData={
                    // the roomName is added in broadcast
                    arg: 'function',
                    opt: { // this is the doObj
                        ID: null, // null is kept on stringify, undefined wouldnt
                        funcName: 'addStartsInGroup', 
                        data:dataFlat,
                    }
                }
                this.broadcast(broadcastData); 
            }
        }

        Promise.all([this.pMongoLoaded, this.pMysqlDataLoaded]).then(()=>{

            // create listeners for every change of an athlete to recreate its startingroup
            for (let SG of this.data.startgroups){
                this.eH.eventSubscribe(`inscriptions@${this.meetingShortname}:inscriptionChanged${SG.xInscription}`, ()=>{listenerUpdateAth(SG.xStartgroup)}, this.name, true)
            }
        })

        // make sure that the startgroups are recreated on global changes; additionally, updating the startgroups can be requested by a writing client 
        const recreateStartgroups = async ()=>{
            await this.createStartgroups();
            // broadcast the changed data
            let broadcastData={
                // the roomName is added in broadcast
                arg: 'function',
                opt: { // this is the doObj
                    ID: null, // null is kept on stringify, undefined wouldnt
                    funcName: 'renewStartgroups', 
                    data:this.data.startgroups,
                }
            }
            this.broadcast(broadcastData); 
        };
        this.eH.eventSubscribe(`general@${this.meetingShortname}:renewStartgroups`, recreateStartgroups, this.name, true)

        // functions used in all rooms
        this.functionsWrite.addInscription = this.addInscription.bind(this); // NOTE: the function will NOT change the ID, since the changed data is handled differently
        this.functionsWrite.addStart = this.addStart.bind(this); // NOTE: the function will NOT change the ID, since the changed data is handled differently
        this.functionsWrite.allSeriesStatusChange = this.allSeriesStatusChange.bind(this);
        this.functionsWrite.updateSeries = this.updateSeries.bind(this);
        this.functionsWrite.updateAuxData = this.updateAuxData.bind(this);
        this.functionsWrite.moveSeries = this.moveSeries.bind(this);
        this.functionsWrite.deleteSSR = this.deleteSSR.bind(this);
        this.functionsWrite.deleteSeries = this.deleteSeries.bind(this); 
        this.functionsWrite.updatePresentState = this.updatePresentState.bind(this);
        this.functionsWrite.updateHeatStarttimes = this.updateHeatStarttimes.bind(this);
        this.functionsWrite.updateQualification = this.updateQualification.bind(this);

        const schemaUpdatePresentState = {
            type: "object",
            properties: {
                xStart: {type:"integer"},
                xStartgroup: {type:"integer"},
                newState: {type: "boolean"} // "present" state
            },
            required: ['xStart', 'xStartgroup', 'newState']
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
        
        const schemaUpdateQualification = {
            type: 'object',
            properties: {
                xSeries: {type: "integer"},
                xSeriesStart: {type: "integer"},
                qualification: {type: "integer"},
            },
            additionalProperties: false,
            required: ["xSeries", "xSeriesStart", "qualification"],
        }
        
        const schemaDeleteSeries = {type:"integer"};

        this.validateAllSeriesStatusChange = this.ajv.compile({type:'integer'});
        this.validateUpdatePresentState = this.ajv.compile(schemaUpdatePresentState);
        this.validateChangePosition = this.ajv.compile(schemaChangePosition);
        this.validateDeleteSSR = this.ajv.compile(schemaDeleteSSR);
        this.validateMoveSeries = this.ajv.compile(schemaMoveSeries);
        this.validateDeleteSeries = this.ajv.compile(schemaDeleteSeries);
        this.validateUpdateQualification = this.ajv.compile(schemaUpdateQualification);
        this.validateUpdateHeatStarttimes = this.ajv.compile({type:'integer'});

        // the following validations must be provided by the inheriting class:
        const missing = ()=>{throw {message: 'validation function missing in inheriting class', code: 20}}
        this.validateUpdateSeries = missing;
        this.validateAuxData = missing;


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

    async updateQualification(data){
        if (!this.validateUpdateQualification(data)){
            throw {code:21, message: this.ajv.errorsText(this.validateUpdateQualification.errors)}
        }

        // find the series
        const series = this.data.series.find(s => s.xSeries == data.xSeries);
        if (!series){
            throw {code:22, message:`Could not find series ${data.xSeries}.`};
        }

        // find the seriesStarStartResult
        const ssr = series.seriesstartsresults.find(ssr=>ssr.xSeriesStart==data.xSeriesStart);
        if (!ssr){
            throw {code:22, message:`seriesstartresult ${data.xSeriesStart} was not found in the respective series. series start result cannot be changed.`}
        }

        // the qualification status before
        const qualificationBefore = ssr.qualification;

        // update the qualification
        await ssr.update(data).catch(err=>{
            throw {code: 23, message: `Could not update the seriesstartresult: ${err}`}
        });

        // add / delete the startInGroup for the next round
        // adding/deleting the startsInGroup fails silently. (should actually never fail) It would have to be fixed manually on the client.
        const sg = this.data.startgroups.find(s=>s.xStartgroup==ssr.xStartgroup);
        if (sg){
            // find the next (x)round.
            const rG = this.data.relatedGroups.find(g=>g.xRound==sg.xRound);
            if (rG){
                // find the eventGroup and get the next round
                const eG = this.rEventGroups.data.find(eg=>eg.xEventGroup==rG.round.xEventGroup);
                if (eG){
                    const nextRound = eG.rounds.find(r=>r.order==rG.round.order+1);
                    if (nextRound){
                        if ([0,11].includes(qualificationBefore) && [0,11].includes(data.qualification)==false){
                            
                            // add the startInGroup
                            const d = {
                                xRound: nextRound.xRound,
                                number: 1, // always group 1 initially
                                xStart:sg.xStart,
                                present: true,
                            }
                            this.rStartsInGroup.serverFuncWrite('addStartsInGroup', d).catch(err=>{
                                this.logger.log(25, `Could not add startsInGroup ${JSON.stringify(d)}: ${JSON.stringify(err)}`)
                            })

                        } else if ([0,11].includes(qualificationBefore)==false && [0,11].includes(data.qualification)){
                            
                            // delete the startInGroup
                            // find the xStartgroup
                            const sig = this.rStartsInGroup.data.startsInGroups.find(sig => sig.xRound == nextRound.xRound && sig.xStart == sg.xStart);
                            if (sig){
                                this.rStartsInGroup.serverFuncWrite('deleteStartsInGroup', sig.xStartgroup).catch(err=>{
                                    this.logger.log(25, `Could not delete xStartgroup ${sig.xStartgroup}: ${JSON.stringify(err)}`)
                                })
                            }

                        }
                    }
                }
            }
        }


        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateQualification', data: data},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
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

    async addInscription(data){
        // the data must be as needed by the inscription room and is checked there

        // basically, all stuff is done in rInscription; therefore, it is not a change for this room
        await this.rInscriptions.serverFuncWrite('addInscription', data);

        return {
            isAchange: false,
            response: true,
        }
    }

    async addStart(data){
        // the data must be as needed by the starts room and is checked there

        // basically, all stuff is done in rStarts; therefore, it is not a change for this room
        await this.rStarts.serverFuncWrite('addStart', data);

        return {
            isAchange: false,
            response: true,
        }
    }

    async close(){
        // remove all event listeners:
        // startgroup listeners
        for (let SG of this.data.startgroups){
            // unregister from the athlete change event
            this.eH.eventUnsubscribe(`inscriptions@${this.meetingShortname}:inscriptionChanged${SG.xInscription}`, this.name);
        }

        // SIG listeners:
        // loop over all related rounds
        for (let rg of this.data.relatedGroups){
            this.eH.eventUnsubscribe(`startsInGroup@${this.meetingShortname}:addedAthleteForRound/GrpNbr${rg.xRound}/${rg.number}`, this.name)
            this.eH.eventUnsubscribe(`startsInGroup@${this.meetingShortname}:deletedAthleteForRound/GrpNbr${rg.xRound}/${rg.number}`, this.name)
        }

        // eventGroup listeners 
        this.eH.eventUnsubscribe(`eventGroups@${this.meetingShortname}:contestUnlink${this.contest.xContest}`, this.name)
        this.eH.eventUnsubscribe(`eventGroups@${this.meetingShortname}:contestLink${this.contest.xContest}`, this.name)

        // general listener:
        this.eH.eventUnsubscribe(`general@${this.meetingShortname}:renewStartgroups`, this.name)
    }

    // read all series from mysql and return the sequelize models as an array
    async getSeries(){
        throw 'Must be implemented by the inheriting class';
    }

    async onMongoConnected(){

        // resolve the prepared promise:
        this.mongoConnected()

    }

    /**
     * create all related groups/rounds/eventGroups/events
     * returns a promise with the result of sequelize 
     */
    async _getRelatedGroups(){
        return this.models.groups.findAll({attributes:['xRound', 'number', 'name'], where:{"xContest":{[Op.eq]:this.contest.xContest}}, include: [{model:this.models.rounds, as:'round', include: [{model:this.models.eventgroups, as:"eventgroup", include:[{model:this.models.events, as:"events"}]}]}]})
    }

    // StartsInGroup creation: 
    // --> startsingroup
    //      --> (ev.) groups
    //          --> (ev.) rounds
    //              --> (ev.) eventGroups
    //      --> starts 
    //          --> events
    //              --> (ev.) eventGroups
    //          
    //          --> inscription 
    //              --> athlete/relay
    //                  --> club
    //                  --> regions
    //        
    async createStartgroupSingle(xStartgroup){
        return this.models.startsingroup.findAll({
            where: {"xStartgroup":xStartgroup},
            attributes: ['xStartgroup', ['number', 'groupNumber'], 'xRound', 'xStart', 'present'], // array instead of one value: the first is the actual attribute, the second is how it should be named in the output
            include: [{model:this.models.groups, as:"group", // the association does not only check "xRound", but also "number" (thank to a special association-scope)
            where:{"xContest": {[Op.eq]:this.contest.xContest}}
            }, {model:this.models.starts, as:"start", attributes:['notificationPerf', 'bestPerf', 'bestPerfLast', 'competitive', 'paid'], include:[{model:this.models.events, as:'event', attributes:['xEvent', 'xDiscipline', ['xCategory', 'eventXCategory'], 'info', 'xEventGroup'], include:[{model:this.models.eventgroups, as:'eventgroup', attributes:[['name', 'eventGroupName'], 'combined']}]}, {model:this.models.inscriptions, as:'inscription', attributes:[['number', 'bib'], 'xInscription', 'xCategory'], include:[{model:this.models.athletes, as:'athlete', attributes:['xAthlete', ['forename', 'athleteForename'], ['lastname', 'athleteName'], 'birthdate', 'sex'], include:[{model:this.models.clubs, as:'club', attributes:[['name', 'clubName'], ['sortvalue', 'clubSortvalue'], 'xClub']}, {model:this.models.regions, as:'region'}]}]}]}],
            raw: true, 
            }).then((data)=>{
                // data is an array
                let dataFlat = this.flattenAttributes(data)[0];
                this.bufferToBooleansStartsingroup(dataFlat);
                return  dataFlat;
    
            })
    }

        // create the startgroups and write it to this.data.startgroups
    // this function should be called at startup, on request and when important general stuff change, e.g. all bib assignments or the base data.
    async createStartgroups(){
        return this.models.startsingroup.findAll({
            //where: {"xStartgroup":{[Op.in]:startsInGroups}}, // TODO: include
            attributes: ['xStartgroup', ['number', 'groupNumber'], 'xRound', 'xStart', 'present'], // array instead of one value: the first is the actual attribute, the second is how it should be named in the output
            include: [{model:this.models.groups, as:"group", // the association does not only check "xRound", but also "number" (thank to a special association-scope)
            where:{"xContest": {[Op.eq]:this.contest.xContest}}
            }, {model:this.models.starts, as:"start", attributes:['notificationPerf', 'bestPerf', 'bestPerfLast', 'competitive', 'paid'], include:[{model:this.models.events, as:'event', attributes:['xEvent', 'xDiscipline', ['xCategory', 'eventXCategory'], 'info', 'xEventGroup'], include:[{model:this.models.eventgroups, as:'eventgroup', attributes:[['name', 'eventGroupName'], 'combined']}]}, {model:this.models.inscriptions, as:'inscription', attributes:[['number', 'bib'], 'xInscription', 'xCategory'], include:[{model:this.models.athletes, as:'athlete', attributes:['xAthlete', ['forename', 'athleteForename'], ['lastname', 'athleteName'], 'birthdate', 'sex'], include:[{model:this.models.clubs, as:'club', attributes:[['name', 'clubName'], ['sortvalue', 'clubSortvalue'], 'xClub']}, {model:this.models.regions, as:'region'}]}]}]}],
            raw: true, // makes the data flat; but do the replacements still work?
            //logging: console.log,
            }).then(data=>{
                // we actually would need an object for each xStartgroup with xStartgroup as the attribute --> this shall be done on the client
                this.data.startgroups = this.flattenAttributes(data);
                
                for (let i=0;i<this.data.startgroups.length; i++){
                    // manually convert bit (which are buffers) to boolean
                    this.bufferToBooleansStartsingroup(this.data.startgroups[i]);
                }

            }).catch(err=>{
                console.log(`Error when creating the startsingroup for contest ${this.contest.xContest}: ${err}`);
            })
    }

    /**
     * Flatten all DB-attributes on the highest level of an array with objects. Useful e.g. for associated DB-objects, where columns of references tables result in attributes like "referencedTable.col1", which is changed here to "col1" (the rightmost part after a point) only. IMPORTANT: doews not work when the column name would contain a dot (.)!
     * @param {array} data The array of object to flatten its properties
     * @param {boolean} copy To copy the array and object first (no deep!) or not; default=false
     * @returns The array with the flattened objects
     */
    flattenAttributes(data, copy=false){
        let flattened = data
        if (copy){
            // copy array and each simnge object
            flattened = Array.from(data); 
            flattened.forEach(el=>{el = Object.assign({}, el);})
        }

        flattened.forEach(obj=>{    
            for (let key of Object.keys(obj)){
                let parts = key.split('.');
                if (parts.length==1){continue;}
                let newKey = parts[parts.length-1];
                obj[newKey] = obj[key];
                delete obj[key];
            }
        })

        return flattened;
    }

    bufferToBooleansStartsingroup(obj){
        // bit is returned as buffer --> if we have raw results, we need to translate it ourselves! (Sequelize would do it for us)
        
        obj.present = !!obj.present[0]; // get the first bit; double negation makes it a boolean
        obj.paid = !!obj.paid[0];
        obj.combined = !!obj.combined[0];
        obj.competitive = !!obj.competitive[0];
        return obj;
    }

    /**
     * n: the number of the series 
     **/
    getStarttime(n, interval){
        const d = new Date(this.data.contest.datetimeStart);
        // set a reasonable default value! Must change when the order of series changes
        let datetime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds() + interval*(n-1));
        return datetime;
    }

    // update all starttimes
    async updateHeatStarttimes(interval){
        if (!this.validateUpdateHeatStarttimes(interval)){
            throw {code:21, message: this.ajv.errorsText(this.validateUpdateHeatStarttimes.errors)}
        }

        // make sure that the series are sorted!
        // sort the series by number
        this.data.series.sort((a,b)=>a.number-b.number);

        // recreate all heat starttimes, starting from the starttime of the contest
        for (let h=1; h<= this.data.series.length; h++){
            let newTime = this.getStarttime(h, interval);
            const s = this.data.series[h-1];
            if (newTime != s.datetime){
                s.datetime = newTime;
                await s.save();

                // notify rSite, if selected
                if (s.xSite != null){
                    this.eH.raise(`sites/${s.xSite}@${this.meetingShortname}:seriesChanged`, {series: s, startgroups:this.data.startgroups});
                }
            }
        }

        // broadcast
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateHeatStarttimes', data: interval},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret;

    }

    async allSeriesStatusChange(status){
        if (!this.validateAllSeriesStatusChange(status)){
            throw {code:21, message: this.ajv.errorsText(this.validateAllSeriesStatusChange.errors)}
        }

        for (let series of this.data.series){
            if (series.status != status){
                series.status = status;
                await series.save().catch(err=>{
                    throw {code: 22, message: `Could not save the series ${series.xSeries} with its changed status: ${err}`}; 
                });
    
                // notify the site about the change
                if (series.xSite){
                    this.eH.raise(`sites/${series.xSite}@${this.meetingShortname}:seriesChanged`, {series, startgroups:this.data.startgroups});
                }
            }
        }

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'allSeriesStatusChange', data: status},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret;
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

    hasResults(ssr){
        throw 'hasResults must be implemented by the inheriting class!';
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
            if (this.hasResults(ssr)){
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
}

export default rContest