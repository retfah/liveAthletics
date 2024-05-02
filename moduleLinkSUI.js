import https from 'https';
import fs from 'fs';
import zlib from 'zlib';
import {pipeline} from 'stream/promises';
import {parseStringPromise} from 'xml2js';
import conf from './conf.js';
import Sequelize  from 'sequelize';
import { streamToStringLatin1 } from './common.js';
const Op = Sequelize.Op;
const QueryTypes = Sequelize.QueryTypes;
import {Worker, isMainThread, parentPort, workerData} from  'node:worker_threads';

/*import {promisify}  from 'util';
const readFileAsync = promisify( fs.readFile);*/
import {readFile} from 'node:fs/promises';
import {writeFile} from 'node:fs/promises';

import initModels from "./modelsBaseSUI/init-models.js"; // es6 with define syntax (based on modified sequelize-auto functions, run as es5 but creating es6-import with define)
import nationalBodyLink from "./nationalBodyLink.js";

// link to alabus
export default class moduleLinkSUI extends nationalBodyLink {

    static conf = {

        pathEmptyDb: './emptyDbBaseSui.sql',

        host: 'alabus.swiss-athletics.ch', // live server
        //host: 'alabustest.swiss-athletics.ch', // test server
        port: 443,
        pathBaseData: '/rest/License/Athletica/ExportStammDataFull',
        pathCompetitionList: "/rest/Event/Athletica/ExportMeetingList",
        pathCompetitionData: "/rest/Event/Athletica/MeetingData",
        pathResultsUpload: "/rest/Event/Athletica/ImportResultData",
        //method: 'GET', // not necessary when https.get is used
        /*headers: {
            authorization: "Basic " + Buffer.from("TODOusername:password").toString('base64'),// base64(username:pw)}
            connection: 'close'
        },*/
        debug: true, // stores the baseData locally as a file (DOES NOT WORK YET)
        fileNameBaseData: "StammdatenNode.gz", // only used when debug=true

        // define a list matching the alabus discipline numbers and the local dicipline numbers; including indoor/outdoor
        // alabus does not differentiate indoor outdoor; thus, we need two lists
        disciplineTranslationTableOutdoor: {
            // liveAthletics:Alabus
            // see Excel "Kategorien Disziplinen SVM" to copy data from
            207:310,
            206:320,

        },
        disciplineTranslationTableIndoor: {
            // liveAthletics:Alabus
            // see Excel "Kategorien Disziplinen SVM" to copy data from
            
            1:30,
            2:50,
            3:70,
            4:80,
            5:90,
            6:100,
            7:110,
            8:140,
            9:252,
            10:253,
            11:254,
            12:255,
            13:256,
            209:310,
            208:320,
            16:257,
            14:275,
            14:276,

        },
        disciplineTranslationTable: {
            // a merge of above tables, since the association from liveathletics to alabus is unique
            // will be created below
        },
        disciplineTranslationTableOutdoorInv: {
            // the backtranslation table is created below
        },
        disciplineTranslationTableIndoorInv: {
            // the backtranslation table is created below
        }

        // the categories are given as code (e.g. MAN_, U20M, ...) --> translate it automatically, by stripping the _ from MAN_ and WOM_ and keep all the rest the same.
    };

    // to initialize this class we should use this static creator function, since the preparation of the sequelize-DB-connection is async
    static async create(logger, mongoClient, mysqlPool){

        // first check if the base DB exists; if not, create it
        // check if there is an adminDB; automatically create it if it is not available.
        const mysqlbaseConn = await mysqlPool.getConnection().catch(error=>{console.log(error)});

        let dbCreated = false; 
        await mysqlbaseConn.query(`show databases where "basesui"`).then(async (rows)=>{
            if (rows.length==0){
                // create the base admin db
                let res = await mysqlbaseConn.query(`create database if not exists basesui DEFAULT CHARACTER SET 'utf8' DEFAULT COLLATE 'utf8_general_ci'`).catch(async (error)=>{ throw `basesui-database could not be created: ${error}`});
                
                dbCreated = true;

                // the rest is done below
            }
        })

        // so far, the base connection was not for a specific DB. Now, select the DB:
        await mysqlbaseConn.query(`USE basesui`)

        // insert tables etc.
        if (dbCreated){
            // load the DB-code through sequelize
            try {
                // copy the standard DB into the new DB 
                // the sql code to create the tables must be in a separate file. This code is then run on the DB. We cannot use mysqldump here, as e.g. there is no import option yet for it.
                
                // formerly readFileAsync
                let emptyDbCode = await readFile(this.conf.pathEmptyDb, 'utf8').catch(err=>{
                    logger.log(5, `Reading empty basesui code failed: ${err}`);
                    throw err;
                }) // if the encoding is ommitted, a buffer is returned which CANNOT be read by sequelize

                await mysqlbaseConn.query(emptyDbCode);
            }catch(err){
                await mysqlbaseConn.query(`drop database if exists basesui`)
                throw(`Could not create the basesui-database: ${err}`);
            }
        }
        

        // ------------------
        // Start the connection to the DB with sequelize
        // ------------------

        // try to connect to DB, load some data and write some others
        const sequelizeBase = new Sequelize('basesui', conf.database.username, conf.database.password, {
            dialect: 'mariadb', // mariadb, mysql
            dialectOptions: {
                timezone: 'local',
                connectTimeout: 10000, //ms
                acquireTimeout: 30000, //ms
                // multipleStatements: true, //would be needed if the admin-table creation was done through sequelize; however, it is dangerous as it allows SQL-injections!
            },
            host: conf.database.host,
            port: conf.database.port,
            //operatorsAliases: false, // does not exist anymore
            // application wide model options: 
            define: {
                timestamps: false // we generally do not want timestamps in the database in every record, or do we?
            }
            })


        // test the connection:
        await sequelizeBase
        .authenticate()
        .then(() => {
            logger.log(85,'DB-Base connection has been established successfully.');
        })
        .catch(err => {
            logger.log(1,'Unable to connect to the base database:', err);
            logger.log(1, '--> cannot start the server');
            throw new Error('Unable to connect to DB and thus unable to start the server.');
        });

        // now we can create the actual instance
        return new this(sequelizeBase, logger, mongoClient)
        
    }
    
    /**
     * 
     * @param {object} seq Sequelize instance
     */
    constructor(seq, logger, mongoClient){
        super('SUI', mongoClient);

        this.sequelize = seq;
        this.models = initModels(seq);
        this.logger = logger;

        // make the static conf available in this for non-static methods
        this.conf = this.constructor.conf;

        // create the inverse disciplineTranslationTable
        for (const [o,v] of Object.entries(this.conf.disciplineTranslationTableOutdoor)){
            this.conf.disciplineTranslationTableOutdoorInv[v]=parseInt(o);
        }
        for (const [o,v] of Object.entries(this.conf.disciplineTranslationTableIndoor)){
            this.conf.disciplineTranslationTableIndoorInv[v]=parseInt(o);
        }

        // create a merged table, since the translation from liveathletics to alabus is unique, but not the otrher way around.
        this.conf.disciplineTranslationTable = JSON.parse(JSON.stringify(this.conf.disciplineTranslationTableIndoor)); // create a copy, before assigning the other properties
        Object.assign(this.conf.disciplineTranslationTable, this.conf.disciplineTranslationTableOutdoor);


    }

    /**
     * This function is the general entry point for requests. All requests shall (later) be processed through this function. This allows maximum flexibility for (base-)modules. 
     * It is NOT possible to call the functions directly from rMeeting for security reasons, since it would allow to call ALL module functions, which might be much more than should be allowed.
     * THe inheriting class shall override this function
     * @param {string} functionName The name of the function to call
     * @param {*} data The data for this function
     * @param {object} meeting The meeting room.
     * @return {object} o.response
     * @return {object} o.isAchange (defaults to false)
     * or throw an error with code >=30
     */
    async baseFunction(functionName, data, meeting){

        if (functionName=='uploadResults'){
            return this.uploadResults(meeting, data);
        } else if (functionName=='baseLastUpdate'){
            return {isAchange: false, response:{lastUpdate:this.lastBaseUpdateDate}};
        } else if (functionName=='baseUpdate') {
            let response = {err:0};
            // note: meeting is needed to raise an event.
            response.notes = await this.updateBaseData(data, meeting).catch((errObj)=>{
                if (errObj.code==1){
                    // connection error
                    response.err = 2;
    
                } else if (errObj.code==2) {
                    // error during processing of the server's answer
                    throw {code:23, message:`There was an error on the server while processing the update: ${JSON.stringify(errObj)}`}
    
                } else if(errObj.code==4){
                    // login credentials wrong
                    response.err=3;
                } else {
                    throw {code:24, message:`There was an error on the server while processing the update: ${JSON.stringify(errObj)}`}
                }
            });

            return {response, isAchange:false};

        } else if (functionName=='getCompetitions'){
            const response = {
                err:0, 
            };
    
            response.competitions = await this.getCompetitions(data).catch((errObj)=>{
                if (errObj.code==1){
                    // connection error
                    response.err = 2;
    
                } else if (errObj.code==2) {
                    // error during processing of the server's answer
                    throw {code:23, message:`There was an error on the server while processing the received list of meetings: ${JSON.stringify(errObj)}`}
    
                } else if (errObj.code==3) {
                    // no meetings
                    response.err = 1;
                } else if(errObj.code==4){
                    // login credentials wrong
                    response.err=3;
                }

            });

            return {response, isAchange:false}

        } else if (functionName=='importCompetition') {
            
            const response = {
                err:0, 
                notes:'',
            };
    
            // reference to the rooms of this meeting
            const roomRef = meeting.rMeetings.activeMeetings[meeting.meeting.shortname].rooms;
    
            const importResult = await this.importCompetition(roomRef, data).catch((errObj)=>{
                if (errObj?.code==1){
                    // connection error
                    response.err = 2;
    
                } else if (errObj?.code==2) {
                    // error during processing of the server's answer
                    throw {code:23, message:`There was an error on the server while processing the competition: ${JSON.stringify(errObj)}`}
    
                } else if (errObj?.code==3) {
                    // meeting does not exist
                    response.err = 1;
                } else if(errObj?.code==4){
                    // login credentials wrong
                    response.err=3;
                } else {
                    throw {code:25, message:`Error occured during processing: ${JSON.stringify(errObj)}`};
                }
            });
    
            if (response.err==0){
                // store the information about the import
                meeting.data.baseSettings['SUI'] = importResult.baseSettings;
    
                // store this data to DB
                try {
                    await meeting.collection.updateOne({type:'meeting'}, {$set:{meeting: meeting.data}})
                } catch (e){
                    this.logger.log(20, `Could not update meeting in MongoDB: ${e}`)
                    throw {code: 24, message: `Could not update meeting in MongoDB: ${e}`};
                }
    
                response.notes = importResult.statsForClient.notes;
                response.failCount = importResult.statsForClient.failCount;
                response.newCount = importResult.statsForClient.newCount;
                response.updateCount = importResult.statsForClient.updateCount;
                
            }
    
            // return
            let ret = {            
                isAchange: false, 
                response,
            };
    
            return ret;
            
        } else {
            throw {code:23, message: `Function ${functionName} does not exist in module baseSui.`};
        }

    }

    /**
     * Parse the xml base data in a separate worker, since it would block the main thread for too long
     * @param {any} data The data needed by the Worker (see in the worker for documentation)
     * @returns {array} some notes about the execution
     */
    async parseBase(data) {
        return new Promise((resolve, reject) => {
            const worker = new Worker('./moduleLinkSuiWorker1.js', {
                workerData: data
            });
            worker.on('message', (objAsStr)=>{
                resolve(objAsStr)
            });
            worker.on('error', reject);
            worker.on('exit', (code) => {
                if (code !== 0)
                reject({code:33, message:`Error during parsing: ${code}`});
            });
        });
    };

    /**
     * Translate the performance value from Alabus to liveAthletics
     * @param {string} perf The performance as string as in the base DB
     * @param {integer} xDiscipline xDiscipline of liveAthletics
     * @return {numeric} integer or whatever is correct for liveAthletics
     */
    perfAlabus2LA(perf, xDiscipline){
        // the xDiscipline is useless, since the interpretation is fully dependent on the alabus type, and not xDiscipline of live athletics. However, for alabus it is simple: there are just two formats: one for tech, one for track; they can easily be differentiated
        if (perf.indexOf(';')>=0){
            // is a time
            // according to the an interface definition, the times should look as follows: HH:MM:SS.ZZZ
            // in fact, it looks like times are HH:MM:SS:ZZZ
            // make sure it would work with both
            const parts = perf.split(/[:,.]/);
            if (parts.length==4){
                // should actually always be the case
                return ((3600*parseInt(parts[0])+60*parseInt(parts[1])+parseInt(parts[2]))*1000+parseInt(parts[3]))*100; // in 1/100000s
            }
            return 0;
        } else if (perf.indexOf('.')>=0){
            const parts = perf.split(/[.]/);
            if (parts.length==2){
                // should actually always be the case
                return 100*parseInt(parts[0]) + parseInt(parts[1]); // in cm
            }
            return 0;
        }
        // should never happen, except when empty
        return 0;
    }

