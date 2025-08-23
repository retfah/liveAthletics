
// TODO: add default values in ajv validation to make sure that no undefined properties are sent ot the client 

import groups from './modelsMeetingDefine/groups.js';
import roomServer from './roomServer.js';
import rEventGroup from './rEventGroup.js';

import Sequelize  from 'sequelize';
import rdEventsWithGroups from './rdEventsWithGroups.js';
const Op = Sequelize.Op;

/**
 * the room for eventGroup management (adding, deleting, updating,  ...), including rounds and groups
 * The data stores a list of objects: data =[{eventGroup1}, {eventGroup2}]
 */
class rEventGroups extends roomServer{

    /** Constructor for the eventGroup-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {sequelize} sequelizeMeeting sequelize The sequelize connection to the meetingDB
     * @param {sequelizeModels} modelsMeeting sequelize-models The sequelize models of the Meeting-DB
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     */
    constructor(meetingShortname, sequelizeMeeting, modelsMeeting, mongoDb, eventHandler, logger, startsInGroup, inscriptions, starts){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false)
        super(eventHandler, mongoDb, logger, "eventGroups@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = []; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        // reference to other rooms:
        this.startsInGroup = startsInGroup;
        this.rContests = undefined; // will be set later
        this.rInscriptions = inscriptions;
        this.rStarts = starts;
        this.rEvents = undefined; // will be set later

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all eventGroups, rounds and roundGroups
        this.models.eventgroups.findAll({include: [{model:this.models.rounds, as:"rounds", include:[{model:this.models.groups, as:"groups"}]}]}).then(eventGroups=>{
            this.data = eventGroups;
            this.ready = true;

            // TODO: for testing only
            /*let eG = eventGroups[0];
            let dynamicRoom = {
                parentRoom: this,
                timeout: 1000 // keep the room open forever; to be changed in the future, when we have a timeout function (without the timeout, I think it's better to keep the room open)
            };
            setTimeout(()=>{
                let subroom = new rEventGroup(dynamicRoom, eG, this.meetingShortname, this.mongoDB, this.eH, this.logger, this, this.rContests, this.startsInGroup, this.rInscriptions, this.rStarts, this.rEvents);

            }, 1000) // make sure that the other rooms are defined
            */
        })

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addEventGroup = this.addEventGroup.bind(this);
        this.functionsWrite.deleteEventGroup = this.deleteEventGroup.bind(this);
        this.functionsWrite.updateEventGroup = this.updateEventGroup.bind(this);

        this.functionsWrite.addRound = this.addRound.bind(this);
        this.functionsWrite.deleteRound = this.deleteRound.bind(this);
        this.functionsWrite.updateRound = this.updateRound.bind(this);
        

        // define, compile and store the schemas:
        let schemaAddEventGroup = {
            type: "object",
            properties: {
                xEventGroup: {type: "integer"}, // used only by server2server / sideChannel
                xDiscipline: {type: "integer"},
                name: {type: "string", maxLength:50},
                combined: {type: "boolean"}, 
                // currently we want to prevent round changes via the event group since the checks for correct order is not implemented in eventgroup
                /*
                rounds: {
                    type:"array",
                    items: {
                        type:"object",
                        properties:{
                            xRound: {type: "integer"},
                            name: {type: "string"},
                            //xEventGroup: {type: "integer"}, // does it work without it, i.e. does it automatically add the eventgroup? actually it should
                            order: {type:"integer"},
                            numGroups: {type: "integer"},
                            qualiModule: {type: "string"},
                            qualiConf: {type: "string"},
                            // 2021-05-29: double eager insert actually works, but right after the successful inserts "sequelize" crashes with a cyclic dependency error. Therefore I currently avoid this
                            // 2021-06-05: probably the error was actually within MongoDB and not sequelize!
                            /*groups: {
                                type:"array",
                                items: {
                                    type:"object",
                                    properties: {
                                        // xRound: {type:"integer"}, // part of the primary key
                                        number: {type:"integer"}, // part of the primary key
                                        xContest:{type: "integer"}, // optional
                                        name:{type:"string"}
                                    },
                                    required: ["number"]
                                }
                            }
                        },
                        required:["name", "order", "numGroups"], // TODO: qualiModule/qualiConf
                        additionalProperties: false,
                    }
                }*/
            },
            required: ["xDiscipline", "name"],
            additionalProperties: false,
        };
        let schemaUpdateEventGroup = {
            type: "object",
            properties: {
                xEventGroup: {type:"integer"},
                xDiscipline: {type: "integer"},
                name: {type: "string", maxLength:50},
                combined: {type: "boolean"}
            },
            required: ["xDiscipline", "xEventGroup"],
            additionalProperties: false,
        };
        let schemaDeleteEventGroup = {
            type: "integer"
        };

        let schemaAddRound = {
            type: "object",
            properties : {
                xRound:{type:"integer"}, // used only by server2server / sideChannel
                xEventGroup: {type:"integer"},
                name: {type:"string", maxLength:50},
                order: {type:"integer"},
                numGroups: {type:"integer", minimum:1, maximum:65535},
                qualiModule: {type: "string", maxLength:45},
                qualiConf: {type: "string"},
                groups: {
                    type:"array",
                    items: {
                        type:"object",
                        properties: {
                            xRound: {type:"integer"}, // part of the primary key, used only by server2server / sideChannel
                            number: {type:"integer", minimum:1, maximum:65535}, // part of the primary key
                            xContest:{type: ["integer", "null"]}, // optional
                            name:{type:"string", maxLength:45}
                        },
                        required: ["number"],
                        additionalProperties: false,
                    }
                }
            },
            required: ["xEventGroup", "name", "numGroups", "qualiModule"] , // order is optional, since it always must be the last round!
            additionalProperties: false,
        }; // groups are optional, but they would be created here if they are not already defined
        let schemaUpdateRound = {
            type: "object",
            properties : {
                xRound: {type:"integer"},
                xEventGroup: {type:"integer"},
                name: {type:"string", maxLength:50},
                // order: {type:"integer"}, // the order is NOT to be changed (currently)!
                numGroups: {type:"integer", minimum:1, maximum:65535},
                qualiModule: {type: "string", maxLength:45},
                qualiConf: {type: "string"},
                groups: {
                    type:"array",
                    items: {
                        type:"object",
                        properties: {
                            xRound: {type:"integer"}, // part of the primary key
                            number: {type:"integer", minimum:1, maximum:65535}, // part of the primary key
                            xContest:{type: ["integer", "null"]}, // optional
                            name:{type:"string", maxLength:45}
                        },
                        required: ["number"],
                        additionalProperties: false,
                    }
                }
            },
            required: ["xRound", "xEventGroup"],
            additionalProperties: false,
        };
        let schemaDeleteRound = {
            type: "object",
            properties: {
                xRound:{type:"integer"},
                xEventGroup: {type:"integer"}
            },
            required:["xEventGroup", "xRound"], // TODO: we could make xEventGroup optional
            additionalProperties: false,
        }

        this.validateAddEventGroup = this.ajv.compile(schemaAddEventGroup);
        this.validateUpdateEventGroup = this.ajv.compile(schemaUpdateEventGroup);
        this.validateDeleteEventGroup= this.ajv.compile(schemaDeleteEventGroup);
        this.validateAddRound = this.ajv.compile(schemaAddRound);
        this.validateUpdateRound = this.ajv.compile(schemaUpdateRound);
        this.validateDeleteRound = this.ajv.compile(schemaDeleteRound);
 
    }

