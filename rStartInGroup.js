

// starts in group: this room is used to "forward" entries from "start" (in the first round) or from a qualification (after first round) to a group in the next round. Additioanlly, this room also handles (in the future) the positioning athlethes in relays
// which athlete starts in which group and for relays, in what order do the athletes start. On the client it may make sense to have a tool to assign the grops to the athletes; by default they will be assigned to group 1. (As long as there is only one group and the automatic assignement to group 1 works, there is no need to have afrontend on the client.) Eventually the implementation on the client is also kind of a qualification-definition tool: While the shown qualification status (in the rankinglist) will be stored to seriesStartsResults, this must also be "replicated" by adding an entry to startsInGroup (by default for group 1). If there is a qualifiation mode over multiple groups, the qualifications can however not be defined within one group/series, but an overview would be needed, where the qualification is handled on the basis of all groups. (Before we have such a tool, it should always be possible to do it manually.) 

// eager load relayAthletePositions


// roomServer.func: validity check and split whether read or write function:
// - WRITING:  check for rights, check if the last request was the same (only needed for requests over wsProcessor), ID check and if necessary conflict checking (both not needed here), check if another funciton is running --> either put it on the functionsWorkStack or run it now (This has to be followed here as well!); 
//   --> finally it would arrive at _startWriteFunction: checks the Tab-ID for security reasons (would need an overrule here), do an ID and conflict check again (since wthings could have changed), then call this.functionsWrite[request.func](request.data).then((ret)=>{...}); unfortunately, calls respFunc(response) "hardcoded", broadcasts the change and finally calls finishedFunc; this handles the functionsWorkStack and calls the next write-request if there is one. 
// - READING: async: this.functionsReadOnly[request.func](request.data).then((ret)=>{...})
// --> implementing a reading function should be simple
// --> writing is more difficult. We need to implement the following:
//     - use the functionsWorkStack --> needs two modes: wsRequest (-_> _startWriteFunction) and serverRequest (new function)
//     - call this.functionsWrite[request.func](request.data) and broadcast the change (ideally share that part of the function with _startWriteFunction)
//     - call finishedFunc (must be able to handle both kinds of requests)

// for writing, we do not (need to) check whether we have the correct ID, but we need to create a new one when we apply a change


/**
 * we will need several functions that access data from other rooms and that finally create the calls to add/(update)/delete. If a client is making the changes, then links such as from event --> eventGroup --> round... are already known on the client and the client can directly call add/update/delete. 
 * Modifications to startsInGroup:
 * - DONE new start for event addedStart(xStart, xEvent) --> if the event is in an eventGroup (event.getXEventGroup(xEvent)--> xEventGroup) and of there is a first round (eventGroup.getXRound(xEventGroup, roundNumber) --> xRound), assign to group 1 (requires access to event and eventGroups)
 * - DONE delete start deleteStart(xStart) --> check if the start has an entry in startsInGroup --> delete it (it will fail when there is an entry in seriesStartResults)
 * - DONE event added to eventGroup (adlready added in events) addedEventToEventGroup(xEvent, xEventGroup) --> if the eventGroup has a first round, get all starts for that event and create startsInGroup for all atheletes of that event (group 1) (requires access to starts and eventGroups)
 * - event deleted from eventGroup deleteEventFromEventGroup(xEvent, xEventGroup)--> delete all startsInGroup for this event (given NONE of the entries is already linked to a seriesStartsResults!)
 * - N/A (indirectly) event changed from one eventGroup to another --> use delete and add (see above) 
 * - TODO qualification for next round --> add entry for group 1 in next round
 * - TODO "un"qualify (e.g. when hurt) from next round --> delete entry
 * NOTE: deleting is not possible as soon as an athlete is inscribed to a series!
 * ATTENTION: before deleting all startsInGroup for an event, make sure that ALL startsInGroup can be deleted, i.e. they are not referenced in seriesStartsResults, otherwise it might happen that some startsInGroup get deleted, before another athlete arrived which is already in a series, preventing further deletions. We then would have some starts without startsInGroup, despite the fact the eventGroup and round exists. This shall not happen.
 */

 import Sequelize, { QueryTypes }  from 'sequelize';
 const Op = Sequelize.Op;
import { copyObject } from './common.js';

import roomServer from './roomServer.js';


/**
 * the room for startsInGroup management (adding, deleting, updating,  ...)
 * The data stores a list of objects: data =[{startsInGroup1}, {startsInGroup2}]
 */
class rStartsInGroup extends roomServer{