    /**
     * Translate the performance value from liveAthletics to Alabus. 
     * @param {string} perf The performance as given by liveAthletics
     * @param {integer} discType disciplineType of liveAthletics
     */
    perfLA2Alabus(perf, discType){
        if (discType==3){
            // track
            // remove the 1/100000s
            let millis = Math.ceil((perf % 100000)/100);
            let allSeconds = (perf - (perf % 100000))/100000;
            let hours = Math.floor(allSeconds/3600);
            let minutes = Math.floor((allSeconds-3600*hours)/60);
            let seconds = allSeconds-3600*hours-60*minutes;
            // format: HH:MM:SS.zzz // note: here, alabus uses . after the second, but in the base data it is : ...?
            return `${hours.toString().padStart(2,0)}:${minutes.toString().padStart(2,0)}:${seconds.toString().padStart(2,0)}.${millis.toString().padStart(3,0)}`;

        } else if (discType==2 || discType==1){
            // tech
            // as float in m with two digits after the period and 6 digits before; fill up with 0
            return (perf/100).toFixed(2).padStart(9,0);
        } else {
            return 0;
        }
    }

    // TODO: move this to either the base class or even another file, which is also used by the listPrinter
    /**
     * Upload the results of a meeting to the national body. Get the data from the DB here (might be changed later on to the "generic lists processor"); but let the results get processed by the discpipline-type specific function. 
     * @param {object} meeting The meeting-object to get the results from; should contain a reference 
     * @param {object} opts Object with the options required to get the data; e.g. login credentials to the central database of the national body.
     */
    async uploadResults(meeting, opts){

        if (!('password' in opts) || !('username' in opts)){
            throw {code:30, message: 'username or password missing'};
        }

        // first, make sure this competition can be uploaded to swiss athletics:
        if (!(meeting.data?.baseSettings?.SUI?.approval)){
            let msg = `Cannot upload meeting ${meeting.name} to swiss-athletics since it was not downloaded from there / there is no event number.`
            this.logger.log(20, msg);
            throw {code:31, message: msg};
        }

        // for the track disciplines, we need to know how many rounds there are to define the kindOfLap (e.g. V, Z, F, 0, D, ...)
        // TODO: 'D' (for Mehrkampf) is not used yet!
        let queryNumRounds = `SELECT xEventGroup, count(xRound) as numRounds FROM rounds group by xEventGroup`;
        const numRounds = await meeting.seq.query(queryNumRounds, { type: QueryTypes.SELECT });
        // create an object from the result
        const numRoundsEG = {};
        for (let eg of numRounds){
            numRoundsEG[eg.xEventGroup] = eg.numRounds;
        }

        let query = `Select
        seriesstartsresults.position,
        seriesstartsresults.resultOverrule,
        seriesstartsresults.resultRemark,
        seriesstartsresults.startConf,
        seriesstartsresults.xSeriesStart,
        series.status as seriesStatus,
        series.name as seriesName,
        series.datetime,
        series.aux,
        series.number,
        series.xSeries,
        regions.country,
        regions.regionShortname,
        contests.name as contestName,
        contests.status as contestStatus,
        contests.conf as contestConf,
        contests.xContest,
        resultstrack.time,
        resultstrack.timeRounded,
        resultstrack.rank,
        resultstrack.reactionTime,
        resultstech.result,
        resultstech.attempt,
        resultstech.wind,
        heights.height,
        heights.jumpoffOrder,
        resultshigh.resultsHighFailedAttempts,
        resultshigh.resultsHighValid,
        resultshigh.resultsHighPassed,
        startsingroup.number As groupNumber,
        athletes.lastname,
        athletes.forename,
        athletes.birthdate,
        athletes.sex,
        athletes.identifier,
        athletes.nationalBody as athleteNationalBody,
        clubs.name As clubName,
        clubs.usercode as usercode,
        inscriptions.number As bib,
        starts.bestPerf,
        starts.bestPerfLast,
        groups.name As groupName,
        rounds.xRound,
        rounds.order,
        eventgroups.xEventGroup,
        bdlC.shortname as bdlCShortname,
        bdlC.name As bdlCName,
        basedisciplinesC.shortnameStd as bdCShortnameStd,
        basedisciplinesC.nameStd as bdCNameStd,
        basedisciplinesC.type as bdCType,
        CAST(basedisciplinesC.indoor as INTEGER) as bdCIndoor,
        basedisciplinesC.baseConfiguration As bdCBaseConfiguration,
        basedisciplinesC.xBaseDiscipline as bdCXBaseDiscipline,
        events.onlineId,
        events.info as eventInfo,
        events.date,
        events.nationalBody as eventNationalBody,
        events.xEvent,
        categories.shortname As catShortname,
        categories.name As catName,
        categories.sortorder as catSortorder,
        categories.xCategory,
        categories.code, -- the SUI code
        disciplines.configuration,
        disciplines.info as disciplineInfo,
        disciplines.sortorder as disciplineSortorder,
        disciplines.xDiscipline,
        bdlE.name As bdlEName,
        bdlE.shortname As bdlEShortname,
        basedisciplinesE.nameStd As bdENameStd,
        basedisciplinesE.shortnameStd As bdEShortnameStd,
        basedisciplinesE.type As bdEType,
        CAST(basedisciplinesE.indoor as INTEGER) As bdEIndoor,
        basedisciplinesE.baseConfiguration As bdEBaseConfiguration,
        basedisciplinesE.xBaseDiscipline as bdEXDiscipline
    From
        seriesstartsresults Inner Join
        series On seriesstartsresults.xSeries = series.xSeries Inner Join
        startsingroup On seriesstartsresults.xStartgroup = startsingroup.xStartgroup
        left Join
        starts On startsingroup.xStart = starts.xStart left Join
        inscriptions On starts.xInscription = inscriptions.xInscription left Join
        athletes On athletes.xInscription = inscriptions.xInscription Left Join
        regions On athletes.xRegion = regions.xRegion Left Join
        contests On series.xContest = contests.xContest left Join
        resultshigh On resultshigh.xResult = seriesstartsresults.xSeriesStart Left Join
        resultstech On resultstech.xResultTech = seriesstartsresults.xSeriesStart Left Join
        resultstrack On resultstrack.xResultTrack = seriesstartsresults.xSeriesStart Left Join
        heights On resultshigh.xHeight = heights.xHeight Left Join
        clubs On athletes.xClub = clubs.xClub Left Join
        groups On groups.xContest = contests.xContest Left Join
        rounds On groups.xRound = rounds.xRound Left Join
        eventgroups On rounds.xEventGroup = eventgroups.xEventGroup Left Join
        basedisciplines basedisciplinesC On contests.xBaseDiscipline = basedisciplinesC.xBaseDiscipline
        Left Join (select shortname, name, xBaseDiscipline from basedisciplinelocalizations where language='de') bdlC
        On bdlC.xBaseDiscipline =
                basedisciplinesC.xBaseDiscipline Left Join
        events On starts.xEvent = events.xEvent Left Join
        categories On events.xCategory = categories.xCategory Left Join
        disciplines On events.xDiscipline = disciplines.xDiscipline Left Join
        basedisciplines basedisciplinesE On disciplines.xBaseDiscipline =
                basedisciplinesE.xBaseDiscipline Left Join
        (select shortname, name, xBaseDiscipline from basedisciplinelocalizations where language='de') bdlE On bdlE.xBaseDiscipline =
                basedisciplinesE.xBaseDiscipline
    Where
        seriesstartsresults.resultOverrule<=1 AND -- only regular and "retired" results
        -- athletes.nationalBody='SUI' AND -- do NOT only get swiss-people, sicne we need all other persons for ranking as well!
        contests.status>=180 -- only competitions that are at least finished!

    order by
        eventgroups.xEventGroup, -- must be ordered by eventGroup, round, group and series first to make the ranking-stuff work
        rounds.order,
        groups.number,
        series.number,
        heights.jumpoffOrder, -- sort the results
        heights.height,
        resultstech.attempt`;  

        const results = await meeting.seq.query(query, { type: QueryTypes.SELECT });
        // bundle the results, i.e. 
        // 1. bundle all results (all attempts, all heights) of the same round (with regard to a person this is equivalent to all results in the same series) to one entry
        const resBundledPerson = this.bundleResults(results);

        // 2. bundle all results into the grouping that shall be used for ranking and apply the ranks at the same time
        // the ranking shall always be over the whole round
        const conf = {grouping:'xRound', sorting:'xRound', ranking:true};
        const resBundledStructured = this.bundlingAndRanking(conf, resBundledPerson);
        // note: the structure is just one level here, since there 

        // note: the rank within a heat (for track only) already exists on the basis of the timing. the actual upload function may decide whether the rank within the heat or the time-based rank over the whole round shall be used.

        // create the xml and send it.
        // change the sorting again; for alabus, it seems like the results do not need to be structured as the results actually are (event/round/contest); instead, every round seems to be a separate <discipline sportDiscipline="30" licenseCategory="MAN_">, where an athlete obviously only has one result entry (excepr eventually for tech with wind, where there might be a regular and a non-regular result)
        // thus, sort by xEvent (for the category) and xRound

        // the data is in resBundledStructured as [round1, round2, ...] where each round has a data property with the actual data
        // merge all data together, in order to be able to sort differently for alabus/swiss-athletics
        const allResults=resBundledStructured.flatMap(round=>round.data);

        // filter non-SUI-base athletes and no-ranks
        const resultsFiltered= allResults.filter(r=>r.athleteNationalBody=='SUI' && r.ranking.xRound>0);

        if (resultsFiltered.length==0){
            this.logger.log(20, `No results to upload to swiss-athletics in meeting ${meeting.name}.`);
            return;
        }

        // sort the results as discussed above
        resultsFiltered.sort((a,b)=>{
            if (a.xEvent != b.xEvent){
                return a.xEvent - b.xEvent;
            }
            return a.xRound - b.xRound;
        })

        let today = new Date();
        let xmlStr = `<?xml version="1.0" encoding="ISO-8859-1"?>
<watDataset version="${today.toISOString().slice(2,4)+today.toISOString().slice(4,10)}">
    <event>
        <eventNumber>${meeting.data.baseSettings.SUI.approval}</eventNumber>
        <name>${meeting.data.name}</name>
        <eventStart>${meeting.data.dateFrom.slice(0,10)}</eventStart>
        <eventEnd>${meeting.data.dateTo.slice(0,10)}</eventEnd>
        <location>${meeting.data.location}</location>
        <stadium>${meeting.data.stadium}</stadium>
        <amountSpectators></amountSpectators>
        <accounts>
        </accounts>
        <disciplines>`;

        // add all "disciplines" (actually a round of an event)
        // probably it would work differently too, but we do it as athletica did it.
        let lastXRound = resultsFiltered[0].xRound;
        // start the first discipline

        let xDiscipline = this.conf.disciplineTranslationTable[resultsFiltered[0].xDiscipline];
        let catCode = resultsFiltered[0].code;

        xmlStr+= `
            <discipline sportDiscipline="${xDiscipline}" licenseCategory="${catCode}">
                <athletes>`;
        for (let i=0; i<resultsFiltered.length; i++){
            let res = resultsFiltered[i];

            // create the date of the event
            // - basically, sequelize will return a date object; however, if the bundling process uses JSON.parse/strignify to creae a clone, then the date will be a string afterwards
            // - simply taking the first letters of toISOString() does not work, since there is a one day offset from swiss time zone to UTC (e.g. when for switzerland we store 2023-02-03 T00:00:00, the it is 2023-02-02 T23:00:00 in UTC!)
            // note the following procedure only works when the upload is done during the same timezone difference as the record was stored.
            let date;
            // consider timezoneOffset (integer in minutes) given in meeting.data 
            if (typeof(res.date)=='string'){
                let d = new Date(res.date);
                date = new Date(d.valueOf() + meeting.data.timezoneOffset*60*1000);
            } else {
                // is already a date
                date = new Date(res.date.valueOf() + meeting.data.timezoneOffset*60*1000);
            }

            // write the athlete's result

            let indoor = res.bdEIndoor;
            let relevant = 1; // currently we do not use this field; this should be set to 0 if women run in a mens heat

            // differentiate the different types of disciplines!
            if (res.bdEType==1){
                // tech vertical
                // lapkind is always 0 for tech

                xmlStr += `
                    <athlete license="${res.identifier}" licensePaid="1" licenseCat="" inMasterData="1">
                        <efforts>
                            <effort>
                                <DateOfEffort>${date.toISOString().slice(0,10)}</DateOfEffort>
                                <distanceResult>${this.perfLA2Alabus(res.rankingData.lastValidHeight, 1)}</distanceResult>
                                <wind></wind>
                                <kindOfLap>0</kindOfLap>
                                <lap />
                                <place>${res.ranking.xRound}</place>
                                <placeAddon></placeAddon>
                                <indoor>${indoor}</indoor>
                                <relevant>${relevant}</relevant>
                                <effortDetails></effortDetails>
                                <accountinfo></accountinfo>
                                <homologate>1</homologate>
                            </effort>
                        </efforts>
                    </athlete>`;


            } else if (res.bdEType==2){

                // TODO: check that everything is correct! (since this could not be tested before)
                // all the rest until here for type2 is also still untested!

                // tech horizontal
                // lapkind is always 0 for tech

                // if there is a wind measurement, send the best results with valid wind as well as the best result overall, if they are not the same

                // first, write the best result independent of the wind
                /*let wind = res.rankingData.bestResultWind===null ? '' : res.rankingData.bestResultWind;
                xmlStr += `
                <athlete license="${res.identifier}" licensePaid="1" licenseCat="" inMasterData="1">
                    <efforts>
                        <effort>
                            <DateOfEffort>${date.toISOString().slice(0,10)}</DateOfEffort>
                            <distanceResult>${this.perfLA2Alabus(res.rankingData.bestResult, 2)}</distanceResult>
                            <wind>${wind}</wind>
                            <kindOfLap>0</kindOfLap>
                            <lap />
                            <place>${res.ranking.xRound}</place>
                            <placeAddon></placeAddon>
                            <indoor>${indoor}</indoor>
                            <relevant>${relevant}</relevant>
                            <effortDetails></effortDetails>
                            <accountinfo></accountinfo>
                            <homologate>1</homologate>
                        </effort>`;

                // if needed, add an additional effort with correct wind.
                if (res.rankingData.bestResultWindValid != res.rankingData.bestResult){
                    wind = res.rankingData.bestResultWindValidWind===null ? '' : res.rankingData.bestResultWindValidWind;
                    xmlStr += `
                        <effort>
                            <DateOfEffort>${date.toISOString().slice(0,10)}</DateOfEffort>
                            <distanceResult>${this.perfLA2Alabus(res.rankingData.bestResultWindValid, 2)}</distanceResult>
                            <wind>${wind}</wind>
                            <kindOfLap>0</kindOfLap>
                            <lap />
                            <place>${res.ranking.xRound}</place>
                            <placeAddon></placeAddon>
                            <indoor>${indoor}</indoor>
                            <relevant>${relevant}</relevant>
                            <effortDetails></effortDetails>
                            <accountinfo></accountinfo>
                            <homologate>1</homologate>
                        </effort>`
                }

                // end the block
                xmlStr +=`
                    </efforts>
                </athlete>`;*/


            } else if (res.bdEType==3){
                // track

                let resStr = this.perfLA2Alabus(res.time, 3); // must be hh:mm:ss.ttt
                // process the aux data to get the wind
                let aux = JSON.parse(res.aux);
                let wind = ''; // empty if no wind; normally +A.B or -A.B
                if ('wind' in aux){
                    wind = Math.ceil(aux.wind*10)/10;
                    if (wind>0){
                        wind = "+"+wind.toString();
                    } else {
                        wind = wind.toString();
                    }
                }
                
                let lap = res.number.toString().padStart(2,'0').slice(-2); // must be two letter code (alabus cannot handle heat-number >=100); always take the last two digits

                // for the lap kind, we must differentiate between the rounds;
                let lapKind = 'V'; // F (Final) X (Halbfinal) D (Mehrkampf; not used) Q (Qualifikation; not used) S (Serie) V (Vorlauf) Z (Zwischenlauf) 0 (für tech)
                if (numRoundsEG[res.xEventGroup]==1){
                    lapKind = 'S';
                } else if (numRoundsEG[res.xEventGroup]==2){
                    if (res.order==2){
                        lapKind = 'F';
                    }
                } else {
                    if (res.order==numRoundsEG[res.xEventGroup]){
                        lapKind = 'F';
                    } else if (res.order==numRoundsEG[res.xEventGroup]-1){
                        lapKind = 'X';
                    } else if (res.order>1){
                        lapKind = 'Z';
                    }
                }
                // for the final round (i.e. the last round when there is more than 1)
                if (res.order==numRoundsEG[res.xEventGroup] && numRoundsEG[res.xEventGroup]>1){
                    // overwrite the default numbers by letters; the last final heat is A_, second last B_, ... 
                    const letters=['A_', 'B_', 'C_', 'D_', 'E_'];
                    // we need to know how many heats we had...
                    let sql = `select count(*) as numHeats from series where xContest=${res.xContest}`;
                    const numHeatsRow = await meeting.seq.query(sql, { type: QueryTypes.SELECT });
                    const numHeats = numHeatsRow[0].numHeats;
                    
                    lap = letters[Math.min(4,res.number-numHeats)];
                }

                // NOTE: placeAddon (e.g. for markers for competition >1000m over sealevel), effortDetails,a ccountInfo and homologate are currently not used, since it seems like athleteica also did not use it.
                xmlStr += `
                    <athlete license="${res.identifier}" licensePaid="1" licenseCat="" inMasterData="1">
                        <efforts>
                            <effort>
                                <DateOfEffort>${date.toISOString().slice(0,10)}</DateOfEffort>
                                <timeResult>${resStr}</timeResult>
                                <wind>${wind}</wind>
                                <kindOfLap>${lapKind}</kindOfLap>
                                <lap>${lap}</lap>
                                <place>${res.rank}</place>
                                <placeAddon></placeAddon>
                                <indoor>${indoor}</indoor>
                                <relevant>${relevant}</relevant>
                                <effortDetails></effortDetails>
                                <accountinfo></accountinfo>
                                <homologate>1</homologate>
                            </effort>
                        </efforts>
                    </athlete>`;
            }
            
            // check if the next entry is different
            if (i<resultsFiltered.length-1 && resultsFiltered[i+1].xRound != lastXRound){
                lastXRound = resultsFiltered[i+1].xRound;
                xDiscipline = this.conf.disciplineTranslationTable[resultsFiltered[i+1].xDiscipline];
                catCode = resultsFiltered[i+1].code;
                xmlStr+= `
                </athletes>
            </discipline>
            <discipline sportDiscipline="${xDiscipline}" licenseCategory="${catCode}">
                <athletes>`;
            }
        }
        // end the xml.
        xmlStr+= `
                </athletes>
            </discipline>`;

        // loop over all results and create the xml


        // finalize the xml:
        xmlStr += `
        </disciplines>
    </event>
</watDataset>`;

        // for debuggin, write the file to disk
        await writeFile(`./temp/newResults.xml`, xmlStr);
        
        // gzip the xml!
        let xmlgz = zlib.gzipSync(xmlStr);

        // create the body
        let remoteFilename = `${today.getUTCFullYear()}${(today.getUTCMonth()+1).toString().padStart(2,0)}${today.getUTCDate().toString().padStart(2,0)}_${meeting.data.baseSettings.SUI.approval}.gz`; // the filename to be send
        let body = "--swissAthletics\r\n"; // TODO eventually CRLF before is (not) needed
        body += `content-disposition: form-data; name="file"; filename="${remoteFilename}" \r\n`;
        body += `content-type: application/x-gzip \r\n\r\n`;
        // put here the xmlgz
        let body2 = `\r\n`;
        body2 += "--swissAthletics--";

        // finally transform the body to buffer and concat with the xmlgz buffer 
        let bodyBuffer = Buffer.concat([Buffer.from(body), xmlgz, Buffer.from(body2)]);

        let opts2 = {
            host: this.conf.host,
            port: this.conf.port,
            auth:`${opts.username}:${opts.password}`,
            method:'POST',
            headers:{
                'Content-Type': "multipart/form-data; boundary=swissAthletics",
                'Content-Length': bodyBuffer.length, 
            },
            path: this.conf.pathResultsUpload,
        }

        // if it does not work, try with the module "form-data"

        return new Promise((resolve, reject)=>{
            // upload the data
            let req = https.request(opts2); 
            req.write(bodyBuffer);

            req.on('error', (e)=>{
                this.logger.log("Upload failed: " + e.message);
                reject({code:31, message: 'HTTPS error: ' + e.message});
            })
            req.on('response', (res)=>{

                if (res.statusCode==401){
                    this.logger.log(`Upload SUI results failed: ${res.statusCode} ${res.statusMessage}`);
                    reject({code:33, message:`Upload results failed due to invalid username and/or password (${res.statusCode} ${res.statusMessage})`});
                }
                else if (res.statusCode>299){
                    this.logger.log(`Upload SUI results failed: ${res.statusCode} ${res.statusMessage}`);
                    reject({code:32, message:`Upload results failed: ${res.statusCode} ${res.statusMessage}`});
                } else {
                    let ret = {response: true, isAchange: false};
                    resolve(ret);
                }
            })

            req.end(); // finally send the real request

        })

    }



