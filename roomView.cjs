// IMPORTANT NOTE: Views are dicontinued currently (12-2020). They were/are implemented on the server, but not yet on the client and thus the complete stuff is not tested! The implementation on the client would have been problematic, since a data change in a view would not have changed the data in the room or other views. This would have resulted in an inconsistent UI on the client during the time where the change is processed on the server. If there was temporarily no connection to the server, this state would have occured for a longer time even, which would not be acceptatble. The alternative is to just use the standard room, but just to not have the full dataset for some clients. Some properties there might either be undefined or non-existant. (Actually, for javascript this is the same for the "last" property, e.g. firstProp.secondProp.lastProp=undefined woudl be the same as if lastProp was just missing.)



/**
 * - The basic registration must be in the room, and not in the view, since for example writing tickets must be registered for the room and not for the roomView. (When it was with the latter, it would be extremely hard to control the maximum number of writing tickets, since the logic would need to change whenever another view was added.)
 * - A view probably better just should do the data-handling (derive its dataset from the room, change its dataset (or not if not necessary) on changes in the room and let these changes be broadcasted by the room.) --> thus no client handling here. 
 * - in order to keep track of changes applicable to a certain view it might be necessary to store stack infos to the mongoDB. Either the same amount of info is stored as in the room (thus we store actually duplicate data) or it would probably be possible to store just the id's of the changes that were applicable to the view and the view could then on demand translate the changes needed to update a certain vlient of the view. 
 * TODO: 
 * - how to handle a client that connects to multiple views and/or the room?
 * - how should it work on the client? Is there also the main roomClient that handles various views or is a view on the client side handled as a room? (If the latter, then the client would necessary have multiple connections to different views of the same room!) --> better that also on the client there is the mainRoom which does the difficult stuff and a few views linked through that.
 */

//const { Logger } = require("mongodb");

/**
 * Processes: 
 * Startup (currently sync): 
 * - The room creates the roomView-instance (either on startup of the same, or dynamically on demand when a user wants to connect to a non-existant dynamic room.)
 * - The roomView gets the current ID from the room and runs the room-data through the filter to create its own dataset
 * - (FUTURE: (static) roomViews might have its own stack and ID on mongoDB. )
 * - the roomView is ready
 * 
 * A client wants to connect to the roomView:
 * - room.enter --> opt.roomView is set --> calls enterView (in roomServer)
 * - OR client is already in the room, but wants to add subscription of the view: direct call on enterView
 * - enterView: 
 *  - check if this roomView exists; otherwise call startDynamicRoomView and if it can be started, add it to the list of existing roomViews
 *  - add client to the view by calling enter(clientSID) on the view. This function usually just adds the SID to the list of clients, but by inheritance this process could be overwritten, e.g. to check accessing rights. Returns true on success.
 *  - TODO: if entering view was successful, store the clients 'subscription' to the view in the clients object, in order to know which views it is listening to and which views need to left on leave
 *  - if entering is unsuccessful and it was a newly created dynamic room, close it again.
 * 
 * A change already processed in the room shall be processed in the roomView:
 * - find out whether this change applied to the view: 
 *  - check if the roomView has a special function that can determine whether the change given is applicabale to it --> ideally for each possible change-function, have the corresponding function defined in functionsProcessChange; 
 *   - if it exists, apply the change to the roomView data and broadcast this incremental change to the clients.
 *   - if it does not exist, the check it less efficiently: rederive the data from the room and compare the old and new data (JSON.stringify and compare); if changed, store the new data and the respective ID of the room. Broadcast the new full (!) data to all listening clients
 *   - NOTE: if a roomView knows that a certain change in the room never has an influence on the roomView, this function shall always be implemented in roomView and just return 'not applicable to roomView' instead of not having it!
 * - broadcasting shall be sone by providing a function in room with the SID's the broadcast should be sent to.
 * 
 * A client leaves a room (properly):
 * - TODO
 * - close a dynamic room when there are no clients anymore
 * 
 * A client leaves a room (by loosing connection):
 * - TODO
 */

class roomView{
    
    /**
     * 
     * @param {roomServer} room The room this view is used in. 
     */
    constructor(room, name, isDynamic=false){
        this.room = room;

        // logger instance
        this.logger = room.logger;

        // event handler instance
        this.eH = room.eH;

        // a view has its own name
        this.name = name;

        // store a list of the listening clients (SIDs). For each SID, the room stores the wsConnection. 
        this.clients = []

        // a view has its own id, which is only updated when a change in the room is also applicable to the view. 
        this.id = this.room.uuidv4()

        // the data(sub)set
        this.data = '';

        // we need to store a list of the 'change-functions' of which we can process the data change given in doObj
        this.functionsProcessChange = {};

        // create the dataset
        this.createDataset();

        // know whether the rom should be automatically closed when the last client leaves
        this.isDynamic = isDynamic;


        // FUTURE: 
        // the roomView has its own stack; eventually this is even stored in mongoDB. Storing would probably require unnecessary disk space and should be ommitted for dynamic roomViews (or limited to just very few entries). Anyway, in dynamic rooms the stack only makes truly sense if we expect many clients connected to it or when the room is kept open (for a certain time) when the client 'leaves' without properly disconnecting. 
        //this.stack = [];
        //this.stackIDs = [];

        // register the view in the room
        room.viewCreated(this);
    }

