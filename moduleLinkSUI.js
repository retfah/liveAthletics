import https from 'https';
import fs from 'fs';
import zlib from 'zlib';
import {pipeline} from 'stream/promises';
import {parseStringPromise} from 'xml2js';
import conf from './conf.js';
import Sequelize  from 'sequelize';
import { streamToString } from './common.js';
const Op = Sequelize.Op;
import {Worker, isMainThread, parentPort, workerData} from  'node:worker_threads';

import initModels from "./modelsBaseSUI/init-models.js"; // es6 with define syntax (based on modified sequelize-auto functions, run as es5 but creating es6-import with define)
import nationalBodyLink from "./nationalBodyLink.js"

// link to alabus
export default class moduleLinkSUI extends nationalBodyLink {

    // to initialize this class we should use this static creator function, since the preparation of the sequelize-DB-connection is async
    static async create(logger, mongoClient){

        // ------------------
        // Start the connection to the DB with sequelize
        // ------------------

        // try to connect to DB, load some data and write some others
        const sequelizeBase = new Sequelize('basesui', conf.database.username, conf.database.password, {
            dialect: 'mariadb', // mariadb, mysql
            dialectOptions: {
                timezone: 'local',
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

        // something completely different: get Data from alabus! Works so far!
        this.conf = {
            //host: 'alabus.swiss-athletics.ch', // live server
            host: 'alabustest.swiss-athletics.ch', // test server
            port: 443,
            pathBaseData: '/rest/License/Athletica/ExportStammDataFull',
            pathCompetitionList: "/rest/Event/Athletica/ExportMeetingList",
            pathCompetitionData: "/rest/Event/Athletica/MeetingData",
            pathResultsUpload: "/rest/Event/Athletica/ImportResultData",
            //method: 'GET', // not necessary when https.get is used
            headers: {
                authorization: "Basic " + Buffer.from("121832:struppi1").toString('base64'),// base64(username:pw)}
                connection: 'close'
            },
            debug: true, // stores the baseData locally as a file (DOES NOT WORK YET)
            fileNameBaseData: "StammdatenNode.gz", // only used when debug=true

            // TODO: create a list matching the alabus discipline numbers and the local dicipline numbers; including indoor/outdoor
            disciplineTranslationTable: {
                // liveAthletics:Alabus
                207:310, // high jump
                206:320, // PV

            },
            disciplineTranslationTableInv: {
                // the backtranslation table is created below
            }
            

            // the categories are given as code (e.g. MAN_, U20M, ...) --> translate it automatically, by stripping the _ from MAN_ and WOM_ and keep all the rest the same.
        } 

        // create the inverse disciplineTranslationTable
        for (const [o,v] of Object.entries(this.conf.disciplineTranslationTable)){
            this.conf.disciplineTranslationTableInv[v]=parseInt(o);
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
        if (xDiscipline>=206 && xDiscipline<=207){
            // PV and HJ: '000002.05', in m

            const val = parseFloat(perf);
            if (isNaN(val)){
                return ''; // not zero, but emtpy string!
            } else {
                return val*100; // to cm.
            }

        } else {
            return 0;
        }
    }

    /**
     * Translate the performance value from liveAthletics to Alabus. 
     * @param {string} perf The performance as given by liveAthletics
     * @param {integer} xDiscipline xDiscipline of liveAthletics
     */
    perfLA2Alabus(perf, xDiscipline){
        // TODO
    }

    /**
     * update the base data. 
     * @param {object} opts Object with the options required to get the data; e.g. login credentials to the central database of the national body.
     * @param {string} opts.username The username for the login (actually the license/member number)
     * @param {string} opts.password 
     */
    async updateBaseData(opts){

        // TODO: move the first part (download, extracting and xml2js in a separate Worker thread (https://nodejs.org/api/worker_threads.html#new-workerfilename-options)) in order to not occupy the main process

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
                msg = `Download of base data successful. Duration: ${(timeDownloaded - timeStart)/1000}s. (If debug: write to file, then ...) Starting unzipping.`;
                notes.push(msg);
                this.logger.log(90, msg);
    
                // first, simply store the compressed data (e.g. interesting for debugging to have the data file, but in the smaller, compressed version)
    
                // TODO: use raw queries for everything, since we do not need the model overhead!
                // TODO: do not create all promises first but always use await! Otherwise we use massive amounts of memory (ram) to keep track of all our promises
                
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
                pipeline(resForProcessing, zlib.createGunzip(), streamToString).then(async (xmlString)=>{
                    // parse the xml (might take some time...)
                    let timeUnzipped = new Date();
                    msg = `Unzipping file successful. Duration: ${(timeUnzipped - timeDownloaded)/1000}s. Starting parsing the xml.`;
                    notes.push(msg);
                    this.logger.log(90, msg);
                    //parseStringPromise(xmlString, {explicitArray:false,})
                    this.parseBase(xmlString)
                    .then(async (xml)=>{
    
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
                        for (let club of xml.watDataset.accounts.account){
    
                            // there are currently (2022-05) two accounts (accountCode) that appear twice with a different accountType ("Verein" and "Lauftreff"). Since the athletes only reference the acctountCode, it should actually be unique. For the moment, we simply import only non-Lauftreff accounts.
    
                            if (club.accountType != 'Lauftreff'){
    
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
                        let athleteInsertQuery = 'insert into athletes (license, licensePaid, licenseCategory, lastname, firstname, sex, nationality, clubCode, birthdate)\n values \n';
                        let performanceInsertQuery = "insert into performances (license, discipline, bestEffort, bestEffortDate, bestEffortEvent, seasonEffort, seasonEffortDate, seasonEffortEvent, notificationEffort, notificationEffortDate, notificationEffortEvent, season) values ";
    
                        // do a first loop where we try to run two big sql queries for the inserts
                        for (let athlete of xml.watDataset.athletes.athlete){
    
                            let license = parseInt(athlete.$.license);
                            if (isNaN(license)){
                                msg = `License was NaN: ${athlete.$.license} ${athlete.firstName} ${athlete.lastName}. Skip this athlete.`;
                                notes.push(msg);
                                this.logger.log(90, msg);
                                continue;
                            }
                            let birthdate = athlete.birthDate.slice(6,10)+'-'+athlete.birthDate.slice(0,2)+'-'+athlete.birthDate.slice(3,5);
                            let sex = athlete.sex.toUpperCase()=='W' ? 'f' : 'm';
    
                            athleteInsertQuery += `("${license}", ${athlete.$.licensePaid=='0' ? false : true}, "${athlete.$.licenseCat}", "${athlete.lastName}", "${athlete.firstName}", "${sex}", "${athlete.nationality}", "${athlete.accountCode}", "${birthdate}"),`;
    
                            // TODO: performances
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
        
                                    performanceInsertQuery += `("${license}", ${parseInt(perf.$.sportDiscipline)}, "${bestEffort}", "${bestEffortDate}", "${bestEffortEvent}", "${seasonEffort}", "${seasonEffortDate}", "${seasonEffortEvent}", "${notificationEffort}", "${notificationEffortDate}", "${notificationEffortEvent}", "O"),\n`;
    
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
        
                                    performanceInsertQuery += `("${license}", ${parseInt(perf.$.sportDiscipline)}, "${bestEffort}", "${bestEffortDate}", "${bestEffortEvent}", "${seasonEffort}", "${seasonEffortDate}", "${seasonEffortEvent}", "${notificationEffort}", "${notificationEffortDate}", "${notificationEffortEvent}", "I"),\n`;
    
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
                            let msg = 'Inserting all athletes at a time was not successful. Trying to insert them separately.'+err.toString();
                            notes.push(msg);
                            this.logger.log(98, msg);
                        });
    
                        const timeAthletesInserted = new Date();
                        msg = `Athlete sql insertion (attempt) finished. Duration: ${(timeAthletesInserted - timeAthleteStringCreated)/1000}s. Try to insert all performances at once.`;
                        notes.push(msg);
                        this.logger.log(90, msg);
    
                        let performancesInserted = false;
                        performanceInsertQuery = performanceInsertQuery.slice(0,-2) + ";";
                        await this.sequelize.query(performanceInsertQuery, {logging:false, raw:true}).then(()=>{performancesInserted=true}).catch(err=>{
                            let msg = 'Inserting all performances at a time was not successful. Trying to insert them separately.';
                            notes.push(msg);
                            this.logger.log(98, msg + err.toString());
                        });
                        const timePerformancesInserted = new Date();
                        msg = `Performances sql insertion (attempt) finished. Duration: ${(timePerformancesInserted - timeAthletesInserted)/1000}s. If needed, start single inserts of athletes ${!athletesInserted} and/or performances ${!performancesInserted}.`;
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
                                    msg = `Inserting athletes from ${i-logAfterN} to ${i} took ${((new Date())-timeBefore)/1000}s.`;
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
                
                                            let query = `insert into performances (license, discipline, bestEffort, bestEffortDate, bestEffortEvent, seasonEffort, seasonEffortDate, seasonEffortEvent, notificationEffort, notificationEffortDate, notificationEffortEvent, season) values ("${license}", ${parseInt(perf.$.sportDiscipline)}, "${bestEffort}", "${bestEffortDate}", "${bestEffortEvent}", "${seasonEffort}", "${seasonEffortDate}", "${seasonEffortEvent}", "${notificationEffort}", "${notificationEffortDate}", "${notificationEffortEvent}", "O");`;
    
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
                
                                            let query = `insert into performances (license, discipline, bestEffort, bestEffortDate, bestEffortEvent, seasonEffort, seasonEffortDate, seasonEffortEvent, notificationEffort, notificationEffortDate, notificationEffortEvent, season) values ("${license}", ${parseInt(perf.$.sportDiscipline)}, "${bestEffort}", "${bestEffortDate}", "${bestEffortEvent}", "${seasonEffort}", "${seasonEffortDate}", "${seasonEffortEvent}", "${notificationEffort}", "${notificationEffortDate}", "${notificationEffortEvent}", "I");`;
    
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
                                msg = `Single athletes insertion finished: successful: ${success}, failed: ${fail}. Errors: ${errorCodesA}`;
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

                        // report success
                        resolve(notes);
    
                    }).catch((err)=>{
                        throw {code:29, message:`Error in the worker for parsing: ${JSON.stringify(err)}`}
                    });

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
                
                pipeline(res, streamToString).then(async (rawMsg)=>{
    
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
                        const competitionNames = lines[1].slice(5).split(':');
                        const competitionDates = lines[2].slice(10).split(':');
    
                        // all arrays should have the same length
                        let competitions = [];
                        for (let i=0; i<competitionIDs.length; i++){
                            const dateParts = competitionDates[i].split('.');
                            const date = new Date(Date.UTC(parseInt(dateParts[2]), parseInt(dateParts[1])-1, parseInt(dateParts[0]))); // month is zero based
    
                            competitions.push({
                                identifier: competitionIDs[i],
                                name: competitionNames[i].slice(1,-1), // there are '' around the name
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
     * @param {string} identifier The identifier of the meeting (e.g. the meeting name or a key identifying the meeting with the national body)
     * @param {object} meetingRooms The meeting-object to import the competition into.
     * @param {object} opts Object with the options required to get the data; e.g. login credentials to the central database of the national body.
     * @resolve {object} o.notes: some notes about the importing process
     * @resolve {object} o.baseSettings: settings of the base import, eventually needed for results upload (e.g. a meeting ID)
     * @reject {object} o.code: 1=general connection error, 2=Server error during processing, 3=meeting does not exist, 4=credentials invalid
     */
    async importCompetition(identifier, meetingRooms, opts){

        // request must be post; 
        // request body: &meetingid=123456
        // type: application/x-www-form-urlencoded

        const requestBody = `&meetingid=${identifier}`;

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

        // delete existing athletes first or not? set default value
        // 0 == do noting; 1== delete all starts, 2== delete athletes and starts
        opts.deleteAthletes ?? 0; 

        if (opts.deleteAthletes>0){
            // delete all starts related to an athlete in this base
            // TODO
        }

        if (opts.deleteAthletes==2){
            // delete all athletes linked with this base
            // TODO
        }

        
        // we must use a "manual" Promise here since the events of the request are called synchonously without .catch. Therefore "throwing" inside an event-callback would result in a UnhandledPromiseRejection Error.
        return new Promise((resolve, reject)=>{

            this.logger.log(90, 'Starting download of competition.')
            let timeStart = new Date();
    
            // TODO: post parameter!
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
    
                // TODO: what response do we get when there is no meeting with the given ID?
                // --> error {code:3, message:`Meeting with ID ${identifier} does not exist.`}
                
                // ungzip and import: 
                pipeline(res, streamToString).then(async (xmlString)=>{
                    // parse the xml (might take some time...)
                    let timeUnzipped = new Date();
                    this.logger.log(90, `toString successful. Duration: ${(timeUnzipped - timeDownloaded)/1000}s. Starting parsing the xml.`);
                    return parseStringPromise(xmlString, {explicitArray:true,}).then(async (xml)=>{
                        
                        let notes = [];
                        let newCount = 0;
                        let updateCount = 0;
                        let failCount = 0;

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
                            const xDiscipline = this.conf.disciplineTranslationTableInv[parseInt(disc.$.disCode)];
                            
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
                                    xEventGroup: null,
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
                                                sortValue: athBase.clubSortvalue,
                                            }

                                            club = meetingRooms.clubs.serverFuncWrite('addClub', insertClubData).catch(err=>{
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

                                            region = meetingRooms.regions.serverFuncWrite('addRegion', regionData).catch(err=>{
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

                                        let x=3;

                                    }


                                }
                            }


                        }
                        
                        
                        // TODO: temporary implement here the stuff for the foreign-athletes stuff.


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
    
            })

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

        const xDisciplineAlabus = this.conf.disciplineTranslationTable[xDiscipline];


        let perf = await this.models.performances.findOne({where:{license:identification, discipline: xDisciplineAlabus}, logging:false,});

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
     * Get all performance (ll disciplines) in the base DB for a person
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

                const xDiscipline = this.conf.disciplineTranslationTableInv[perf.discipline];
                if (!xDiscipline){
                    // discipline not existing in liveAthletics
                    continue;
                }

                ret.push({
                    xDiscipline: xDiscipline,
                    notification: this.perfAlabus2LA(perf.notificationEffort, xDiscipline),
                    notificationEvent: perf.notificationEffortEvent,
                    notificationDate: perf.notificationEffortDate,
                    season: this.perfAlabus2LA(perf.seasonEffort, xDiscipline),
                    seasonEvent: perf.seasonEffortEvent,
                    seasonDate: perf.seasonEffortDate,
                    best: this.perfAlabus2LA(perf.bestEffort, xDiscipline),
                    bestEvent: perf.bestEffortEvent,
                    bestDate: perf.bestEffortDate,
                });
            }

            return ret;

        } else {
            return [];
        }
    }

    // TODO: implement all functions!
}