    // TODO: to be moved in another file
    /**
     * Merge multiple results (e.g. attempts in techLong or heights in techHigh) of the same round in one. This funtion calls the type specific function to merge (and potentially preprocess) the results. Ideally the data is already sorted such that all results of the same round/person occurs right after the other, but it will be sorted here to ensure that everything works fine. 
     * @param {array} results array with the raw sql result lines, where the result of one person might be on multiple lines
     * @returns array of results that are bundled by person/round
     */
    bundleResults(results){
        
        if (results.length==0) return results;
        
        // first sort the results by xSeriesStart to make sure that reuslts that belong together appear one after the other
        results.sort((a,b)=>a.xSeriesStart-b.xSeriesStart);

        let resBundled = [];
        
        let lastXSSR = results[0]?.xSeriesStart;
        let begin = 0; // the begin of the same xSSR
        for (let i = 0; i<results.length; i++){
            // always actually check the next element; except if it is the last element
            if (i==results.length-1 || lastXSSR != results[i+1].xSeriesStart){
                
                let end = i;
                // get the results to bundle
                const resToBundle = results.slice(begin, end+1);
                // merge all results in between
                // TODO: this if/else should actually be in a general function somewhere and not here
                let bundled;
                if (results[i].bdCType == 1){
                    // techHigh
                    bundled = this.bundleTechHigh(resToBundle);
                } else if (results[i].bdCType == 2){
                    // techLong
                    bundled = this.bundleTechLong(resToBundle);
                } else if ((results[i].bdCType == 3)){
                    // track (probably nothing to do in the subfunction) 
                    bundled = this.bundleTrack(resToBundle);
                }
                resBundled.push(bundled);

                if (i<results.length-1){
                    lastXSSR = results[i+1].xSeriesStart;
                    begin = i+1;
                }
            }
        }

        return resBundled;
    }

    /**
     * take an array of results (i.e. with every attempt) of one person and create a single object with all results in it
     */
    bundleTechHigh(results){

        // make sure the sorting is correct
        results.sort((a,b)=>{
            if (a.jumpoffOrder != b.jumpoffOrder){
                return a.jumpoffOrder - b.jumpoffOrder;
            } else {
                return a.height-b.height;
            }
        })

        // use the first result as the basis and then delete/add properties
        let res = JSON.parse(JSON.stringify(results[0]));

        // delete the properties that are only valid for the single result
        delete res.resultsHighFailedAttempts;
        delete res.resultsHighValid;
        delete res.resultsHighPassed;
        delete res.height;
        delete res.jumpoffOrder;
        
        // add the new properties
        // create the following "total" properties to be added to the object:
        res.rankingData = {
            totalFailedAttempts: 0, // until and with the last valid hight
            //failedAttemptsSinceLastValid: 0, // after 3, the person is out of the competition. 
            failedAttemptsOnLastValid: 0,
            lastValidHeight: 0,
            numFailedJumpoffAttempts:0,
            numValidJumpoffAttempts:0,
            //lastFinishedHeight: 0,
            //firstUnfinishedHeight: ,
        }

        // additionally add an array with the following data per item:
        /*
        {
            height (in cm),
            resultStr XX-, XO, ...
            jumpoffOrder 0, 
        }
        */
        res.results = [];

        // for the calculation of totalFailedAttempts (only until and inlcuding the last valid height in the main competition), we first need to know the last valid height in order to not count the later results
        for (let r of results){
            if (r.jumpoffOrder==0 && r.resultsHighValid && r.height>res.rankingData.lastValidHeight){
                res.rankingData.lastValidHeight = r.height;
                res.rankingData.failedAttemptsOnLastValid = r.resultsHighFailedAttempts;
            }
        }

        for (let r of results){
            // create the string
            let resStr = r.jumpoffOrder==0 ? '' : 'J:';
            resStr += 'X'.repeat(r.resultsHighFailedAttempts);
            if (r.resultsHighValid){
                resStr += 'O';
            } else if (r.resultsHighPassed){
                resStr += '-'
            }
            res.results.push({
                height: r.height,
                resultStr: resStr,
                jumpoffOrder: r.jumpoffOrder,
                resultsHighFailedAttempts: r.resultsHighFailedAttempts,
                resultsHighValid: r.resultsHighValid,
                resultsHighPassed: r.resultsHighPassed,
            })

            // calculate the ranking data
            if (r.jumpoffOrder>0){
                // in jumpoff
                if (r.resultsHighValid){
                    res.rankingData.numValidJumpoffAttempts++;
                } else{
                    res.rankingData.numFailedJumpoffAttempts++;
                }
            } else {
                // regular result
                // the totalFailedAttempts shall only consider the failed atempts until and including the lastValidHeight, but not in further 
                if (r.height<=res.rankingData.lastValidHeight){
                    res.rankingData.totalFailedAttempts += r.resultsHighFailedAttempts;
                }
            }
        }

        return res;

    }

