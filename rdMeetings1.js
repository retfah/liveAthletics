// roomDataset meetings
// reduced dataset for the selection of a meeting

// TODO: 
// extend with auxilary data: e.g. from/to-dates, place, organizer, ... (data that is currently only found in each meeting itself in a not defined yet room)

import roomDataset from './roomDataset.js';

class rdMeetings1 extends roomDataset{ // do not rename without renaming the references to the static properties

    // the schema for a single meeting
    static meetingSchema = {
        type:'object',
        properties:{
            xMeeting:{type:'number'},
            shortname:{type:'string'},
            name:{type:'string'}
        }
    }

    constructor(room){

        // (room, name, isDynamic=false)
        super(room, 'meetingSelection');

        // add special functions:
        // TODO:
        //this.functionsProcessChange.functionXY= this.functionXY.bind(this);
        // Make sure that on the client the same function can be used independent of whether the full or a partial dataset is sent
        // updateMeeting: only report the applicable changes
        // deleteMeeting: only report if the meeting was running (the normal function should work)
        // activateMeeting: nothing to do
        // runMeeting: add the reduced dataset to the data
        // deactivateMeeting: nothing to do
        // stopMeeting: 
        // is "bind(this)" really needed?
        this.functionsProcessChange['addMeeting'] = this.addMeeting.bind(this);
        this.functionsProcessChange['deleteMeeting'] = this.deleteMeeting.bind(this);
        this.functionsProcessChange['runMeeting'] = this.runMeeting.bind(this);
        this.functionsProcessChange['stopMeeting'] = this.stopMeeting.bind(this);
        this.functionsProcessChange['activateMeeting'] = this.activateMeeting.bind(this);
        this.functionsProcessChange['deactivateMeeting'] = this.deactivateMeeting.bind(this);
        this.functionsProcessChange['updateMeeting'] = this.updateMeeting.bind(this);

    }

    updateMeeting(doObj){
        let newMeeting = doObj.data;

        // get the current meetings data
        let [i,] = this.room.findObjInArrayByProp(this.data, 'xMeeting', newMeeting.xMeeting)

        // if it is not in this data, then the meetign was not activated and needs no change.
        if (i<0){
            return this.createIDchangeObj();
        } else {
            // process the data
            let newMeetingMod = this.propertySelection(newMeeting, rdMeetings1.meetingSchema);

            // create a clone of the doObj, since we are not allowed to change the actual doObj (because other datasets would then get the already altered data)
            let doObjMod = {...doObj}; 
            doObjMod.data = newMeetingMod;

            this.data[i] = newMeetingMod;

            return this.createFunctionObj(doObjMod);
        }


    }

    addMeeting(doObj){
        // since the meeting will be started asynchronously (later) and broadcast its own event, we just have to update the ID
        return this.createIDchangeObj();
    }

    deleteMeeting(doObj){
        // actually, this should always be just an ID change, since the meeting should have been stopped before it gets deleted
        // but we treat it as if it was not stopped before...
        let meetingId = doObj.data;
        let [ind, ] = this.room.findObjInArrayByProp(this.data, 'xMeeting', meetingId);
        if (ind<0){
            // meeting did not exist in data
            return this.createIDchangeObj();
        } else {
            // delete the meeting from the array and broadcast the delete object
            this.data.splice(ind,1);
            return this.createFunctionObj(doObj);
        }
    }

    stopMeeting(doObj){

        // in general this should be called after deactivate, meaning that there is no change for that dataset anymore
        // we have to translate from "stop" to "delete", since a stopped meeting in the rom is equivalent to a deletion in this dataset

        let meetingId = doObj.data;
        let [ind,] = this.room.findObjInArrayByProp(this.data, 'xMeeting', meetingId);
        if (ind<0){
            // meeting did not exist in data; happens when the deactivate-function was run before (as it should be)
            return this.createIDchangeObj();
        } else {
            // delete the meeting from the array and broadcast the deleteMeeting object
            this.data.splice(ind,1);

            let doObjMod = {
                ID: doObj.ID,
                funcName: 'deleteMeeting',
                data: doObj.data
            }

            return this.createFunctionObj(doObjMod);
        }
    }

    runMeeting(doObj){
        // when the meeting starts running, we have to ADD it to the clients of this dataset (i.e., the function changes from activate to add!)

        // create a changed doObj
        let doObjMod = {
            ID: doObj.ID,
            funcName: 'addMeeting'
        };

        // get the meeting and filter it
        let [, meeting] = this.room.findObjInArrayByProp(this.room.data, 'xMeeting', doObj.data);

        let dataSubset = this.propertySelection(meeting, rdMeetings1.meetingSchema);

        doObjMod.data = dataSubset;

        // add the data to the dataset
        this.data.push(dataSubset)

        return this.createFunctionObj(doObjMod);

    }

    activateMeeting(doObj){
        // would change the active property of the meeting; since this property is not part of this dataset, just report the new ID; the meeting will then be added as soon as it is run
        return this.createIDchangeObj();
    }

    deactivateMeeting(doObj){
        // in general this should be called before stop, meaning that we here will delete the meeting from the list of running+active meetings
        // we have to translate from "stop" to "delete", since a stopped meeting in the rom is equivalent to a deletion in this dataset

        let meetingId = doObj.data;
        let [ind,] = this.room.findObjInArrayByProp(this.data, 'xMeeting', meetingId);
        if (ind<0){
            // meeting did not exist in data; should not happen, since the stop-function usually should activate later
            return this.createIDchangeObj();
        } else {
            // delete the meeting from the array and broadcast the deleteMeeting object
            this.data.splice(ind,1);

            let doObjMod = {
                ID: doObj.ID,
                funcName: 'deleteMeeting',
                data: doObj.data
            }

            return this.createFunctionObj(doObjMod);
        }
    }

    /**
     * Apply the given filter criterion to derive the dataset. 
     * Applied when:
     * - when it must be checked whether a change applies to the dataset or not.
     * - usually when the subdataset is created for the first time.
     * Must be able to deliver a filtered dataset. Usually data is an array with objects. If also single objects might get filtered, e.g. when it must be checked whether a chenge applies to that view, then the function must also be able to handle that!
     */
    applyFilter(data){

        // first: filter for criterias ('where')
        // data is an array
        let dataSubset = data.filter(row=>{

            // implement the filter logic here
            return row.active && row.running

        })

        // second: get only the attributes we want of the dataSubset. As this process is more computationally costly than the simple filtering, it shall be done second and hopefully on a reduced dataset. 
        let schemaMod = {
            type:'array',
            items: rdMeetings1.meetingSchema
        }

        dataSubset = this.propertySelection(dataSubset,schemaMod);

        // OLD: (works as well, but not in that generality as the new approach)
        //dataSubset.map(row => this.pick(row, attributes)); // do the attribute filter for all 
        

        return dataSubset;
    }

    datasetsAreEqual(data1, data2){
        return this.daeUnsortedArray(data1, data2)
    }

}

//module.exports = rdMeetings1;
export default rdMeetings1;