    /**
     * create the sub-dataset for this view.
     * The function is called on startup of the room.  
     * This funciton implements the default behavior, which is to call applyFilter. If some additional stuff shall be done, the funcito can be overriden.
     */
    createDataset(){
        this.data = this.applyFilter(this.room.data);
    }

    /**
     * Recreate the dataset and send out a broadcast if the data has changed. This is a generic function that is always available and may be called e.g. when there are changes in the room, which are not specifically handled. 
     * @param {boolean} broadcastChanges True if a broadcast should be sent to all view-clients given there was a change 
     * @param {string} sidExclude The sid of the client not needing the broadcast
     */
    recreateDataset(broadcastChanges=true, sidExclude=''){
        let newData = this.applyFilter(this.room.data);
        if (JSON.stringify(newData)!=JSON.stringify(this.data)){
            this.data = newData;

            if (broadcastChanges){
                let obj = {type: 'full', data: newData}; // TODO: on the client it is not yet defined how this shall be handled!
                this.broadcast(obj, sidExclude);
            }
        }
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

            let passFilter = true;
            return passFilter;

        })

        // second: get only the attributes we want of the dataSubset. As this process is more computationally costly than the simple filtering, it shall be done second and hopefully on a reduced dataset. 

        //let attributes = ['attribute', 'also.fourth.level.works']
        //dataSubset.map(row => this.pick(row, attributes)); // do the attribute filter for all 

        return dataSubset;
    }

    /**
     * Remove the client with the given sid from the list of clients listening to the room. If it was the last remaining client in a dynamic view, the view will be closed. 
     * @param {string} sid 
     */
    leave(sid){
        // remove from the clients list of this room
        let ind = this.clients.indexOf(sid)
        if (ind>=0){
            this.clients.splice(ind, 1);
        }

        this.evaluateAutoclose()

    }

    enter(sid){
        // add the clients to the list of sids
        // first check that the client was not already int he roomView
        let ind = this.clients.indexOf(sid);
        if (ind==-1){
            this.clients.push(sid);
            return true;
        } else {
            // sid was already in room and thus cannot be added once more! (TODO: eventuelly raise an error instead of returning false)
            this.logger.log(50, 'Client was already registered in the view; which should not happen!')
            return false
        }
    }

    /**
     * Evalaute whether the room has to be closed or not. This function is called when a client leaves the room or when a  
     */
    evaluateAutoclose(){
        
        // if it is a dynamic roomView, check whether there are still clients connected or close this roomView
        if (this.isDynamic && this.clients.length==0 ){
            // remove the view from the room's list of views
            this.room.viewCloses(this.name);
            // the garbage collector will delete this object then since it is not referenced anymore
        }
    }

    /**
     * evaluate whether the client has rights to enter this view; by default yes.
     * @param {string} sid 
     * @returns {boolean} accessRight The client has the right to access the room. 
     */
    evaluateRights(sid){
        return true;
    }

    /**
     * broadcast Send some data to every connected client
     * @param {object} obj The object with the changes to do; must be have the following properties (see also 'pushChange' for schema): funcName, data, ID (the new UUID)
     * @param {wsConnectionUUID} sidExclude Exclude this wsConnection-UUID form the broadcast (e.g. because the request came fomr this UUID)
     */
    broadcast(obj, sidExclude){

        // broadcast to clients of the room itself (and not just of a roomView)
        // currently the potential to send one data-package per client, eventually with the data of several views, is left unused 

        // extend the object with the roomName
        obj.roomName = this.room.name;

        // extened the object with the view name
        obj.viewName = this.name;

        // loop over all clients and send them the data (except the sender)
        //for (let sid in this.clients){
        for(let sid of this.clients){
            if (sid!=sidExclude){
                // wrap the object to be sent to the room-handler
                let sendObj = {
                    name:'room',
                    data:obj
                }
                
                this.room.clients[sid].processor.sendNoteAck(sendObj);
                //this.clients[sid].sendNote(); // should we send it as note, where we do not know whether it has arrived or as request, where we can get an acknowledgement? Or maybe I'll reimplement noteAck...
            }
        }
    }

    // 
    /**
     * Helper function to reduce an object to certain properties only. 
     * copied from: https://www.jstips.co/en/javascript/picking-and-rejecting-object-properties/
     * @param {object} obj The object to reduce 
     * @param {array} keys An array of strings storing all attributes to keep. IT DOES NOT WORK WITH NESTED ATTRIBUTES (even if it looks so on the mentioned homepage, but there are just properties with names like 'hello.world') 
     */
    pick(obj, keys) {
        return keys.map(k => k in obj ? {[k]: obj[k]} : {})
                    .reduce((res, o) => Object.assign(res, o), {});
    }

}


module.exports = roomView;