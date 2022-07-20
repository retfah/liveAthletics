// NOTE: this file is originally based on the roomView implementation, but changed to represent a (sub-) dataset

import roomServer from "./roomServer.js";

// only needed in developMode actually:
import _ from 'lodash';



/**
 * - This class basically provides all methods needed for a data-(sub)-set representation:
 *   - right checking: does a client have the right to get the dataset?
 *   - creating the dataset from the roomdata (select only several properties and/or filter some elements)
 *   - (this class does not change any data in the room/DB)
 *   - checking if a change also applies to the dataset and broadcasting the change 
 *   - IMPORTANT: a data(sub)set might not provide the full functionalities as does the room itself. Esepcially, it might lack the use of the functions, that would only change the changed part and not just send the full new dataset (i.e. change the name of one person and not the full details such as age, etc.). Basically it could be easy to provide special functions in the roomDataset-class to filter the change as well (e.g. just use a subpart of the reduced schema, relevant for the data sent in the change). 
 *   - on the client there should be no need for a special view. The roomClient-implementation might be written in a way that the same execution function that is used for the main room also works for the reduced dataset sent if the change was also processed by this data(sub)set class.
 *   - NOTE: it would be too cumbersome to have an ID for the data-state for every subset. Thus, only the ID of the main room is used. When a change in the room data does not change the data of the subset, then only/still the new ID is broadcasted!
 *   - eventually a dataset also allows to have its own auxilary data (would be interesting)
 * - registration must be in the room, and not here, since for example writing tickets must be registered for the room. 
 * - so far I suggest not to keep track of changes applicable to a certain dataset. Instead, a reconnecting client might get all the changes. Or, actually we could process the changes in the room through the data(sub)set filter again and send this ifno to the clients. Probably not needed on short notice.
 */


/**
 * Processes: 
 * Startup (currently sync): 
 * - The room creates the roomDataset-instance (either on startup of the same, or (FUTURE:) dynamically on demand when a user wants to connect to a non-existant dynamic room.)
 * - The roomDataset gets the current ID from the room and runs the room-data through the filter to create its own (sub-)dataset
 * - the roomdataset is ready
 * 
 * TODO rethink for datasets: 
 * A client wants the data from the roomDataset:
 * - room.enter --> opt.dataset is given 
 * - check if this roomDataset exists; otherwise call startDynamicRoomDataset and if it can be started, add it to the list of existing roomDatasets
 * - check if the client has the right to enter the room and the dataset (eventually the rights to enter the room are checked solely in the dataset -> to be implemented as needed.
 *  - if the client did not have the right to enter the room, evaluate autoclose on the dataset to close again a dynamic roomDataset if it was just created but is not used now.
 * - enter the roomDataset and the room, register the leave/connection-loss-event, broadcast the new client to all clients, return the requested data
 * 
 * A change already processed in the room shall be broadcasted to dataset-clients as well:
 * - by default, the roomDataset just processes the full (!) new dataset, checks whether something has changed by comparing the data as json before and after. In any case, report the new ID to the clients and of course as well the data if it changed. 
 * - the implementation for the dataset might implement special behaviors for some room-"functions": e.g. deleting could be done as in the room by just defining the ID to the client, if the deleted dataset was also in the (sub)dataset. Adding could be done the same way as in the room, but with a reduced dataset. IMPORTANT: the room-instance on the client should (ideally) not need special functions for datasets (except "updateIDonly"), e.g. the 'add' function on the client would need to work with the full dataset as well as with reduced data.
 * - NOTE: the dataset does NOT have its own ID!
 * 
 * HOW TO IMPLEMENT BROADCAST STUFF:
 * - broadcasting changes starts in room._processChange -> room._broadcastChange: here, the doObj is put into the object as sent to the client finally in room.broadcast. It looks like this: 
 *   obj={arg:'function', opt:doObj}
 * - thus the broadcast for roomDataset clients must be managed in room._broadcastChange
 * 
 * 
 * A client leaves a room (properly):
 * - TODO
 * - close a dynamic room when there are no clients anymore
 * 
 * A client leaves a room (by loosing connection):
 * - TODO
 */

