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
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, dynamicRoom, contest, rContests, rStartsInGroup, rBaseDisciplines, rMeeting, rCategories, rInscriptions, rStarts){

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


        this.validateAllSeriesStatusChange = this.ajv.compile({type:'integer'});

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
}

export default rContest