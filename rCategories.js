




import conf from './conf.js';
import roomServer from './roomServer.js';

/**
 * the room for category management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{category1}, {category2}]
 */
class rCategories extends roomServer{

    /** Constructor for the category-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false)
        super(eventHandler, mongoDb, logger, "categories@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = []; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all categories
        this.models.categories.findAll().then(categories=>{
            this.data = categories;
            this.ready = true;
            //this.eH.raise(`${this.name}:initialized`)
        })

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addCategory = this.addCategory.bind(this);
        this.functionsWrite.deleteCategory = this.deleteCategory.bind(this);
        this.functionsWrite.updateCategory = this.updateCategory.bind(this);

        // define, compile and store the schemas:
        let cat = {
            xCategory: {type:"integer"},
            shortname: {type:"string", maxLength:4},
            name: {type:"string", maxLength:30},
            sortorder: {type:"integer"},
            ageMin: {type:"integer", minimum:0, maximum:255},
            ageMax: {type:"integer", minimum:0, maximum:255},
            code: {type:"string", maxLength:4},
            sex: {type:"string", enum:conf.sexes},
            active: {type:"boolean"}, // eventually must be changed to integer
        }
        let schemaAddCategory = {
            type: "object",
            properties: cat,
            required: ["shortname", "name", "ageMin", "ageMax", "sex", "code"]
        };
        let schemaUpdateCategory = {
            type: "object",
            properties: cat,
            required: ["xCategory"]
        };
        let schemaDeleteCategory = {
            type: "integer"
        }
        this.validateAddCategory = this.ajv.compile(schemaAddCategory);
        this.validateUpdateCategory = this.ajv.compile(schemaUpdateCategory);
        this.validateDeleteCategory= this.ajv.compile(schemaDeleteCategory);
 
    }

    /**
     * add an category
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addCategory(data){

        // validate the data based on the schema
        let valid = this.validateAddCategory(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addCategory, updateCategory, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var category = await this.models.categories.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: Category could not be created: ${err}`, code:22}})

            this.data.push(category); 

            // the data to be sent back to the client requesting the add is the full data
            let sendData = category.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addCategory',
                data: category.dataValues // should have the same properties as data, but with added xCategory
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteCategory
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
            throw {message: this.ajv.errorsText(this.validateAddCategory.errors), code:23};
        }
    }


    async deleteCategory(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteCategory(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, category] = this.findObjInArrayByProp(this.data, 'xCategory', data)

            // delete the entry in the meetings table
            await this.models.categories.destroy({where:{xCategory: data}}).catch(()=>{
                throw {message: "Category could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data, 'xCategory', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteCategory',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addCategory
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
            throw {message: this.ajv.errorsText(this.validateDeleteCategory.errors), code:23};
        }
    }

    
    async updateCategory(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateCategory(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data, 'xCategory', data.xCategory);
            if (i<0){
                throw {code:24, message:"The category does not exist anymore on the server (should actually never happen)."};
            }

            let categoryOld = o.dataValues;

            return o.update(data).then(async(categoryChanged)=>{
                // the data should be updated in th DB by now.

                // set the local data
                this.data[i] = categoryChanged;

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateCategory', data: categoryChanged.dataValues}, 
                    undoObj: {funcName: 'updateCategory', data: categoryOld, ID: this.ID},
                    response: categoryChanged.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the category with the respective Id. Error: " + err};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateEventGroup.errors)}
        }
    }

    /**
     * calculate the best matching category for the given brithdate and sex
     * birthdate and meetingdate as date-string
     * @returns {integer} xCategory
     */
    catCalc(meetingdate, birthdate, sex, returnAllMatching=false){

        // copied from catCalcWorker in athletes.ejs

        // calculate the best matching category based on the birthdate (as string, e.g. '1992-03-28') and the sex
        // returns the xCategory or undefined when no matching category was found and returnAllMatching is false; returns an array with all matching categories with the best category being first

        // if both the age and the sex are known, calculate the default category
        // the best fitting category is the one with the lowest age-span (and the sex matches)
        // if two are identical, take the first one
        let enddate = new Date();
        if (meetingdate){
            enddate = new Date(meetingdate);
        }
        let meetingYear = enddate.getFullYear();
        let athleteYear = Number(birthdate.split('-')[0]);
        let age = meetingYear - athleteYear;

        // list of matching categories; entries: {xCategory, catSpan, catDelta}
        let matchingCategories = [];

        // loop over all categories and find the best category
        // let xCatBest = -1; // xCategory of the best category so far
        // let catSpanBest = 9999; // age span of the currently best category
        // let catDeltaBest = 9999; // delta of the age between maxAge of the best cat and the athlete
        for (let cat of this.data){
            if (cat.sex==sex && cat.ageMax>=age && cat.ageMin<=age){
                // the category basically suits:

                let catSpan = cat.ageMax - cat.ageMin; // age span of the currently best category
                let catDelta = cat.ageMax-age; // delta of the age between maxAge of the best cat and the athlete
                matchingCategories.push({
                    xCategory: cat.xCategory,
                    catSpan,
                    catDelta
                })

                // // basically the category suits; is it better than the currently best?
                // if ((catSpanBest > catSpan && catDeltaBest >= catDelta) || (catSpanBest >= catSpan && catDeltaBest>catDelta)){
                //     // at least one criterion is better
                //     xCatBest = cat.xCategory;
                //     catSpanBest = catSpan;
                //     catDeltaBest = catDelta;
                // }
            }
        }
        // sort the array: first priority: catDelta, second priority: catBest
        matchingCategories.sort((cat1, cat2)=>{
            if (cat1.catDelta>cat2.catDelta){
                return 1;
            } else {
                // equal must be 0; non equal must be non-zero
                if (cat1.catSpan==cat2.catSpan){
                    return 0
                } else {
                    return cat1.catSpan < cat2.catSpan ? -1 : 1;
                }
            }
        })
        if (returnAllMatching){

            return matchingCategories.map(el=>el.xCategory);
        } else {
            if (matchingCategories.length>0){
                return matchingCategories[0].xCategory;
            } else {
                return;
            }

            /*if (xCatBest==-1){
                // no matching cat found
                return
            } else {
                return xCatBest;
            }*/
        }

    }

}

export default rCategories;