class roomDataset{

    // check schema
    /*note = {
        name:'room',
        data: {
            roomName:'roomXY',
            arg: 'function',
            opt: {}
        }
    }*/
    // the outer part and data.roomName is added by roomDataset.broadcast
    // arg and opt are given by the respective function
    // the checked schema must differentiate the three different cases! Ideally the schemas for the opt-property are referenced from the room.
    static schemaDatasetFunctions={
        type:'object',
        properties: {
            arg: {type:'string', enum:['function', 'fullData', 'IDchange']} // check the values and make the optSchema dependent on it
            // note that the roomName will be added later.
        },
        allOf:[
            {
                'if':{
                    properties:{arg:{const:'function'}}
                },
                'then':{
                    properties:{opt:roomServer.schemaDoObj}
                }
            },
            {
                'if':{
                    properties:{arg:{const:'fullData'}}
                },
                'then':{
                    properties:{opt:{
                        type:'object',
                        properties:{
                            ID: {type: 'string'},
                            data: {} // can be of any type
                        },
                        required: ['ID', 'data']
                    }} 
                }
            },
            {
                'if':{
                    properties:{arg:{const:'IDchange'}}
                },
                'then':{
                    properties:{opt:{type:'string'}}
                }
            }
        ],
        required: ['arg', 'opt']
    }
    
    /**
     * 
     * @param {roomServer} room The room this dataset is used in. 
     * @param {string} name The name of this roomDataset
     * @param {boolean} isDynamic Whether this roomDataset shall be dynamically closed when there are no clients anymore listening to that data
     */
    constructor(room, name, isDynamic=false){
        this.room = room;

        // logger instance
        this.logger = room.logger;

        // event handler instance
        this.eH = room.eH;

        // a dataset has its own name
        this.name = name;

        // store a list of the listening clients (tabIds). For each tabId, the room stores the wsConnection. 
        this.clients = [];

        // the dataset has no special ID. It uses the ID of the room and will also update the ID if a change in the room is not a change in the dataset.

        // the data(sub)set
        this.data = '';

        // store a list of function(names) we can process specifically, without just broadcasting the full new data
        this.functionsProcessChange = {};

        // create the dataset
        this.createDataset();

        // know whether the dataset should be automatically closed when the last client leaves
        this.isDynamic = isDynamic;

        // create the validation function for the dataset-functions
        this.validateFunction = this.room.ajv.compile(roomDataset.schemaDatasetFunctions);

        // register the dataset in the room
        room.datasetCreated(this);
    }

    /**
     * create the sub-dataset
     * The function is called on startup of the room.  
     * This function implements the default behavior, which is to call applyFilter. If some additional stuff shall be done, the function can be overriden.
     */
    createDataset(){
        this.data = this.applyFilter(this.room.data);
    }

    /**
     * Recreate the dataset. This is a generic function that is always available and may be called e.g. when there are changes in the room, which are not specifically handled. 
     */
    recreateDataset(){

        this.data = this.applyFilter(this.room.data);

    }


    /**
     * Apply the given filter criterion to derive the dataset. 
     * Applied when:
     * - when it must be checked whether a change applies to the dataset or not.
     * - usually when the subdataset is created for the first time.
     * Must be able to deliver a filtered dataset. Usually data is an array with objects. 
     */
    applyFilter(data){

        throw new Error('this function must be instantiated by the inheriting class!');

        // first: filter for criterias ('where')
        // data is an array
        let dataSubset = data.filter(row=>{

            // implement the filter logic here and define passFilter

            let passFilter = true;
            return passFilter;

        })

        // second: get only the attributes we want of the dataSubset. As this process is more computationally costly than the simple filtering, it shall be done second and hopefully on a reduced dataset. 
        let schemaSelect = {
            type:'object',
            properties:{
                prop1:{type:'number'},
                prop2:{type:'string'}
            }
        }
        this.propertySelection(dataSubset, schemaSelect)

        return dataSubset;
    }