    /** Constructor for the startsInGroup-room
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
        // old idea: no writing tickets at all; only use this room through other rooms
        // new 2022-09 when adding group assignment: allow to have writing clients; however, they should be always online (no offline clients).
        super(eventHandler, mongoDb, logger, "startsInGroup@" + meetingShortname, true, -1, false);

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = {
            // main data:
            startsInGroups:[],

            // auxilary data:

        }; 

        // the reference to the sequelize connection
        this.seq = sequelizeMeeting;
        this.models = modelsMeeting;

        this.ready = false; // as we have async stuff here, we need to know whether we are ready to do something or not (e.g. the sequelize data is loaded.)

        // get all startsInGroups
        this.models.startsingroup.findAll({include: [
            {model:this.models.relayathletepositions, as:"relayathletepositions"}]}).then(startsInGroups=>{
            this.data.startsInGroups = startsInGroups;
            // aux data:
            //TODO
            this.ready = true;
        })

        // links to auxilary rooms:
        this.eventGroups = undefined; // will be given on meeting startup by rMeetings
        this.starts = undefined; // will be given on meeting startup by rMeetings
        this.events = undefined; // will be given on meeting startup by rMeetings

        // listen to auxilary data events:
        // TODO

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        
        this.functionsWrite.addStartsInGroup = this.addStartsInGroup.bind(this);
        this.functionsWrite.deleteStartsInGroup = this.deleteStartsInGroup.bind(this);
        this.functionsWrite.updateStartsInGroup = this.updateStartsInGroup.bind(this);
        this.functionsWrite.addedStart = this.addedStart.bind(this);
        this.functionsWrite.deleteStart = this.deleteStart.bind(this);
        this.functionsWrite.deleteMultiStartsInGroup = this.deleteMultiStartsInGroup.bind(this);
        this.functionsWrite.addMultiStartsInGroup = this.addMultiStartsInGroup.bind(this);
        this.functionsWrite.addedEventToEventgroup = this.addedEventToEventgroup.bind(this);
        this.functionsWrite.deleteEventFromEventGroup = this.deleteEventFromEventGroup.bind(this);
        this.functionsWrite.deleteRound = this.deleteRound.bind(this);
        this.functionsWrite.addedRound1 = this.addedRound1.bind(this);
        this.functionsWrite.deleteGroup = this.deleteGroup.bind(this);


        // define, compile and store the schemas:
        let schemaAddStartsInGroup = {
            type: "object",
            properties: {
                xStartgroup: {type: "integer"},
                xRound: {type:"integer"},
                number: {type:"integer"},
                xStart: {type:"integer"},
                present: {type: "boolean"}
            },
            required: ["xRound", "number", "xStart"],
            additionalProperties: false
        };
        let schemaUpdateStartsInGroup = {
            type: "object",
            properties: {
                xStartgroup: {type: "integer"},
                // the xRound and xStart cannot be changed; only deleted and added new!
                number: {type: "integer"},
                present: {type: "boolean"}
            },
            required: ["xStartgroup"],
            additionalProperties: false
        };
        let schemaDeleteStartsInGroup = {
            type: "integer"
        };
        let schemaAddedStart = {
            type: "object",
            properties: {
                xStart: {type:"integer"},
                xEvent: {type: "integer"},
                groupNum: {type:"integer"},
            },
            required:["xStart", "xEvent", "groupNum"],
            additionalProperties: false
        }
        let schemaDeleteStart = {
            type: "integer"
        };
        let schemaAddedEventToEventgroup = {
            type: "object",
            properties:{
                xEvent: {type:"integer"},
                xEventGroup: {type: "integer"}
            },
            required:["xEvent", "xEventGroup"],
            additionalProperties: false

        };
        let schemaDeleteEventFromEventgroup = {
            type: "object",
            properties:{
                xEvent: {type:"integer"},
                xEventGroup: {type: "integer"}
            },
            required:["xEvent", "xEventGroup"],
            additionalProperties: false
        };
        let schemaDeleteMultiStartsInGroup = {
            type: "array",
            items: {
                type: "integer",
            }
        };
        let schemaAddMultiStartsInGroup = {
            type: "array",
            items: schemaAddStartsInGroup
        }
        // delete all groups of a round and thus delete all corresponding startsInGroup entries
        let schemaDeleteRound = {
            type: "integer"
            /*type: "object",
            properties:{
                xRound: {type:"integer"},
                xEventGroup: {type:"integer"}, // since round is a child object of the eventGroup, we also need the eventGroup here
            },
            required:["xRound", "xEventGroup"],
            additionalProperties: false*/
        }
        let schemaAddedRound1 = {
            type: "object",
            properties:{
                xRound: {type:"integer"},
                xEventGroup: {type:"integer"}, // since round is a child object of the eventGroup, we also need the eventGroup here
            },
            required:["xRound", "xEventGroup"],
            additionalProperties: false
        }
        let schemaDeleteGroup = {
            type: "object",
            properties:{
                xRound: {type:"integer"},
                number: {type: "integer", minimum:2} // this function is not used for group 1, thus 2 is minimum
            },
            required:["xRound", "number"],
            additionalProperties: false
        };

        this.validateAddStartsInGroup = this.ajv.compile(schemaAddStartsInGroup);
        this.validateUpdateStartsInGroup = this.ajv.compile(schemaUpdateStartsInGroup);
        this.validateDeleteStartsInGroup = this.ajv.compile(schemaDeleteStartsInGroup);
        this.validateAddedStart = this.ajv.compile(schemaAddedStart);
        this.validateDeleteStart = this.ajv.compile(schemaDeleteStart);
        this.validateAddedEventToEventgroup = this.ajv.compile(schemaAddedEventToEventgroup);
        this.validateDeleteEventFromEventgroup = this.ajv.compile(schemaDeleteEventFromEventgroup);
        this.validateDeleteMultiStartsInGroup = this.ajv.compile(schemaDeleteMultiStartsInGroup);
        this.validateAddMultiStartsInGroup = this.ajv.compile(schemaAddMultiStartsInGroup);
        this.validateDeleteRound = this.ajv.compile(schemaDeleteRound);
        this.validateAddedRound1 = this.ajv.compile(schemaAddedRound1);
        this.validateDeleteGroup = this.ajv.compile(schemaDeleteGroup);

    }

    /**
     * Called when a first rond to an eventGroup is added. Then automatically create the startsINGroup entries for that first round
     * @param {object} data xRound and xEventGroup (needed to find the respective events and starts)
     */
    async addedRound1(data){
        let valid = this.validateAddedRound1(data);
        if (!valid){
            throw {message: this.ajv.errorsText(this.validateAddedRound1.errors), code:21};
        }

        // get the eventGroup
        let eventGroup = this.eventGroups.data.find(el=>el.xEventGroup == data.xEventGroup)
        if (!eventGroup){
            throw {message: `There is no eventGroup with xEventGroup=${data.xEventGroup}`, code: 22};
        }

        // get round 1
        let round = eventGroup.rounds.find(r=>r.order==1);
        if (!round || round.xRound != data.xRound){
            throw{message: `There is no round 1 in eventgroup ${eventGroup.xEventGroup} or the round does not match the specified xRound=${data.xRound}.`, code: 24};
        }

        // testing whether the group exists is actually not necessary, as long as all is programmed as it should in the eventgroup/round management; thus only check during develpment
        if (developMode){
            let group = round.groups.find(g=>g.number==1);
            if (!group){
                throw{message: `SEVERE ERROR: There is no group 1 in round ${round.xRound}. This should never happen and must be an error in the eventGroup/round managament.`, code:25}
            }
        } 

        // add a startInGroup for all athletes of the events linked to this eventGroup
        let addedStarts = []; // store all starts that were added
        let events = this.events.data.events.filter(el=>el.xEventGroup==data.xEventGroup);
        for (let j=0; j<events.length; j++){
            // get all starts of that event
            let starts = this.starts.data.starts.filter(start=>start.xEvent==events[j].xEvent);
            for (let i=0; i<starts.length; i++){
                let start = starts[i];
    
                let insert = {
                    xStart: start.xStart,
                    xRound: round.xRound,
                    number: 1,
                    present: true,
                }
    
                // create the entry
                var startsInGroup = await this.models.startsingroup.create(insert).catch((err)=>{throw {message: `Sequelize-problem: StartsInGroup could not be created: ${err}`, code:26}})
                this.data.startsInGroups.push(startsInGroup); 
    
                // add to array, including xStartgroup
                addedStarts.push(startsInGroup.dataValues);

                // raising event to notify contest NOT needed, since the contest is not yet listening to this event and will initialize this data by itself!
                //this.eH.raise(`${this.name}:addedAthleteForRound/GrpNbr${round.xRound}/1`, startsInGroup.xStartgroup)
            }
        }

        if (addedStarts.length==0){
            let ret = {
                isAchange: false, 
                response: addedStarts,
            };
            return ret;
        }
        
        // broadcast
        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'addMultiStartsInGroup',
            data: addedStarts 
            // the UUID will be added on resolve
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // deleteStartsInGroup
            data: {}
            // the ID will be added on resolve
        };

        // do the rest (put on stack and report to other clients etc)
        let ret = {
            isAchange: true, 
            doObj: doObj, 
            undoObj: undoObj,
            response: addedStarts,
            preventBroadcastToCaller: true
        };
        return ret;

    }

    /**
     * A group is deleted. All participants in this group are reset to group 1 (this functin is only used for number>=2; the validation ensures this).
     * ATTENTION: this function does NOT check if there are aread series/seriesstartsresults for this group! This is must be checked by the caller!
     * @param {object} data "number" of the group, xRound
     */
    async deleteGroup(data){
        let valid = this.validateDeleteGroup(data);
        if (!valid){
            throw {message: this.ajv.errorsText(this.validateDeleteGroup.errors), code:21};
        }

        // get all relevant startsInGroups and update them
        let startsInGroup = this.data.startsInGroups.filter(sig=>sig.xRound==data.xRound && sig.number==data.number);
        
        for (let i=0; i<startsInGroup.length; i++){
            let sig = startsInGroup[i];
            sig.number = 1;
            await sig.save().catch(err=>{
                throw {message: `Could not change the number in startsInGroup ${sig.xStartgroup}: ${err}`, code:22}
            })

            // raise event to notify e.g. contests
            this.eH.raise(`${this.name}:deletedAthleteForRound/GrpNbr${data.xRound}/${data.number}`, sig.xStartgroup)

        }


        // nothing was changed
        if (startsInGroup.length==0){
            let ret = {
                isAchange: false,
                response: data,
            };
            return ret;
        }

        // broadcast; delete multiple with the given list "deletedStartsInGroup"
        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'deleteGroup',
            data: data 
            // the UUID will be added on resolve
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // deleteStartsInGroup
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

    /**
     * Delete all entries of a certain round.
     * @param {integer} xRound The xRound that will be deleted
     */
    async deleteRound(xRound){
        let valid = this.validateDeleteRound(xRound);
        if (!valid){
            throw {message: this.ajv.errorsText(this.validateDeleteRound.errors), code:21};
        }

        // if any athlete (in any group) is already in a series, we have to abort:
        let changePossible = true;

        // create a list of all startsInGroup to delete
        let deletedStartsInGroup = [];

        // we do not need to loop over all groups, since we can simply filter the startsINGroup by xRound, without the group
        let startsInGroup = this.data.startsInGroups.filter(sig => sig.xRound==xRound);
        for (let j=0; j< startsInGroup.length; j++){

            let xStartgroup = startsInGroup[j].xStartgroup
            deletedStartsInGroup.push(xStartgroup);

            // check whether the xStartgroup exists in seriesStartsResults
            // we run this command directly on the DB and not on data since the series-data is split over many rooms. 
            let cnt = await this.models.seriesstartsresults.count({where:{xStartgroup:xStartgroup}});
            if (cnt>0){
                changePossible = false;
                break;
            }
        }

        if (!changePossible){
            throw {message: `Cannot delete startInGroup entries, since at least one athlete is already assigned to a series.`, code:23}
        }

        if (deletedStartsInGroup.length==0){
            // nothing to delete; so just go back without any change
            let ret = {
                isAchange: false, 
                response: deletedStartsInGroup,
            };
            return ret;
        }

        // If we are here, we should be able to delete all entries (the only exception is the extremely rare case, where a person is assigned to a series exactly during our deletion.)

        // delete in DB all at the same time (!) --> either all deletions fail or none!
        await this.models.startsingroup.destroy({where:{xStartgroup: {[Op.in]:deletedStartsInGroup}}}).catch(()=>{
            // should we really throw er error here? Or should we simply continue? --> We should not throw an error, but note what xStartgroups failed. We must ensure that the data is still consistent among different clients 
            throw {message: `StartsInGroups (${deletedStartsInGroup}) could not be deleted!`, code:24}
        }); // is "await" needed here?

        // delete in local data (yes, this could be included in above loop, but then we could not guarantee that all clients keep having the same data)

        // we simply loop backwards and delete+destroy matching elements
        for (let j=this.data.startsInGroups.length-1; j>=0; j--){
            // when we would assume that concurrent changes were processed at the same time it would be problematic to loop the way I do and the indices used for splicing should be re-derived before usage (as in the default delete statement), since they could have changed during the async call was processed.
            let sig = this.data.startsInGroups[j];
            if (deletedStartsInGroup.indexOf(sig.xStartgroup) >= 0){
                this.data.startsInGroups.splice(j,1);

                // raise event to notify e.g. contests
                this.eH.raise(`${this.name}:deletedAthleteForRound/GrpNbr${sig.xRound}/${sig.number}`, sig.xStartgroup)
            }
        }


        // broadcast; delete multiple with the given list "deletedStartsInGroup"
        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'deleteMultiStartsInGroup',
            data: deletedStartsInGroup 
            // the UUID will be added on resolve
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // deleteStartsInGroup
            data: {}
            // the ID will be added on resolve
        };

        // do the rest (put on stack and report to other clients etc)
        let ret = {
            isAchange: true, 
            doObj: doObj, 
            undoObj: undoObj,
            response: deletedStartsInGroup,
            preventBroadcastToCaller: true
        };
        return ret;

    }

    /**
     * Add startsInGroup for all starts of the given event (xEvent), which was linked to a new eventgroup (xEventgroup)
     * @param {object} data contains xEvent and xEventgroup
     * @returns 
     */
    async addedEventToEventgroup(data){
        let valid = this.validateAddedEventToEventgroup(data);
        if (!valid){
            throw {message: this.ajv.errorsText(this.validateAddedEventToEventgroup.errors), code:21};
        }

        // if the eventGroup has a first round, get all starts for that event and create startsInGroup for all athletes of that event (group 1) (requires access to starts and eventGroups)

        // get the eventGroup
        let eventGroup = this.eventGroups.data.find(el=>el.xEventGroup == data.xEventGroup)
        if (!eventGroup){
            throw {message: `There is no eventGroup with xEventGroup=${data.xEventGroup}`, code: 22};
        }

        // get the round 1
        if (eventGroup.rounds.length==0){
            throw{message: `Eventgroup ${eventGroup.xEventGroup} has no rounds yet.`, code: 23};
        }
        // get round 1
        let round = eventGroup.rounds.find(r=>r.order==1);
        if (!round){
            throw{message: `There is no round 1 in eventgroup ${eventGroup.xEventGroup}.`, code: 24};
        }

        // testing whether the group exists is actually not necessary, as long as all is programmed as it should in the eventgroup/round management; thus only check during develpment
        if (developMode){
            let group = round.groups.find(g=>g.number==1);
            if (!group){
                throw{message: `SEVERE ERROR: There is no group 1 in round ${round.xRound}. This should never happen and must be an error in the eventGroup/round managament.`, code:25}
            }
        } 

        // add a startInGroup for all athletes of this event

        let addedStarts = []; // store all starts that were added
        let starts = this.starts.data.starts.filter(start=>start.xEvent==data.xEvent);
        for (let i=0; i<starts.length; i++){
            let start = starts[i];

            let insert = {
                xStart: start.xStart,
                xRound: round.xRound,
                number: 1,
                present: true,
            }

            // create the entry
            var startsInGroup = await this.models.startsingroup.create(insert).catch((err)=>{throw {message: `Sequelize-problem: StartsInGroup could not be created: ${err}`, code:26}})
            this.data.startsInGroups.push(startsInGroup); 

            // add to array, including xStartgroup
            addedStarts.push(startsInGroup.dataValues);

            // raise event to notify e.g. contests 
            this.eH.raise(`${this.name}:addedAthleteForRound/GrpNbr${round.xRound}/1`, startsInGroup.xStartgroup)

        }

        if (addedStarts.length==0){
            let ret = {
                isAchange: false, 
                response: addedStarts,
            };
            return ret;
        }
        
        // broadcast
        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'addMultiStartsInGroup',
            data: addedStarts 
            // the UUID will be added on resolve
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // deleteStartsInGroup
            data: {}
            // the ID will be added on resolve
        };

        // do the rest (put on stack and report to other clients etc)
        let ret = {
            isAchange: true, 
            doObj: doObj, 
            undoObj: undoObj,
            response: addedStarts,
            preventBroadcastToCaller: true
        };
        return ret;

    }

    /**
     * add multiple startsInGroup at the same time. This is needed e.g. in conjunction with addedEventToEventgroup.
     * @param {array} data The startsInGroup entries to enter, eventually including the xStartgroup id.
     * @returns 
     */
    async addMultiStartsInGroup(data){
        let valid = this.validateAddMultiStartsInGroup(data);
        if (!valid){
            throw {message: this.ajv.errorsText(this.validateAddMultiStartsInGroup.errors), code:21};
        }

        let inserted = []; // we must separately store the inserted data, to make sure the data sent back and broadcasted contains the xStartgroup
        for (let i=0; i<data.length; i++){
            let insert = data[i];

            // create the entry
            var startsInGroup = await this.models.startsingroup.create(insert).catch((err)=>{throw {message: `Sequelize-problem: StartsInGroup could not be created: ${err}`, code:26}})
            this.data.startsInGroups.push(startsInGroup); 
            inserted.push(startsInGroup.dataValues);

            // raise event to notify e.g. contests 
            this.eH.raise(`${this.name}:addedAthleteForRound/GrpNbr${insert.xRound}/${insert.number}`, startsInGroup.xStartgroup)

        }
        
        // broadcast
        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'addMultiStartsInGroup',
            data: inserted
            // the UUID will be added on resolve
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // deleteStartsInGroup
            data: {}
            // the ID will be added on resolve
        };

        // do the rest (put on stack and report to other clients etc)
        let ret = {
            isAchange: true, 
            doObj: doObj, 
            undoObj: undoObj,
            response: inserted,
            preventBroadcastToCaller: true
        };
        return ret;

    }

    /**
     * delete startsInGroup for all starts of the given event (xEvent), which was unlinked from an eventgroup (xEventgroup). It will first check whether none of the starts in that event is already set into a series already. If so, it would immediately stop the process. If this is successfull, it will delete all entries in the DB at the same time and then delete the locally stored data-objects as well. Uses "deleteMultiStartsInGroup" for the broadcast. 
     * @param {object} data contains xEvent and xEventgroup
     * @returns 
     */
    async deleteEventFromEventGroup(data){

        // very important: it must be ensured before any change no athlete (in any roundin any group) was assigned to a series yet!

        let valid = this.validateDeleteEventFromEventgroup(data);
        if (!valid){
            throw {message: this.ajv.errorsText(this.validateDeleteEventFromEventgroup.errors), code:21};
        }
        
        // if the eventGroup has a first round, get all starts for that event and create startsInGroup for all athletes of that event (group 1) (requires access to starts and eventGroups)

        // get the eventGroup
        let eventGroup = this.eventGroups.data.find(el=>el.xEventGroup == data.xEventGroup)
        if (!eventGroup){
            throw {message: `There is no eventGroup with xEventGroup=${data.xEventGroup}`, code: 22};
        }

        // if any athlete (in any round and group) is already in a series, we have to abort:
        let changePossible = true;

        // to increase speed, prepare a list of all starts which are related to the deleted event
        const xStarts = this.starts.data.starts.filter(el=>el.xEvent==data.xEvent).map(el=>el.xStart);

        // loop over all rounds; at the same time create a list of all startsInGroup to delete
        let deletedStartsInGroup = [];

        // before, it was loop over all rounds. However, this is actually not needed when we simply filter for the xStarts related to this event
        let startsInGroup = this.data.startsInGroups.filter(sig => {
            // check that only startsInGroup of the correct event are deleted (in order not to delete entries from events which are still part of the eventGroup)!
            return xStarts.indexOf(sig.xStart)!=-1;
            
        });
        for (let j=0; j< startsInGroup.length; j++){

            deletedStartsInGroup.push(startsInGroup[j].xStartgroup);

            // check whether the xStartgroup exists in seriesStartsResults
            let xStartgroup = startsInGroup[j].xStartgroup
            // we run this command directly on the DB and not on data since the series-data is split over many rooms. 
            let cnt = await this.models.seriesstartsresults.count({where:{xStartgroup:xStartgroup}});
            if (cnt>0){
                changePossible = false;
                break;
            }
        }
        

        /*outerLoop: // this is a label... didnt know it exists ...  can be used to break to the outer loop
        for (let i=0; i<eventGroup.rounds.length; i++){
            let xRound = eventGroup.rounds[i].xRound;
            // we do not need to loop over all groups, since we can simply filter the startsINGroup by xRound, without the group
            let startsInGroup = this.data.startsInGroups.filter(sig => {
                if (sig.xRound!=xRound){
                    return false;
                }
                //  we must not only compare the group, but also that it is the correct event (in order not to delete entries from events which are still part of the eventGroup)!
                return xStarts.indexOf(sig.xStart)!=-1;
                
            });
            for (let j=0; j< startsInGroup.length; j++){

                deletedStartsInGroup.push(startsInGroup[j].xStartgroup);

                // check whether the xStartgroup exists in seriesStartsResults
                let xStartgroup = startsInGroup[j].xStartgroup
                // we run this command directly on the DB and not on data since the series-data is split over many rooms. 
                let cnt = await this.models.seriesstartsresults.count({where:{xStartgroup:xStartgroup}});
                if (cnt>0){
                    changePossible = false;
                    break outerLoop;
                }
            }
        }*/

        if (!changePossible){
            throw {message: `Cannot delete startInGroup entries, since at least one athlete is already assigned to a series.`, code:23}
        }

        // If we are here, we should be able to delete all entries (the only exception is the extremely rare case, where a person is assigned to a series exactly during our deletion.)
        /*let deletedStartsInGroup = [];
        for (let i=0; i<eventGroup.rounds.length; i++){
            let xRound = eventGroup.rounds[i].xRound;
            // we do not need to loop over all groups, since we can simply filter the startsINGroup by xRound, without the group

            // we simply loop backwards and note the elements to delete
            for (let j=this.data.startsInGroups.length-1; j>=0; j--){
                // when we would assume that concurrent changes were processed at the same time it would be problematic to loop the way I do and the indices used for splicing should be re-derived before usage (as in the default delete statement), since they could have changed during the async call was processed.
                if (this.data.startsInGroups[j].xRound == xRound){
                    // add index to deleted indices
                    deletedStartsInGroup.push(this.data.startsInGroups[j].xStartgroup);
                }
            }
        }*/

        if (deletedStartsInGroup.length==0){
            // nothing to delete; so just go back without any change
            let ret = {
                isAchange: false, 
                response: deletedStartsInGroup,
            };
            return ret;
        }

        // delete in DB all at the same time (!) --> either all deletions fail or none!
        await this.models.startsingroup.destroy({where:{xStartgroup: {[Op.in]:deletedStartsInGroup}}}).catch(()=>{
            // should we really throw er error here? Or should we simply continue? --> We should not throw an error, but note what xStartgroups failed. We must ensure that the data is still consistent among different clients 
            throw {message: `StartsInGroups (${deletedStartsInGroup}) could not be deleted!`, code:24}
        }); // is "await" needed here?

        // delete in local data (yes, this could be included in above loop, but then we could not guarantee that all clients keep having the same data)

        // we simply loop backwards and delete+destroy matching elements
        for (let j=this.data.startsInGroups.length-1; j>=0; j--){

            // when we would assume that concurrent changes were processed at the same time it would be problematic to loop the way I do and the indices used for splicing should be re-derived before usage (as in the default delete statement), since they could have changed during the async call was processed.
            let SIG = this.data.startsInGroups[j];
            if (deletedStartsInGroup.indexOf(SIG.xStartgroup) >= 0){

                // raise event to notify e.g. contests
                this.eH.raise(`${this.name}:deletedAthleteForRound/GrpNbr${SIG.xRound}/${SIG.number}`, SIG.xStartgroup)

                this.data.startsInGroups.splice(j,1);
            }

        }


        // broadcast; delete multiple with the given list "deletedStartsInGroup"
        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'deleteMultiStartsInGroup',
            data: deletedStartsInGroup 
            // the UUID will be added on resolve
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // deleteStartsInGroup
            data: {}
            // the ID will be added on resolve
        };

        // do the rest (put on stack and report to other clients etc)
        let ret = {
            isAchange: true, 
            doObj: doObj, 
            undoObj: undoObj,
            response: deletedStartsInGroup,
            preventBroadcastToCaller: true
        };
        return ret;

    }

    /**
     * delete multiple startsInGroup at the same time. This is needed e.g. in conjunction with deleteEventFromEventGroup
     * @param {array} deletedStartsInGroup The array with a list of xStartgroup to delete
     */
    async deleteMultiStartsInGroup(deletedStartsInGroup){

        // validation: 
        let valid = validateDeleteMultiStartsInGroup(deletedStartsInGroup);
        if (!valid){
            throw {message: this.ajv.errorsText(this.validateDeleteMultiStartsInGroup.errors), code:21};
        }

        // check that none of the xStartgroup is already in a series:
        // untested, since the function is currently not used: 
        let cnt = await this.models.seriesstartsresults.count({where:{xStartgroup: {[Op.In]:deletedStartsInGroup}}});
        if (cnt>0){
            throw {code: 22, message:`Cannot delete the startsInGroup since ${cnt} starts are already assigned to a series.`};
        }

        // delete in DB all at the same time (!) --> either all deletions fail or none
        await this.models.startsingroup.destroy({where:{xStartgroup: {[Op.In]:deletedStartsInGroup}}}).catch(()=>{
            // should we really throw er error here? Or should we simply continue? --> We should not throw an error, but note what xStartgroups failed. We must ensure that the data is still consistent among different clients 
            throw {message: `StartsInGroups (${deletedStartsInGroup}) could not be deleted!`, code:24}
        }); // is "await" needed here?


        // we simply loop backwards and delete+destroy matching elements
        for (let j=this.data.startsInGroups.length-1; j>=0; j--){
            // when we would assume that concurrent changes were processed at the same time it would be problematic to loop the way I do and the indices used for splicing should be re-derived before usage (as in the default delete statement), since they could have changed during the async call was processed.
            let sig = this.data.startsInGroups[j];
            if (sig.xStartgroup in deletedStartsInGroup){
                this.data.startsInGroups.splice(j,1);

                // raise event to notify e.g. contests
                this.eH.raise(`${this.name}:deletedAthleteForRound/GrpNbr${sig.xRound}/${sig.number}`, sig.xStartgroup)
            }
        }

        // broadcast; delete multiple with the given list "deletedStartsInGroup"
        // object storing all data needed to DO the change
        let doObj = {
            funcName: 'deleteMultiStartsInGroup',
            data: deletedStartsInGroup 
            // the UUID will be added on resolve
        }

        // object storing all data needed to UNDO the change
        // Not needed yet / TODO...
        let undoObj = {
            funcName: 'TODO', // deleteStartsInGroup
            data: {}
            // the ID will be added on resolve
        };

        // do the rest (put on stack and report to other clients etc)
        let ret = {
            isAchange: true, 
            doObj: doObj, 
            undoObj: undoObj,
            response: deletedStartsInGroup,
            preventBroadcastToCaller: true
        };
        return ret;
    }

    /**
     * Called when a start is added. Try to create the startInGroup entry, which requires that the event is linked to an event group AND the eventGroup has a first round.
     * @param {object} data The data with xStart and xEvent
     */
    async addedStart(data){
        
        let valid = this.validateAddedStart(data);
        if (valid){
            
            // first try to get  the respective xRound
            // get event
            let event = this.events.data.events.find(el=>el.xEvent==data.xEvent);
            if (!event){
                throw {message: `There is no event with xEvent=${data.xEvent}`, code: 24};
            }
            if (event.xEventGroup==null || event.xEventGroup==undefined){
                throw {message: `The event is not in an eventGroup`, code: 25};
            }

            // get eventGroup
            let eventGroup = this.eventGroups.data.find(el=>el.xEventGroup == event.xEventGroup)
            if (!eventGroup){
                throw {message: `There is no eventGroup with xEventGroup=${event.xEventGroup}`, code: 26};
            }

            // get the round
            if (eventGroup.rounds.length==0){
                throw{message: `Eventgroup ${event.xEventGroup} has no rounds yet.`, code: 27};
            }
            // get round 1
            let round = eventGroup.rounds.find(r=>r.order==1);
            if (!round){
                throw{message: `There is no round 1 in eventgroup ${event.xEventGroup}.`, code: 28};
            }

            // testing whether the group exists
            let group = round.groups.find(g=>g.number==data.groupNum);
            if (!group){
                throw{message: `SEVERE ERROR: There is no group number ${data.groupNum} in round ${round.xRound}. This should never happen and must be an error in the eventGroup/round managament.`, code:29}
            }

            let insert = {
                xStart: data.xStart,
                xRound: round.xRound,
                number: data.groupNum,
                present: true,
            }

            // create the entry
            var startsInGroup = await this.models.startsingroup.create(insert).catch((err)=>{throw {message: `Sequelize-problem: StartsInGroup could not be created: ${err}`, code:30}})

            this.data.startsInGroups.push(startsInGroup); 

            // raise event to notify e.g. contests
            this.eH.raise(`${this.name}:addedAthleteForRound/GrpNbr${round.xRound}/${insert.number}`, startsInGroup.xStartgroup)

            // the data to be sent back to the client requesting the add is the full data
            let sendData = startsInGroup.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addStartsInGroup',
                data: startsInGroup.dataValues // should have the same properties as data, but with added xStartsInGroup
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteStartsInGroup
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
            throw {message: this.ajv.errorsText(this.validateAddedStart.errors), code:23};
        }

    }

    /**
     * Delete the group assignment, given if exists. It will fail when there is already a refrence to seriesStartsResults
     * @param {integer} xStart The xStart to delete
     */
    async deleteStart(xStart){

        let valid = this.validateDeleteStart(xStart);
        if (valid){
            // if there are multiple entries, there is certainly already a result --> delete not possible
            let startEntries = this.data.startsInGroups.filter(el=>el.xStart==xStart);
            if (startEntries.length==0){
                throw{message:`Start ${xStart} had no entry to delete in startsInGroup.`, code: 24 };
            }
            if (startEntries.length>1){
                throw{message:`Start ${xStart} has multiple entries in startsInGroup. Deletion is not possible when the athlete has results, which is the case if he/she is registered in a second round already.`, code: 25};
            }

            // try to delete the startResult; it will fail when there is an entry in seriesStartResult (this is probably faster than testign that manually on the data in the respective room)
            startEntries[0].destroy().catch(()=>{
                throw {message: "StartsInGroup could not be deleted!", code:26}
            });

            // remove in in models
            let [ind, startsingroup] = this.findObjInArrayByProp(this.data.startsInGroups, 'xStart', xStart) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.startsInGroups.splice(ind,1);
            }

            // raise event to notify e.g. contests
            this.eH.raise(`${this.name}:deletedAthleteForRound/GrpNbr${startsingroup.xRound}/${startsingroup.number}`, startsingroup.xStartgroup)
            

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteStartsInGroup',
                data: startEntries[0].xStartgroup
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addStartsInGroup
                data: {}
                // the ID will be added on resolve
            };
            
            // do the rest (put on stack and report to other clients etc)
            let ret = {
                isAchange: true, 
                doObj: doObj, 
                undoObj: undoObj,
                response: xStart,
                preventBroadcastToCaller: true
            };
            return ret;

        } else {
            throw {message: this.ajv.errorsText(this.validateDeleteStart.errors), code:23};
        }
    }

    /**
     * add an startsInGroup
     * @param {object} data This data shall already be in the format as can be used by Sequelize to insert the data. It will be checked with the schema first.
     */
    async addStartsInGroup(data){

        // validate the data based on the schema
        let valid = this.validateAddStartsInGroup(data);
        if (valid) {

            // translate the boolean values; it would work in the DB (translated automatically), but in the locally stored data and returned value in 'meeting' from sequelize, it would still be the untranslated data, i.e. with true/false instead of 1/0. 
            // Method 1: manually translate the booleans with the translateBooleans-function in roomServer --> not very efficient if executed on the whole data and every function like addStartsInGroup, updateStartsInGroup, ... would have to actively call this function in it
            // Method 2: implement setter on sequelize level. Better solution, as only implemented once for all possible functions.
            var dataTranslated = data; //this.translateBooleans(data);

            var startsInGroup = await this.models.startsingroup.create(dataTranslated).catch((err)=>{throw {message: `Sequelize-problem: StartsInGroup could not be created: ${err}`, code:22}})

            this.data.startsInGroups.push(startsInGroup); 

            // raise event to notify e.g. contests
            this.eH.raise(`${this.name}:addedAthleteForRound/GrpNbr${data.xRound}/${data.number}`, startsInGroup.xStartgroup)

            // the data to be sent back to the client requesting the add is the full data
            let sendData = startsInGroup.dataValues;

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'addStartsInGroup',
                data: startsInGroup.dataValues // should have the same properties as data, but with added xStartsInGroup
                // the UUID will be added on resolve
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // deleteStartsInGroup
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
            throw {message: this.ajv.errorsText(this.validateAddStartsInGroup.errors), code:23};
        }
    }


    async deleteStartsInGroup(data){

        // data must be an integer (the xStartgroup id)
        let valid = this.validateDeleteStartsInGroup(data);

        if (valid){

            // get the entry from the data (respectively its index first):
            let [ind, startsInGroup] = this.findObjInArrayByProp(this.data.startsInGroups, 'xStartgroup', data)

            // delete the entry in the startsInGroups table
            await this.models.startsingroup.destroy({where:{xStartgroup: data}}).catch(()=>{
                throw {message: "StartsInGroup could not be deleted, pontentially since it is already assigned to a series!", code:21}
            });

            // NOTE: also arrives here when the event actually did not exist (anymore!); However, should always exist!

            // delete the entry locally from the data:
            [ind, startsingroup] = this.findObjInArrayByProp(this.data.startsInGroups, 'xStartgroup', data) // must be reqpeated, since the index could have changed due to the async call.
            if (ind>=0){
                this.data.startsInGroups.splice(ind,1);
            }

            // raise event to notify e.g. contests
            this.eH.raise(`${this.name}:deletedAthleteForRound/GrpNbr${startsingroup.xRound}/${startsingroup.number}`, startsingroup.xStartgroup)

            // object storing all data needed to DO the change
            let doObj = {
                funcName: 'deleteStartsInGroup',
                data: data
            }

            // object storing all data needed to UNDO the change
            // Not needed yet / TODO...
            let undoObj = {
                funcName: 'TODO', // addStartsInGroup
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
            throw {message: this.ajv.errorsText(this.validateDeleteStartsInGroup.errors), code:23};
        }
    }

    
    async updateStartsInGroup(data){
        // check if the client has the rights to do a change!
        // TODO
        
        // validate the data based on the schema
        let valid = this.validateUpdateStartsInGroup(data);
        if (valid) {

            // get the instance to update
            let [i, o] = this.findObjInArrayByProp(this.data.startsInGroups, 'xStartgroup', data.xStartgroup);
            if (i<0){
                throw {code:24, message:"The startsInGroup does not exist anymore on the server (should actually never happen)."};
            }

            // prevent a change of the startsInGroup when there is a seriesStartsResult entry.
            let res = await this.seq.query(`select count(*) as c from seriesstartsresults where xStartgroup=${o.xStartgroup}`, QueryTypes.SELECT);
            if (res[0][0].c > 0){
                throw {code:25, message:"The group cannot be changed, since the person is already assigned to a series. "};
            }
            
            // TODO: check all other functions whether sometinhg similar is needed.


            // cannot just assign dataValues to startsInGroup old, since "update" does not create a new object, but modifies the old one!
            let startsInGroupOld = copyObject(o.dataValues);

            return o.update(data).then(async(startsInGroupChanged)=>{
                // the data should be updated in th DB by now.

                // set the local data
                this.data.startsInGroups[i] = startsInGroupChanged;

                // raise event to notify e.g. contests
                this.eH.raise(`${this.name}:deletedAthleteForRound/GrpNbr${startsInGroupOld.xRound}/${startsInGroupOld.number}`, startsInGroupOld.xStartgroup)

                // raise event to notify e.g. contests
                this.eH.raise(`${this.name}:addedAthleteForRound/GrpNbr${startsInGroupChanged.xRound}/${startsInGroupChanged.number}`, startsInGroupChanged.xStartgroup)

                let ret = {
                    isAchange: true, 
                    doObj: {funcName: 'updateStartsInGroup', data: startsInGroupChanged.dataValues}, 
                    undoObj: {funcName: 'updateStartsInGroup', data: startsInGroupOld, ID: this.ID},
                    response: startsInGroupChanged.dataValues,
                    preventBroadcastToCaller: true
                };
                
                // the rest is done in the parent
                return ret;

            }).catch((err)=>{
                throw {code: 22, message: "Could not update the startsInGroup with the respective Id. Error: " + err};
            });

        } else {
            throw {code: 23, message: this.ajv.errorsText(this.validateUpdateStartsInGroup.errors)}
        }
    }

}

export default rStartsInGroup;