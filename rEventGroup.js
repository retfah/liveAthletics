// NOTE: this currently is a fully dynamic room! The data is generated danymically at startup and on some events. Changes are reported to the clients, but not through the side channel.

// dynamically created room for each eventGroup
// content: 
// 1) always provides: the status of all contests for each group & round
// 2) if at least two contests of groups in the first round are still in roll call mode, provide the options to assign the groups to each athlete (i.e. provide all this data then; the good thing is: if changes to data is only possible when the status is accordingly, then we really only have to monitor the status of the events and create the data only once, when the states are accordingly and there is no need to update the data on e.g. every new result.)
// 3) if all contests of a round are finished and the next round's contests are still in roll call mode, provide everything needed to create the qualification for the next round (including to set the groups in the next rond, if this is ever used)
// 4) provide structures startlist+result datasets that can be used for server-side printing beyond the boundaries of one single contest.

// NOTE: this room is NOT intended to provide a live overview of results on the client! This shall be done on the client by listening to all rooms that are involved in a round and mergign the data on the client. We do not want to do this here, since it would require a big effort on the server, even if no client is listening. 

import rInscriptions from "./rInscriptions.js";
import roomServer from "./roomServer.js";

export default class rEventGroup extends roomServer {

    constructor(dynamicRoom, eventGroup, meetingShortname, mongoDb, eventHandler, logger, rEventGroups, rContests, rStartsInGroup, rInscriptions, rStarts, rEvents){

        let roomName = `eventGroups/${eventGroup.xEventGroup}@${meetingShortname}`

        //(eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTickets=-1, conflictChecking=false, dynamicRoom=undefined, reportToSideChannel=true, keepWritingTicket=true)
        super(eventHandler, mongoDb, logger, roomName, true, 0, false, dynamicRoom, false, false);

        this.eventGroup = eventGroup;

        this.ready = false;

        // probably all data will be dynamic, i.e. not loaded from a DB, but created here
        /* eventGroup: {
            rounds: [
                {name, numGroups, order, qualiConf, qualiModule, 
                    groups: [
                        {
                            name, number, // untile here all from eventGroup;
                            contest: {} // put here the contest
                        }
                    ]
                }
            ]
        */
        this.data = {
            aux: {}, // e.g. all names (similar to auxData in rContest)
            eventGroup: {}, // all general information about
        };

        // reference the other rooms
        this.rEventGroups = rEventGroups;
        this.rContests = rContests;
        this.rStartsInGroup = rStartsInGroup;
        this.rInscriptions = rInscriptions;
        this.rStarts = rStarts;
        this.rEvents = rEvents;

        // check that all referenced rooms are ready; otherwise, we might end up having a room with incomplete data
        // TODO: actually we do not link al those rooms here anymore, but we do it directly on the client 
        Promise.all([this.rEventGroups._roomReady(), this.rContests._roomReady(), this.rStartsInGroup._roomReady(), this.rInscriptions._roomReady(), this.rStarts._roomReady(), this.rEvents._roomReady()]).then(async ()=>{
            
            await this.createData();

            this.ready = true;
        })


        // listen to the following events: 
        // changes to eG: roundAdd (iO), roundDelete (iO), roundUpdate (iO), groupAdd (in roundUpdate), groupDelete (in roundUpdate), groupChange (in roundUpdate), changedContestAssignment (in roundUpdate)
        // start added/removed for event in this eventGroup (we also need to add a listener to changes of the group (in rStartgroup), but make sure that we do not create a loop, when the change is initiated by this room)

        // TODO: make sure the events are 'unlistened' when the room is closed
        this.l1 = this.eH.eventSubscribe(`eventAddedToEventGroup${eventGroup.xEventGroup}`, async (event)=>{
            if (this.ready){
                await this.serverFuncWrite('updateData', {});
                //this.createData()
            };
        })

        this.l2 = this.eH.eventSubscribe(`eventDeletedFromEventGroup${eventGroup.xEventGroup}`, async (event)=>{
            if (this.ready){
                await this.serverFuncWrite('updateData', {});
                //this.createData();
            };
        })

        // this event is called for any changes to the eventGroup, including rounds and groups
        this.l3 = this.eH.eventSubscribe(`eventGroupUpdated${eventGroup.xEventGroup}`, async (event)=>{
            if (this.ready){
                await this.serverFuncWrite('updateData', {});
                //this.createData()
            };
        })

        // add the functions to the respective object of the parent
        // the name of the funcitons must be unique over BOTH objects!
        // VERY IMPORTANT: the variables MUST be bound to this when assigned to the object. Otherwise they will be bound to the object, which means they only see the other functions in functionsWrite or functionsReadOnly respectively!
        this.functionsWrite.updateData = this.updateData.bind(this);

    }

    async updateData(data){

        // data is NOT used here; only on the clients.

        await this.createData();

        const doObj = {
            funcName: 'updateData',
            data: this.data,
        };

        const undoObj = {
            funcName: 'TODO',
            data: {},
        };

        // The data is not transferred through the side channel due to the reporttoSideChannel setting in the creation of the room

        // do the rest (put on stack and report to other clients etc)
        let ret = {
            isAchange: true, 
            doObj: doObj, 
            undoObj: undoObj,
            response: this.data, // actually not used
            preventBroadcastToCaller: true
        };
        return ret;
    }

    async createData(){

        this.logger.log(98, `(Re)created the data in room ${this.name}` )

        // ATTENTION: the data collected and merged here MUST be a copy of the actual objectes. Otherwise, adding further properties (e.g. the events) to an object would result in a modification of the original object, which would lead to probelms there (e.g. cyclic references wich are problematic for JSON.stringify). 

        // data should mainly consist of all rounds/groups and their status; 
        // dependent on that, there might be additional data to allow to assign athjletes to groups or to process qualifications

        // --------------------
        // create the main data
        const eG = this.eventGroup;

        // get the main data; this is a copy of the data on all levels down to the groups. ATTENTION: without clone=true, the last child element (here: groups) would be a reference to dataValues instead of a copy of it!
        const data = eG.get({plain:true, clone:true});

        // try to add the contests to the groups
        for (let round of data.rounds){
            for (let group of round.groups){
                if (group.xContest){
                    
                    const contest = this.rContests.data.find(co=>co.xContest==group.xContest);
                    if (contest){
                        group.contest = contest.get({plain:true, clone:true});
                    } else {
                        group.contest = null;
                    }

                    // this contest data only contains the basic contest data such as the start time, but not the series and results!
                    // The actual contests are directly linked on the client.
                    /*let contestRoom = this.rContests.getSubroom(`${group.xContest}`);
                    if (contestRoom){
                        await contestRoom._roomReady();
                        group.contestRoom = contestRoom.data;
                    } else {
                        group.contestRoom = null;
                    }*/
                }
            }
        }

        // add a list of events to the data
        data.events = [];
        for (let e of this.rEvents.data.events.filter(e=>e.xEventGroup == eG.xEventGroup)){
            data.events.push(e.get({plain:true, clone:true}));
        }

        this.data = data;

        // TODO: notify all clients about the updated data! -_> evenutally do this vie Server-write-functions, which should do this automatically.

    }
}