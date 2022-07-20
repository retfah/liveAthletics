
import module from './module.js';



/**
 * This class is meant as the basis for the implementation of connection classes to national bodies, to get their base data, get meeting inscriptions and upload results. At the same time, this class also provides the bae data to other rooms. 
 */
export default class nationalBodyLink extends module {

    /**
     * 
     * @param {string} country country code 3 letters upper case
     * @param {object} mongoDbClient The mongoDb Client
     */
    constructor(country, mongoDbClient){
        super('link'+country, 'nationalBodyLink');

        this.baseDataDate = null;
        this.mongoDB = mongoDbClient.db('nationalBodyLink');
        this.collection;
        this.mongoReady = false;
        this.country = country;
        
        this.lastBaseUpdateDate = null;

        this._startupMongo();
    }

    async _startupMongo(){
        // define the mongoDb-collection for this link model:
        this.collection = await this.mongoDB.collection(this.name);
        this.mongoReady = true;

        // get the current date of last base update
        let len = this.collection.countDocuments({type:'lastBaseUpdateDate'});
        if (len==0){
            // create the document
            await this.collection.updateOne({type:'lastBaseUpdateDate'},{$set:{date:null}},{upsert:true}) //update with upsert=insert when not exists

        } else if (len>1){
            let msg = `National body link ${this.name} cannot be started due to multiple documents of type lastBaseUpdateDate`;
            this.logger.log(1, msg);
            throw msg;
        } else {
            let cursor = this.collection.find({type:'lastBaseUpdateDate'});
            let date = (await cursor.next()).date;
            if (date != null){
                this.lastBaseUpdateDate = new Date (date);    
            } else {
                this.lastBaseUpdateDate = null;    
            }
        }

        // allow other functions to be called when the connection is ready
        this.onMongoConnected();

    }

    // sets the date of the last update to this date or the data specified
    async postUpdateBaseData(date = new Date()){
        // create the document
        await this.collection.updateOne({type:'lastBaseUpdateDate'},{$set:{date:date}},{upsert:true}).catch(err=>{
            this.logger.log(20, `Could not update the date of last base update. Error: ${err}`)
        }) //update with upsert=insert when not exists

        this.lastBaseUpdateDate = date;
    }


    // will be called as soon as the collection is ready
    async onMongoConnected(){

    }

    /**
     * update the base data. 
     * @param {object} opts Object with the options required to get the data; e.g. login credentials to the central database of the national body.
     */
    async updateBaseData(opts){
        // do not forget to call postUpdateBaseData when successfully finished
    }
    
    /**
     * get a list of all competitions that could be imported from the national body
     * @param {object} opts Object with the options required to get the data; e.g. login credentials to the central database of the national body.
     * @resolve {array} [{identifier: 123, name: 'meeting 1', date:'2022-01-01'}, {...}]
     * @reject {object} o.err: 1=general connection error, 2=Server error during processing, 3=no meetings available, 4=credentials invalid
     * 
     */
    async getCompetitions(opts){

    }


    /**
     * Import a competition into the provided meeting.
     * @param {string} identifier The identifier of the meeting (e.g. the meeting name or a key identifying the meeting with the national body)
     * @param {object} meeting The meeting-object to import the competition into.
     * @param {object} opts Object with the options required to get the data; e.g. login credentials to the central database of the national body.
     * @resolve {object} o.notes: some notes about the importing process
     * @resolve {object} o.baseSettings: settings of the base import, eventually needed for results upload (e.g. a meeting ID)
     * @reject {object} o.code: 1=general connection error, 2=Server error during processing, 3=no meetings available, 4=credentials invalid
     */
    async importCompetition(identifier, meeting, opts){

    }

    /**
     * Upload the results of a meeting to the national body. 
     * @param {object} meeting The meeting-object to import the competition into.
     * @param {object} opts Object with the options required to get the data; e.g. login credentials to the central database of the national body.
     */
    uploadResults(meeting, opts){

    }

    // provide search functions. The returned array must contain the dataset of all matching athletes that is required to inscribe this athlete int he main DB.
    getAthlete(searchString){
        // only a search string is provided. The search function should allow to match all white space separated parts with any stuff before and after either in lastname or firstname
    }

    // provide search functions. The returned array must contain the dataset of all matching clubs that is required to put this club int he main DB.
    getClub(name){
        // the given name should match either the name or shortname, if both exist in the respective DB
    }


    /**
     * Get the performance in the base DB for a person
     * @param {string} identification The identification of the athlete in the DB. (Typically the license number. ) We provide it as a string because there might be non-numeric identifiers. The only limitation is that the identifier is unique per athlete
     * @param {integer} xDiscipline The discipline to get the data for.
     * @param {string} type what type of performance is requested; either null (=all), "notification", "season", "best"; default=null
     * @return {object} {notification: 123, season: 123, best: 123} values that were not requested are undefined/not given. Optional: notificationEvent, notificationDate, ...
     */
    async getPerformance(identification, xDiscipline, type=null){

    }

    /**
     * Get all performance (ll disciplines) in the base DB for a person
     * @param {string} identification The identification of the athlete in the DB. (Typically the license number. ) We provide it as a string because there might be non-numeric identifiers. The only limitation is that the identifier is unique per athlete
     * @param {string} type what type of performance is requested; either null (=all), "notification", "season", "best"; default=null
     * @return {array of object} {notification: 123, season: 123, best: 123} values that were not requested are undefined/not given. Optional: notificationEvent, notificationDate, ...
     */
    async getPerformances(identification, type=null){

    }

}