    /**
     * take an array of results (i.e. with every attempt) of one person and create a single object with all results in it
     */
    bundleTechLong(results){
        // make sure the sorting is correct
        results.sort((a,b)=>a.attempt-b.attempt);

        // use the first result as the basis and then delete/add properties
        let res = JSON.parse(JSON.stringify(results[0]));

        // delete the properties that are only valid for the single result
        delete res.attempt;
        delete res.result;
        delete res.wind;

        // note: we need two different kind of analysis here: 
        // the performances sorted best to worst for ranking
        // the best performance considering the wind limit for entry limits and similar
        
        // add the new properties
        // create the following "total" properties to be added to the object:
        res.rankingData = {
            bestResultWindValid: 0, // will ALWAYS be filled with the best result where the wind either does not exist (e.g throws or indoor) or where it is <=2.0 m/s
            bestResultWindValidWind: null, // will be set to the wind of the best result with valid wind
            bestResult: 0, // the overall best result
            bestResultWind: null, // the wind for the respective result
            resultsSorted: [], // best first; only non-zero results, but independent of the wind; will be used for ranking later (Note: the wind is not important here)
        }

        res.results = []; // the original order of results, a copy of the original object including attempt, result and wind

        for (let r of results){
            res.results.push({
                attempt: r.attempt,
                result: r.result,
                wind: r.wind,
            })
            // assuming that a value of 0 means a not valid result
            if (r.result){
                res.rankingData.resultsSorted.push(r.result);
            }

            // calculate the best result considering wind
            if ((r.wind===null || r.wind<=200)){
                if (res.rankingData.bestResultWindValid < r.result){
                    res.rankingData.bestResultWindValid = r.result;
                    res.rankingData.bestResultWindValidWind = r.wind;

                } else if (res.rankingData.bestResultWindValid == r.result && r.wind<res.rankingData.bestResultWindValidWind){
                    // just update the wind, because it is lower
                    res.rankingData.bestResultWindValidWind = r.wind;
                }
            }

            // the best result independent of the wind
            if ( res.rankingData.bestResult < r.result){
                res.rankingData.bestResult = r.result;
                res.rankingData.bestResultWind = r.wind;
            } else if( res.rankingData.bestResult == r.result && r.wind<res.rankingData.bestResultWind){
                // just update the wind, because it is lower
                res.rankingData.bestResultWind = r.wind;
            }

        }
        // sort the results for the sorted view; best result first
        res.rankingData.resultsSorted.sort().reverse(); 

        return res;
    }

    /**
     * for track events ther should be just one result entry per person per contest; thus we simply return the first element. If there were multiple, we write an error message.
     */
    bundleTrack(results){
        if (results.length>1){
            this.logger.log(20, `There was more than one result for xSeriesStart=${results[0].xSeriesStart} in a track event. Used only the first result for the online-result update.`);
        }
        return results[0];
    }

    /**
     * Structure the data in the input by sorting it into subcontainers. On every container-level, we might perform a ranking. 
     * @param {object} conf The configuration for the bunding, including potential child-configurations
     * @param {string} conf.grouping the name of the property used to group (if omitted, sorting will be used)
     * @param {string} conf.sorting the name of the property used to sort (if omitted, grouping will be used)
     * @param {string} conf.ranking true or false (default) to add a rank. for this level or not. The name of the rank will be the grouping property name.
     * @param {object} conf.sub The configuration of the sub-structure
     * @param {any} conf.<anything> will simply be kept within the conf object stored in the strcuture
     * @param {array} data The array to take teh data from
     */
    bundlingAndRanking(conf, data){

        /**
         * pageBreak: 0=default: no, +1: after this container, +2: before this container; both=1+2=3
         * pagebreakN: do a page break after n children: default 0
         * the returned data should look like this, e.g. for a typical ranking list, ordered by discipline/eventGroup/round/group (typically=contest)/:
         * [
         *  {data: all60mRes, 
         *      label:'60m', 
         *      conf={grouping:xDiscipline, sorting: disciplienSortorder, label:discicplineName, pageBreak:3, pageBreakN:0, ranking:false, flatten:true, sub:[...]},
         *      sub:[{data:MAN60mSaturday, label:'60m MAN Saturday' conf:{grouping:xEventGroup, sorting:datetime, label: egName, ranking:false, flatten:false, sub:[...]}, sub:[{data:MAN60mSaturdayRound1, conf:{ranking:true, grouping: xRound, sorting:roundNumber, sub:[...]}, sub:{data:MAN60mSaturdayRound1Heat1, conf:{ranking: true, grouping:xSeries, sorting: seriesNumber, hereIsNoSubAnymore}}}]}, 
         *          {label:'60m M Sunday, ...}]},
         * {data: all100mRes, label:'100m', ...}
         * ]
         */
        
        if (!('grouping' in conf) && !('sorting' in conf)){
            this.logger.log(10, `Cannot bundle/rank data if neither "grouping" nor "sorting" is defined!`);
            return {data, conf};
        }
        if (!('grouping' in conf)){
            conf.grouping = conf.sorting;
        }
        if (!('sorting' in conf)){
            conf.sorting = conf.grouping;
        }

        // first, sort the data
        data.sort((a,b)=>a[conf.grouping]-b[conf.grouping]);

        // create the container to be returned
        let bundledData = [];

        // loop over the data and do the bunding; if requested also add the rank
        let lastVal = data[0][conf.grouping];
        let begin = 0;
        for (let i=0; i<data.length; i++){
            if (i==data.length-1 || data[i+1][conf.grouping] != lastVal){
                
                let end = i;
                let resToBundle = data.slice(begin, end+1);

                // add ranks to the data, if requested
                if (conf.ranking){
                    if (data[begin].bdCType == 1){
                        // techHigh
                        this.rankTechHigh(resToBundle, conf.grouping);
                    } else if (data[begin].bdCType == 2){
                        // techLong
                        this.rankTechLong(resToBundle, conf.grouping);
                    } else if (data[begin].bdCType == 3){
                        // track
                        this.rankTrack(resToBundle, conf.grouping);
                    }
                }

                let bundle = {
                    data: resToBundle,
                    // label, // not nessessarily done here 
                    conf,
                };
                if (conf.sub){
                    // let the data be prepared recursively
                    bundle.sub = this.bundlingAndRanking(conf.sub, resToBundle);
                }

                if (i<data.length-1){
                    begin = i+1;
                    lastVal = data[i+1][conf.grouping];
                }

                // add the data to the bundles
                bundledData.push(bundle);
            }

        }

        // finally, sort the bundles
        bundledData.sort((a,b)=>a.data[0][conf.sorting]-b.data[0][conf.sorting]);

        return bundledData;

    }

    // add ranks for techLong results
    rankTechLong(results, label){
        results.sort((r1, r2)=>{
            // compare the sorted Results
            for (let i=0; Math.min(r1.rankingData.resultsSorted.length, r2.rankingData.resultsSorted.length); i++){
                if (r1.rankingData.resultsSorted[i]>r2.rankingData.resultsSorted[i]){
                    // r1 is better
                    return -1;
                } 
                if (r2.rankingData.resultsSorted[i]>r1.rankingData.resultsSorted[i]){
                    // r2 is better
                    return 1;
                } 
                // both are equal
                return 0;
            }

            // if one athlete had more results than another, he/she is better if at least the best of the additional results is valid

            if (r1.rankingData.resultsSorted.length>r2.rankingData.resultsSorted.length && r1.rankingData.resultsSorted[r2.rankingData.resultsSorted.length-1]>0){
                // r1 is better
                return -1;
            }
            if (r2.rankingData.resultsSorted.length>r1.rankingData.resultsSorted.length && r2.rankingData.resultsSorted[r1.rankingData.resultsSorted.length-1]>0){
                // r2 is better
                return 1;
            }

            // both are equal
            return 0;
        })

        // do the ranking
        // current rank during rank assignment
        let rank=1;
        // from the sorted array, derive the ranking
        for (let i=0; i<results.length; i++){

            // make sure the ranking object already exists
            if (!('ranking' in results[i])){
                results[i].ranking = {};
            }

            if (results[i].resultOverrule<2){
                let r2 = results[i];
                if (i>0){
                    let r1 = results[i-1];
                    // check if the element equals the last
                    let equal = true;
                    for (let j=0; j<Math.min(r1.rankingData.resultsSorted.length, r2.rankingData.resultsSorted.length); j++){
                        if (r2.rankingData.resultsSorted[j] != r1.rankingData.resultsSorted[j]){
                            equal = false;
                            break;
                        }
                    }
                    if (!equal){
                        rank = i+1;
                    }
                }
                // assign a rank only if there is a valid result
                if (r2.rankingData.bestResult){ // if there is no valid result, it will be 0
                    results[i].ranking[label] = rank;
                }else{
                    results[i].ranking[label] = 0
                }
                
            } else {
                results[i].ranking[label] = 0; // TODO: eventually, no rank is something undefined instead of 0 or we use rank as a string and tranlate the overrule-code here to DQ, DNS, DNF, ...
            }
            
        }

    }

    // add ranks for track results
    rankTrack(results, label){
        // always use simply the time; ranking based on the evaluation on the timing should already be present, but we will ensure it here

        results.sort((s1,s2)=>{
            if (Math.max(s1.resultOverrule,1) !=  Math.max(s2.resultOverrule,1)){ // regular (0) and retired (1) must be treated the same
                return s1.resultOverrule - s2.resultOverrule; // this should meansingfully sort also within resultOverrule
            }
            if (s1.timeRounded===null && s2.timeRounded===null){
                return 0;
            }
            if (s1.timeRounded===null){
                return 1;
            } 
            if (s2.timeRounded===null){
                return -1;
            } 
            if (s1.timeRounded-s2.timeRounded != 0){
                return s1.timeRounded-s2.timeRounded;
            }
            return s1.rank-s2.rank;
        });

        let lastRank = 0;
        let lastTime = -1;
        for (let i=0; i<results.length; i++){
            let res = results[i];
            if (res.timeRounded != lastTime){
                lastRank = i+1;
                lastTime = res.timeRounded;
            }

            // make sure the ranking object already exists
            if (!('ranking' in res)){
                res.ranking = {};
            }

            // rank=0 if there is a reultOverrule!
            if (res.resultOverrule>1 || res.timeRounded==null){
                res.ranking[label] = 0;
            } else {
                res.ranking[label] = lastRank;
            }
        }

    }

    // add ranks for techHigh results
    rankTechHigh(results, label){
        // sort the results
        results.sort((s1, s2)=>{
            if (Math.max(s1.resultOverrule,1) !=  Math.max(s2.resultOverrule,1)){ // regular (0) and retired (1) must be treated the same
                return s1.resultOverrule - s2.resultOverrule; // this should meansingfully sort also within resultOverrule
            }
            // both result overrules are <2
            let r1 = s1.rankingData;
            let r2 = s2.rankingData;

            // 1) lastValidHeight
            if (r1.lastValidHeight != r2.lastValidHeight){
                return r2.lastValidHeight - r1.lastValidHeight; // the lower the more to the right.
            }

            // 2) failed attempts on last valid height
            if (r1.failedAttemptsOnLastValid != r2.failedAttemptsOnLastValid){
                return r1.failedAttemptsOnLastValid - r2.failedAttemptsOnLastValid; // the lower the more to the left
            }

            // 3) failed attempts in total
            if (r1.totalFailedAttempts != r2.totalFailedAttempts){
                return r1.totalFailedAttempts - r2.totalFailedAttempts; // the lower the more to the left
            }

            // jumpoff:

            // 4) the more results (independent whetrher valid or not) there are in the jumpoff, the better
            // (in contrast to the ranking in techHighBase, we can assume here that the results are correct and we only do the calculation at the end of the competition, and not between two athletes on the same jumpoff height)
            if (r1.numValidJumpoffAttempts + r1.numFailedJumpoffAttempts != r2.numValidJumpoffAttempts + r2.numFailedJumpoffAttempts){
                return r2.numValidJumpoffAttempts + r2.numFailedJumpoffAttempts - r1.numValidJumpoffAttempts - r1.numFailedJumpoffAttempts; // the more the better, i.e. the lower thew rank
            }

            // 5) it is also deemed 'failure' when an athlete retired after the last height. Thus if both have failed at the same height, but one is finally called retired, he actually left before and thus is ranked worse
            if (r1.resultOverrule != r2.resultOverrule){
                return r1.resultOverrule - r2.resultOverrule;
            }

            // equal results
            return 0;

        })

        // current rank during rank assignment
        let rank=1;
        // from the sorted array, derive the ranking
        for (let i=0; i<results.length; i++){

            // make sure the ranking object already exists
            if (!('ranking' in results[i])){
                results[i].ranking = {};
            }

            if (results[i].resultOverrule<2){
                let r2 = results[i].rankingData;
                if (i>0){
                    let r1 = results[i-1].rankingData;
                    // check if the element equals the last
                    let equal = (r1.lastValidHeight == r2.lastValidHeight && r1.failedAttemptsOnLastValid == r2.failedAttemptsOnLastValid && r1.totalFailedAttempts == r2.totalFailedAttempts && r2.numValidJumpoffAttempts + r2.numFailedJumpoffAttempts == r1.numValidJumpoffAttempts + r2.numFailedJumpoffAttempts && r1.resultOverrule == r2.resultOverrule); 
                    if (!equal){
                        rank = i+1;
                    }
                }
                // assign a rank only if there is a valid height
                if (r2.lastValidHeight){ // if there is no valid height, it will be 0
                    results[i].ranking[label] = rank;
                }else{
                    results[i].ranking[label] = 0
                }
                
            } else {
                results[i].ranking[label] = 0; // TODO: eventually, no rank is something undefined instead of 0 or we use rank as a string and tranlate the overrule-code here to DQ, DNS, DNF, ...
            }
            
        }

    }