    /**
     * Remove the client with the given tabId from the list of clients listening to the dataset. If it was the last remaining client in a dynamic dataset, the dataset will be closed. 
     * @param {string} tabId 
     */
    leave(tabId){
        // remove from the clients list of this room
        let ind = this.clients.indexOf(tabId)
        if (ind>=0){
            this.clients.splice(ind, 1);
        }

        this.evaluateAutoclose()

    }

    enter(tabId){
        // add the clients to the list of tabIds
        // first check that the client was not already registered
        let ind = this.clients.indexOf(tabId);
        if (ind==-1){
            this.clients.push(tabId);
            return true;
        } else {
            // tabId was already in room and thus cannot be added once more! (TODO: eventuelly raise an error instead of returning false)
            this.logger.log(50, 'Client was already registered in the dataset; which should not happen!')
            return false
        }
    }

    /**
     * Evalaute whether the room has to be closed or not. This function is called when a client leaves the room or when a  
     */
    evaluateAutoclose(){
        
        // if it is a dynamic roomDataset, check whether there are still clients connected or close this roomDataset
        if (this.isDynamic && this.clients.length==0 ){
            // remove the dataset from the room's list of datasets
            this.room.datasetCloses(this.name);
            // the garbage collector will delete this object then since it is not referenced anymore
        }
    }

    /**
     * evaluate whether the client has rights to get this dataset; by default yes.
     * @param {string} tabId 
     * @returns {boolean} accessRight The client has the right to access the room. 
     */
    evaluateRights(tabId){
        return true;
    }

    /**
     * compare two datasets whether they are identical in the sense of the dataset. E.g. a variation of the order in an array.  Must be overridden by the inhgeriting function.  This class provides two functions that can be used in standard cases: if everything (including order of arrays and properties) is equal, we can simply compare the JSON.string (daeJSON) or if the order in the outermost array is not important, use daeUnsortedArray
     * @param {object or array} data1 The dataset 1
     * @param {object or array} data2 The dataset 2
     * @returns {boolean} 
     */
    datasetsAreEqual(data1, data2){
        return true;
    }

    daeJSON(data1, data2){
        return JSON.stringify(data1) == JSON.stringify(data2);
    }
    daeUnsortedArray(data1, data2){
        // lets assume that the order of properties within the objects is the same. Thus we can create the json of every object and then compare those
        if (data1.length != data2.length){
            return false;
        } 
        let data1J = [];
        let data2J = [];

        for (let el of data1){
            data1J.push(JSON.stringify(el))
        }
        for (let el of data2){
            data2J.push(JSON.stringify(el))
        }

        // check if all elements are part in the other array
        for (let el of data1J){
            if (!data2J.includes(el)){
                return false;
            }
        }
        return true;
    }

