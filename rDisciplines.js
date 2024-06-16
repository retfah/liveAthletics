// TODO: currently, we create a list with the full names of the disciplines on the client and the client gets the full disciploines data, including all translations. This is actually a little bit overkill. Addiationally, it is actually also not absolutely necessary that the client has a regular room-connection, since there will not be any changes during a typical meeting. Therefore, implement creating translated lists on the server and provide them e.g. via a ws-request or add it as auxilar data to other rooms.

import roomServer from './roomServer.js';

/**
 * the room for baseDiscipline/discipline/baseDisciplinesLocalizations management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{baseDiscipline1}, {baseDiscipline2}]
 */
class rDisciplines extends roomServer{

    /** Constructor for the baseDiscipline-room
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
        super(eventHandler, mongoDb, logger, "disciplines@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = []; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all baseDisciplines
        this.models.basedisciplines.findAll({include: [{model:this.models.disciplines, as:"disciplines"}, {model:this.models.basedisciplinelocalizations, as:"basedisciplinelocalizations"}]}).then(baseDisciplines=>{
            this.data = baseDisciplines;
            this.ready = true;
        }).catch(err=>{
            throw err;
        })

        // the disciplines room shall provide pre-baked discipline arrays for all languages to be easily used as auxilary data in other rooms (dynamically injected on fullreload)
        // an object holding all translated lists of disciplines
        this.translations = {};


        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        // TODO: the functions for adding, deleting and updating are still the templated ones for baseDisciplines, not including disciplines and the localizaitons 

        this.functionsWrite.addBaseDiscipline = this.addBaseDiscipline.bind(this);
        this.functionsWrite.deleteBaseDiscipline = this.deleteBaseDiscipline.bind(this);
        this.functionsWrite.updateBaseDiscipline = this.updateBaseDiscipline.bind(this);
        this.functionsWrite.updateLocalization = this.udapteLocalization.bind(this);
        this.functionsWrite.addLocalization = this.addLocalization.bind(this);
        this.functionsWrite.deleteLocalization = this.deleteLocalization.bind(this);

        // define, compile and store the schemas:
        const discipline = {
            xDiscipline: {type: "integer"},
            xBaseDiscipline: {type:"integer"},
            sortorder: {type: "integer"},
            active: {type: ["boolean", "integer"], minimum:0, maximum:1},
            configuration: {type:"string"},
            info: {type:"string", maxLength: 45}
        }
        const baseDiscipline={
            xBaseDiscipline: {type:"integer"},
            type: {type:"integer", minimum:0, maximum:255},
            nameStd: {type:"string", maxLength:50}, // used if there is no translation
            shortnameStd: {type:"string", maxLength:20}, // used if there is no translation
            timeAppeal: {type:"string", format:"time"},
            timeCall: {type:"string", format:"time"},
            baseConfiguration: {type:"string"},
            indoor: {type:'boolean'},
            disciplines: {
                type:'array',
                items: {
                    type:'object',
                    properties:discipline,
                    required:['sortorder', 'active', 'configuration', 'info'], //xBaseDiscipline is not required since it will always be set equal to the baseDiscipline and is not available during add
                    additionalProperties: false,
                },
                minItems:1,
            }
        }
        const schemaAddBaseDiscipline = {
            type: "object",
            properties: baseDiscipline,
            required: ["type", "nameStd", "shortnameStd", "disciplines"],
            additionalProperties: false,
        };
        const schemaUpdateBaseDiscipline = {
            type: "object",
            properties: baseDiscipline,
            required: ["xBaseDiscipline", 'disciplines'],
            additionalProperties: false,
        };
        const schemaDeleteBaseDiscipline = {
            type: "integer"
        };
        const schemaAddLocalization = {
            type: 'object',
            properties:{
                xBaseDiscipline:{type:'integer'},
                language: {type:'string'}, // eventually check also the format
                name: {type:'string'},
                shortname: {type:'string'}
            },
            required: ["xBaseDiscipline", 'language', 'name', 'shortname'],
            additionalProperties: false,
        }        
        const schemaUpdateLocalization = {
            type: 'object',
            properties:{
                xBaseDiscipline:{type:'integer'},
                xDisciplinesLocalization:{type:'integer'},
                language: {type:'string'}, // eventually check also the format
                name: {type:'string'},
                shortname: {type:'string'}
            },
            required: ["xBaseDiscipline", 'xDisciplinesLocalization', 'language', 'name', 'shortname'],
            additionalProperties: false,
        };
        const schemaDeleteLocalization = {
            type: 'object',
            properties:{
                xBaseDiscipline:{type:'integer'},
                xDisciplinesLocalization:{type:'integer'}
            },
            required: ["xBaseDiscipline", 'xDisciplinesLocalization'],
            additionalProperties: false,
        };
        const schemaTechVertical = { // base discipline
            type:"object",
            properties:{
                heightMax:{type:"integer", minimum:1},
                jumpoffHeightVariation:{type:'integer', minimum:1}
            },
            required:['heightMax', 'jumpoffHeightVariation'],
            additionalProperties: false
        };
        const schemaTechHorizontal = { // base discipline
            type:"object",
            properties:{
                wind:{type:"boolean"},
                type:{enum: ['throw', 'jump']}, // differentiate whether the discipline will have an optional distance or a weight 
            },
            required:["wind"], // wind shall always be present, but is simply false for throws
            additionalProperties: false,
        }
        const schemaTrack = { // base discipline
            type: "object",
            properties:{
                distance: {type:'integer', minimum:0},
                startInLanes: {type:"boolean"},
                finishInLanes: {type:"boolean"},
                groupSize: {type:'integer', minimum:1},
                wind: {type:"boolean"},
                straight: {type:"boolean"},
                heatInterval: {type:'integer', minimum:0},
                type: {enum: ["regular", "hurdles", "relay"]},
                crouchStart: {type:"boolean"},
            }
        }
        const schemaRelay = { // discipline
            type:'object',
            properties:{
                numAthletes:{type:'integer', minimum:2},
                numAthletesCompeting:{type:'integer', minimum:2},
                legs: {
                    type:['null', 'array'],
                    items:{type:'string'},
                }
            },
            additionalProperties: false,
            required: ['numAthletes', 'numAthletesCompeting', 'legs'],
        }
        const schemaHurdles = { // discipline
            type:'object',
            properties: {
                height: {type:"number"},
                d1: {type:"number"},
                d2: {type:"number"}, 
                d3: {type:"number"}
            },
            additionalProperties: false,
            required: ['d1', 'd2', 'd3', 'height'],
        }
        const schemaThrows = { // discipline
            type:'object',
            properties: {
                weight: {type:'number'} // in g
            },
            additionalProperties: false,
            required: ['weight'],
        }
        const schemaJumpHor = { // discipline
            type:'object',
            properties: {
                distance: {type:"number"}
            },
            required: [], // distance is optional
            additionalProperties: false,
        }
        this.validateAddBaseDiscipline = this.ajv.compile(schemaAddBaseDiscipline);
        this.validateUpdateBaseDiscipline = this.ajv.compile(schemaUpdateBaseDiscipline);
        this.validateDeleteBaseDiscipline= this.ajv.compile(schemaDeleteBaseDiscipline);
        this.validateAddLocalization = this.ajv.compile(schemaAddLocalization);
        this.validateUpdateLocalization = this.ajv.compile(schemaUpdateLocalization);
        this.validateDeleteLocalization = this.ajv.compile(schemaDeleteLocalization);
        this.validateConfTrack = this.ajv.compile(schemaTrack);
        this.validateConfTechHorizontal = this.ajv.compile(schemaTechHorizontal);
        this.validateConfTechVertical = this.ajv.compile(schemaTechVertical);
        this.validateThrows = this.ajv.compile(schemaThrows);
        this.validateHurdles = this.ajv.compile(schemaHurdles);
        this.validateJumpHor = this.ajv.compile(schemaJumpHor);
        this.validateRelay = this.ajv.compile(schemaRelay);
    }

    getTranslatedDisciplines(lang){
        // check whether the translation already exists, otherwise translate and return it
        return (lang in this.translations) ? this.translations[lang] : this.createTranslation(lang);
    }

    createTranslation(lang='base'){
        // create a discipline-dataset providing everything needed for vue's: xDiscipline, xBaseDiscipline, sortorder, type, relay, name, shortname (before 2021-09 also timeAppeal and timeCall)
        // if lang='base', always the standard name and shortname are used as defined in baseDisciplines. Otherwise it will be tried to find a translation in the basedisciplinelocalizations
        
        let disciplines = [];

        // loop over all baseDisicplines:
        for (let bd of this.data){

            let name, shortname;
            // get the name and shortname: 
            if (lang=='base'){
                // use the default value
                name = bd.nameStd;
                shortname = bd.shortnameStd;
            } else {
                // try to get a translation: 
                let local = bd.basedisciplinelocalizations.find(bdl=>bdl.language==lang);
                if (local){
                    name = local.name;
                    shortname = local.shortname;
                }else {
                    // use the default value
                    name = bd.nameStd;
                    shortname = bd.shortnameStd;
                }
            }

            // loop over the linked disciplines
            for (let d of bd.disciplines){
                // add the discipline when active
                if (d.active){

                    // TODO: some disciplines need further modifications to the names and shortnames based on d.configuration (e.g. hurdle heights, weights)
                    // if we really make modules for different types of disciplines, then wach module should provide a "translator" function doing these modifications
                    if (d.xDiscipline==123){
                        name = name + "";
                        shortname = shortname + "";
                    }

                    // xDiscipline, xBaseDiscipline, sortorder, timeAppeal, timeCall, type, name, shortname 
                    disciplines.push({
                        xDiscipline: d.xDiscipline,
                        xBaseDiscipline: bd.xBaseDiscipline,
                        sortorder: d.sortorder,
                        indoor: bd.indoor,
                        /*timeAppeal: d.timeAppeal,
                        timeCall: d.timeCall,*/
                        type: bd.type,
                        //relay: bd.relay,
                        name: name,
                        shortname: shortname,
                        configuration:d.configuration,
                        baseConfiguration: bd.baseConfiguration,
                        info: d.info,
                    })
                }
            }
        }

        // sort the disciplines:
        disciplines.sort((el1, el2)=>{return el1.sortorder-el2.sortorder})

        this.translations[lang] = disciplines;
        return disciplines;
    }

    /**
     * add localization
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addLocalization(data){

        // validate the data based on the schema
        let valid = this.validateAddLocalization(data);
        if (!valid){
            throw {message: this.ajv.errorsText(this.validateAddLocalization.errors), code:21};
        }

        // find the base Discipline
        let bd = this.data.find(el=>el.xBaseDiscipline == data.xBaseDiscipline);
        if (!bd){
            throw {message: `Base discipline ${data.xBaseDiscipline} does not exist`, code:22};
        }

        // check that the language does not exist yet
        if (bd.basedisciplinelocalizations.find(el=>el.language==data.language) !==undefined){
            throw {message: `Language ${data.language} already exists for base discipline ${data.xBaseDiscipline}.`, code:23};
        }

        // try to create the baseDiscipline

        var bdl = await this.models.basedisciplinelocalizations.create(data).catch((err)=>{throw {message: `Sequelize-problem: BaseDiscipline-localization could not be created: ${err}`, code:24}})

        bd.basedisciplinelocalizations.push(bdl); 

        // the data to be sent back to the client requesting the add is the full data
        let sendData = bdl.dataValues;

        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'addLocalization',
            data: bd.dataValues // should have the same properties as data, but with added index
            // the UUID will be added on resolve
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // deleteBaseDiscipline
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
    }

    /**
     * update localization
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async udapteLocalization(data){

        // validate the data based on the schema
        let valid = this.validateUpdateLocalization(data);
        if (!valid){
            throw {message: this.ajv.errorsText(this.validateUpdateLocalization.errors), code:21};
        }

        // find the base Discipline
        let bd = this.data.find(el=>el.xBaseDiscipline == data.xBaseDiscipline);
        if (!bd){
            throw {message: `Base discipline ${data.xBaseDiscipline} does not exist`, code:22};
        }

        // check that the language does not exist yet
        let bdl = bd.basedisciplinelocalizations.find(el=>el.xDisciplinesLocalization==data.xDisciplinesLocalization);
        if (!bdl){
            throw {message: `xDisciplinesLocalization ${data.xDisciplinesLocalization} does not exists for base discipline ${data.xBaseDiscipline}.`, code:23};
        }

        // try to update the baseDiscipline
        await bdl.update(data).catch(err=>{throw {message: `updating failed in sequelize: ${err}`, code: 24}})

        // the data to be sent back to the client requesting the add is the full data
        let sendData = bdl.dataValues;

        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'updateLocalization',
            data: bd.dataValues // should have the same properties as data, but with added index
            // the UUID will be added on resolve
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // deleteBaseDiscipline
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
    }

    async deleteLocalization(data){

        // data must be an integer (the xMeeting id)
        if (!this.validateDeleteLocalization(data)){
            throw {message: this.ajv.errorsText(this.validateDeleteLocalization.errors), code:21};
        }

        // get the entry from the data (respectively its index first):
        let bd = this.data.find(el=>el.xBaseDiscipline == data.xBaseDiscipline);
        if (!bd){
            throw {message:`xBaseDiscipline ${data.xBaseDiscipline} could not be found.`, cide:22}
        }

        let bdl = bd.basedisciplinelocalizations.find(el=>el.xDisciplinesLocalization == data.xDisciplinesLocalization);
        if (!bdl){
            throw {message:`xDisciplinesLocalization ${data.xDisciplinesLocalization} could not be found.`, cide:23}
        }
        await bdl.destroy().catch(err=> {throw {message: `Localization ${data.xDisciplinesLocalization} could not be deleted!`, code:24}})

        // delete the entry locally from the data:
        let ind = this.data.find(el=>el.xBaseDiscipline == data.xBaseDiscipline);
        this.data.splice(ind, 1);

        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'deleteLocalization',
            data: data
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // addBaseDiscipline
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
    }

    // validate baseDiscipline.configuration and discipline.configuration
    async validateConfigurations(data){
        // valdidate baseConfiguration
        var bc
        try{
            bc = JSON.parse(data.baseConfiguration);
        }catch(err){
            throw {message:`Could not parse base configuration: ${err}`, code: 22}
        }
        if (data.type==1){
            // jump vertical
            if (!this.validateConfTechVertical(bc)){
                throw {message: `Base configuration invalid: ${this.ajv.errorsText(this.validateConfTechVertical.errors)}`, code: 23};
            }
        } else if (data.type==2){
            //technical horizontal
            if (!this.validateConfTechHorizontal(bc)){
                throw {message: `Base configuration invalid: ${this.ajv.errorsText(this.validateConfTechHorizontal.errors)}`, code: 23};
            }
        } else {
            // track
            if (!this.validateConfTrack(bc)){
                throw {message: `Base configuration invalid: ${this.ajv.errorsText(this.validateConfTrack.errors)}`, code: 23};
            }
        }
        
        // validate configuration of the disciplines
        for (let d of data.disciplines){
            var dc
            try{
                dc = JSON.parse(d.configuration);
            }catch(err){
                throw {message:`Could not parse discipline configuration: ${err}`, code: 24}
            }
            if (data.type==2 && bc.type=='throw'){
                if (!this.validateThrows(dc)){
                    throw {message: `Discipline configuration invalid: ${this.ajv.errorsText(this.validateThrows.errors)}`, code: 25};
                }
            } else if (data.type==2 && bc.type=='jump'){
                if (!this.validateJumpHor(dc)){
                    throw {message: `Discipline configuration invalid: ${this.ajv.errorsText(this.validateJumpHor.errors)}`, code: 25};
                }
            } else if (data.type==3 && bc.type=='hurdles'){
                if (!this.validateHurdles(dc)){
                    throw {message: `Discipline configuration invalid: ${this.ajv.errorsText(this.validateHurdles.errors)}`, code: 25};
                }
            } else if (data.type==3 && bc.type=='relay'){
                if (!this.validateRelay(dc)){
                    throw {message: `Discipline configuration invalid: ${this.ajv.errorsText(this.validateRelay.errors)}`, code: 25};
                }
            }
        }
    }

    /**
     * add an baseDiscipline
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addBaseDiscipline(data){

        // validate the data based on the schema
        if (!this.validateAddBaseDiscipline(data)){
            throw {message: this.ajv.errorsText(this.validateAddBaseDiscipline.errors), code:21};
        }

        // validate (base-)configuration
        await this.validateConfigurations(data);

        // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
        // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addBaseDiscipline, updateBaseDiscipline, ... would have to actively call this function in it
        // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
        var dataTranslated = data; //this.translateBooleans(data);

        // without having the property, it owuld not be included in the output 
        dataTranslated.basedisciplinelocalizations = [];

        // first, try to add the base discipline
        var baseDiscipline = await this.models.basedisciplines.create(dataTranslated, {include: [{model:this.models.disciplines, as:"disciplines"}, {model:this.models.basedisciplinelocalizations, as:"basedisciplinelocalizations"}]}).catch((err)=>{throw {message: `Sequelize-problem: BaseDiscipline could not be created: ${err}`, code:26}})

        this.data.push(baseDiscipline); 

        // then add each discipline --> sequelize can do nested inserts meanwhile!
        /*for (let d of data.disciplines){
            d.xBaseDiscipline = baseDiscipline.xBaseDiscipline;
            let discipline = await this.models.disciplines.create(d).catch((err)=>{throw {message: `Sequelize-problem: Discipline could not be created: ${err}`, code:27}});
            baseDiscipline.disciplines.push(discipline);
        }*/

        // the data to be sent back to the client requesting the add is the full data
        let sendData = baseDiscipline.get({plain:true});

        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'addBaseDiscipline',
            data: sendData // should have the same properties as data, but with added xBaseDiscipline
            // the UUID will be added on resolve
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // deleteBaseDiscipline
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
    }


    async deleteBaseDiscipline(data){

        // data must be an integer (the xMeeting id)
        if (!this.validateDeleteBaseDiscipline(data)){
            throw {message: this.ajv.errorsText(this.validateDeleteBaseDiscipline.errors), code:21};
        }

        // get the entry from the data (respectively its index first):
        let baseDiscipline = this.data.find(el=>el.xBaseDiscipline == data);
        if (!baseDiscipline){
            throw {message: `Could not find baseDiscipline ${data}.`, code:22};
        }

        // try to delete all disciplines
        let disciplineDeleteErrors = [];
        let proms = [];
        for (let d of baseDiscipline.disciplines){
            proms.push(d.destroy().catch(err=>disciplineDeleteErrors.push(err)));
        }
        await Promise.all(proms);
        if (disciplineDeleteErrors.length>0){
            throw {message: `Could not delete the discipline, since at least one variation could not be deleted ${disciplineDeleteErrors.reduce((x, i)=>x+i, '')}.`, code:23};
        }

        // try to delete the translations
        let translationDeleteErrors = [];
        proms = [];
        for (let d of baseDiscipline.basedisciplinelocalizations){
            proms.push(d.destroy().catch(err=>translationDeleteErrors.push(err)));
        }
        await Promise.all(proms);
        if (translationDeleteErrors.length>0){
            throw {message: `Could not delete the discipline, since at least one variation could not be deleted ${translationDeleteErrors.reduce((x, i)=>x+i, '')}.`, code:24};
        }

        // delete the entry in the meetings table
        await baseDiscipline.destroy().catch((err)=>{
            throw {message: `BaseDiscipline could not be deleted ${err}`, code:25}
        });

        // delete the entry locally from the data:
        let i = this.data.findIndex(el=>el.xBaseDiscipline == data);
        this.data.splice(i,1);

        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'deleteBaseDiscipline',
            data: data
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // addBaseDiscipline
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
    }

    
    async updateBaseDiscipline(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        if (!this.validateUpdateBaseDiscipline(data)){
            throw {code: 21, message: this.ajv.errorsText(this.validateUpdateBaseDiscipline.errors)}
        }

        // check (base-)configuration
        await this.validateConfigurations(data);

        // get the entry from the data (respectively its index first):
        let baseDiscipline = this.data.find(el=>el.xBaseDiscipline == data.xBaseDiscipline);
        if (!baseDiscipline){
            throw {message: `Could not find baseDiscipline ${data.xBaseDiscipline}.`, code:26};
        }

        // NOTE: nested updating is not possible yet (2024-05) --> we need to do updates separately for the baseDiscipline as well as for the disciplines.

        // first update all disciplines (since we later want to delete the disciplines from data
        
        // check for deleted disciplines and update the others
        for (let d of baseDiscipline.disciplines){
            // if the discipline cannot be found in the sent data, delete it
            let dd = data.disciplines.find(x=>x.xDiscipline == d.xDiscipline);
            if (dd == undefined){
                // delete
                await d.destroy().catch((err)=>{
                    throw {message: `Discipline ${d.xDiscipline} could not be deleted ${err}`, code:27}
                });
                let i = baseDiscipline.disciplines.findIndex(x=>x==d);
                baseDiscipline.disciplines.splice(i,1);
            } else {
                // update
                await d.update(dd).catch((err)=>{
                    throw {message: `Discipline ${d.xDiscipline} could not be updated ${err}`, code:28}
                })
            }
        }

        // add new disciplines
        for (let dd of data.disciplines){
            let d = baseDiscipline.disciplines.find(x=>x.xDiscipline == dd.xDiscipline);
            if (d==undefined){
                // add discipline
                dd.xBaseDiscipline = baseDiscipline.xBaseDiscipline;
                let dNew = await this.models.disciplines.create(dd).catch((err)=>{throw {message: `Sequelize-problem: Discipline could not be created: ${err}`, code:29}})
                baseDiscipline.disciplines.push(dNew);
            }
        }

        // all disciplines modified by now.
        // delete disciplines from the data object for updating
        delete data.disciplines;

        await baseDiscipline.update(data).catch((err)=>{
            throw {code: 22, message: "Could not update the baseDiscipline with the respective Id. Error: " + err};
        });

        // the data to be sent back to the client requesting the add is the full data
        let sendData = baseDiscipline.get({plain:true});

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // addBaseDiscipline
            data: {}
            // the ID will be added on resolve
        };

        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateBaseDiscipline', data: sendData}, 
            undoObj,
            response: sendData,
            preventBroadcastToCaller: true
        };
        
        // the rest is done in the parent
        return ret;
    }

}

export default rDisciplines;