    /**
     * returns nicely formatted string of the error; it contains the error as well as the involved line, but avoids to show the full sql (which would be the case if simply the error was shown)
     * @param {Error} err The error object as returned by sequelize
     */
    insertErrorPrinter(err){
        if (!err?.original?.text){
            return err.toString();
        }
        // get the number of the line
        let rowMatch = err.original.text.match(/(?<=at row )\d*/g);
        let lineNumber=undefined;
        var lineMatch;
        if (rowMatch!==null){
            lineNumber = parseInt(rowMatch[0]);
        } else {
            // try if the error uses the word line
            lineMatch = err.original.text.match(/(?<=at line )\d*/g);
            if (lineMatch===null){
                // we cannot process this error, so simply return the err as string
                return err.toString();
            } else {
                lineNumber = parseInt(lineMatch[0]);
            }
        }

        let strValues = err.original.sql.match(/(?<=values\s*)(?!\s).*/s)[0];
        // split by line and get the right
        // line with the (first) error 
        let errLine = strValues.split(/\),\s*\n?\s*\(/g)[lineNumber-1];
        return `${err.original.text}: ${errLine}`;
    }

    /**
     * update the base data. 
     * @param {object} opts Object with the options required to get the data; e.g. login credentials to the central database of the national body.
     * @param {string} opts.username The username for the login (actually the license/member number)
     * @param {string} opts.password 
     */
    async updateBaseData(opts, meeting){

        if (!('password' in opts) || !('username' in opts)){
            throw {code:30, message: 'username or password missing'};
        }

        let options = {
            host: this.conf.host,
            port: this.conf.port,
            path: this.conf.pathBaseData,
            headers: {
                authorization: "Basic " + Buffer.from(`${opts.username}:${opts.password}`).toString('base64'),
                connection: 'close',
            }
        }

        // store some notes during the processing
        let notes = [];
        let msg = '';

        // we must use a "manual" Promise here since the events of the request are called synchonously without .catch. Therefore "throwing" inside an event-callback would result in a UnhandledPromiseRejection Error.
        return new Promise((resolve, reject)=>{
            msg = 'Starting download of SUI base data.';
            notes.push(msg);
            this.logger.log(90, msg)
            let timeStart = new Date();
            let request = https.get(options);
    
            request.on('error', (e)=>{
                this.logger.log("Download failed: " + e.message);
                reject({code:1, message: 'HTTPS error: ' + e.message});
            })
            request.on('response', (res)=>{

                if (res.statusCode != 200){
                    if (res.statusCode == 401){
                        // unauthorized
                        reject({code:4, message: 'Login credentials wrong'});
                        return
                    } else {
                        // other http(s) error
                        reject({code:1, message: `HTTPS error: ${res.statusCode}, ${res.statusMessage}`});
                        return
                    }
                }

                let timeDownloaded = new Date();
                msg = `Download of base data successful. Duration: ${(timeDownloaded - timeStart)/1000}s. Starting unzipping.`;
                notes.push(msg);
                this.logger.log(90, msg);
                
                // two pipelines in parallel:
                // storing to file (for debugging purposes)
                // TODO: does not work like this. There is no tee option on the Nodejs readableStream, but there would be on the StreamWeb API
                let resForProcessing, resSave;
                //if (this.conf.debug){
                if (false){
                    [resSave, resForProcessing] = res.tee();
    
                    pipeline(resSave, fs.createWriteStream(this.conf.fileNameBaseData))
                    this.logger.log(90, `Writing file for debug successful. Duration: ${((new Date()) - timeDownloaded)/1000}s. Starting unzipping.`);
                    timeDownloaded = new Date();
                } else{
                    resForProcessing = res;
                }

                // ungzip and import: 
                pipeline(resForProcessing, zlib.createGunzip(), streamToStringLatin1).then(async (xmlString)=>{
                    // parse the xml (might take some time...)
                    let timeUnzipped = new Date();
                    msg = `Unzipping file successful. Duration: ${(timeUnzipped - timeDownloaded)/1000}s. Starting parsing the xml.`;
                    notes.push(msg);
                    this.logger.log(90, msg);
                    //parseStringPromise(xmlString, {explicitArray:false,})
                    return this.parseBase(xmlString).catch((err)=>{
                        throw {code:29, message:`Error in the worker for parsing: ${JSON.stringify(err)}`}
                    }).then(async (xml)=>{
    
                        let timeUnzipped = new Date();
                        msg = `Parsing xml successful. Duration: ${(timeUnzipped - timeDownloaded)/1000}s. Starting importing the data.`;
                        notes.push(msg);
                        this.logger.log(90, msg);
    
                        // first delete all old stuff!
                        await this.models.performances.truncate().catch(err=>{console.log(err); throw err});
                        await this.models.athletes.truncate().catch(err=>{console.log(err); throw err});
                        await this.models.clubs.truncate().catch(err=>{console.log(err); throw err});
                        const timeTruncated = new Date();
                        msg = `Truncation successful. Duration: ${(timeTruncated - timeUnzipped)/1000}s. Starting club insert string creation.`;
                        notes.push(msg);
                        this.logger.log(90, msg);
                        
                        // first import all clubs
                        // NOTE: the approach here is to create one single insert query and then execute it. This is much faster than executing singe queries. However, the approach is not safe for sql injections and might have difficulties with unescaped special characters. The replacements done on the club name solves the problem with the " character. If there are other such yet unsolved problems, eventually change to single queries and use parameter binding. 
                        // for the moment, svms (club.svms.smv) and relays (club.relays.relay) are not imported!
                        let clubsInsertQuery = 'insert into clubs (code, name, short, type, lg) \n values \n '

                        // until now (2023-02) the accountCodes were not necessarily unique (which was an error and should get fixed). Therefore, we have some additional effort: we only insert a club, if it was not inserted yet.

                        let insertedClubs = new Set(); // probably the fastest possible way to accomplish this
                        let problematicClubs = [];

                        for (let club of xml.watDataset.accounts.account){
    
                            if (insertedClubs.has(club.accountCode)){
                                problematicClubs.push(club.accountCode);

                            } else{

                                insertedClubs.add(club.accountCode);

                                clubsInsertQuery += `("${club.accountCode}", "${club.accountName.replace(/"/g,'\\"')}", "${club.accountShort.replace(/"/g,'\\"')}", "${club.accountType}", "${club.lg}"), `; // the replacements are needed to escape the quotation ": sql needs the " being escaped with a backslash. However, since \" is treated in javascript as an escape for ", it would instantly be escaped to " without the backslash. So we use double backslash, since this escapes the backslash and finally results in having \" as we have wanted. 
    
                                /*let insert= {
                                    code:club.accountCode, 
                                    name:club.accountName, 
                                    short:club.accountShort, 
                                    type:club.accountType,
                                    lg:club.lg,
                                }*/
    
                            } 
                        }
    
                        
                        const timeClubStringCreated = new Date();
                        msg = `Club string creation finished. Duration: ${(timeClubStringCreated - timeTruncated)/1000}s. Starting club insert.`
                        notes.push(msg);
                        this.logger.log(90, msg);
                        if (problematicClubs.length>0){
                            msg = `The following accountCode appeared multiple times in the base data. only the first was imported: ${problematicClubs}.`
                            notes.push(msg);
                            this.logger.log(90, msg);
                        }
    
                        clubsInsertQuery = clubsInsertQuery.slice(0,-2) + ';';
                        await this.sequelize.query(clubsInsertQuery, {logging:false, raw:true}).then(()=>{
                            msg = `Clubs successfully inserted after totally ${(new Date() - timeUnzipped)/1000}s.`;
                            notes.push(msg);
                            this.logger.log(90, msg)
                        }).catch(err=>{
                            throw 'Clubs could not be imported!: ' + JSON.stringify(err);
                        });
                        
                        const timeClubInserted = new Date();
                        msg = `Club sql insertion finished. Duration: ${(timeClubInserted - timeClubStringCreated)/1000}s. Starting creation of athletes+performances insert string.`;
                        notes.push(msg);
                        this.logger.log(90, msg);
    
                        // probably fastest approach to insert the data: create a raw insert script and insert all data at the same time. --> problem: currently the data delivered by Alabus contains multiple identical entries! --> first try to insert all in one query and if this fails, do separate inserts of the athletes in a second insert. Do the same for the performances. 
                        let athleteInsertQuery = 'insert into athletes (license, licensePaid, licenseCategory, lastname, firstname, sex, nationality, clubCode, birthdate)\n values ';
                        let performanceInsertQuery = "insert into performances (license, discipline, xDiscipline, bestEffort, bestEffortDate, bestEffortEvent, seasonEffort, seasonEffortDate, seasonEffortEvent, notificationEffort, notificationEffortDate, notificationEffortEvent, season) values ";
    
                        // do a first loop where we try to run two big sql queries for the inserts
                        for (let athlete of xml.watDataset.athletes.athlete){
    
                            let license = parseInt(athlete.$.license);
                            if (isNaN(license)){
                                msg = `License was NaN: ${athlete.$.license} ${athlete.firstName} ${athlete.lastName}. Skip this athlete.`;
                                notes.push(msg);
                                this.logger.log(90, msg);
                                continue;
                            }
                            if (athlete.birthDate==''){
                                msg = `Athlete with license ${athlete.$.license} ${athlete.firstName} ${athlete.lastName} has no birthDate and cannot be imported. Skip this athlete.`;
                                notes.push(msg);
                                this.logger.log(90, msg);
                                continue;
                            }
                            let birthdate = athlete.birthDate.slice(6,10)+'-'+athlete.birthDate.slice(0,2)+'-'+athlete.birthDate.slice(3,5);
                            let sex = athlete.sex.toUpperCase()=='W' ? 'f' : 'm';
    
                            athleteInsertQuery += `\n("${license}", ${athlete.$.licensePaid=='0' ? false : true}, "${athlete.$.licenseCat}", "${athlete.lastName}", "${athlete.firstName}", "${sex}", "${athlete.nationality}", "${athlete.accountCode}", "${birthdate}"),`;
    
                            // performances
                            if ((typeof(athlete.performances))=='object' && 'performance' in athlete.performances){
                                let perfs = athlete.performances.performance;
                                // if there is only one entry, then it is not in array form yet
                                if (!Array.isArray(perfs)){
                                    perfs = [perfs];
                                }
                                for (let perf of perfs){
        
                                    let bestEffortDate = '1900-01-01'; 
                                    let seasonEffortDate = '1900-01-01'; 
                                    let notificationEffortDate = '1900-01-01';
                                    let bestEffort = '';
                                    let bestEffortEvent = '';
                                    let seasonEffort = '';
                                    let seasonEffortEvent = '';
                                    let notificationEffort = '';
                                    let notificationEffortEvent = '';
                                    if (perf.bestEffort.$.date.length==10){
                                        bestEffortDate = perf.bestEffort.$.date.slice(6,10)+'-'+perf.bestEffort.$.date.slice(0,2)+'-'+perf.bestEffort.$.date.slice(3,5);
                                        bestEffort = perf.bestEffort._;
                                        bestEffortEvent = perf.bestEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                    } 
                                    if (perf.seasonEffort.$.date.length==10){
                                        seasonEffortDate = perf.seasonEffort.$.date.slice(6,10)+'-'+perf.seasonEffort.$.date.slice(0,2)+'-'+perf.seasonEffort.$.date.slice(3,5);
                                        seasonEffort = perf.seasonEffort._;
                                        seasonEffortEvent = perf.seasonEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                    }
                                    if (perf.notificationEffort.$.date.length==10){
                                        notificationEffortDate = perf.notificationEffort.$.date.slice(6,10)+'-'+perf.notificationEffort.$.date.slice(0,2)+'-'+perf.notificationEffort.$.date.slice(3,5);
                                        notificationEffort = perf.notificationEffort._;
                                        notificationEffortEvent = perf.notificationEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                    }
                                    
                                    // try to get the xDiscipline
                                    let discipline = parseInt(perf.$.sportDiscipline)
                                    let xDiscipline = this.conf.disciplineTranslationTableOutdoorInv[discipline] ?? 0;

                                    performanceInsertQuery += `\n("${license}", ${discipline}, ${xDiscipline}, "${bestEffort}", "${bestEffortDate}", "${bestEffortEvent}", "${seasonEffort}", "${seasonEffortDate}", "${seasonEffortEvent}", "${notificationEffort}", "${notificationEffortDate}", "${notificationEffortEvent}", "O"),`;
    
                                    /*let insertP = {
                                        license,
                                        discipline: parseInt(perf.$.sportDiscipline),
                                        bestEffort: perf.bestEffort._,
                                        bestEffortDate,
                                        bestEffortEvent: perf.bestEffort.$.event,
                                        seasonEffort: perf.seasonEffort._,
                                        seasonEffortDate,
                                        seasonEffortEvent: perf.seasonEffort.$.event,
                                        notificationEffort: perf.notificationEffort._,
                                        notificationEffortDate,
                                        notificationEffortEvent: perf.notificationEffort.$.event,
                                        season:'O', // enum "I" / "O"
                                    }*/
                                    
                                }
                            }
                            
                            // insert performances indoor
                            if ((typeof(athlete.performances))=='object' && 'performanceIndoor' in athlete.performances){
                                let perfs = athlete.performances.performanceIndoor;
                                // if there is only one entry, then it is not in array form yet
                                if (!Array.isArray(perfs)){
                                    perfs = [perfs];
                                }
                                for (let perf of perfs){
        
                                    let bestEffortDate = '1900-01-01'; 
                                    let seasonEffortDate = '1900-01-01'; 
                                    let notificationEffortDate = '1900-01-01';
                                    let bestEffort = '';
                                    let bestEffortEvent = '';
                                    let seasonEffort = '';
                                    let seasonEffortEvent = '';
                                    let notificationEffort = '';
                                    let notificationEffortEvent = '';
                                    if (perf.bestEffort.$.date.length==10){
                                        bestEffortDate = perf.bestEffort.$.date.slice(6,10)+'-'+perf.bestEffort.$.date.slice(0,2)+'-'+perf.bestEffort.$.date.slice(3,5);
                                        bestEffort = perf.bestEffort._;
                                        bestEffortEvent = perf.bestEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                    } 
                                    if (perf.seasonEffort.$.date.length==10){
                                        seasonEffortDate = perf.seasonEffort.$.date.slice(6,10)+'-'+perf.seasonEffort.$.date.slice(0,2)+'-'+perf.seasonEffort.$.date.slice(3,5);
                                        seasonEffort = perf.seasonEffort._;
                                        seasonEffortEvent = perf.seasonEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                    }
                                    if (perf.notificationEffort.$.date.length==10){
                                        notificationEffortDate = perf.notificationEffort.$.date.slice(6,10)+'-'+perf.notificationEffort.$.date.slice(0,2)+'-'+perf.notificationEffort.$.date.slice(3,5);
                                        notificationEffort = perf.notificationEffort._;
                                        notificationEffortEvent = perf.notificationEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                    }

                                    // try to get the xDiscipline
                                    let discipline = parseInt(perf.$.sportDiscipline)
                                    let xDiscipline = this.conf.disciplineTranslationTableIndoorInv[discipline] ?? 0;
        
                                    performanceInsertQuery += `\n("${license}", ${discipline}, ${xDiscipline}, "${bestEffort}", "${bestEffortDate}", "${bestEffortEvent}", "${seasonEffort}", "${seasonEffortDate}", "${seasonEffortEvent}", "${notificationEffort}", "${notificationEffortDate}", "${notificationEffortEvent}", "I"),`;
    
                                    /*let insertP = {
                                        license,
                                        discipline: parseInt(perf.$.sportDiscipline),
                                        bestEffort: perf.bestEffort._,
                                        bestEffortDate,
                                        bestEffortEvent: perf.bestEffort.$.event,
                                        seasonEffort: perf.seasonEffort._,
                                        seasonEffortDate,
                                        seasonEffortEvent: perf.seasonEffort.$.event,
                                        notificationEffort: perf.notificationEffort._,
                                        notificationEffortDate,
                                        notificationEffortEvent: perf.notificationEffort.$.event,
                                        season:'I', // enum "I" / "O"
                                    }*/
        
                                }
                            }
                        }
    
                        const timeAthleteStringCreated = new Date();
                        msg = `athletes+performances insert string creation finished. Duration: ${(timeAthleteStringCreated - timeClubInserted)/1000}s. Try to insert all athletes at once.`;
                        notes.push(msg);
                        this.logger.log(90, msg);
    
                        let athletesInserted = false;
                        athleteInsertQuery = athleteInsertQuery.slice(0,-1) + ";";
                        await this.sequelize.query(athleteInsertQuery, {logging:false}).then(()=>{athletesInserted=true}).catch(err=>{
                            // avoid the full error here, since it contains the full string! Instead, try to deliver only the relevant (=error) part 
                            let msg = 'Inserting all athletes at a time was not successful. Trying to insert them separately.'+ this.insertErrorPrinter(err);//+err.toString();
                            notes.push(msg);
                            this.logger.log(90, msg);
                        });
    
                        const timeAthletesInserted = new Date();
                        msg = `Athlete sql insertion (attempt) finished. Duration: ${(timeAthletesInserted - timeAthleteStringCreated)/1000}s. Try to insert all performances at once.`;
                        notes.push(msg);
                        this.logger.log(90, msg);
    
                        let performancesInserted = false;
                        performanceInsertQuery = performanceInsertQuery.slice(0,-1) + ";";
                        await this.sequelize.query(performanceInsertQuery, {logging:false, raw:true}).then(()=>{performancesInserted=true}).catch(err=>{
                            let msg = 'Inserting all performances at a time was not successful. Trying to insert them separately.' + this.insertErrorPrinter(err);
                            notes.push(msg);
                            this.logger.log(90, msg);
                        });
                        const timePerformancesInserted = new Date();
                        msg = `Performances sql insertion (attempt) finished. Duration: ${(timePerformancesInserted - timeAthletesInserted)/1000}s. If needed, start single inserts of athletes (${!athletesInserted}) and/or performances (${!performancesInserted}).`;
                        notes.push(msg);
                        this.logger.log(90, msg);
    
                        // loop again if either the performances insert or the athletes insert was not successful
                        if (!athletesInserted || !performancesInserted){
    
                            // import athletes and their performances
                            //let errorsA = [];
                            let errorCodesA = [];
                            let errorLicenses = [];
                            let errorsP = [];
    
                            // log time for every N athletes
                            const logAfterN = 5000;
                            let timeBefore = new Date();
                            let i=0;
    
                            // count successful and non.successful inserts.
                            let success = 0;
                            let fail = 0;
                            for (let athlete of xml.watDataset.athletes.athlete){
                                i++;
                                if ((i%logAfterN)==0){
                                    msg = `Inserting athletes/performances from ${i-logAfterN} to ${i} took ${((new Date())-timeBefore)/1000}s.`;
                                    notes.push(msg);
                                    this.logger.log(90, msg);
                                    timeBefore = new Date();
                                }
    
                                let license = parseInt(athlete.$.license);
                                if (!athletesInserted){
                                    let birthdate = athlete.birthDate.slice(6,10)+'-'+athlete.birthDate.slice(0,2)+'-'+athlete.birthDate.slice(3,5);
                                    let sex = athlete.sex.toUpperCase()=='W' ? 'f' : 'm';
        
                                    let query =  `insert into athletes (license, licensePaid, licenseCategory, lastname, firstname, sex, nationality, clubCode, birthdate) values ("${license}", ${athlete.$.licensePaid=='0' ? false : true}, "${athlete.$.licenseCat}", "${athlete.lastName}", "${athlete.firstName}", "${sex}", "${athlete.nationality}", "${athlete.accountCode}", "${birthdate}");`;
                                    await this.sequelize.query(query, {logging:false}).then(()=>{success++}).catch(err=>{
                                        fail++; 
                                        //errorsA.push(err); 
                                        errorCodesA.push(err.original.errno); 
                                        if (errorLicenses.indexOf(license)==-1){
                                            errorLicenses.push(license);
                                        }
                                    });
                                }
    
                                if (!performancesInserted){
                                    if ((typeof(athlete.performances))=='object' && 'performance' in athlete.performances){
                                        let perfs = athlete.performances.performance;
                                        // if there is only one entry, then it is not in array form yet
                                        if (!Array.isArray(perfs)){
                                            perfs = [perfs];
                                        }
                                        for (let perf of perfs){
                
                                            let bestEffortDate = '1900-01-01'; 
                                            let seasonEffortDate = '1900-01-01'; 
                                            let notificationEffortDate = '1900-01-01';
                                            let bestEffort = '';
                                            let bestEffortEvent = '';
                                            let seasonEffort = '';
                                            let seasonEffortEvent = '';
                                            let notificationEffort = '';
                                            let notificationEffortEvent = '';
                                            if (perf.bestEffort.$.date.length==10){
                                                bestEffortDate = perf.bestEffort.$.date.slice(6,10)+'-'+perf.bestEffort.$.date.slice(0,2)+'-'+perf.bestEffort.$.date.slice(3,5);
                                                bestEffort = perf.bestEffort._;
                                                bestEffortEvent = perf.bestEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                            } 
                                            if (perf.seasonEffort.$.date.length==10){
                                                seasonEffortDate = perf.seasonEffort.$.date.slice(6,10)+'-'+perf.seasonEffort.$.date.slice(0,2)+'-'+perf.seasonEffort.$.date.slice(3,5);
                                                seasonEffort = perf.seasonEffort._;
                                                seasonEffortEvent = perf.seasonEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                            }
                                            if (perf.notificationEffort.$.date.length==10){
                                                notificationEffortDate = perf.notificationEffort.$.date.slice(6,10)+'-'+perf.notificationEffort.$.date.slice(0,2)+'-'+perf.notificationEffort.$.date.slice(3,5);
                                                notificationEffort = perf.notificationEffort._;
                                                notificationEffortEvent = perf.notificationEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                            }

                                            // try to get the xDiscipline
                                            let discipline = parseInt(perf.$.sportDiscipline)
                                            let xDiscipline = this.conf.disciplineTranslationTableOutdoorInv[discipline] ?? 0;
                
                                            let query = `insert into performances (license, discipline, xDiscipline, bestEffort, bestEffortDate, bestEffortEvent, seasonEffort, seasonEffortDate, seasonEffortEvent, notificationEffort, notificationEffortDate, notificationEffortEvent, season) values ("${license}", ${discipline}, ${xDiscipline}, "${bestEffort}", "${bestEffortDate}", "${bestEffortEvent}", "${seasonEffort}", "${seasonEffortDate}", "${seasonEffortEvent}", "${notificationEffort}", "${notificationEffortDate}", "${notificationEffortEvent}", "O");`;
    
                                            await this.sequelize.query(query, {logging:false}).then(()=>{}).catch(err=>{
                                                //fail++; 
                                                errorsP.push(err); 
                                            });
                                        }
                                    }
                                    
                                    // insert performances indoor
                                    if ((typeof(athlete.performances))=='object' && 'performanceIndoor' in athlete.performances){
                                        let perfs = athlete.performances.performanceIndoor;
                                        // if there is only one entry, then it is not in array form yet
                                        if (!Array.isArray(perfs)){
                                            perfs = [perfs];
                                        }
                                        for (let perf of perfs){
                
                                            let bestEffortDate = '1900-01-01'; 
                                            let seasonEffortDate = '1900-01-01'; 
                                            let notificationEffortDate = '1900-01-01';
                                            let bestEffort = '';
                                            let bestEffortEvent = '';
                                            let seasonEffort = '';
                                            let seasonEffortEvent = '';
                                            let notificationEffort = '';
                                            let notificationEffortEvent = '';
                                            if (perf.bestEffort.$.date.length==10){
                                                bestEffortDate = perf.bestEffort.$.date.slice(6,10)+'-'+perf.bestEffort.$.date.slice(0,2)+'-'+perf.bestEffort.$.date.slice(3,5);
                                                bestEffort = perf.bestEffort._;
                                                bestEffortEvent = perf.bestEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                            } 
                                            if (perf.seasonEffort.$.date.length==10){
                                                seasonEffortDate = perf.seasonEffort.$.date.slice(6,10)+'-'+perf.seasonEffort.$.date.slice(0,2)+'-'+perf.seasonEffort.$.date.slice(3,5);
                                                seasonEffort = perf.seasonEffort._;
                                                seasonEffortEvent = perf.seasonEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                            }
                                            if (perf.notificationEffort.$.date.length==10){
                                                notificationEffortDate = perf.notificationEffort.$.date.slice(6,10)+'-'+perf.notificationEffort.$.date.slice(0,2)+'-'+perf.notificationEffort.$.date.slice(3,5);
                                                notificationEffort = perf.notificationEffort._;
                                                notificationEffortEvent = perf.notificationEffort.$.event.replace(/"/g,'\\"').replace(/'/g, "\\'");
                                            }

                                            // try to get the xDiscipline
                                            let discipline = parseInt(perf.$.sportDiscipline)
                                            let xDiscipline = this.conf.disciplineTranslationTableIndoorInv[discipline] ?? 0;
                
                                            let query = `insert into performances (license, discipline, xDiscipline, bestEffort, bestEffortDate, bestEffortEvent, seasonEffort, seasonEffortDate, seasonEffortEvent, notificationEffort, notificationEffortDate, notificationEffortEvent, season) values ("${license}", ${discipline}, ${xDiscipline}, "${bestEffort}", "${bestEffortDate}", "${bestEffortEvent}", "${seasonEffort}", "${seasonEffortDate}", "${seasonEffortEvent}", "${notificationEffort}", "${notificationEffortDate}", "${notificationEffortEvent}", "I");`;
    
                                            await this.sequelize.query(query, {logging:false}).then(()=>{}).catch(err=>{
                                                //fail++; 
                                                errorsP.push(err); 
                                            });
    
                                        }
                                    }
                                }
    
                            }
    
                            const timeSingleInserts = new Date();
                            msg = `Single inserts of athletes ${!athletesInserted} and/or performances ${!performancesInserted} finished. Duration: ${(timeSingleInserts - timePerformancesInserted)/1000}s.`;
                            notes.push(msg);
                            this.logger.log(90, msg);
                            if (!athletesInserted){
                                msg = `Single athletes insertion finished: successful: ${success}, failed: ${fail}. Error numbers: ${errorCodesA}. Affected licenses: ${errorLicenses}`;
                                notes.push(msg);
                                this.logger.log(90, msg);
                            }
                            if (!performancesInserted){
                                msg = `Single performances insertion finished. Errors: ${errorsP}`;
                                notes.push(msg);
                                this.logger.log(90, msg);
                            }
                            
                        }
    
                        let timeFinished = new Date();
                        msg = `Importing into DB successful. Duration: ${(timeFinished - timeUnzipped)/1000}s.`;
                        notes.push(msg);
                        this.logger.log(90, msg);
    
                        // save the current date 
                        let dateStr = xml.watDataset.$.version;
                        let d = new Date(parseInt(dateStr.slice(0,4)), parseInt(dateStr.slice(4,6))-1, parseInt(dateStr.slice(6,8)))
                        this.postUpdateBaseData(d);

                        // make sure that all contests recreate their startgroups !
                        meeting.eH.raise(`general@${meeting.meetingShortname}:renewStartgroups`);

                        // report success
                        resolve(notes);
    
                    })

                }).catch((err)=>{
                    // do not throw, since the calling function is not async
                    reject(err);
                }) // end pipieline
    
            }) // end request.on('response')
    
        }) // end promise


    }

