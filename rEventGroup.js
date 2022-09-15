// dynamically created room for each eventGroup
// content: 
// 1) always provides: the status of all contests for each group & round
// 2) if at least two contests of groups in the first round are still in roll call mode, provide the options to assign the groups to each athlete (i.e. provide all this data then; the good thing is: if changes to data is only possible when the status is accordingly, then we really only have to monitor teh status of the events and create the data only once, when the states are accordingly and there is no need to update teh data on e.g. every new result.)
// 3) if all contests of a round are finished and the next round's contests are still in roll call mode, provide everythign needed to create the qualification for the next round (including to set the groups in the next rond, if this is ever used)
// 4) provide structures startlist+result datasets that can be used for server-side printing beyond the boundaries of one single contest.

// NOTE: this room is NOT intended to provide a live overview of results on the client! This shall be done on the client by listening to all rooms that are involved in a round and mergign the data on the client. We do not want to do this here, since it would require a big effort on the server, even if no client is listening. 

import rInscriptions from "./rInscriptions.js";
import roomServer from "./roomServer.js";

export default class rEventGroup extends roomServer {

    constructor(dynamicRoom, eventGroup, meetingShortname, mongoDb, eventHandler, logger, rEventGroups, rContests, rStartsInGroup, rInscriptions, rStarts, rEvents){

        let roomName = `eventGroups/${eventGroup.xEventGroup}@${meetingShortname}`

        //(eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTickets=-1, conflictChecking=false, dynamicRoom=undefined, reportToSideChannel=true, keepWritingTicket=true)
        super(eventHandler, mongoDb, logger, roomName, true, -1, false, dynamicRoom, true, false);

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
        // changes to eG: roundAdd, roundDelete, roundChange, groupAdd, groupDelete, groupChange (=?) changedContestAssignment
        // start added/removed for event in this eventGroup (we also need to add a listener to changes of the group (in rStartgroup), but make sure that we do not create a loop, when the change is initiated by this room)

        // TODO: make sure the events are 'unlistened' when the room is closed
    }

    async createData(){

        // data should mainly consist of all rounds/groups and their status; 
        // dependent on that, there might be additional data to allow to assign athjletes to groups or to process qualifications

        // --------------------
        // create the main data
        const eG = this.eventGroup;

        // get the main data; this is a copy of the data on all levels down to the groups
        const data = eG.get({plain:true});
        
        // try to add the contests to the groups
        for (let round of data.rounds){
            for (let group of round.groups){
                if (group.xContest){
                    // this contest data only contains the basic contest data such as the start time, but not the series and results!
                    // Where should we add the actual contest data? here or on the client? Lets do it here for the moment. "On the client" would be beneficial, since all results-data is always up to date, but it is way more complex to achieve.
                    let contestRoom = this.rContests.getSubroom(`${group.xContest}`);
                    if (contestRoom){
                        await contestRoom._roomReady();
                        group.contestRoom = contestRoom.data;
                    } else {
                        group.contestRoom = null;
                    }
                    
                    const contest = this.rContests.data.find(co=>co.xContest==group.xContest);
                    if (contest){
                        group.contest = contest.get({plain:true});
                    } else {
                        group.contest = null;
                    }

                    // TODO: register events for status changes of the contests

                }
            }
        }

        // add a list of events to the data
        data.events = [];
        for (let e of this.rEvents.data.events.filter(e=>e.xEventGroup == eG.xEventGroup)){
            data.events.push(e.get({plain:true}));
        }


        // TODO: temporary only
        this.data = data;

        //------------------
        // the group-number can be set for groups, which contest is still before rollCall mode
        // if 


        // qualifications can be done when ALL previous groups/contests are finished AND the groups/contests of the next round are still before rollCall mode


        // create the auxilary data; two options: 
        // - directly create the data from the DB (as it is done in rContestTechHigh); problem: change to names would not show up here automatically, but it would require an event as notifier and additionally  
        // - filter the data of rInscriptions --> current solution
        // - create new datasets of rStarts and rInscription that we more or less always keep on the client (load once and do not remove them)
        // OR: do not provide such auxilary data, but simply connect to rStarts and rInscriptions on the client --> current solution

        // create a list of all events in this eventGroup
        this.rStarts.data.starts.filter

    }

    // handle the changes in startInGroup via this room, or not ??? (alternative: allow writing in rStartInGroup) the latter is probably better
    /*async updateStartInGroup(){

    }

    async addStartInGroup(){

    }

    async deleteStartInGroup(){

    }*/
}