    /**
     * Process a change-broadcast: check whether there is a special fucntion for the mentioned function that can process the data for the dataset. Alternatively create the full updates dataset and send the full new data to the clients, if it has changed. 
     * This function is called from room._broadcastChange. 
     * @param {*} doObj 
     * @param {*} tabIdExclude 
     */
    _broadcastChange(doObj, tabIdExclude){

        //first get the respective function
        let functionName = doObj.funcName;

        // check whether there is a special data-processing for this function
        if (functionName in this.functionsProcessChange){
            // call the respective function. NOTE: The function MUST also change the data of the roomDataset! If the developement mode is on, it will be checked whetehr this works appropriately. The returned object must fulfill the schema below.

            // call the function
            let obj = this.functionsProcessChange[functionName](doObj);

            if (developMode){
                // perform some checks

                if (!this.validateFunction(obj)){
                    let text = `Error: The roomDataset-function for '${functionName}' did not return an object fulfilling the schema. Error: ${this.validateFunction.errors}.`;
                    this.logger.log(3, text);
                    return;
                }


                // ideally, we also check that the new dataset created by the function is the same as if the fullDataset was recreated
                // the problem is that it is not possible to generically test this, since some differences may be unimportant, e.g. the order of an array
                // thus we can only check the correctness of the new array if the dataset provides such a comparison function
                let datasetFunctionData = this.data;
                this.recreateDataset();
                if (!this.datasetsAreEqual(this.data, datasetFunctionData)){
                    let text = `Error: The roomDataset-function for '${functionName}' did not create the same dataset as if the fullDataset was recreated!`;
                    this.logger.log(3, text);
                    return;
                }

            }

            this.broadcast(obj, tabIdExclude)

        } else {
            // recreate the full dataset and compare to the old one
            let dataBefore = this.data;
            this.recreateDataset();
            let obj;
            if (JSON.stringify(dataBefore)!=JSON.stringify(this.data)){
    
                obj = {arg: 'fullData', opt: {ID: this.room.ID, data: this.data}}; 
                
            } else {
                // only the ID has changed
                obj = this.createIDchangeObj(); //{arg: 'IDchange', opt: this.room.ID}; 
            }

            this.broadcast(obj, tabIdExclude);

        }
    }

    createIDchangeObj(){
        return {arg: 'IDchange', opt: this.room.ID}; 
    }

    createFunctionObj(doObj){
        return {arg: 'function', opt: doObj}; 
    }

    /**
     * broadcast Send some data to every connected client
     * @param {object} obj The object with the changes to do; must be have the following properties (see also 'pushChange' for schema): funcName, data, ID (the new UUID)
     * @param {wsConnectionUUID} tabIdExclude Exclude this wsConnection-UUID form the broadcast (e.g. because the request came from this UUID)
     */
    broadcast(obj, tabIdExclude){

        // extend the object with the roomName
        obj.roomName = this.room.name;

        // loop over all clients and send them the data (except the sender)
        //for (let tabId in this.clients){
        for(let tabId of this.clients){
            if (tabId!=tabIdExclude){
                // wrap the object to be sent to the room-handler
                let sendObj = {
                    name:'room',
                    data:obj
                }
                
                this.room.clients[tabId].processor.sendNote(sendObj);
            }
        }
    }

    /**
     * Define a certain subschema to get the subobject of an object. The new, reduced object is then returned. If required properties are not availabe, the function will throw an error. 
     * @param {object} obj the object to take the values from
     * @param {object} schemaSelect The schema of the properties to select. Note that the items-property for arrays currently MUST be a schema itself and not an array of schemas. 
     * @returns {object} The new object with the selected properties
     */
    propertySelection(obj, schemaSelect){
        if (schemaSelect.type=="object"){
            let newObject = {};

            let schemaProps = Object.keys(schemaSelect.properties);
            //let objProp = Object.keys(obj);
            schemaProps.forEach(schemaProp =>{
                if (schemaProp in obj){
                    // recursive call
                    newObject[schemaProp] = this.propertySelection(obj[schemaProp], schemaSelect.properties[schemaProp]);
                } else {
                    if ("required" in schemaSelect && schemaSelect.required.indexOf(schemaProp)>=0){
                        // error: a required property is not available
                        throw `required property ${schemaProp} not available in object.`;
                    } else {
                        newObject[schemaProp] = undefined;
                    }
                }
            });

            return newObject
        } else if (schemaSelect.type=="array"){

            if (Array.isArray(obj) ){
                if ("items" in schemaSelect){
                    let newArray = [];
                    obj.forEach((objEl)=>{
                        newArray.push(this.propertySelection(objEl, schemaSelect.items))
                    })
                    
                    return newArray;
                } else {
                    // "copy" the whole array without further reductions/proofs
                    return obj;
                }

            } else {
                // data is not an array, thus it cannot be copied
                // we could also throw an error..?
                return [];
            }

        } else {

            // nothing to do
            return obj;
        }

    }

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


//module.exports = roomDataset;
export default roomDataset;