    /**
     * get a list of all competitions that could be imported from the national body
     * @param {object} opts Object with the options required to get the data; e.g. login credentials to the central database of the national body.
     * @resolve {array} [{identifier: 123, name: 'meeting 1', date:'2022-01-01'}, {...}]
     * @reject {object} o.code: 1=general connection error, 2=Server error during processing, 3=no meetings available, 4=credentials invalid
     * 
     */
    async getCompetitions(opts){

        if (!('password' in opts) || !('username' in opts)){
            throw {code:30, message: 'username or password missing'};
        }

        const options = {
            host: this.conf.host,
            port: this.conf.port,
            path: this.conf.pathCompetitionList,
            headers: {
                authorization: "Basic " + Buffer.from(`${opts.username}:${opts.password}`).toString('base64'),
                connection: 'close',
            }
        }

        // we must use a "manual" Promise here since the events of the request are called synchonously without .catch. Therefore "throwing" inside an event-callback would result in a UnhandledPromiseRejection Error.
        return new Promise((resolve, reject)=>{
            this.logger.log(90, 'Starting download of competitions.')
            let timeStart = new Date();
    
            let request = https.get(options);
    
            request.on('error', (e)=>{
                this.logger.log("Download failed: " + e.message);
                reject ({code:1, message: 'HTTPS error: ' + e.message});
            })
            request.on('response', (res)=>{
                // res is a readable stream with some additional properties

                if (res.statusCode != 200){
                    if (res.statusCode == 401){
                        // unauthorized
                        reject({code:4, message: 'Login credentials wrong'});
                    } else {
                        // other http(s) error
                        reject({code:1, message: `HTTPS error: ${res.statusCode}, ${res.statusMessage}`});
                    }
                    return
                }

                let timeDownloaded = new Date();
                this.logger.log(90, `Download of competitions successful. Duration: ${(timeDownloaded - timeStart)/1000}s.`);
                
                pipeline(res, streamToStringLatin1).then(async (rawMsg)=>{
    
                    // process the gathered data:
                    // Control=116334:123456
                    // Name="Biel/Bienne Athletics Hallenmeeting":"Meeting 2"
                    // Startdate=01.10.2022:02.12.2099

                    if (rawMsg==''){
                        throw{code:3, message: 'No meetings available.'};
                    }
    
                    try {
                        // split by line:
                        const lines = rawMsg.split('\n'); // should have three lines
                        const competitionIDs = lines[0].slice(8).split(':');
                        const competitionNames = lines[1].slice(6,-1).split(':'); // has "" around the values (not the single values, but the whole)
                        const competitionDates = lines[2].slice(10).split(':');
    
                        // all arrays should have the same length
                        let competitions = [];
                        for (let i=0; i<competitionIDs.length; i++){
                            const dateParts = competitionDates[i].split('.');
                            const date = new Date(Date.UTC(parseInt(dateParts[2]), parseInt(dateParts[1])-1, parseInt(dateParts[0]))); // month is zero based
    
                            competitions.push({
                                identifier: competitionIDs[i],
                                name: competitionNames[i], 
                                date
                            })
                        }
    
                        resolve(competitions);
    
                    } catch (ex){
                        throw{code: 2, message: `Error while processing the list of competitions received from the server: ${ex}.`};
                    }
    
                }).catch(err=> {
                    reject(err)
                }) // end pipline
    
            })
        })

    }

