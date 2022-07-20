

import meetings from './modelsMeetingDefine/meetings.js';
import roomServer from './roomServer.js';

/**
 * this room does NOT provide any changing options, but only provides a merged dataset between events, eventGroups, rounds, groups and contests
 */
 class rContestsOverview extends roomServer{

    /** Constructor for the contest-room
     * @method constructor
     * @param {string} meetingShortname
     * @param {mongoDb} mongoDb The mongoDb instance to be used.
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {logger} logger A logger instance
     * 
     */
    constructor(meetingShortname, mongoDb, eventHandler, logger, rContests, rEvents, rEventGroups, rBaseDisciplines, rCategories){

        // call the parents constructor FIRST (as it initializes some variables to {}, that are extended here)
        // (eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false, dynamicRoom=undefined, reportToSideChannel=true)
        super(eventHandler, mongoDb, logger, "contestsOverview@" + meetingShortname, true, 0, false, undefined, false); // no writing clients, changes are not reported to sideChannel, sicne they are only reactions to changes in other rooms

        // initialize/define the default structure of the data (either an array [] or an object {})
        // we need to define this since roomDatasets will required the respective type, before the actual data is loaded
        this.data = {
            contests: [],
            disciplines: [], // will stay empty in the room; is filled for every client separately based on its language,
            categories: rCategories.data,
        }; 

        this.eH.eventSubscribe('categories@' + meetingShortname + ':ready', ()=>{
            this.data.categories = rCategories.data;
        })

        // sequelize is not needed here, since we get all data from other rooms

        // reference to the rooms:
        this.rEvents = rEvents;
        this.rEventGroups = rEventGroups;
        this.rContests = rContests;
        this.rBaseDisciplines = rBaseDisciplines;
        this.rCategories = rCategories;
        this.meetingShortname = meetingShortname;

        // all rooms need to be ready first before we can create the data
        let checkReadiness = ()=>{
            
            if (this.rEvents.ready && this.rEventGroups.ready && this.rContests.ready){
                this.createData();
                this.ready = true;
                return true;
            }
            return false;
        }

        // if rooms are not ready yet, add listeners for the respective room's ready event
        if (!checkReadiness()){
            // unsubscribe from the events ("garbage collection")
            if (!this.rEvents.ready){
                this.eH.eventSubscribe(`events@${meetingShortname}:ready`, (data)=>{
                    checkReadiness();
                    this.eH.eventUnsubscribe(`events@${meetingShortname}:ready`, this.name);
                }, this.name, true);
            }
            if (!this.rEventGroups.ready){
                this.eH.eventSubscribe(`eventGroups@${meetingShortname}:ready`, (data)=>{
                    checkReadiness();
                    this.eH.eventUnsubscribe(`eventGroups@${meetingShortname}:ready`, this.name);
                }, this.name, true);
            }
            if (!this.rContests.ready){
                this.eH.eventSubscribe(`contests@${meetingShortname}:ready`, (data)=>{
                    checkReadiness();
                    this.eH.eventUnsubscribe(`contests@${meetingShortname}:ready`, this.name);
                }, this.name, true);
            }
        }


        // listen to changes in contests, events, eventGroups and make sure that the data here is updated as it should
        // there should be very few or no changes in events and eventGroups, but there are certainly changes in contests (especially contest status changes). Handle the latter separately without recreating the full data every time
        this.eH.eventSubscribe(`eventGroups@${meetingShortname}:change`, (data)=>{this.createData()}, this.name, true);
        this.eH.eventSubscribe(`events@${meetingShortname}:change`, (data)=>{this.createData()}, this.name, true);

        // TODO: separate handler for changes in contests to not recreate the full dataset on every change
        this.eH.eventSubscribe(`contests@${meetingShortname}:change`, (data)=>{this.createData()}, this.name, true);

        this.functionsWrite.updateContests = this.updateContests.bind(this);

    }

    // (re)creates the data
    createData(){
        // first prepare the eventGroups, by creating an object with xEventGroup as the key and a selective copy of the eventGroup; add the events to the eventGroups
        //let eventGroups = {};

        // OLD:
        /*for (let eG of this.rEventGroups.data){
            // create a copy and add it to the eventGroups 
            eventGroups[eG.xEventGroup] = Object.assign({}, eG.dataValues); // NOTE: this does not create a copy of the rounds and groups. Those are still tehoriginal objects! 
            eventGroups[eG.xEventGroup] = eG.events = [];
        }

        // loop over all events add it to their respective eventGroup
        for (let e of this.rEvents.data.events){
            if (e.xEventGroup != null){
                // add event to the respective eventGroup
                let eG = eventGroups[e.xEventGroup];
                eG.events.push({xEvent: e.xEvent, xCategory: e.xCategory, info:e.info, onlineId:e.onlineId});
            }
        }*/

        // NEW (more efficient):
        // loop over all events and create a reference
        let eventsPerEventGroup = {};
        for (let e of this.rEvents.data.events){
            if (e.xEventGroup != null){
                let o = {xEvent: e.xEvent, xCategory: e.xCategory, info:e.info, onlineId:e.onlineId}
                if (!(e.xEventGroup in eventsPerEventGroup)){
                    eventsPerEventGroup[e.xEventGroup] = [o];
                } else {
                    eventsPerEventGroup[e.xEventGroup].push(o);
                }
            }
        }


        // create a copy of the contests array as the basis for the further assignments
        let contestOverview = Array.from(this.rContests.data, el=>{
            let c=Object.assign({}, el.dataValues);
            c.groups = [];
            return c;
        });

        // it is more efficient to loop over all groups in rounds in eventGroups and find the respective contest to add it than to start with the contest and search the groups
        for (let eG of this.rEventGroups.data){
            for (let r of eG.rounds){
                for (let g of r.groups){
                    // add the necessary information to the contest-data
                    if (g.xContest!=null){
                        let contest = contestOverview.find(el=>el.xContest == g.xContest);
                        if (!contest){
                            this.logger.log(20, `Could not find a contest with xContest=${g.xContest}.`);
                            continue;
                        }
                        let o = {
                            xRound: g.xRound,
                            number: g.number,
                            groupName: g.name, 
                            xEventGroup: eG.xEventGroup,
                            order: r.order,
                            roundName: r.name,
                            numGroups: r.numGroups,
                            eventGroupName: eG.name,
                            xDiscipline: eG.xDiscipline,
                            combined: eG.combined
                        }
                        // add the list of events, if available
                        if (eG.xEventGroup in eventsPerEventGroup){
                            o.events = eventsPerEventGroup[eG.xEventGroup];
                        } else {
                            o.events = [];
                        }
                        contest.groups.push(o);
                    }
                }
            }
        }


        this.data.contests = contestOverview;

        // send the new data to all clients
        this.serverFuncWrite('updateContests',undefined).catch(()=>{});

    }

    async updateContests(noData){
        let ret = {
            isAchange: true, 
            doObj: {funcName: 'updateContests', data: this.data.contests},
            undoObj: {funcName: 'TODO', data: {}, ID: this.ID},
            response: true, 
            preventBroadcastToCaller: true
        };

        return ret;
    }

    /**
     * return a personalized data object, providing the precreated merged list of disciplines (merged with baseDisciplines and the translated stuff) 
     */
        getPersonalizedData(client){

            // we cannot add the dynamic auxilary data to the data directly, but we need to create a new object with the same properties and then add the data there
            let data = {};
            for (let o in this.data){
                data[o] = this.data[o];
            }
    
            data.disciplines = this.rBaseDisciplines.getTranslatedDisciplines(client.session.lang);

    
            return data;
        }


 }

 export default rContestsOverview;