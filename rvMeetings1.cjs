// room-view meetings

const roomView = require('./roomView');


class rvMeetings1 extends roomView{

    constructor(room){

        super(room, 'rvMeetings1');

        this.functionsProcessChange.updateMeeting = this.updateMeeting.bind(this);
    }

    /**
     * Apply the given filter criterion to derive the dataset. 
     * Applied when:
     * - when it must be checked whether a change applies to the view or not.
     * - usually when the subdataset is created for the first time.
     * Must be able to deliver a filtered dataset. Usually data is an array with objects. If also single objects might get filtered, e.g. when it must be checked whether a chenge applies to that view, then the function must also be able to handle that!
     */
    applyFilter(data){

        //throw new Error('this function must be instantiated by the inheriting class!');

        // first: filter for criterias ('where')
        // data is an array
        let dataSubset = data.filter(row=>{

            // implement the filter logic here and define passFilter
            return row.active

        })

        // second: get only the attributes we want of the dataSubset. As this process is more computationally costly than the simple filtering, it shall be done second and hopefully on a reduced dataset. 
        let attributes = ['xMeeting', 'shortname', 'name'];
        dataSubset.map(row => this.pick(row, attributes)); // do the attribute filter for all 
        // NOTE: this second part could (in some cases) also be done in combination with JSON.stringyfy: JSON.stringyfy(data, (key, value)=>{if (show){return value}else{return undefined}}) 
        // the function given is called "node visitor" and is raised for every key in the object. It will also be called for every sub-object's properties! Thus if we want that obj.foo is deleted, but obj.bar.foo is kept, then we cannot use this function!
        

        return dataSubset;
    }

    // the function to be called when updateMeeting did a change and raised doObj.funcName='updateMeeting' with doObj.data which is entered as data here
    updateMeeting(data){
        // this function can/could actually be avoided, when in the room the called writingFunction can tell that the data returned is a standard dataset, as then we could easily process that data through applyFilter and realize whether something has changed or not.
        
        if(Object.keys(this.applyFilter(data)).length===0){
            // the change was not applicable to this view
        } else {
            // implement the change in this room:

            // find the element to change...
            let i = this.data.findIndex((v)=>{if(v.xMeeting==data.xMeeting){return true}})
            
            // ...and replace it
            this.data[i] = data;
        }
        
        // TODO: dependent on how we implement everything, we have to define here what data shall be sent to the clients of this view.

    }

}

module.exports = rvMeetings1;