    // provide search functions. The returned array must contain the dataset of all matching athletes that is required to inscribe this athlete in the main DB.
    async getAthlete(searchString){
        // only a search string is provided. The search function should allow to match all white space separated parts with any stuff before and after either in lastname or firstname

        // do not return anything if the search string is too short and cannot be a license number, in order not to have too many results.
        if (searchString.length<3 && isNaN(searchString)){
            throw {code:10, message:'Search strings with less than 3 characters are not executed, since it would produce too many results.'};
        }

        // split the search string by white space. (Note: thanks to this splitting it should be safe not to escape the strings, i.e. SQL injections should not be possible
        const searchStrings = searchString.trim().split(' ');
        
        // construct the where clause
        // the clause finally should be that every part must be either in lastname or firstname
        // since we do not necessarily need true sequelize objects, it is way easier to do a raw query on the DB: 
        let whereClause = '';
        for (let i=0; i<searchStrings.length; i++){
            let s = searchStrings[i];
            if (s==''){
                continue;
            }
            if (i>0){
                whereClause += ' AND'
            }

            if (isNaN(s)){
                // regular text
                // add % on both sides to match string parts independent where they ocure in the name (the % before could be ommitted, however names with a pre-part such as "von Ballmoos", "le Guennec" or where people have many first and last names, we want to match all of them)
                whereClause += ` (lastname like "%${s}%" OR firstname like "%${s}%")`
            } else {
                // must be the license; requries exact match
                whereClause += ` license=${parseInt(s)}`;
            }
        }
        const query = 'select * from athletes where' + whereClause;
        const queryCount = 'select count(*) from athletes where' + whereClause;

        // first only count the number of entries; if there are not too many, get the entries in a second call
        const res1 = await this.sequelize.query(queryCount, {type: this.sequelize.QueryTypes.SELECT, logging:false,}).catch(err=>{
            let msg = `Cannot query the number of athletes in the baseSuiDb: ${err.message}`
            this.logger.log(10, msg);
            throw {code: 10, message:msg};
        });
        const numAthletes = res1[0]['count(*)'];
        if (numAthletes>20){
            return {
                entries: [],
                entriesNum: numAthletes,
            }
        }

        let athletes = await this.sequelize.query(query, {type: this.sequelize.QueryTypes.SELECT, model:this.models.athletes, logging:false,}).catch(err=>{
            let msg = `Cannot query the atheltes in the baseSuiDb: ${err.message}`
            this.logger.log(10, msg);
            throw {code: 11, message:msg};
        });

        // format the athletes array to deliver the following properties (containing everything to create an entry in the athletes table): 
        // identifier (license), nationalBody (e.g. SUI), lastname, firstname, birthdate, sex, club, country, countryName, regionName, regionShortname. 
        // ATTENTION: club and the region/country properties will be used to find or create the entry in clubs/region. For the region, all given properties must exactly match. Not given proeprties are assumed to be empty ('').
        // NOTE: performances are not included here, since it would be unnecessary effort for the server and the separate function to get performances for one specific athlete. 
        const athletesFormatted = await Promise.all(athletes.map(async ath=>{

            // get the club
            let club = await this.models.clubs.findOne({where:{code:ath.clubCode}, logging:false,}).catch(err=>{
                console.log('Getting club error')
                throw {code:12, message: `Error while getting club: ${JSON.stringify(err)}`}
            }); // actually, a club should always be found. 
            let clubName = club ? club.name : ''; 
            let clubSortname = club ? club.short : '';

            return {
                identifier: ath.license.toString(), // must be string
                lastname: ath.lastname,
                firstname: ath.firstname,
                birthdate: ath.birthdate,
                sex: ath.sex,
                nationalBody: this.country,
                clubName: clubName, // name of the club. exact match in clubs will be required; otherwise the club is created.
                clubSortvalue: clubSortname, // optional, the name for sorting of the club, e.g. abbrev. such as "athletics club" should be last ("Place acthletics club"). Only used if the club needs to be inserted. (if the property is not given, it is assumed empty ''.)
                country: ath.nationality, // exact match in country, countryName and countryShortname will be required; otherwise the country (region) is created
                countryName: '', // optional; only used to create a new entry if country, regionName and regionShortname do not match 
                regionName: '', // exact match in country, countryName and countryShortname will be required; otherwise the country (region) is created
                regionShortname: '', // exact match in country, countryName and countryShortname will be required; otherwise the country (region) is created
            }
        })).catch(err=> {throw err});

        return {
            entries: athletesFormatted,
            entriesNum: numAthletes,
        };

    }

    // provide search functions. The returned array must contain the dataset of all matching clubs that is required to put this club in the main DB.
    getClub(name){
        // the given name should match either the name or shortname, if both exist in the respective DB
    }

