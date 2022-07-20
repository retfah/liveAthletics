// NOTE: DISCONTINUED

// TODO: while a json can easily be created out of a sequelize model representation, the opposite is obviously not so easily possible. Write a generic function that can backpropagate changes in a json into the model and save it. Including all the checks that need to be done. Possibly they are not made manually in this function, but in the sequelize framework.

const roomView = require('./roomView');

// TODO: create a roomView which shows only the data needed in the selection of the meeting. (i.e. do not show configuzration stuff etc.)
class vMeetingsSelection extends roomView{
    
    constructor(room){
        super(room, "meetingsSelection", false);
        
    }

    /**
     * Apply the given filter criterion to derive the dataset. 
     * Applied when:
     * - when it must be checked whether a change applies to the view or not.
     * - usually when the subdataset is created for the first time.
     * Must be able to deliver a filtered dataset. Usually data is an array with objects. If also single objects might get filtered, e.g. when it must be checked whether a chenge applies to that view, then the function must also be able to handle that!
     */
    applyFilter(data){

        // the data is of shape [{}, {}, ...]

        // first: filter for criterias ('where')
        // filter all deactivated and deactivating meetings
        let dataSubset = data.filter(meeting=>{

            // implement the filter logic here and define passFilter
            if (meeting.active && meeting.running){
                return true;
            } else {
                return false;
            }
        })

        // second: get only the attributes we want of the dataSubset. As this process is more computationally costly than the simple filtering, it shall be done second and hopefully on a reduced dataset. 

        let attributes = ['name', 'shortname']
        dataSubset.map(row => this.pick(row, attributes)); // do the attribute filter for all 

        return dataSubset;
    }

}

module.exports = vMeetingsSelection;