    /**
     * add an eventGroup
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addEventGroup(data){

        // validate the data based on the schema
        let valid = this.validateAddEventGroup(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addEventGroup, updateEventGroup, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            // make sure that there is an empty rounds property; otherwise sequelize will not return the rounds property, which we need
            dataTranslated.rounds = [];

            // nested "eager" create work, but we need to use transactions to make sure either everythign or nothing is inserted
            var eventGroup = this.seq.transaction(async t=>{
                return await this.models.eventgroups.create(dataTranslated, {include:[{model:this.models.rounds, as:"rounds", include: [{model:this.models.groups, as:"groups"}]}]})
            }).catch((err)=>{throw {message: `Sequelize-problem: EventGroup could not be created: ${err}`, code:22}})
            
            this.data.push(eventGroup); 

            // the data to be sent back to the client requesting the add is the full data
            //let sendData = eventGroup.dataValues;
            let sendData = eventGroup.get({plain:true});

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addEventGroup',
                data: sendData // should have the same properties as data, but with added xEventGroup
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteEventGroup
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
            throw {message: this.ajv.errorsText(this.validateAddEventGroup.errors), code:23};
        }
    }


    async deleteEventGroup(data){

        // data must be an integer (the xMeeting id)
        let valid = this.validateDeleteEventGroup(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, eventGroup] = this.findObjInArrayByProp(this.data, 'xEventGroup', data)

            // delete the entry in the meetings table
            await this.models.eventgroups.destroy({where:{xEventGroup: data}}).catch(()=>{
                throw {message: "EventGroup could not be deleted!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, ] = this.findObjInArrayByProp(this.data, 'xEventGroup', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.splice(ind,1);
            }

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteEventGroup',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addEventGroup
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
            throw {message: this.ajv.errorsText(this.validateDeleteEventGroup.errors), code:23};
        }
    }

    async updateEventGroup(data){

        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateEventGroup(data);
        if (valid) {

            // get the instance to update
            let [i,eventGroup] = this.findObjInArrayByProp(this.data, 'xEventGroup', data.xEventGroup);
            if (i<0){
                throw {code:22, message:`The eventGroup (xEventGroup=${data.xEventGroup}) does not exist on the server.`};
            }

            // store the old data for the undo-object
            let eventGroupOld = eventGroup.dataValues;

            // it is not allowed to change the discipline of an eventGroup
            // TODO: allow it as long as there is no event linked to it yet
            if (eventGroupOld.xDiscipline != data.xDiscipline){
                throw {code: 25, message: "It is not allowed to change the discipline of an eventGroup"};
            }

            // update it
            return eventGroup.update(data, {include: [{model:this.models.rounds, as:"rounds", include:[{model:this.models.groups, as:"groups"}]}]}).then(async(eventGroupChanged)=>{
                // the data should be updated in the DB by now.

                // raise an event to notify the eventGroup (i.e. the dynamic room for this eventGroup)
                this.eH.raise(`eventGroupUpdated${eventGroupChanged.xEventGroup}`, eventGroupChanged)

                // set the local data
                this.data[i] = eventGroupChanged;

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateEventGroup', data: eventGroupChanged.dataValues}, 
                    undoObj: {funcName: 'updateEventGroup', data: eventGroupOld, ID: this.ID},
                    response: eventGroupChanged.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the eventGroup with the respective Id. Error: " + err};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateEventGroup.errors)}
        }
    }

    /**
     * Does not only add a round, but also the corresponding groups based on the groups defined in the request and/or the groups resulting from numGroups 
     * The added round MUST always be the last round!
     * @param {object} data The data to add
     * @returns 
     */
    async addRound(data){

        // validate the data based on the schema
        let valid = this.validateAddRound(data);
        if (valid) {

            // get the corresponding eventGroup
            let [iEG, eG] = this.findObjInArrayByProp(this.data, 'xEventGroup', data.xEventGroup);
            if (iEG<0){
                throw {code:24, message:"The corresponding eventGroup does not exist anymore on the server (should actually never happen)."};
            }

            let createGroups=()=>{
                let groups = [];
                for (let i=1;i<=data.numGroups;i++){
                    groups.push({
                        // xRound will be automatically added
                        number: i,
                        name: `Group ${i}`, // TODO: make this dependent from a meeting-wide variable. (Note: we should not simply translate the word here based on the language of the user-interface of the client, since clients might have various languages, while we still want a consistant naming.)
                        xContest: null
                    })
                }

                return groups;
            }

            // do an additional check that the defined groups are matching the numGroups
            // every group number must occure exactly once. If every group exists and if the number of groups matches numGroups, everything is fine.
            if (data.numGroups==data?.groups?.length){
                // check that every group exists:
                let ok = true;
                for (let i=1; i<=data.numGroups; i++){
                    if (data.groups.findIndex(g=>g.number==i)==-1){
                        ok=false;
                        break;
                    }
                }
                if (!ok){
                    // overwrite the incorrect groups
                    data.groups = createGroups();
                }
            } else {
                // if no  groups were previously defined or if not to correct number of groups was predefined, we define (overwrite!) them here;
                data.groups = createGroups();
            }
            // when we get here the groups are correct

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addEventGroup, updateEventGroup, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            
            // check that if the order is given it is correctly set to last+1 --> simply overwrite it if it was wrong
            dataTranslated.order = eG.rounds.length+1;

            var round = await this.models.rounds.create(dataTranslated, {include:[{model:this.models.groups, as:"groups"}]}).catch((err)=>{throw {message: `Sequelize-problem: Round could not be created: ${err}`, code:22}})

            eG.rounds.push(round); 

            // if this was the first round, add entries in startsInGroup for all starts of the events in this eventGroup; (for rounds >1 we would have to call the qualification module. TODO)
            if (round.order==1){
                // never remove the await here! otherwise we might have a problem because the startingroup entries in rContestXY will not be initialized appropriately!
                await this.startsInGroup.serverFuncWrite('addedRound1', {xRound:round.xRound, xEventGroup:data.xEventGroup}).catch(err=>{
                    this.logger.log(20, `There was an unexpected error when adding the startsInGroup entry after adding round 1: ${JSON.stringify(err)}`);
                })
            }

            // notify the rdEventsWithGroups about the number of gorups in the new round (NOTE: this information is only needed if order==1, but is sent in any case)
            this.eH.raise(`${this.name}:setNumGroups`, {xEventGroup: data.xEventGroup, order:round.order, numGroups: round.numGroups, groups:round.groups, xRound:round.xRound})

            // if a contest is linked to the group, notify it about the new group
            round.groups.forEach(g=>{
                if (g.xContest != null){
                    this.eH.raise(`${this.name}:contestLink${g.xContest}`, {xRound: g.xRound, number:g.number})
                }
            })

            // raise an event to notify the eventGroup (i.e. the dynamic room for this eventGroup)
            this.eH.raise(`eventGroupUpdated${eG.xEventGroup}`, eG)


            // the data to be sent back to the client requesting the add is the full data
            let sendData = round.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addRound',
                data: round.dataValues // should have the same properties as data, but with added xEventGroup
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteRound
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
            throw {message: this.ajv.errorsText(this.validateAddRound.errors), code:23};
        }
    }