    /**
     * Import a competition into the provided meeting.
     * @param {object} meetingRooms The meeting-object to import the competition into.
     * @param {object} opts Object with the options required to get the data; e.g. login credentials to the central database of the national body and the identifier of the meeting.
     * @resolve {object} o.notes: some notes about the importing process
     * @resolve {object} o.baseSettings: settings of the base import, eventually needed for results upload (e.g. a meeting ID)
     * @reject {object} o.code: 1=general connection error, 2=Server error during processing, 3=meeting does not exist, 4=credentials invalid
     */
    async importCompetition(meetingRooms, opts){

        if (!('password' in opts) || !('username' in opts) || !('identifier' in opts)){
            throw {code:30, message: 'username, password or meeting-identifier missing'};
        }

        // request must be post; 
        // request body: &meetingid=123456
        // type: application/x-www-form-urlencoded

        const requestBody = `&meetingid=${opts.identifier}`;

        // returns an xml, which then ideally is parsed as it is done for the base data

        let options = {
            host: this.conf.host,
            port: this.conf.port,
            path: this.conf.pathCompetitionData,
            headers: {
                authorization: "Basic " + Buffer.from(`${opts.username}:${opts.password}`).toString('base64'),
                connection: 'close',
                'Content-type': "application/x-www-form-urlencoded",
                'Content-Length': Buffer.byteLength(requestBody),
            },
            method: 'post',
        };

        // prepare the returned data
        let notes = [];
        let newCount = 0;
        let updateCount = 0;
        let failCount = 0;

        // delete existing athletes first or not? set default value
        // 0 == do noting; 1== delete all starts, 2== delete athletes and starts
        opts.deleteAthletes = opts.deleteAthletes ?? 0; 

        if (opts.deleteAthletes>0){
            // delete all starts related to an athlete in this base
            // TODO: relay
            var xInscriptionsToDelete = meetingRooms.inscriptions.data.inscriptions.filter(i=>{
                if ('athlete' in i){
                    return i.athlete.nationalBody == 'SUI';
                } 
                return false;
            }).map(x=>x.xInscription);
            
            // delete the starts
            let startsToDelete = meetingRooms.starts.data.starts.filter(s=>xInscriptionsToDelete.indexOf(s.xInscription)>=0);

            for (let s of startsToDelete){
                await meetingRooms.starts.serverFuncWrite('deleteStart', s.xStart).catch(err=>notes.push(`Could not delete start for xStart=${s.xStart}: ${err}`));
            }

        }

        if (opts.deleteAthletes==2){
            // delete all starts+athletes linked with this base (starts were already deleted above)
            for (let xInsc of xInscriptionsToDelete){
                await meetingRooms.inscriptions.serverFuncWrite('deleteInscription', xInsc).catch(err=>notes.push(`Could not delete inscription for xInscription=${xInsc}: ${err}`));
            }
        }

        
        // we must use a "manual" Promise here since the events of the request are called synchonously without .catch. Therefore "throwing" inside an event-callback would result in a UnhandledPromiseRejection Error.
        return new Promise((resolve, reject)=>{

            this.logger.log(90, 'Starting download of competition.')
            let timeStart = new Date();
    
            let request = https.request(options);
    
            request.on('error', (e)=>{
                this.logger.log("Download failed: " + e.message);
                reject({code:1, message: 'HTTPS error: ' + e.message});
            })
            request.on('response', (res)=>{

                if (res.statusCode != 200){
                    if (res.statusCode == 401){
                        // unauthorized
                        reject({code:4, message: 'Login credentials wrong'});
                        return
                    } else {
                        // other http(s) error
                        reject({code:1, message: `HTTPS error: ${res.statusCode}, ${res.statusMessage}`});
                        return
                    }
                }

                let timeDownloaded = new Date();
                this.logger.log(90, `Download of competition data successful. Duration: ${(timeDownloaded - timeStart)/1000}s.`);
    
                // what response do we get when there is no meeting with the given ID?
                // --> error {code:3, message:`Meeting with ID ${identifier} does not exist.`}
                
                // ungzip and import: 
                pipeline(res, streamToStringLatin1).then(async (xmlString)=>{
                    // parse the xml (might take some time...)
                    let timeUnzipped = new Date();
                    this.logger.log(90, `toString successful. Duration: ${(timeUnzipped - timeDownloaded)/1000}s. Starting parsing the xml.`);
                    return parseStringPromise(xmlString, {explicitArray:true,}).then(async (xml)=>{

                        const data = xml.meetDataset;

                        // store some info about the import for furtehr usage, e.g. result upload
                        let baseSettings = {
                            approval: data.$.approval,
                            entryFee: data.$.entry_fee,
                            entryFeeReduction: data.$.entry_fee_reduction,
                            penalty: data.$.penalty,
                        }
                        const penalty = parseFloat(data.$.penalty)/100 || 0;

                        for (let disc of data.disciplines[0].discipline){
                            // import "discipline" into events 

                            // translate the discipline numbers!

                            // we need to know whether this is an indoor competition or outdoor and then take the correct translation table
                            // unfortunately this information is NOT given in the import data; instead, we need to use the data set for the existing meeting.
                            let disciplineTranslationTableInv;
                            if (meetingRooms.meeting.data.isIndoor){
                                disciplineTranslationTableInv = this.conf.disciplineTranslationTableIndoorInv;
                            } else {
                                disciplineTranslationTableInv = this.conf.disciplineTranslationTableOutdoorInv;
                            }

                            const xDiscipline = disciplineTranslationTableInv[parseInt(disc.$.disCode)];
                            
                            // if the discipline could not be translated, it could not be imported
                            if (xDiscipline==undefined){
                                notes.push( `Cannot import discipline with disCode ${disc.$.disCode} since the discipline cannot be matched.`);
                                failCount++;
                                continue;
                            }

                            // translate xCategory
                            // the categories are given as code (e.g. MAN_, U20M, ...) --> translate it automatically, by stripping the _ from MAN_ and WOM_ and keep all the rest the same. DO not use the code column in the DB because I think I will remove it wometime soon.
                            const cat = meetingRooms.categories.data.find(c=>c.shortname==disc.$.catCode.replace('_',''));

                            if (!cat){
                                notes.push(`Cannot import discipline with disCode ${disc.$.disCode} since the category cannot be matched.`);
                                failCount++;
                                continue;
                            }
                            
                            // check if the event already exists
                            const eventExisting = meetingRooms.events.data.events.find(e=>e.nationalBody=='SUI' && e.onlineId==disc.$.disId);

                            // create a valid JS date.
                            const dateParts = disc.$.disDate.split('.') //"01.10.2022"
                            const d = new Date(parseInt(dateParts[2]), parseInt(dateParts[1])-1, parseInt(dateParts[0]));

                            let event;
                            let evtFailed = false;
                            if (!eventExisting){
                                // create the event

                                let evt = {
                                    xDiscipline,
                                    xCategory: cat.xCategory,
                                    xEventGroup: null,
                                    entryFee: parseFloat(disc.$.disFee)/100 || 0,
                                    bailFee: penalty, // actually not used anymore
                                    onlineId: disc.$.disId,
                                    nationalBody: 'SUI',
                                    date: d.toISOString(),
                                    info: disc.$.disInfo,
                                }

                                event = await meetingRooms.events.serverFuncWrite('addEvent', evt).then((evt)=>{
                                    newCount++;
                                    return evt;
                                }).catch(err=>{
                                    notes.push(`Error during adding ${JSON.stringify(evt)}: ${JSON.stringify(err)}`);
                                    failCount++;
                                    evtFailed = true;
                                })
                            
                            } else {
                                // update event

                                let evt = {
                                    xEvent: eventExisting.xEvent,
                                    xDiscipline,
                                    xCategory: cat.xCategory,
                                    xEventGroup: eventExisting.xEventGroup, // do NOT set the eventGroup; just keep it the way it is!
                                    entryFee: parseFloat(disc.$.disFee)/100 || 0,
                                    bailFee: penalty, // actually not used anymore
                                    onlineId: disc.$.disId,
                                    nationalBody: 'SUI',
                                    date: d.toISOString(),
                                    info: disc.$.disInfo,
                                }

                                event = await meetingRooms.events.serverFuncWrite('updateEvent', evt).then((evt)=>{
                                    updateCount++;
                                    return evt;
                                }).catch(err=>{
                                    notes.push(`Error during updating ${JSON.stringify(evt)}: ${JSON.stringify(err)}`);
                                    failCount++;
                                    evtFailed = true;
                                })
                            }
                            if (evtFailed){
                                continue;
                            }

                            // import athletes
                            if ('athletes' in disc && typeof(disc.athletes[0])=='object' && 'athlete' in disc.athletes[0]){
                                for (const ath of disc.athletes[0].athlete){
                                    // check if the athlete already exists, otherwise create it
                                    let inscription = meetingRooms.inscriptions.data.inscriptions.find(i=>i.athlete.nationalBody=='SUI' && i.athlete.identifier==ath.$.license);
                                    let createStart = !inscription;
                                    let athFailed = false;
                                    if (!inscription){
                                        // create the athlete

                                        // get the athlete from the base data
                                        let athBase = await this.getAthlete(ath.$.license).then(athletes=>{
                                            // getAthlete returns an array; get the first element only
                                            if (athletes.entriesNum==0){
                                                let msg = `Cannot import athlete with license ${ath.$.license}, because he/she is not in the base data.`;
                                                this.logger.log(90, msg);
                                                notes.push(msg);
                                                athFailed = true;
                                            } else {
                                                return athletes.entries[0];
                                            }

                                        }).catch(err=>{
                                            let msg = `Cannot import athlete with license ${ath.$.license}, due to a error in the base data: ${JSON.stringify(err)}`;
                                            this.logger.log(90, msg);
                                            notes.push(msg);
                                            athFailed = true;
                                        });
                                        if (athFailed){
                                            continue;
                                        }

                                        // get the right category
                                        const xCategory = meetingRooms.categories.catCalc(meetingRooms.meeting.data.dateTo, athBase.birthdate, athBase.sex)

                                        // get or insert the club
                                        let club = meetingRooms.clubs.data.clubs.find(c=>c.name==athBase.clubName);
                                        if (!club){
                                            // create the club
                                            const insertClubData= {
                                                name: athBase.clubName,
                                                sortvalue: athBase.clubSortvalue,
                                            }

                                            club = await meetingRooms.clubs.serverFuncWrite('addClub', insertClubData).catch(err=>{
                                                athFailed=true;
                                                let msg= `Club could not be added: ${JSON.stringify(err)}. Skipping athlete ${ath.$.license}.`;
                                                notes.push(msg);
                                                this.logger.log(90, msg);
                                            })
                                        }
                                        if (athFailed){
                                            continue;
                                        }

                                        // get or insert the region
                                        let region = meetingRooms.regions.data.find(r=> r.country == athBase.country && r.regionName == athBase.regionName && r.regionShortname == athBase.regionShortname);
                                        if (!region){
                                            // create the region first
                                            const regionData = {
                                                country: athBase.country,
                                                countryName: athBase.countryName,
                                                regionName: athBase.regionName,
                                                regionShortname: athBase.regionShortname,
                                            };

                                            region = await meetingRooms.regions.serverFuncWrite('addRegion', regionData).catch(err=>{
                                                athFailed=true;
                                                let msg= `Region could not be added: ${JSON.stringify(err)}. Skipping athlete ${ath.$.license}.`;
                                                notes.push(msg);
                                                this.logger.log(90, msg);
                                            })
                                        }
                                        if (athFailed){
                                            continue;
                                        }

                                        const insc = {
                                            //xInscription,
                                            //number,
                                            xCategory,
                                            athlete: {
                                                //xAthlete,
                                                lastname: athBase.lastname,
                                                forename: athBase.firstname,
                                                birthdate: athBase.birthdate,
                                                sex: athBase.sex,
                                                xClub: club.xClub,
                                                identifier: ath.$.license,
                                                nationalBody:'SUI',
                                                xRegion: region.xRegion,
                                                //xInscription
                                            }
                                        }
                                        inscription = await meetingRooms.inscriptions.serverFuncWrite('addInscription', insc).catch(err=>{
                                            let msg = `Failure during adding the inscription with license ${ath.$.license}: ${JSON.stringify(err)}`;
                                            this.logger.log(90, msg);
                                            notes.push(msg);
                                            athFailed=true;
                                        })
                                    }
                                    if (athFailed){
                                        continue;
                                    }

                                    // find or insert the start
                                    if (!createStart){
                                        // check if the start already exists
                                        let start = meetingRooms.starts.data.starts.find(s=>s.xEvent==event.xEvent && s.xInscription==inscription.xInscription)
                                        createStart = createStart || !start;
                                    }
                                    if (createStart){
                                        // create the start

                                        // get performances from base!
                                        let perf = (await this.getPerformance(ath.$.license, xDiscipline).catch(err=>{
                                            let msg = `Could not get performance: ${JSON.stringify(err)}. Start will not have a performance.`;
                                            this.logger.log(90, msg);
                                            notes.push(msg);
                                            return undefined;
                                        })) ?? {notification:0, best:0};

                                        const s = {
                                            //xStart,
                                            xInscription: inscription.xInscription,
                                            xEvent: event.xEvent,
                                            paid: ath.$.paid!="n",
                                            bestPerf: parseInt(perf.best) || 0,
                                            bestPerfLast: parseInt(perf.notification) || 0, // there would be a .$.notificationEffort field in the import, but it seems not to be used
                                            //inBase:'SUI', // is this really needed and used like this? I think this field is at least for the swiss nationalBody exchenge not needed.
                                            competitive: true,
                                        };

                                        await meetingRooms.starts.serverFuncWrite('addStart', s).catch(err=>{
                                            let msg = `Could not do inscription for ${ath.$.license} for event ${event.xEvent}: ${JSON.stringify(err)}`;
                                            this.logger.log(90, msg);
                                            notes.push(msg);
                                        })

                                    }


                                }
                            }


                        }


                        const importResult = {
                            statsForClient:{
                                notes: notes,
                                newCount,
                                updateCount,
                                failCount
                            },
                            baseSettings: baseSettings,
                        }
                        resolve(importResult);

                    }) // end parse string to xml
                }).catch(err=>{
                    reject(err);
                }) // end pipline
    
            }) // end onResponse

            // Send also the content of the message now (not just the header)
            request.write(requestBody);
            request.end();
            

        })


    }

    /**
     * Get the performance in the base DB for a person
     * @param {string} identification The identification of the athlete in the DB. (Typically the license number. ) We provide it as a string because there might be non-numeric identifiers. The only limitation is that the identifier is unique per athlete
     * @param {integer} xDiscipline The discipline to get the data for.
     * @param {string} type what type of performance is requested; either null (=all), "notification", "season", "best"; default=null
     * @return {object} {notification: 123, season: 123, best: 123} values that were not requested are undefined/not given
     */
    async getPerformance(identification, xDiscipline, type=null){
        // since all best results are in one row in the DB, we always return all three values

        let perf = await this.models.performances.findOne({where:{license:identification, xDiscipline: xDiscipline}, logging:false,});

        if (perf){

            return {
                notification: this.perfAlabus2LA(perf.notificationEffort, xDiscipline),
                notificationEvent: perf.notificationEffortEvent,
                notificationDate: perf.notificationEffortDate,
                season: this.perfAlabus2LA(perf.seasonEffort, xDiscipline),
                seasonEvent: perf.seasonEffortEvent,
                seasonDate: perf.seasonEffortDate,
                best: this.perfAlabus2LA(perf.bestEffort, xDiscipline),
                bestEvent: perf.bestEffortEvent,
                bestDate: perf.bestEffortDate,
            }
        } else {
            return {
                notification: null,
                season: null,
                best: null,
            }
        }

    }

    /**
     * Get all performance (all disciplines) in the base DB for a person
     * @param {string} identification The identification of the athlete in the DB. (Typically the license number. ) We provide it as a string because there might be non-numeric identifiers. The only limitation is that the identifier is unique per athlete
     * @param {string} type what type of performance is requested; either null (=all), "notification", "season", "best"; default=null
     * @return {array of object} {notification: 123, season: 123, best: 123} values that were not requested are undefined/not given. Optional: notificationEvent, notificationDate, ...
     */
    async getPerformances(identification, type=null){
        // since all best results are in one row in the DB, we always return all three values

        let perfs = await this.models.performances.findAll({where:{license:identification}, logging:false,});

        if (perfs){

            let ret = [];

            for (let perf of perfs){

                if (perf.xDiscipline===undefined || perf.xDiscipline===0){
                    // discipline not existing in liveAthletics
                    continue;
                }

                ret.push({
                    xDiscipline: perf.xDiscipline,
                    notification: this.perfAlabus2LA(perf.notificationEffort, perf.xDiscipline),
                    notificationEvent: perf.notificationEffortEvent,
                    notificationDate: perf.notificationEffortDate,
                    season: this.perfAlabus2LA(perf.seasonEffort, perf.xDiscipline),
                    seasonEvent: perf.seasonEffortEvent,
                    seasonDate: perf.seasonEffortDate,
                    best: this.perfAlabus2LA(perf.bestEffort, perf.xDiscipline),
                    bestEvent: perf.bestEffortEvent,
                    bestDate: perf.bestEffortDate,
                });
            }

            return ret;

        } else {
            return [];
        }
    }

}