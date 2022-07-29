import roomDataset from './roomDataset.js';

// add categories + meeting to this dataset (e.g the same as in rEvents, minus the possible disciplines, since we cannot translate them here)

// room dataset containing all events and the groups in their first rounds. This is useful to do the inscriptions, to assign directly also the group of the athlete. However, the same functionality should also be provided by te separate

export default class rdEventsWithGroups extends roomDataset{ // do not rename without renaming the references to the static properties

    constructor(rEvents, rEventGroups){
        
        super(rEvents, 'eventsWithGroups', false, false);

        this.data = {
            events:[], 
            categories: rEvents.data.categories, 
            meeting: rEvents.data.meeting
        };

        this.rEvents = rEvents;
        this.rEventGroups = rEventGroups;

        this.logger = rEvents.logger;

        // we must know when the eventGroup room is ready, since we cannot create are dataset before

        this.eGReadyListener = rEvents.eH.eventSubscribe(`${rEvents.name}:ready`, ()=>{

            // just recreate the dataset and send it to all clients
            this.onEventGroupChange();

            // unsubscribe now
            rEvents.eH.eventUnsubscribe(`${rEvents.name}:ready`, this.eGReadyListener);
        })

        // connect event for changes in eventGroups to onEventGroupChange
        // events must be raised in the following funciton in rEventGroups:
        // - addRound (if it is round 1)
        // - updateRound (if it is round 1)
        // - deleteRound (if it is round 1)
        // not needed in: 
        // - addEventGroup (since no event will exist at that time)
        // - deleteEventGroup (cannot delete as long as event is linked)
        // - updateEventGroup (no changes to rounds occure here)
        // raised in rEventGroups.deleteRound
        this.eventGroupRoundDeleteListener = this.rEvents.eH.eventSubscribe(`${this.rEventGroups.name}:resetNumGroups`, (data)=>{

            // data: {xEventGroup, order, numGroups}

            // only if the affected round-order is 1 and the number of groups was previously >1, there will be possibly a change
            if (data.order==1 && data.numGroups>1){
                let changes = false;
                // loop over all events and check if it is linked to the affected eventGroup

                for (let event of this.data.events){
                    if (event.xEventGroup == data.xEventGroup){
                        changes = true;
                        event.numGroups = 1; // reset numGroups to 1
                    }
                }
                
                if (changes){
                    this._broadcastFullData();
                }
            }

            // old: just recreate the dataset
            //this.onEventGroupChange();
        })

        // raised in rEventGroups.addRound and rEventGroups.updateRound
        this.eventGroupRoundDeleteListener = this.rEvents.eH.eventSubscribe(`${this.rEventGroups.name}:setNumGroups`, (data)=>{

            // data: {xEventGroup, order, numGroups}

            // only if the affected round-order is 1, there will be possibly a change
            if (data.order==1 ){
                let changes = false;
                // loop over all events and check if it is linked to the affected eventGroup

                for (let event of this.data.events){
                    if (event.xEventGroup == data.xEventGroup){
                        // does the data really change
                        if (event.numGroups != data.numGroups){
                            changes = true;
                            event.numGroups = data.numGroups; // set numGroups
                        }
                    }
                }
                
                if (changes){
                    this._broadcastFullData();
                }
            }

            // old: just recreate the dataset
            //this.onEventGroupChange();
        })

    }

    // OLD: whenever the number of groups in a first round changes:
    // just recreate the dataset and send it to all clients
    // CURRENTLY: on rooms-are-ready, create the initial full dataset
    onEventGroupChange(){
        this.createEvents();
        this._broadcastFullData();
    }

    _broadcastFullData(){
        const obj = {arg: 'fullData', opt: {ID: this.room.ID, data: this.data}}; // TODO: the ID did not change. Does the client accept the new dtaa anyway?
        this.broadcast(obj);
    }

    // overwrite the default behavior, since we also have auxilary data
    createDataset(){
        this.createEvents();
    }
    recreateDataset(){
        this.createEvents();
    }

    createEvents(){

        const rEventsData = this.rEvents.data;

        // this should actually only be done when both rooms (rEvents and rEventGroups are ready!!!) 
        if (this.rEventGroups.ready && this.rEvents.ready){
            // create a copy of the data in the room
            let data = JSON.parse(JSON.stringify(rEventsData.events));

            // loop over all events and try to add te required information
            for (let event of data){
                if (event.xEventGroup == undefined){
                    event.numGroups = 1;
                    continue;
                }
                const eG = this.rEventGroups.data.find((eG)=>{return event.xEventGroup==eG.xEventGroup});
                if (eG && eG.rounds.length>=1) {
                    event.numGroups = eG.rounds[0].numGroups;
                } else {
                    // if there is no round yet or the eventGroup could not be found, we assume there is one group
                    event.numGroups = 1; 
                }
            }

            this.data.events = data;
        }

    }

}