    async updateRound(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateRound(data);
        if (valid) {

            // get the corresponding eventGroup
            let [iEG, eG] = this.findObjInArrayByProp(this.data, 'xEventGroup', data.xEventGroup);
            if (iEG<0){
                throw {code:24, message:"The eventGroup does not exist anymore on the server (should actually never happen)."};
            }

            // find the round
            let [i, r] = this.findObjInArrayByProp(eG.rounds, 'xRound', data.xRound);
            if (i<0){
                throw {code:26, message:"The round does not exist anymore on the server (should actually never happen)."};
            } 

            // we need to first modify the groups, before the rounds; because when we fail to delete a group, we should not set a lower numGroups for consistancy reasons.

            // check whether the athletes of the groups to be deleted and of the groups with changed xContest are not assigned to a series yet.
            let deletedGroups = [];
            let groupsWithContestDeletion = []; // includes all groups where the current xContest is deleted 
            let groupsWithContestChange = []; // includes all groups where the current xCOntest is changed (if the current xContest==null then it is not added)
            let groupsWithContestAdded = []; // groups (data objects, not sequelize-models!) where the contest was added. 

            // check for groups to delete
            for (let iG=r.groups.length-1; iG >=0; iG--){
                // to delete?
                if (r.groups[iG].number>data.numGroups){

                    // add to deletedGroups
                    deletedGroups.push(r.groups[iG])
                }
            }

            // check for changes only if the groups are given
            if (data.groups){
                // check for groups to change
                // for which groups does the xSeries get replaced / changed at all?
                for (let iG=0; iG<r.groups.length; iG++){
                    let g = r.groups[iG];

                    // try to find the respective group in the request
                    let gNew = data.groups.find(el=>el.number==g.number);
                    if (!gNew){
                        // no change for this groups specified (Note that only changed groups need to be specified in the update request)
                        continue;
                    }
                    if (g.xContest==null){
                        // so far xContest was undefined
                        if (gNew.xContest != null){
                            groupsWithContestAdded.push(gNew);
                        }
                        // surely has no entry in seriesstartsresults yet; change can surely be applied later
                        continue;
                    }
                    if (g.xContest != gNew.xContest){
                        if (gNew.xContest == null){
                            // xContest gets deleted
                            groupsWithContestDeletion.push(g);
                        } else {
                            // xContest changes
                            groupsWithContestChange.push(g);
                        }
                    }

                }
            }

            // check whether no athlete of the respective round is assigned to a series:
            // all groups that need to be checked not to contain any entry in seriesstartsresults:
            let toChangeGroups = [...deletedGroups, ...groupsWithContestDeletion, ...groupsWithContestChange].map(g=>g.number);

            let cnt = this.models.seriesstartsresults.count({include:[{model:this.models.startsingroup, as:"startsingroup", where: {number:{[Op.in]:toChangeGroups}, xRound:data.xRound} }]}).catch((err)=>{
                throw {code:30, message: `Error while counting referenced seriesstartsresults for changed groups in round ${r.xRound}: ${err}`};
            })
            if (cnt>0){
                // cannot apply the changes, since some athletes of changed groups were already assigned to a series.
                throw {code:31, message: `Cannot apply the group changes (deletion of group and/or change in the assignment to a contest), since some athletes are already assigned to a series.`};  
            }

            // past this point we can be sure that no person participating in a certain referenced contest already has an enry in seriesstartsresults. Thus, we can actually delete, change and add groups as well as change the referenced contests in the groups.
            
            // we could use the deletedGroups array here; however, since we need round and the index in the array (iG) as well, we loop through the double array again.
            for (let iG=r.groups.length-1; iG >=0; iG--){
                if (r.groups[iG].number>data.numGroups){

                    // "reset" startsInGroup to group 1 for the respective group
                    await this.startsInGroup.serverFuncWrite('deleteGroup', {xRound: data.xRound, number: r.groups[iG].number}).catch(err=>{
                        throw {message:`startsInGroup entries could not be reset to number=1 (group 1): ${err}`, code:25}
                    })

                    // delete the round: 
                    await r.groups[iG].destroy().catch((err)=> {throw {message: `Group could not be deleted: ${err}`, code:27}})
                    r.groups.splice(iG,1);
                }
            }

            // now check whether groups have changed or need to be added
            for (let iG=1; iG <= data.numGroups; iG++){
                // try to find the group in the current list
                let gIndex = r.groups.findIndex((g)=> g.number==iG);
                let g = r.groups[gIndex];
                if (!g){
                    // the round does not exist yet (it must have number>1, because we cannot delete round 1)
                    // check whether it exists in data or apply a default otherwise:
                    let gNewData = data.groups.find(g=>g.number==iG);
                    if (gNewData){
                        // check that the xRound is correct (just overwrite it)
                        gNewData.xRound = r.xRound;

                        // check that xContest is not undefined, but null (if not integer)
                        if (gNewData.xContest==undefined){
                            gNewData.xContest = null;
                        } else {
                            // notify the contest about the added group
                            this.eH.raise(`${this.name}:contestLink${gNewData.xContest}`, {xRound: r.xRound, number: gNewData.iG})
                        }
                    }else{
                        gNewData = {
                            number: iG,
                            name: `Group ${iG}`, 
                            xContest: null,
                            xRound: r.xRound
                        }
                    }

                    let gNew = await this.models.groups.create(gNewData).catch((err)=>{throw {message: `Could not create the new group: ${err}`, code: 28}})
                    r.groups.push(gNew);

                    // since it must be group number >=2, there is no change needed in startsingroup

                } else {
                    // check if the group changed
                    // find the group in the data
                    let gUpdateData = data.groups.find(g=>g.number==iG);
                    // if the group does not exist in the data to update, just keep it as it is
                    if (gUpdateData){
                        // make sure the index is not changed!
                        gUpdateData.xRound = r.xRound;

                        // store the current xContest, bofore it gets updated:
                        let xContestOld = g.xContest;

                        let changed = false;
                        let changedXContest = false;
                        for (let prop of ['name', 'xContest', 'number']){
                            if(prop in gUpdateData && g[prop] != gUpdateData[prop]){
                                changed=true;
                                if (prop=="xContest"){
                                    changedXContest = true;
                                }
                                break; 
                            }
                        }
                        if (changed){
                            // update the group
                            let modifiedGroup = await g.update(gUpdateData).catch((err)=>{ throw {message:`Could not update the group: ${err}`, code:29}})
                            // overwrite the previous model
                            r.groups[gIndex] = modifiedGroup;

                        }
                        if (changedXContest){
                            // notify the new and old contest!
                            if (xContestOld != null){
                                this.eH.raise(`${this.name}:contestUnlink${xContestOld}`, {xRound: r.xRound, number: g.number})
                            }
                            if (gUpdateData.xContest != null){
                                this.eH.raise(`${this.name}:contestLink${gUpdateData.xContest}`, {xRound: r.xRound, number: g.number})
                            }
                        }
                    }

                }

            } // end group update/add

            // remove the groups here, since we did this change already separately
            delete data.groups;
            let roundChanged = await r.update(data).catch((err)=>{
                throw {code: 22, message: "Could not update the round with the respective Id. Error: " + err};
            });

            // with updating it is not possible to eager load (=include) other models so far (2021-05). Therefore we need to transfer the former group models manually to the changed round
            roundChanged.groups = r.groups;

            // replace the round in the local data:
            eG.rounds[i] = roundChanged;

            // notify the rdEventsWithGroups about the number of gorups in the new round (NOTE: this information is only needed if order==1, but is sent in any case)
            this.eH.raise(`${this.name}:setNumGroups`, {xEventGroup: data.xEventGroup, order:roundChanged.order, numGroups: roundChanged.numGroups, groups: roundChanged.groups, xRound:roundChanged.xRound})

            // raise an event to notify the eventGroup (i.e. the dynamic room for this eventGroup)
            this.eH.raise(`eventGroupUpdated${eG.xEventGroup}`, eG)

            let ret = {
                isAchange: true, 
                doObj: {funcName: 'updateRound', data: roundChanged.dataValues}, 
                undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
                response: roundChanged.dataValues,
                preventBroadcastToCaller: true
            };
            
            // the rest is done in the parent
            return ret;

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateRound.errors)}
        }
    }

    async deleteRound(data){

        // only the very last round can be deleted!

        // for simplicity, the data should not only contain the xRound, but also xEventGroup; the latter index helps to find the model
        let valid = this.validateDeleteRound(data);

        if (valid){

            // find the event group
            let [iEG, eG] = this.findObjInArrayByProp(this.data, 'xEventGroup', data.xEventGroup);
            if (iEG<0){
                throw {code:24, message:"The eventGroup does not exist anymore on the server (should actually never happen)."};
            }

            // get the entry from the data (respectively its index first):
            let round= eG.rounds.find(r=>r.xRound==data.xRound)
            if (!round){
                throw {code:25, message:"The round does not exist anymore on the server (should actually never happen)."};
            }
            
            // only the last round can be deleted. With this we prevent that there are holes in the order of rounds and we prevent that rounds without qualification are deleted and the programmers life is easier since we do not need to modify many other round'^s orders to prevent "holes" in the order.
            if (eG.rounds.length != round.order){
                throw {message: "Only the last round can be deleted, which is not the case!", code:22}
            }

            // first delete all groups
            // for this we first have to delete the entries in startsInGroup (if possible=if not referenced in seriesStartsResults = not in a series already)
            await this.startsInGroup.serverFuncWrite('deleteRound', data.xRound).catch(err=>{
                if (err.code==23){
                    throw err; // by chance the error code here shall also be 23
                }else {
                    throw {message:"startsInGroup entries could not be deleted. Thus, also the round cannot be deleted.", code:24}
                }
            })
            // then we can delete the groups
            round.groups.forEach(async group=>{
                await group.destroy().catch((err)=>{
                    throw {message: `Group could not be deleted from the DB: ${err}`, code: 25};
                })

                // notify the contest about the removed group
                if (group.xContest != null){
                    this.eH.raise(`${this.name}:contestUnlink${group.xContest}`, {xRound: group.xRound, number: group.iG})
                }
            })
            // delete the objects as well for the case when destroying the round fails
            round.groups = [];

            // delete the entry
            await round.destroy().catch((err)=>{
                throw {message: `Round could not be deleted in DB: ${err}`, code:21}
            });

            // notify the rdEventsWithGroups that the number of groups in the event must be reset to 1 (because 1 is the default and minimum) (NOTE: this information is only needed id order==1, but is sent in any case)
            this.eH.raise(`${this.name}:resetNumGroups`, {xEventGroup: data.xEventGroup, order:round.order, numGroups: round.numGroups})

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            let [ind, ] = this.findObjInArrayByProp(eG.rounds, 'xRound', data.xRound) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                eG.rounds.splice(ind,1);
            }

            // raise an event to notify the eventGroup (i.e. the dynamic room for this eventGroup)
            this.eH.raise(`eventGroupUpdated${eG.xEventGroup}`, eG)

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteRound',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addRound
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
            throw {message: this.ajv.errorsText(this.validateDeleteRound.errors), code:26};
        }
    }

    /**
     * Try to start a dynamic subroom. This function shall be overriden by the inheriting class if needed. 
     * @param {string} subroomName The name of the subroom
     * @returns {boolean} returns the room on success, and false if it could not be created.
     */
    startDynamicSubroom(subroomName){
        // IMPORTANT: the dynamic room creation MUST provide the reference to parentRoom=this to the constructor of the subroom! 

        let xEventGroup = Number(subroomName);
        if (isNaN(xEventGroup)){
            return false;
        }

        // the subroom should be xEventGroup; try to get the contest
        let eG = this.data.find(c=>c.xEventGroup==xEventGroup);
        if (!eG){
            return false;
        }

        // start the room
        let dynamicRoom = {
            parentRoom: this,
            timeout: 1000 // keep the room open forever; to be changed in the future, when we have a timeout function (without the timeout, I think it's better to keep the room open)
        }

        try{
            // TODO: eventually rEventGroup will be dependent on the type of discipline!
            let subroom = new rEventGroup(dynamicRoom, eG, this.meetingShortname, this.mongoDB, this.eH, this.logger, this, this.rContests, this.startsInGroup, this.rInscriptions, this.rStarts, this.rEvents);

            // save the room: 
            this.subrooms[subroomName] = subroom;

            return subroom;
        }catch (ex) {
            this.logger.log(22, `Could not create the subroom ${xEventGroup} in meeting ${this.meetingShortname}: ${ex}`)
            return false;
        }
    }

}

export default rEventGroups;