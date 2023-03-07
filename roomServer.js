// here we implement the base class for the rooms on the server.

// const roomView = require("./roomView"); // DISCONTINUED

/**
 * Thoughts on rooms (updated 12-2020):
- rooms are organized around tables and base on 'what tables are used together'?
- every room can have views (partially implemented (Server:yes, client:no), but probably unnecessarily complex, thus discontinued)
	- a view does not have logic to access the DB, but presents to its clients the data or a subset of it. 
	- a client can sign in to a/multiple view/s and/or to the room. 
	- a client must be able to sign to multiple views in the same room
	- the accessing rights are checked for the view. Usually no checks needed on room level and on functions level (However, e.g. changePassword-function must check e.g. that users only change their own password)
	- a dynamic view does not store its uuid and changes to Mongo, regular views probably neither (--> that means we have to reload all after a reconnect, when the server was down in the meantime)
	- views provide a practical extensibility for modules: the main room can stay the same, but must simply load some additional views
	- on the client, it would make sense that for the roomClientVue-implementation it does not matter whether a room or a view is accessed. 
	  (so why cant we just implement a view on the client as it was a room? because writingTickets, status of other clients etc are handled in the room only!)
	- ideally, there is not much effort to maintain a roomViewClient, when there is already the roomClient defined. Especially when the roomView is just a subVersion of the room itself, then it could be possible to reuse the full roomClient, but it connects just to the view.
	  - Idea: there are two ways how functions can be implemented in views:
	    1) the roomViewClient provides certain fucntions to the rommClientVue implementation. It then translates this to the respective function of the room, which is called with an additional parameter stating that the call is coming not from the room actually, but from the view. This causes the roomServer to check the rights for the function in the view, but the process will still be in the room. However, the response must then be sent to the view again, and not room. (But the room will also get the change through teh broadcasting process.) (There might be some difficulties in the latter part of sending the response --> check if this can easily be implemented on the server and make sure the response is not going to the room.)
	    2) A view may have additional function that are not covered by the room. Those functions will be handled in the view also on the server, where it is actually translated then to (several) fucntion calls on the room (since views NEVER should read/write themselves.
	- the roomManger handles views in the same way as rooms (i.e. imports the javascript file if necessary, registers everythign and returns the view. )
	WHY VIEWS ARE PROBLEMATIC:
	- every view-dataset on the client is not in sync with the other views. Given we have no connection on the client, we could hav einconsistent data shown, e.g. when a change was made in one view/the room, the change will not be shown in the other views/the room. (It would be better to have only one data-set for all. Thus see belows approach with requested data.)
	- it is rather complex on the client (but not that difficult on the server)
- Subrooms could be rooms e.g. for each entry of a table the parent room is representing. 
	- Subrooms are actually full (vollwertig), independent rooms, not views!
	- However, a 'parent' room could start the subrooms. 
	- As should be possible with all rooms, they can have interdependencies, i.e. one room listens to the other room and vice versa. 
- (ALTERNATIVE TO VIEWS): one room may have several subsets of data, which can be provided in dependence with the accessing rights of the client. E.g. the list of meetings should not contain the technical stuff about take-over-code, passwords of the master-server, etc
- Writing access to tables or rows should not be available in multiple rooms, but only in one. Through the dependencies, the other room can take notice of changes.
- one room usually only handles one main table and possibly also tables related to this table (1:n, i.e. an entity in the main table is referenced n times in the related table). The opposite (the inheriting table is the main table) does not work, since then the referenced super table would be referenced n-times!

- some rooms might be read only; respectively we could not call it rooms, but e.g. "functions", whitch access data either directly on the DB or through the different rooms. I think about everything that is genetrated on time x and then is NOT automatically updated anymore. E.g. print-outs or statistics.

 */

/**
 * IMPLEMENTING VIEWS (DISCONTINUED)
 * implementing views is more difficult than we could think. The difficult points are: (1) how do the different views know that a change applies to them? (2) How is the change processed on the client (i.e. can we use the same functions?)? (3) How is writing handled for clients connected to a subview (as they do not deliver the full data to the change, but a subset --> can we still use the normal room function or do we need view and function-specific 'translation' of the writing request from the reduced dataset to the full dataset)? (4) How do dynamic views work (e.g. a user only sees his meetings; the view is opened on request and closed as soon as there no client connected to it anymore)?
 * Basic thoughts:
 * - every view has its unique name
 * - views can be either static or dynamic: dynamic views are created on request; static views are started whenever the room is started
 * - every view has its own list of clients
 * - every view has its own ID (eventually, we can use the same IDs as in the room, but each view keeps track of which was the last ID with changes applying to it. Thus the view could verify, whether the client requesting a change through the view is still up to date and can process the change. On the other hand, the view could also send a change of the ID to the client, even if there was no change of data for this view. The problem with that method is that then a view-client that shortly was offline and has made changes, cannot process them when the room-(=view)-ID has changed, even if a specific view-ID wouldnt have change, since the changes on the server didnt apply to the view.)
 * - the view doesn't handle writing tasks: this must be done in the room itself. This also means, that the writing tickets apply to the room and not to the view. 
 * - basically views could store their change history (stack) and the ID to mongo as does to room. For dynmaic views, this would definitively be overkill. For static views it could be reasonable. However, for the beginning I'd ommit storing the view-specific stack and ID to mongo.  
 * 
 * Difficulty 1:
 * - Method 1: every view is called when data has changed. The view derives its data from the current data and checks whether it is different or not --> works always, but has a very low performance
 * - Method 2: every writing function in room knows, which view is affected when (i.e. if attribute A has changed, views x and y are affected) --> computationally efficient, but the code is not very well maintainable, e.g. when a view is added, its dependency must be injected in all functions in the room manually. Dynamic views would be probably even more difficult.
 * - Method 3: a view places observers to the data and can react automatically to changes --> would be nice, but is not possible.
 * - Method 4: the room centrally stores dependencies of views. After changes, the room knows which views need to be updated.
 * - Method 5: the room tells every view what has changed and the view then decides itself whether it has to raise an event on its scale. (actually similar to one, but the derivation does not work on the full data, but just on teh changed data.)  
 * 
 * Difficulty 2:
 * - ideally, we could use the same functions for changes on the client in a view as are used in the room (-> less work). However, as we have different data and different representation on the client, this is anyway hardly possible. Thus, each view will likely have its own functions for viewing. However, this fucntions probably can be effieciently derived from room functions. 
 
 * (Temporary) Conclusion: 
  * -->: method 1 must be implemented anyway, since a view must be able to initially derive its dataset. Method 5 could be easy to implement as well and could improve the performance:
 * - views have to check themselfs whether a change applies to them or not. A simple progress it would be if the change can optionally return the changed dataset. Then a view can run the change through a filter and see if the change applies to it and if required update its own dataset. 
 * - only room get connected client to server, not the views. The views thus use this connection.
 * - Views only provide data. The functions are always provided by the room. The view may forward some change-functions to the room. 
 * - The views do not (yet) store the stack and ID to mongo. 
 */

/**
 * CHANGES:
 * 2019-12: redesign the whole room-stuff to support views. The default will stay the same, i.e. that all data is accessed, however many rooms in the future will use views instead of the complete set of data (NOT YET IMPLEMENTED).
 * 2020-01: do not reject entering the room when there is no writing ticket left
 * 2020-05: broadcast changes also to the calling client (do not exclude it from receiving the update): this can be important in cases, where the request times out and thus is rolled back on the calling client. But when he then does not get the change as soon as it is done on the server, the client is out of sync, which would not be realized until the client tries to send another change, when the server will then answer with error 13 / outdated.
 * 2021-01: The prior approach used the sid to identify the client. However, this leads to problems when the same browser has two tabs open --> he actually requires two websocket connections that are now identified by the tabId, which is specific for the tab. However, the writingTickets are still also related to the session (sid), since they are related to the rights of a certain client. Additionally it would not be possible to reuse a former writing-ticket if it was related to the tabId alone since it changes on reload. Therefore, as long as a writing tab is connected, the writingTicket is related to the tabId AND the session id (sid). When the connection is lost, the writingTicket stays reserved for another client of the same sid. This approach prevents that two tabs in the same browser=same sid share the same writingTicket. However, it is basically possible that after closing one tab another tab in the same browser takes over the writingTicket.
 * 2021-09: raise events on successfull changes (i.e. when the ID changes)
 * 2022-07: spelling error maxWritingTicktes --> maxWritingTicktets corrected
 * 2022-07: implement a secondary mode, which is activated by a function call from rBackup. If it is changed to secondaryMode, all present writingTickets are revoked and deleted and no further writingTickets are possible. 
 * 2021-01: before, when the server was restarted, the (former) writing clients lost their writing tickets because they are not stored in offlineWritingClients (since this would be stored only when the clients do not propertly leave, but they do not leave at all when the server is shutdown/crashes). This is now avoided by also storing the onlineWritingCLients to mongo and then create offlineWritingClients from this on startup 
 */

/** basic important stuff:
 * - for writing, one change at a time! No concurrent changes. Have a waiting stack with changes.
 * - on incoming changes: try to process* the changes. Then send the changes to all members of the room with the new version number except the sender of the change. Acknowledge to the sender at least with the new version number.
 *   * Check all inputs first (something outdated and conflicting?), use transactions in MySQL for complex queries. Try to process the query/transaction. On success, proceed; otherwise start rollback (if needed).
 * - the roomServer (parent of specific implementations) has the task to do all the websocket-stuff and to coordinate the available function-calls of this specific room. The specific room implementation does (normally?) not need to do anything to the websocket stuff
 * - ATTENTION: a lot of the stuff done here, especially those relying on UUIDs for the clients, are prone to session-hijacking if the connection between server and client is not encrypted!!!
 * - MongoDB/BSON: "cyclic dependency error": this is a typical error that may occur when saving to MongoDB and results from a cyclic dependency in the object structure to save, e.g. when an object references its parent (as sequelize does with includes: instance._options.include[].parent). This error often comes from sequelize: often "doObj.data = sequelizeModel.dataValues" (to remove the functions of the object, since they are not needed in doObj and also not in the data returned to the client). However, if there is an array in .dataValues (e.g. eventGroup.rounds), this references the original array. If we later add a model to the array (actually not to obj.dataValues.array, but simply obj.array; e.g. eventGroup.rounds.push(newRound)), then also the original obj returned from sequelizeModel.dataValues will now have the model in the array (e.g. eventGroup.rounds[0]=newModel). This is problematic, since any stack element which referenced eventgroup.dataValues, now also contains a full model in eventGroup.rounds, which then shows the cyclic dependency error. To solve this, replace model.dataValues with model.get({plain:true}).
 * 
 * Background ideas: 
 * - in a simple, ideal world, only one room has access to a certain DB-table or parts of it. It gets more tricky, when other rooms shall also read from that table. And even more tricky, when multiple rooms read+write to/from the same table. Writing rooms must know of other rooms with access to the same data and let them know, when something is changed.
 * - every client and listening room does not necessarily need to implement all functions a writing room is able to perform, but it must know how to handle such cases by reloading everything/parts
 * - every change must be stored (temporary, not to mySQL-DB and maybe in MongoDB) together with its new version number
 * - the current version number does not necessarily need to be stored to disk. However if not stored, all relay servers will have to get all the data from new on restart of the main server, since no version-check can be done anymore. If the version is stored for every room, then only rooms with changes will have to reload everything. If we even would store the changes to disk (probably MongoDB) and not only temporary, we could also ommit this and incremental (normal) changes could be sent to the client after restart if there are different versions.
 * - there must be a way how the server can connect to a relay server (and not getting connected by the relay) and connect all rooms. Eventually this is handled outside the roomServer class.
 * - there are two kinds of rooms:
 *   - static: werden beim Programm start immer geladen und existieren ständig, zB der room mit allen Athleten. Die existenz dieses Rooms ist nicht abhängig von Datenbankeinträgen, die gemanagten Daten natürlich schon. Static rooms können dynamische rooms erzeugen und verwalten, zB wenn ein Athlet hinzugefügt wird, wird sein room dynamisch erstellt und irgendwie verwaltet
 *   - dynamic: Die Existenz ist abhängig von Einträgen in der Datenbank, zB ein room für einen spezifischen Wettkampf oder einen spezifischen Athleten. 
 * 
 * About conflict handling and non-blocking change requests: 
 * - When a client was offline and on reconnect wants to push all his cached changes, we might get into conflicts when another client did changes in the meantime. We do not get into conflicts, when the changes were non-blocking (e.g. not on the same DB-entry), but we do get into problems when they were about the same DB-entry (and different, otherwise we coudld simply forget about them). Resolving this blocking conflicts can be very difficult, because: 
 *   - further changes might come in during this conflict handling (with conflict handling I understand that a user must decide about the conflict msolving, which takes time. If an automatic conflict handling is possible on the server, meaning the server decides what to take and what to reject, then this is no problem.)
 *   - multiple changes might have dependencies on each other (when undoing an old change, all subsequent changes based on this must be undone, e.g. when an DB entry shall be changed, but another client wrote other DB-entries that refer to the first one)
 * - As this can get very complicated, no true conflict handling (requiring user decision) is implemented yet, but mechanisms to avoid conflicts, check if there are conflicts and to resolve conflicts automatically and easily are/should be implemented. 
 * - The following is reasonably complex and shall be implemented for now: 
 *   1) Writing only when online (when offline, the client cannot write, i.e. does not store a local stack at all and maybe 'deactivates'/'greys out' the respective buttons/forms)
 *   2) only one client can check out a writing ticket, others cannot write at the same time (weak definition: as long as the client with the checked out ticket is online, also others can write, as the client would receive the changes immediately.)
 *   3) "the winner takes it all": no checked out ticket needed and offline is accepted, but when the ID is not the same anymore when the changes made offline should be posted, they will simply be deleted.
 *   4) do conflict handling in then sense of "allow offline changes by many clients, but undo them when two are conflicting". For some cases this might be easy enough to implement. 
 *   -> The above can be combined together, as they are not distinct from each other. 
 *   --> THIS IS HOW IT CAN BE IMPLEMENTED:
 *     - always check out writing tickets, simply put the max number (maxWritingTickets=-1 e.g. inf) to very high when not limited (solving case 2)
 *     - always make sure that only clients having checked out a writing ticket are given the chance to write.
 *     - if the ID on the Server is NOT the same as on the client (which will never happen with ticket limit=1), do
 *          - simply reject the new changes (solving case 3) (conflictChecking=false)
 *          - do check for blocking conflicts and simply reject if the conflict is blocking (solving case 4) (conflictChecking=true)
 *            NOTE: any more advanced conflict handling would be integrated here)
 *     - 1) is a strict mode on top of it with additional restrictions on the client. On the server there is nothing additionally needed compared to the stuff needed to implement the other cases; 
 * 
 * Additional comments: 
 * - the ticket system maybe requires that the client gets the same UUID again on reconnect. 
 * - the check if a change in the database is blocking or not requires checks that are similar or the same to normal checks needed to make sure that the change is feasible/allowed/correct --> do them together in the same function
 * - There are some dangers in the case when blocking/non-blocking and the conflict handling is not correctly implemented, e.g.: Assume an offline client had addtional results stored and then closed the competition. If the results entries are conflicting but closing the competition is not, the competition will be immediately closed and the client asked what to do with the conflict. However the decision can then not be processed, because the competition is closed. There might be other and more sever cases, probably even leading to locking. 
  
 */

/* TODO: 
- the changes must be broadcasted in roomViews as well
- add the possibility to change between writing and non-writing without having to reconnect to the room. 
- it should be possible to listen to multiple views: add the possibility to provide an array of views to listen to. This also means that the returned data is an array storing the info for the different rooms. 
*/ 


// error code <=10 are for errors in the transmission and handling
// error-codes >20 are for specific errors returned in the functions defined in the inheriting classes
/**
 * 11: general Server errors (which have nothing to do with wrong data from the client), e.g. the function returns an object with the wrong format
 * 12: [genreal] the server room is closing 
 * 13: the client is outdated and thus the request cannot be processed (only when conflictChecking=false)
 * 14: conflict checking impossible: conflictCheckingFunction not available or erronous
 * 15: conflict checking negative result: checking successfully done, but change seems to be conflicting and thus is rejected. 
 * 16: roomView does not exist
 * 17: [on func request]: 'func' (function name) missing in the request
 * 17: [on enter]: Server is not ready yet. (ready=false)
 * 17: [on revokeWritingTicket]: something went wrong on revoking the writing ticket
 * 17: [on requestWritingTicket]: the calling client is not member of this room
 * 18: [on revokeWritingTicket]: something went wrong on giving the client the free writing ticket
 * 18: [on function calls]: no writing rights, but needed for this function 
 * //18: [on enter]: cannot get a writing ticket, because no writing tickets are available anymore (not used anymore!)
 * 18: [on enter]: The client is already connected
 * 18: [on requestWritingTicket]: only one writingTicket per client allowed! client cannot get another one
 * 19: [on enter]: no rights to enter this room (with writing rights, when requested)
 * 19: [on !enter]: requesting client is actually not a client in this room 
 * 19: [on requestWritingTicket]: no writing tickets available.
 * 19: [on func request] the requested function is not available in this room; prior to 2022-01, this was code 12, but it most likely was no separately checked anywhere, so the change should not matter
 */

//const Ajv 			= 	require('ajv'); // check JOSN input with schema

// the info returned to any clientRoom contains the following information: 
/*infosSchema = {
    type:'object',
    properties:{
        clients:{type: object},
        maxWritingTickets:{type:'number'},
        numClients:{type:'number'},
        numClientsWriting: {type:'number'}
    },
    required: [maxWritingTickets, numClients, numClientsWriting]
    }

each client is an object with tabIdHash={connected, name, writing, tabIdHash }
*/

import AjvPack from 'ajv';
const Ajv = AjvPack.default;
const ajv 			= 	new Ajv({useDefaults:true, allowUnionTypes:true}); // check JSON input with schema; apply defaults if available (outside of regular JSON-Schema!); unionTypes is required when "type=['string', 'number']". By default, combinations are only allowed for null and something.
import addFormats from "ajv-formats";
import { toHash } from 'ajv/dist/compile/util.js';
addFormats(ajv); // needed to check formats like date-time, etc (see ajv-formats docs)
import crypto from 'crypto'; // for hashing (NOT for passwords) and other crypto stuff
import {copyObject} from './common.js';
//import bcrypt from 'bcryptjs'; // for PASSWORD hashing; is slow, replace by bcrypt (instead of bcryptjs) when installable. Requires dependencies outside node on windows; on UNIX it should work easier. (Note: bcrypt runs in C++, while bcryptjs is all in javascript; both have the same methods)

// Change 2022-02: the func-calls were not exactly the same for server and client (i.e. to the server, it had to be "func", while to the client it had to be "funcName")

/**
 * 
 */
// IMPORTANT: Never change the class-name, since there are static properties referenced in this class itself and in other codes!
class roomServer{

    // staticschema definitions: 
    static schemaDoObj = {
        type:'object',
        description: 'object storing the change to be processed on the clients (actually often (always?) the same as the request). Must contain the funcitonName to be called and the parameters',
        properties: {
            ID: {type: "string"},  
            oldID: {type:"string"},
            funcName: {type: "string"}, 
            data: {} //type: "object"} // can be anything!
        },
        required: ["funcName", "data", "ID"]
        
    }
    static schemaDoObjPreID = {
        type:'object',
        description: 'object storing the change to be processed on the clients (actually often (always?) the same as the request). Must contain the funcitonName to be called and the parameters. Without the ID yet',
        properties: {
            //ID: {type: "string"},  // not yet inside, as the ID is generated later
            funcName: {type: "string"}, 
            data: {} //type: "object"} // can be anything!
        },
        required: ["funcName", "data"]
        
    }

    static schemaUndoObj = {
        type: 'object',
        description: 'Probably not needed yet: object that stores the fucntion and data to be called to undo the change, e.g. deleteEntry xy when the request was createEntry xy',
        properties: {
            //ID: {type: "string"}, 
            funcName: {type: "string"}, 
            data: {} // type: "object"} // can be anything!
        },
        required: [], 
        // if funcName exists, then also data must exist
        dependencies: {
            funcName: ["data"]
        },
        // the following should do the same, but would be more complicated anyway
        /*
        'if': { properties:{
            funcName:{type:'string'}} // funcName exists
        },
        'then':{
            required: ["funcName", "data"]
        }*/ 
    }

    static schemaSucc = {
        type: 'object',
        properties: {
            response: {
                type: ['boolean', 'string', 'object', 'null', 'number', 'array'], // 'any' does not exist --> need an array with all possibilitis
                description: 'what to return to the requesting client'
            },
            doObj: roomServer.schemaDoObjPreID,
            undoObj: roomServer.schemaUndoObj,
            isAchange: {
                type: 'boolean', 
                description: 'true if a change has been processed. If true, the changes defined in doObj/undoObj will be sent to all the other clients and stored on the stack together with a new id, otherwise only the response will be returned to the requesting client.'
            },
            preventBroadcastToCaller:{
                type: 'boolean',
                description: 'set this property to true when the requesting client shall not receive the broadcast. When the property is omitted or false, the requesting client will receive the broadcast as well (but usually after the reqponse) and then neglect it as the he already is on the same id-level.'
            }
        },
        required: ["response", "isAchange"],
        // does this already work in ajv? or is there an error in my formulation?
        'if': { properties:{
            isAchange:{const: true}}
        },
        'then':{
            required: ["doObj", "undoObj"]
        }
    }
    static schemaFail = {
        type: 'object',
        properties: {
            message:{type: 'string'},
            code: {type: 'number'}
        },
        required: ["message", "code"]
    }
    get ready(){
        return this._childReady && this._mongoReady;
    };

    set ready(ready){
        // actually sets the childReady; the overall-ready (_ready) is true as soon as _mongoReady and _childReady are both true

        // check whether this will change the ready property. If yes, raise the respective event.
        if (ready && !this._childReady && this._mongoReady){
            this.eH.raise(`${this.name}:ready`, {});
            this._onRoomReady(); 
        }

        this._childReady = ready;
    }

    /** Constructor for the general Server-room implementation. This super-constructor MUST be called before the rest of the child-constructor.
     * @method constructor
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {mongoDb} mongoDb The mongoDb instance to be used. The collection-name is the name of the room.
     * @param {logger} logger A/The logger instance
     * @param {string} name The name of the room. Used e.g. in the mongoDb.
     * @param {boolean} storeReadingClientInfos Should the server also save infos (name, writingRights, connection) about clients that only do read?
     * @param {integer} maxWritingTickets The maximum number of connections that are allowed to be in writing mode at the same time (i.e. that are given a writing ticket). -1=unlimited
     * @param {boolean} conflictChecking If true, the inheriting class's functions do provide conflict checking, e.g. even when a client was outdated on sending the changes, they can get processed if the change is not conflicting with another change made in the meantime. If false, every change request by an outdated client will be rejected.
     * @param {object} dynamicRoom An object with properties for a dynamic room
     * @param {object} dynamicRoom.parentRoom The parent room of the dynamic room
     * @param {number} dynamicRoom.timeout The timeout after which the room closes automatically (not implemented yet). If the dynamic room should not close automatically, set it to a negative value (e.g. -1).
     * @param {boolean} reportToSideChannel Report changes to the sideChannel; typically true, except for e.g. rSideChannel, rBackup, rMeetings or when the data is fully dynamic
     * @param {boolean} keepWritingTicket If a client disconnects without properly leaving, keep its writing ticket. At the same time, when this is set to false, all writingTickets will be deleted when the server reloads. (This is needed e.g. in the sideChannel.)
     * //@param {socketProcessor2} wsProcessor UNUSED The websocket processor instance; needed obviously for the
     * //@param {roomManager} roomManager UNUSED The room manager instance. Needed for showing the status information to the user.
     */
    constructor(eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTickets=-1, conflictChecking=false, dynamicRoom=undefined, reportToSideChannel=true, keepWritingTicket=true){

        // TODO: change ALL rooms to not yet merge the meetignShortname and the room name, so that this can be done here.
        // unfortunately I did not realize that we need the meeting shortname here, which is given only in the name; get it from the string
        let splitRoom = name.split('@');
        this.meetingShortname = splitRoom.length==2 ? splitRoom[1] : '';

        // set references
        this.eH = eventHandler;
        this.mongoDB = mongoDb;
        this.collection; // will be filled my MongoDBinit
        this.logger = logger;
        this.name = name;
        this.parentRoom = undefined;
        this.autoclosureTimeout = -1;
        this.reportToSideChannel = reportToSideChannel; // whether changes in this room are reported to the sideChannel or not; should be true fall all room except rBackup and rSideChannel
        this.keepWritingTicket = keepWritingTicket;

        // if this room is a dynamic room, check that the parentProperty is set correctly
        if (dynamicRoom){
            // the schema to check for the dynamic room. Ideally we could also check that the parentRoom is indeed a "roomServer" object
            let schema = {
                type:'object',
                properties:{
                    parentRoom: {
                        type:"object"
                    },
                    timeout: {
                        type:"number",
                        default: -1
                    }
                },
                required:['parentRoom']
            }

            if(!ajv.validate(schema, dynamicRoom)){
                let text = `The dynamic room ${name} could not be started, since the dynamicRoom property does not fulfill the schema.`;
                this.logger.log(10, text)
                throw new Error('Dynamic room could not be created: '+text);
            }
            this.parentRoom = dynamicRoom.parentRoom;
            this.autoclosureTimeout = dynamicRoom.timeout;

        }

        //this.rM = roomManager; // eventually needed
        //this.wsProcessor = wsProcessor;  // why have I put this here?

        // should the server store clientInfos for reading clients?
        // TODO: set this to false when the server is a live-online server and the clients would be numerous!
        this.storeReadingClientInfos = storeReadingClientInfos;
        // create a random part for the clientTabId hashing.
        this.clientHashString = this.randString(20);

        this.ID; // will be set when Mongo is initialized

        this.clientsRequestingInfos = []; // a list of tabId's of the clients that want to get updates about the connected clients
        // important: it must be prevented that many live clients are requesting this list, as it woudl cause a lot of unnecessary server traffic.
        // TODO: eventually simplyfy all that shit. It is way too complicated for what it is needed. No automatical updates about clients, only a list on request. 


        // create an empty object for storing the connected clients.
        // each client has the following properties:
        // processor: wsProcessor, writing, writingTicketID, name:clientName, storeInfos, tabIdHash, sidHash, datasetName, session, enterOptions, views:['', 'roomViewXY', 'roomViewAB', ...]}; // DISCONTINUED views is not used anymore
        this.clients = {}; // all clients connected to the room, independent whether to a roomView or multiple and/or the room itself
        //this.roomClients = []; // DISCONTINUED list of clients listening to the room data
        this.offlineWritingClients = {}; // without the processor, as the client is disconnected; hashed sid as property!
        // both objects are source to create the client Infos object.
        //this.tabIdHashed = {}; // property=tabIdhashed, value=tabId
        this.onlineWritingClients = {}; // same data as offlineWritingClients. Only read (from Mongo) on a (re-)start of the server, to check if some writingTickets that do not exist in offlineWritingClients exist in "online"WritingClients. Then, those clients are moved to offlineWritingClients (to make offlineWritingClients and writingTickets consistent) and finally the onlineWritingClients are reset to {}. Uses the hashed sid as property as offlineWritingClients

        // initialize everything for the writing tickets and conflict checking:
        this.secondaryMode = false;
        this.maxWritingTicketsDefault = maxWritingTickets; // if the secondary mode is set to true, then the maxWritingTicktes is set to 0. When it is back in main mode, the number is reset to maxWritingTickets
        this.maxWritingTickets = maxWritingTickets;
        this.writingTickets = []; // the property is the writingTicketID of the client. The value is an object storing additional information about the client to make it indetifyable (needed if we wanted to kick one specific client from the list, because it did not appropriately leave the room); the writing tickets are stored to Mongo and are restored on restart (for the case the server crashes, which is exactly the reason why we are doing the fun of conflict checking)
        // TODO: backup servers probably also must have a (the same?) writing-ticket list!
        this.conflictChecking = conflictChecking;

        // create the info object
        this.infos = {numClients: 0, numClientsWriting:0, maxWritingTickets:maxWritingTickets, clients:{}};
        // if there is toJSON method in an object, the JSON.stringify converter will use it, otherwise it will do it on its won, but then 'forgets' the getter-properties
        /*this.infos = {maxWritingTickets:maxWritingTickets, clients:{}};
        // numClientsWriting and numClients are computed properties --> define them with a setter
        Object.defineProperties(this.infos, {
            'numClients':{
                get:()=>{
                    return Object.keys(this.clients).length;
                }
            },
            'numClientsWriting':{
                get:()=>{
                    return this.writingTickets.length;
                }
            }
        })
        this.infos.toJSON = (key)=>{
            return {
            numClients: this.infos.numClients,
            numClientsWriting: this.infos.numClientsWriting,
            maxWritingTickets: this.infos.maxWritingTickets,
            clients: this.infos.clients
        };}*/

        // herein the complete dataset MUST be stored (by the inheriting class)
        this.data = {};

        // Set to true, when the room is closing. 
        // when the room is in closing state, it will be deleted after it is fully closed, i.e. closing is not reset to false, after it was true first
        this.closing = false;

        // all the functions are stored in one of the following objects
        // the functions must be async. They get just one argument: The data to be processed. On success/failure they must return an object with the schemas defined below 'response', doObj','undoObj' and 'isAchange' as properties and their values, on failure an object with properties 'message' and 'code', storing the error message and the error code
        this.functionsReadOnly = {};
        this.functionsWrite = {};

        // if there shall be conflict checking, the conflict-checking functions (not the functions themselves) must be stored in the following object and have the same name as the function itself. 
        this.functionsConflictChecking = {};

        // automatic json-schema proofing:
        this.ajv = ajv; // options can be passed, e.g. {allErrors: true}


        // max stack length
        this.maxStackLength = 100; // set this limit below one for infinity

        // always store last processed change(!)-request (after applying successfully the changes in the DB etc, but without requiring that the new id and other responses could be sent). This is to cover the case that the connection is lost during the processing. Then if the next change request (e.g. after reconnection) is the same as the last one, we simply return the response and do not process the request once again. If there were other changes (from other clients) since this interuption of the connection, then the client has to reload everything anyway and we answer with an error (because the ID has changed then)
        this.lastChange = {};
        this.lastChange.request = {};
        this.lastChange.response = {}; 

        // asynchronously initialize the stack by connecting to MongoDB
        //this.ready = false;
        this._mongoReady = false; // equal to "parent ready"
        this._childReady = false;
        this.initMongoStack().then(()=>{
            this._mongoReady = true;
            // if this changes "ready" to true (i.e. this._childReady is already true) then raise the respective event
            if(this._childReady){
                this.eH.raise(`${this.name}:ready`, {});
                this._onRoomReady(); 
            }
        }).catch((err)=>{throw err});

        // have a list of functions to call (without any parameters) as soon as the room is ready
        this._onReadyFunctions = [];

        // we need to make sure that only one change is processed at a time; introduce a workStack for the fucntion processing
        this.functionsWorkStack = [];
        this.busy = false; // is there currently a function running; then we have to put new functionCalls on the stack.

        // DISCONTINUED: store this room's roomViews as an object where the name of the roomView is the property  
        //this.roomViews = {};

        // store a list of datasets the clients cna register for; one client can only choose one dataset it follows!
        this.datasets = {};

        // store a list of subrooms:
        this.subrooms = {};


        // prepare ajv validations
        this.validateDoObj = this.ajv.compile(roomServer.schemaDoObjPreID);
        this.validateUndoObj = this.ajv.compile(roomServer.schemaUndoObj);
        this.validateSuccess = this.ajv.compile(roomServer.schemaSucc);
        this.validateFail = this.ajv.compile(roomServer.schemaFail);

    }

    async initMongoStack(){

        var initStackDocument = async ()=>{ 
            //await this.collection.insertOne({type:'stack', stack:[]})
            try {
                await this.collection.updateOne({type:'stack'},{$set:{stack:[]}},{upsert:true}) // upsert:true --> if none exists, create it!
            } catch (e){
                this.logger.log(3, e)
                throw e;
                
            }
            this.stack = [];
            this.stackIDs = [];
        };

        try {
            // load Mongo stuff (e.g. stack)
            // get former changes and the version number from the MongoDB
            // the collection is given by the name (should automatically create the collection if it does not exist)

            // before 2022-01, the name of the collection was the full room name, including the (local only)shortname of the meeting --> split it up
            // allow for @ in room name, split at the last @, if there is an @!
            let collectionName;
            if (this.name.indexOf('@')==-1){
                collectionName = this.name;
            } else {
                collectionName = this.name.split('@').slice(0,-1).join('@');
            }
            
            this.collection = await this.mongoDB.collection(collectionName);
            this.onMongoConnected();

            //let cursor = await this.collection.find({type:'stack'}) // returns a cursor to the data
            let len = await this.collection.countDocuments({type:'stack'});
            // there should be only one document:
            if (len>1){
                let errMsg = "Too many documents with type:'stack' for room named '" + this.name + "'.";
                this.logger.log(3, errMsg);
                throw new Error(errMsg);

            } else if(len==0) {
                // create new (empty) document of type stack
                await initStackDocument();

            } else {
                // everything normal:
                let cursor = await this.collection.find({type:'stack'}) // returns a cursor to the data
                let doc = await cursor.next();
                this.stack = doc.stack;    // sorted, the oldest element has index 0, the newwest the highest index

                // in order to know quickly which stackObjects to return to a client, store an additional array with the UUIDs of the reqpective objects 
                this.stackIDs = new Array(this.stack.length);
                // for loop
                for (let i=0; i<this.stack.length;i++){
                    this.stackIDs[i] = this.stack[i].doObj.ID;
                }

                // no Limit when below zero
                if (this.maxStackLength >= 0) { // TODO: is there an error in my code here or why is 'if' and 'this' not marked in blue?
                    // eventually resize the stack, if the maxLength has changed meanwhile (since it was stored in Mongo):
                    let delta = this.stack.length - this.maxStackLength 
                    if (delta>0){
                        this.stack.splice(0, delta);
                        this.stackIDs.splice(0, delta);
                        await this.storeStack(); // store to Mongo
                    }
                }
            }

            // the ID must be stored separately, for the case that the stack is empty (e.g. because maxStackLength=0 or because the room is new.)
            len = await this.collection.countDocuments({type:'ID'});
            if (len>1){
                let errMsg = "Too many documents with type:'ID' for room named '" + this.name + "'.";
                this.logger.log(3, errMsg);
                throw new Error(errMsg);

            } else if(len==0) {
                // create new  document of type ID with the newly created ID:
                this.ID = this.uuidv4();
                await this.collection.insertOne({type:'ID', ID:this.ID})

            } else {
                // everything normal:
                let cursor = await this.collection.find({type:'ID'}) // returns a cursor to the data
                let doc = await cursor.next();
                this.ID = doc.ID;

                // check (if there is a stack) whether the last element has the correct ID
                let l = this.stackIDs.length;
                if (l>0 ){
                    if (this.stackIDs[l-1] != this.ID){
                        // there is something wrong --> delete the current stack and continue operation
                        this.logger.log(11, "The last stack-ID did not match the stored ID --> the stack got emptied for room '"+this.name+"'.")
                        await initStackDocument()
                    }
                }
            }

            // get the list of currently checked out writing tickets
            len = await this.collection.countDocuments({type:'writingTickets'}) // returns a cursor to the data
            if (len>1){
                let errMsg = "Too many documents with type:'writingTickets' for room named '" + this.name + "'.";
                this.logger.log(3, errMsg);
                throw new Error(errMsg);

            } else if(len==0) {
                // create new document of type  with the newly created ID:
                this.writingTickets = [];
                await this.collection.insertOne({type:'writingTickets', writingTickets:[] })

            } else {
                // everything normal:
                let cursor = await this.collection.find({type:'writingTickets'}) // returns a cursor to the data
                let doc = await cursor.next();
                this.writingTickets = doc.writingTickets;
            }

            // get the list of writing clients that were online before the restart
            len = await this.collection.countDocuments({type:'onlineWritingClients'}) // returns a cursor to the data
            if (len>1){
                let errMsg = "Too many documents with type:'onlineWritingClients' for room named '" + this.name + "'.";
                this.logger.log(3, errMsg);
                throw new Error(errMsg);

            } else if(len==0) {
                // create new document of type  with the newly created ID:
                this.writingTickets = [];
                await this.collection.insertOne({type:'onlineWritingClients', onlineWritingClients:{} })

            } else {
                // everything normal:
                let cursor = await this.collection.find({type:'onlineWritingClients'}) // returns a cursor to the data
                let doc = await cursor.next();
                // we store the data to offlineWritingClients, since at the restart, the former online clients are surely offline! With this apporach we make sure that after a restart/crash of the server the writing tickets of formerly online clients are not deleted below!
                // the actual onlineWritingCLients object will stay empty, which is correct at init and will be filled as soon as clients enter the room.
                this.offlineWritingClients = doc.onlineWritingClients;
            }

            // get the list of disconnected writing clients
            len = await this.collection.countDocuments({type:'offlineWritingClients'}) // returns a cursor to the data
            if (len>1){
                let errMsg = "Too many documents with type:'offlineWritingClients' for room named '" + this.name + "'.";
                this.logger.log(3, errMsg);
                throw new Error(errMsg);

            } else if(len==0) {
                // create new document of type  with the newly created ID:
                this.offlineWritingClients = {};
                await this.collection.insertOne({type:'offlineWritingClients', offlineWritingClients:{} })

            } else {
                // everything normal:
                let cursor = await this.collection.find({type:'offlineWritingClients'}) // returns a cursor to the data
                let doc = await cursor.next();
                // since there might already be some former onlineWritingClients in the list, we have to transfer the offlineWritingClients
                for (let sidHash of Object.keys(doc.offlineWritingClients)){
                    this.offlineWritingClients[sidHash] = doc.offlineWritingClients[sidHash];
                }
            }

            if (this.keepWritingTicket){
                // check if every writingTicketID is available in offlineWritingClients and vice versa; delete if not available in both
                // this gets necessary when the server is restarted (regularly or after a crash), because the writing ticket is stored, but the client was online before and thus is not stored in offlineWritingClients. 2021-01-02: with the new approach, the offlineWritignCLients at this poit of the code also includes the former onlineWritingClients
                let writingTicketsNew = []; //this.writingTickets.slice(0);
                for (let offlineSidHash in this.offlineWritingClients){
                    let wti = this.offlineWritingClients[offlineSidHash].writingTicketID;
                    if (this.writingTickets.includes(wti)){
                        writingTicketsNew.push(wti)
                    } else {
                        delete this.offlineWritingClients[offlineSidHash];
                    }
                }
                // herewith we also automatically delete all writingTicketIDs that do not have the disconnected clients stored!
                this.writingTickets = writingTicketsNew;
                this.storeWritingTickets();
                this.storeOfflineWritingClients();
            } else {
                // if there were writing tickets stored, delete them all; same for offlineWritingClients
                if (this.writingTickets.length>0){
                    this.writingTickets = [];
                    this.storeWritingTickets();
                }
                if (Object.keys(this.offlineWritingClients).length>0){
                    this.offlineWritingClients = {};
                    this.storeOfflineWritingClients();
                }
                if (Object.keys(this.onlineWritingClients).length>0){
                    this.onlineWritingClients = {};
                    this.storeOnlineWritingClients();
                }
            }

        } catch (e){
            this.logger.log(3, e)
            throw e;
        }

    }

    /** 
     * This function is called to get a subroom of this room
     * @param {string} subroomName The name of the subroom 
     **/
    getSubroom(subroomName){

        // roomName here means the name of the subroom; subrooms are potential further subrooms. 
        let roomName = subroomName.split('/',1)[0];
        let subrooms = subroomName.slice(roomName.length+1);

        // first try to get an available room
        if (roomName in this.subrooms){
            // check whether a further subroom is requested or this room
            if (subrooms == ''){
                return this.subrooms[roomName];
            } else {
                return this.subrooms[roomName].getSubroom(subrooms);
            }
        }

        // try to create the room dynamically
        const subroom = this.startDynamicSubroom(roomName);
        // make sure that also the subrooms are in secondary mode, if needed
        if (subroom && this.secondaryMode){
            subroom._changeMode(this.secondaryMode);
        }
        return subroom;

    }

    /**
     * Close a subroom (=delete its reference. Garbage collection will do the rest.)
     * @param {object} subroom The subroom. (Actually we would only need the subroomName, but this would allow the subrooms to close an other subroom than itself.)
     */
    closeSubroom(subroom){
        delete this.subrooms[subroom.name];    
        // check if now this room can be clsoed as well.
        this.evaluateAutoclosure();
    }

    // NEW 2022-02: this is an async function; this is required to handle async "getPersonalizedData". The change to async should have no influence, since the call to enter anyway does not care about the returned value/promise
    /**
     * @method enter A request by a client to get connected to this room. 
     * The process workflow should be (2020-11-28): 
     * 1. does the view exist? if not, try to create it IMPORTANT: whenever we have to start the process somewhere we have to check whether the room was dynamic and woudl have to be closed again!
     * 2. does the client have rights to access this room or view?
     * 3. if the client requests a writing ticket:
     * 3a. check if zthe client is in the offline-writing-clients list and give him the sam eticket again
     * 3b. if not, try to give him a new ticket (given there is a ticket left)
     * 4. define the listener for client-disconnection
     * 5. add the client to the room or view (this process shouldn't fail, since we checked rights before!)
     * 6. create the data to be sent to the client
     * 7. broadcast new room-info to all clients
     * 8. send reqponse to client
     * @param {string} tabId The tabId needed for identification of the client. Note: It can also be another server and not a tab.
     * @param {wsProcessor} wsProcessor The Websocket connection (extended with my specific funcitons providing notes and requests) of the calling client. 
     * @param {function} respFunc The responseFunction from the request, i.e. has two two arguments: (data, errorCode=0)
     * @param {object} opt The options-object. properties according to the following schema: {"type":"object", "properties":{"writing":{"type": boolean, "description": "optional, whether or not this connection also intends to write in this room"}, writingTicketID:{"type":"string", "description":"optional, the former writing-ticket-ID"},  "failOnWritingDeclined": {"type":boolean, "description": 'throw error when writing was not possible; default:false (=simply continues without writing rights)'},"ID":{"type": "string", "description":"optional, the UUID of the current data-status present on the client"}, "name": {"type":"string", "description": "optional, a name of the client used to identify it. Used on the server only if writing is true"}, "storeInfos":{type:"boolean", description:"optional, default=false, whether the client wants background information, e.g. about other connected clients"}, "datasetName":{type:"string", description:"if given and not '', the name of the dataset the client requests"}, "enterOptions": {description:"some additional information used during the enter process; e.g. a token; can be of any type"} , "roomViews":{type:"array" items:{"type":"string", description:"DISCONTINUED, optional, if set, the client does not want to be registered to the room, but actually to a roomView."}}, "enterRoom":{type:"boolean", description:"DISCONTINUED, optional property to define whether the room should be entered or just the roomView; if no roomView is given, enterRoom will always be set as true; if at least one roomView was requested, the default value is false."}}}
     * 
     */
    async enter(tabId, wsProcessor, respFunc, opt, session){

        this.logger.log(98, 'Client '+tabId+' wants to enter the room '+this.name);

        // create the hashed tabId
        let tabIdHash = this.createHash(tabId);
        let sidHash = this.createHash(session?.id);

        // do not answer when server is not ready yet. The client will retry anyway.
        if (!this.ready){
            respFunc("Server room is not yet ready. Please be patient", 17) 
            return;
        }

        // check that the client is not connected yet (mostly needed during debugging, when a client might repeat its enter-request, during the server is at a breakpoint)
        if (tabId in this.clients){
            respFunc("Client is already in room.", 18)
            return;
        }

        let writing = opt.writing ? true : false;
        let failOnWritingDeclined = opt.failOnWritingDeclined ?? false;

        // the clients name
        let name='';
        if (opt.name){
            name = opt.name;
        }
        let storeInfos = false;
        if (opt.storeInfos){
            storeInfos = opt.storeInfos;
        }

        /*let requestedRoomViews=[];
        if (opt.roomViews){
            requestedRoomViews = opt.roomViews;
        }*/ // DISCONTINUED

        let enterRoom = true;
        /*if ('enterRoom' in opt){
            if (requestedRoomViews.length){
                enterRoom = opt.enterRoom;
            }
        }*/ // DISCONTINUED

        let datasetName = opt.datasetName ?? ''; // the same as above, in short.


        // DISCONTINUED 1: check whether the roomViews exists and/or can be started; otherwise, the 'enter' process must be stopped
        // however, do NOT enter the roomView yet
        /*var roomViews = [];
        if (requestedRoomViews.length){
            for (viewName in requestedRoomViews){
                roomView = this.getView(viewName);
                if (!roomView){
                    respFunc(`The roomView "${viewName}"does not exist.`, 16); 
                    return;
                } else {
                    roomViews.push(roomView);
                }
            }
        }*/

        // check whether the roomdataset exists and/or can be started; otherwise, the 'enter' process must be stopped
        // however, do NOT enter the dataset yet (since we first want to check the access rights, eventuelly alsoof the room itself and not only of the dataset)
        var dataset;
        if (datasetName){
            if (datasetName in this.datasets){
                dataset = this.datasets[datasetName];
            } else {
                // try to start the dataset
                dataset = this.startDynamicRoomDataset(datasetName);

                if (!dataset){
                    respFunc(`The roomdataset "${datasetName}" does not exist.`, 16); 
                    return;
                }
            }
        }

        // 2: check the rights of the client to enter the room/view
        let accessRight = true;

        if (enterRoom){
            // by default the rights are given. Shall be overriden by the inheriting function, i.e. the actual implementation
            accessRight = this.evaluateRights(tabId, datasetName, opt.enterOptions, session, writing)
        }

        // DISONTINUED: check the rights to access the roomViews
        /*if (accessRight && roomViews.length){ // we must have accessRight in here, such that accessRight cannot get true again after it has been set to false!
            for (roomView in roomViews){
                accessRight = accessRight && roomView.evaluateRights(sid);
            }
        }*/

        // check the right to access the dataset
        if (dataset){
            accessRight = dataset.evaluateRights(tabId) && accessRight;
        }


        // past this point and if the client has access rights, the rest of the function should run without error (except that no writing rights are given, but that does not hinder the client to enter the room/view)  
        if (!accessRight){
            /*for (roomView in roomViews){
                if (roomView){
                    roomView.evaluateAutoclose();
                }
            }*/ // DISCONTINUED
            if (dataset){
                dataset.evaluateAutoclose();
            }
            
            respFunc("The client has no right to enter this room or one of the views.", 19); 
            return;
        }

        // 3. if the client requests a writing ticket:
        // 3a. check if zthe client is in the offline-writing-clients list and give him the sam eticket again
        // 3b. if not, try to give him a new ticket (given there is a ticket left)
        
        let writingTicketID = undefined;

        // if the client is found on the offlineWritingClients list, then it still has a ticket reserved
        // delete from offlineWritingClients list, if it was on it
        if (sidHash in this.offlineWritingClients){
            if (!writing){
                // the client formerly had writing rights, but does not need them anymore --> delete the writing ticket
                this.returnWritingTicketByID(this.offlineWritingClients[sidHash].writingTicketID);
            } else {
                writingTicketID = this.offlineWritingClients[sidHash].writingTicketID;
            }
            delete this.offlineWritingClients[sidHash];
            this.storeOfflineWritingClients();

        } else {

            // check if the client can get a regular writing ticket, but first check that if the client provided a writingTicketID in the options, if this would be still valid --> then the client got a new sessionId, but has an old and valid writingTicketID (or wants to hack us) --> delete the offlineClient for that writingTicketID from the offlineWritingClientsList (should not happen too often...)
            if (writing){

                if (opt.writingTicketID && this.writingTickets.indexOf(opt.writingTicketID)>=0){
                    // if the tabId has changed, but the writingTicked stayed the same, we have to remove it from the offlineWritingClientsList in a less efficient way:
                    for (let clientSidHashed in this.offlineWritingClients){
                        if (this.offlineWritingClients[clientSidHashed].writingTicketID==opt.writingTicketID){
                            delete this.offlineWritingClients[clientSidHashed];
                            this.storeOfflineWritingClients();
                        }
                    }

                    // the client can keep his writing ticket:
                    writingTicketID = opt.writingTicketID;
                } else {
                    // either the client did not yet have a writingTicket or has an invalid one --> try to gather a new writing ticket:
                    
                    // try to checkout a ticket
                    if (this.maxWritingTickets!=-1 && this.writingTickets.length >= this.maxWritingTickets){
                        // new 2020-01: there is no error when no writing ticket can be gathered. the client is connected anyway, but without writing ticket. The client shall leave the room when he does not want to be connected anymore. 
                        //respFunc("No (new) writing tickets available anymore. If the client already had a ticket, then it was invalid.", 18)
                        if (failOnWritingDeclined){
                            respFunc("No (new) writing tickets available anymore. If the client already had a ticket, then it was invalid.", 18)
                            return;
                        } 
                        writing=false;
                        
                    } else {
                        // create a new ticket
                        writingTicketID = this.uuidv4()
                        this.writingTickets.push(writingTicketID);
                        this.storeWritingTickets();
                    }
                }

            }
        } 

        // if the client requested the clientsList but has no writing rights and the server allows it only for writing clients, reset that variable
        if (storeInfos && !writing && !this.storeReadingClientInfos){
            storeInfos = false;
        }


        // 4. define the listener for client-disconnection
        // listen to ws-disconnect events: (the listener is also used for disconnecting from the event!)
        let listener = ()=>{

            this.logger.log(98, 'Client '+tabId+' got disconnected from room '+this.name + ' without properly leaving first.');

            // do not listen to the same event anymore, as the client is not connected anymore
            // NOTE: we do not have to listen for a reconnect, since the client will make the request to the room again if needed
            this.eH.eventUnsubscribe('wsClientDisconnect/'+tabId, this.name + '/' + tabId);

            // if the client requested Infos about all the other clients, also delete it from this list
            if (storeInfos){
                this.clientsRequestingInfos.splice(this.clientsRequestingInfos.indexOf(tabId),1);
            }

            // DISCONTINUED leave all roomViews:
            /*this.clients[tabId].views.forEach((el, ind)=>{
                // if (el=''){
                //     // the client listened to the room data
                //     let i = this.roomClients.indexOf(tabId);
                //     if (i>=0){
                //         this.roomClients.splice(i,1);
                //     }
                // }else {
                //     this.roomViews[el].leave(tabId);
                // }
                this.roomViews[el].leave(tabId)
            })*/

            // DISCONTINUED leave the room itself, if the client also listened to the room
            /*if (this.clients[tabId].listeningRoom){
                let i = this.roomClients.indexOf(tabId);
                if (i>=0){
                    this.roomClients.splice(i,1);
                }
            }*/

            // leave the dataset
            if (this.clients[tabId].datasetName){
                this.datasets[this.clients[tabId].datasetName].leave(tabId);
            }


            // if the client had writing rights: move the client from the clients list to the offlineWritingClients list and remove its processor, but do not delete the writingTicket from the list!
            let writing = this.clients[tabId].writing;
            if (writing){
                if (this.keepWritingTicket){
                    //let client = this.clients[tabId];
                    //delete client.processor;
                    // client should now be identical to onlineWritingClients
                    this.offlineWritingClients[sidHash] = this.onlineWritingClients[sidHash];
                    //this.offlineWritingClients[sidHash] = client; // 2021-01: use the sid to store the offline writing client (since the tabId would change e.g. on reload (it does not change when the same tab reconnects witout reload))
                    this.storeOfflineWritingClients();
                } else {
                    // return the writing ticket
                    this.returnWritingTicketByID(this.clients[tabId].writingTicketID);
                }
                
                // remove from onlineWritingClient
                delete this.onlineWritingClients[sidHash];
                this.storeOnlineWritingClients();

            }

            // always delete the client from the clients list:
            delete this.clients[tabId];
            //delete this.tabIdHashed[tabIdHash];

            // send the updated clientInfo to every listening client
            // update the clientInformation and sent them to the clients
            if (this.storeReadingClientInfos || writing){
                // also change client list
                this.broadcastInfos(true); 
            } else {
                // no need to change client list
                this.broadcastInfos(false); 
            }

            // inform the room that the client has left:
            //this.clientLeft(tabId, this.clients[tabId].datasetName, this.clients[tabId].enterOptions, this.clients[tabId].session)
            this.clientLeft(tabId, datasetName, opt.enterOptions, session)
        }
        this.eH.eventSubscribe('wsClientDisconnect/'+tabId, listener, this.name + '/' + tabId);


        // DISCONTINUED 5. add the client to the room and ev. view (this process shouldn't fail, since we checked rights before!)
        /*let listeningRoom = false;
        let views = [];
        for (roomView in roomViews){
            // add client to roomView
            roomView.enter(tabId);
            views.push(roomView.name);
        }
        if (enterRoom){
            // add client to room
            this.roomClients.push(tabId);
            listeningRoom = true;
        }*/

        // add the client to the dataset
        if(dataset){
            dataset.enter(tabId);
        }

        // add to the room (if the client was already registered, it will not be duplicate)
        this.clients[tabId] = {processor: wsProcessor, writing:writing, writingTicketID:writingTicketID, name:name, storeInfos:storeInfos, tabIdHash:tabIdHash, sidHash:sidHash, datasetName:datasetName, session:session, enterOptions: opt.enterOptions};
        // the same for onlineWriting
        if (writing){
            this.onlineWritingClients[sidHash] = {writing:writing, writingTicketID:writingTicketID, name:name, storeInfos:storeInfos, tabIdHash:tabIdHash, sidHash:sidHash, datasetName:datasetName, session:session, enterOptions: opt.enterOptions}; // the same as in clients, but without processor
            this.storeOnlineWritingClients();
        }
        /*this.clients[tabId] = {processor: wsProcessor, writing:writing, writingTicketID:writingTicketID, name:name, storeInfos:storeInfos, tabIdHash:tabIdHash, views:views, listeningRoom: listeningRoom};*/ // DISCONTINUED
        //this.tabIdHashed[tabIdHash] = tabId; // be able to retranslate the tabId
        if (storeInfos) {
            this.clientsRequestingInfos.push(tabId);
        }

        // 6. create the data to be sent to the client
        // define the data-object to return
        let data = {};
        if (writingTicketID){ 
            data.writingTicketID = writingTicketID;
        }
        data.ID = this.ID;

        if (dataset){
            // FUTURE-TODO: extend this to provide incremental changes also for sub-datasets
            data.type = 'full';
            data.data = dataset.data;
            data.dataset = datasetName; // this is absolutely not needed (since we do never send something else than the requested dataset), but it might help for debugging on the client.
        } else {
            // listens to the room
            // only send incremental changes if ID is given and still in the stack
            if (opt.ID){
                let i = this.stackIDs.indexOf(opt.ID);
                if (i>=0){
                    // get all incremental do-changes and write it to a new array
                    let changes = [];
                    for (let j = i+1; j<this.stackIDs.length; j++){ // 1+ because we do not need to send what is already available, but everything newer. If there is nothing newer, then the changes list will simply stay empty.
                        changes.push({funcName:this.stack[j].doObj.funcName, data:this.stack[j].doObj.data}); // do not simply add the complete stack-doObj, as the client does not need all the incremental IDs, which are stored in the doObj too.
                    }

                    data.type = 'incremental';
                    data.data = changes;
                } else {
                    data.type = 'full';
                    data.data = await this.getPersonalizedData(this.clients[tabId]); 
                }
                
            } else {
                data.type = 'full';
                data.data = await this.getPersonalizedData(this.clients[tabId]); 
            }
        }
        /*if (roomView){
            // TODO: implement the incremental updates for views too (i.e. implement first the stack stuff in the views!)
            data.data = roomView.data;
        }*/ // DISCONTINUED

        
        // 7. broadcast new room-info to all clients
        // update the clientInformation and sent them to the clients
        if (this.storeReadingClientInfos || writing){
            // also change client list
            this.broadcastInfos(true); 
        } else {
            // no need to change client list
            this.broadcastInfos(false); 
        }

        // even if the infos will be broadcast shortly, we have to send it here for one case: non-writing client that wants the infos; because the broadcast would not send the clients since they did not change
        if (storeInfos){
            if ((!this.storeReadingClientInfos) && (!writing)){
                data.infos = this.infos;
            } else {
                // we have to create a client specific info-object
                data.infos = copyObject(this.infos);
                data.infos.clients = this.getPersonalizedClientsInfos(tabId);
            }
        }

        this.logger.log(98, "Successfully entered the room '" + this.name + "'. tabId: "+ tabId + " Name: "+ name)
        this.clientEntered(tabId, datasetName, opt.enterOptions, session)

        // 8. send response to client
        // send the response with the data
        this.logger.log(99,data);
        respFunc(data, 0);
        
    } // end enter

    /**
     * Leave the room. Just remove the entry in the clients array. 
     * Returns true on success. (actually this might be/is unused, since clients do not want to wait for an answer until they close the connection, so Note is used instead of request)
     * @param {*} tabId  
     * @param {object} opt
     */
    leaveRequest(tabId, respFunc, opt) {

        if (!(this.isClient(tabId))){
            respFunc("You are not client of the room '"+this.name+"'.",19)
            return;
        }

        //let tabIdHash = this.clients[tabId].tabIdHash;
        let writing = this.clients[tabId].writing;
        let sidHash = this.clients[tabId].sidHash;

        this.returnWritingTicket(tabId);

        // unsubscribe from the disconnect event!
        this.eH.eventUnsubscribe('wsClientDisconnect/'+tabId, this.name + '/' + tabId);

        if (this.clients[tabId].storeInfos){
            this.clientsRequestingInfos.splice(this.clientsRequestingInfos.indexOf(tabId),1);
        }

        // DISCONTINUED leave all roomViews:
        /*this.clients[tabId].views.forEach((el, ind)=>{
            // if (el=''){
            //     // the client listened to the room data
            //     let i = this.roomClients.indexOf(tabId);
            //     if (i>=0){
            //         this.roomClients.splice(i,1);
            //     }
            // }else {
            //     this.roomViews[el].leave(tabId);
            // }
            this.roomViews[el].leave(tabId)
        })*/

        // DISCONTINUED leave the room itself, if the client also listened to the room
        /*if (this.clients[tabId].listeningRoom){
            let i = this.roomClients.indexOf(tabId);
            if (i>=0){
                this.roomClients.splice(i,1);
            }
        }*/

        // leave the dataset
        if (this.clients[tabId].datasetName){
            this.datasets[this.clients[tabId].datasetName].leave(tabId);
        }

        delete this.clients[tabId];
        //delete this.tabIdHashed[tabIdHash];
        if (writing){
            delete this.onlineWritingClients[sidHash];
            this.storeOnlineWritingClients();
        }

        // always returns true, as nothing can go wrong (except when the connection would get lost)
        respFunc(true);

        // update the clientInformation and sent them to the clients
        if (this.storeReadingClientInfos || writing){
            // also change client list
            this.broadcastInfos(true); 
        } else {
            // no need to change client list
            this.broadcastInfos(false); 
        }

        // if this room is dynamic, check whether it can be deleted
        this.evaluateAutoclosure()

    }

    /**
     * Leave the room. Just remove the entry in the clients array. 
     * Returns true on success.
     * @param {*} tabId  
     * @param {object} opt
     */
    leaveNote(tabId, opt){
        if (!(this.isClient(tabId))){
            this.logger.log(75, "leave: tabId '" +tabId+"' is not a client of the room '"+this.name+"'.")
            return;
        }

        //let tabIdHash = this.clients[tabId].tabIdHash;
        let writing = this.clients[tabId].writing;
        let sidHash = this.clients[tabId].sidHash;

        this.returnWritingTicket(tabId);

        // unsubscribe from the disconnect event!
        this.eH.eventUnsubscribe('wsClientDisconnect/'+tabId, this.name + '/' + tabId);

        if (this.clients[tabId].storeInfos){
            this.clientsRequestingInfos.splice(this.clientsRequestingInfos.indexOf(tabId),1);
        }

        // leave the dataset
        if (this.clients[tabId].datasetName){
            this.datasets[this.clients[tabId].datasetName].leave(tabId);
        }

        delete this.clients[tabId];
        //delete this.tabIdHashed[tabIdHash];
        if (writing){
            delete this.onlineWritingClients[sidHash];
            this.storeOnlineWritingClients();
        }

        // update the clientInformation and sent them to the clients
        if (this.storeReadingClientInfos || writing){
            // also change client list
            this.broadcastInfos(true); 
        } else {
            // no need to change client list
            this.broadcastInfos(false); 
        }

        // if this room is dynamic, check whether it can be deleted
        this.evaluateAutoclosure()

    }

    /**
     * Check whether the room can be closed automatically:
     * - autoclosure is ON (the autoclosureTimeout value is positive or zero)
     * - has a parentRoom
     * - has no clients anymore
     * - has no subrooms
     * and close the room if possible.
     */
    evaluateAutoclosure(){
        if (!this.parentRoom || this.autoclosureTimeout<0){
            return;
        }

        if (Object.keys(this.subrooms).length!=0){
            return;
        }

        if (Object.keys(this.clients).length != 0){
            return;
        }

        // TODO: registering to a closed room takes two connection attempts: in the first attempt, the server will respond "room not ready" and the second time it will answer with the data. Thus, we should make sure that dynamic creation of rooms does not happen too often. Thus, it could be helpful to not close a room too fast, but eventually after a timeout. (Wile the competition takes place, closure of rooms should be avoided. However, before and after the competition, where only occasionally the data is accessed it might make sense.)
        // actually we could/should also change the behavior when a room is not yet ready: keep the request open and answer as soon as we are ready.

        // close the room:
        // there is nothing special to be done except deleting the reference in the parent.
        this.parentRoom.closeSubroom(this.name);
    }

    /**
     * Evaluate, whether the client with the tabId has the right to access the room. Eventually also take into account the dataset that is accessed. (However, note that the dataset provides its own rights-check. The present datasetName mainly serves the prupose to tell this function that not (necessarily) the full room data is accessed. It that sense, when datasetName<>'', this function might be used to just evaluate whether the client has the rights for writing, since reading the data is checked within teh dataset.)
     * @param {string} tabId The tabId of te client 
     * @param {string} datasetName The name of the requested dataset (empty '' if not given))
     * @param {any} enterOptions Some additional options provided by teh client for the enter process, e.g. a token
     * @param {object} session The session object, storing information about the client, e.g. login status and what rights teh client has.
     * @param {boolean} writing True if the client requests writing rights.
     * @returns {boolean} true if the client has the rights to access the room
     */
     evaluateRights(tabId, datasetName, enterOptions, session, writing){
        // to be implemented by the inheriting class
        return true;
    }

    /**
     * DISCONTINUED Try to get a roomView and alternatively try to load a dynamic roomView
     * @param {string} roomView The name of the roomView to return 
     */
    /*getView(roomView){
        // check if this roomView exists; otherwise call startDynamicRoomView and if it can be started, add it to the list of existing roomViews
        if (roomView in this.roomViews){
            return this.roomViews[roomView];
        } else {
            return this.startDynamicRoomView(roomView)
        }
    }*/

    /**
     * DISCONTINUED: Add a view to the room; is caled vy the view itself on creation. 
     * @param {roomView} view the view to be added to the list of views
     */
    /*viewCreated(view){
        if (view.name in this.roomViews){
            this.logger.log(15, `The view "${view.name}" cannot be added, sicne it already exists.`);
        }else {
            this.roomViews[view.name] = view;
        }

    }*/

    /**
     * Add a dataset to the room; is called by the dataset on creation. 
     * @param {roomdataset} dataset the dataset to be added to the list of datasets
     */
    datasetCreated(dataset){
        if (dataset.name in this.datasets){
            this.logger.log(15, `The dataset "${dataset.name}" cannot be added, because it already exists.`);
        }else {
            this.datasets[dataset.name] = dataset;
        }

    }

    /**
     * DISCONTINUED the view calles this function when it closes itself, (at least in the case when there are no clients anymore in a dynamic room)
     * @param {*} viewName 
     */
    /*viewCloses(viewName){
        // delete view from the list of views! (with this there should be no reference to the view anymore and teh garbage collection should free the memory of the view)
        if (viewName in this.roomView){
            delete this.roomView[viewName];
        }
    }*/

    /**
     * the dataset calles this function when it closes itself, (at least in the case when there are no clients anymore in a dynamic room)
     * @param {*} datasetName 
     */
    datasetCloses(datasetName){
        // delete dataset from the list of datasets! (with this there should be no reference to the view anymore and teh garbage collection should free the memory of the view)
        if (datasetName in this.datasets){
            delete this.datasets[datasetName];
        }
    }

    // DISCONTINUED and unfinished
    /*enterView(roomView, tabId){
        // check if this roomView exists; otherwise call startDynamicRoomView and if it can be started, add it to the list of existing roomViews
        if (roomView in this.roomViews){
            let ret = this.roomViews[roomView].enter(tabId);
            // if the client was already in the roomView, it will return false, true on success.
            if (ret){
                this.clients
            }

        }else{
            if(val = this.startDynamicRoomView(roomView, tabId)){
                
            }
            
            this.clients[tabId].views
        }*/

        /*check if this roomView exists; otherwise call startDynamicRoomView and if it can be started, add it to the list of existing roomViews
 *  - add client to the view by calling enter(clienttabId) on the view. This function usually just adds the tabId to the list of clients, but by inheritance this process could be overwritten, e.g. to check accessing rights. Returns true on success.
 *  - TODO: if entering view was successful, store the clients 'subscription' to the view in the clients object, in order to know which views it is listening to and which views need to left on leave
 *  - if entering is unsuccessful and it was a newly created dynamic room, close it again.
*/
    //}

    /**
     * change the name of the client with the given tabId to the new name and report it to every other client
     * @param {string} tabId 
     * @param {*} name 
     */
    changeClientName(tabId, name){

        if (!(this.isClient(tabId))){
            return;
        }

        let nameOld = this.clients[tabId].name;
        let writing = this.clients[tabId].writing;
        let sidHash = this.clients[tabId].sidHash;
        this.clients[tabId].name = name;
        if (writing){
            this.onlineWritingClients[sidHash].name = name;
            this.storeOnlineWritingClients();
        }
        // report to all clients except the just mentioned one.
        let data = {
            // the roomName is added in broadcast
            arg: 'changeClientName',
            opt: {
                oldName: nameOld,
                newName: name
            }
        }
        
        // update the clientInformation and sent them to the clients
        if (this.storeReadingClientInfos || writing){
            // also change client list
            this.broadcastInfos(true); 
        } else {
            // no need to change client list
            this.broadcastInfos(false); 
        }

    }

    /**
     * Dump the mysql-tables used in this room. This used by slave-servers to get to the same state as the master server
     */
    dumpTables(){
        // TODO
        /*mysqldump({

        })*/

        // return the dump and the current ID

    }

    /**
     * give the given writingTicket . 
     * @param {string} tabId The tabId of the client (We do not use the writingTicketID directly in order that we can make sure the client is part of the room and not an evil client, that probably would not get rights to enter the room, can also try to return a random writingTicket)
     */
    returnWritingTicket(tabId){

        if (tabId in this.clients){
            // get the id
            let id = this.clients[tabId].writingTicketID;

            this.returnWritingTicketByID(id);

            delete this.onlineWritingClients[this.clients[tabId].sidHash];
            this.storeOnlineWritingClients();
        } else {
            this.logger.log(75, 'Client with tabId "'+tabId+'" is not member of the room '+this.name);
        }
        
    }

    /**
     * Return the writingTicket when we already know the id and not only th tabId. 
     * @param {string} id The writingTicketID
     */
    returnWritingTicketByID(id){
        // give the writing ticket back
        let ind = this.writingTickets.indexOf(id);
        if (ind>=0){
            this.writingTickets.splice(ind,1);
            this.storeWritingTickets;
            this.logger.log(98, 'Successfully returned writingTicket "'+id+'" in room '+this.name);
            return true;
        } else {
            this.logger.log(75, 'WritingTicketID "'+id+'" did not exist in the room '+this.name+ ' and thus is not deleted.');
            return false;
        }
    }

    /**
     * process the incoming request for a writing ticket for a client that previously did not have a writing ticket
     * @param {*} tabId 
     * @param {*} respFunc 
     */
    requestWritingTicket(tabId, respFunc){

        // at the beginning of most/every function we have to check whether the tabId is part of this room! (as done here)

        // check that the client did not yet have a writing ticket
        if (!this.isClient(tabId)){
            respFunc("You are not a client of room '"+this.roomName+"'.", 17);
            return;
        }
        if (this.clients[tabId].writing){
            respFunc('Cannot get another writing ticket. No stockpiling here!',18);
            return;
        }
        if (this.maxWritingTickets!=-1 && this.writingTickets.length >= this.maxWritingTickets){
            respFunc("No (new) writing tickets available anymore. ", 19);
            return;
        } else{

            // create a new ticket
            let writingTicketID = this.uuidv4()
            this.writingTickets.push(writingTicketID);
            this.storeWritingTickets();

            // store the ticket to the client infos
            let client = this.clients[tabId];
            client.writing = true;
            client.writingTicketID = writingTicketID;

            // store the client to online writing clients
            this.onlineWritingClients[client.sidHash] = {writing:true, writingTicketID: writingTicketID, name: client.name, storeInfos: client.storeInfos, tabIdHash: client.tabIdHash, sidHash: client.sidHash, datasetName: client.datasetName, session: client.session, enterOptions: client.enterOptions}; 
            this.storeOnlineWritingClients();
            
            let resp = {writingTicketID: writingTicketID};

            respFunc(resp);
        }

    }


    /**
     * Reset the list of writing tickets. This might be needed, when a client with writing rights does not properly leave the room when finished. Always return true
     * @param {function} responseFunc The responseFunction from the request, i.e. has two two arguments: (data, errorCode=0). On success, data=ID. 
     * @param {object} opt Not used yet. Could be used e.g. for kicking specifically one client. 
     */
    // TODO: is this used? I think not (2023-01-02)
    writingTicketsReset(responseFunc, opt){
        this.resetWritingTickets();
        responseFunc(true,0);
    }

    /**
     * revoke the writing ticket of the client with the tabIdHash given. Only of offline clients the writing Ticket can be revoked 
     * @param {string} tabId The tabId of the client that wants to revoke the tabId of another client and eventually (opt.writingWanted) wants a writing ticket for its own.
     * @param {function} responseFunc The responseFunction from the request, i.e. has two two arguments: (data, errorCode=0). On success, data=ID. 
     * @param {object} opt
     */
    revokeWritingTicket(tabId, respFunc, opt){
        //opt.sidHash // of the writingTicket to be revoked
        //opt.writingRequested // if the client wants the free writingTicket

        // FUTURE: check if the clients has the rights to do so

        let resp = {}; // the response is either empty or has a property named writingTicketID with the ticket. There is no need for stating that the revoking worked, since an error would be raised otherwise.

        // revoke the writing ticket
        // hereby we automatically check, that the client with the respecitve sidHash really is offline. Do NEVER revoke writing Tickets of online clients (except we make sure we can also inform them; not implemented yet!)
        let revokeClient = this.offlineWritingClients[opt.sidHash];
        if(revokeClient){
            // return the writing ticket
            if(!(this.returnWritingTicketByID(revokeClient.writingTicketID))){
                respFunc('Could not return the writing ticket for any reason...', 17);
                return
            } 

            // delete it from the offlineClients list
            delete this.offlineWritingClients[opt.sidHash];
            this.storeOfflineWritingClients();

        } else {
            respFunc('Could not find offline client with given sidHash.',17);
        }

        if (opt.writingRequested){
            // check that the client does not already have a writing ticket
            if (this.clients[tabId].writing){
                respFunc('Cannot get another writing ticket. No stockpiling here!',18)
            } else{
                // get a writing ticket for the client and return it

                // create a new ticket
                let writingTicketID = this.uuidv4()
                this.writingTickets.push(writingTicketID);
                this.storeWritingTickets();
                let client = this.clients[tabId];
                client.writingTicketID = writingTicketID;
                client.writing = true;

                // store the client to online writing clients
                this.onlineWritingClients[client.sidHash] = {writing:true, writingTicketID: writingTicketID, name: client.name, storeInfos: client.storeInfos, tabIdHash: client.tabIdHash, sidHash: client.sidHash, datasetName: client.datasetName, session: client.session, enterOptions: client.enterOptions}; 
                this.storeOnlineWritingClients();

                resp.writingTicketID = writingTicketID;
            }
        }


        // broadcast new infos
        this.broadcastInfos(true);

        // send the regular response
        respFunc(resp,0);
    }

    /**
     * update the infos and broadcasts it
     * @param {boolean} updateClients Set to true if also the clients shall be updated
     */
    broadcastInfos(updateClients=false){

        // update the clients list, if requested
        if (updateClients){
            // this is how it must look for each client (the hash is teh sidHash for offlineClients and the tabHash for onlineCLients):
            // hash:{connected, name, writing, sidHash }

            // reset all
            this.infos.clients = {}

            // add all connected clients
            for (let tabId in this.clients){
                if (this.storeReadingClientInfos || this.clients[tabId].writing){
                    let client = this.clients[tabId];
                    this.infos.clients[client.tabIdHash] = {name:client.name, connected:true, writing:client.writing, sidHash:client.sidHash} // eventually add also the tabIdHash; however it is actually not necessary since we need only the sidHash and only for offlineWritingClients
                }
            }
            // add all offline writing clients
            for (let sidHash in this.offlineWritingClients){
                let client = this.offlineWritingClients[sidHash];
                this.infos.clients[sidHash] = {name:client.name, connected:false, writing:client.writing, sidHash:sidHash}
            }
        }

        // update the statistics
        this.infos.numClients = Object.keys(this.clients).length;
        this.infos.numClientsWriting = this.writingTickets.length;
        this.infos.maxWritingTickets = this.maxWritingTickets;

        // start the broadcasting.

        // every clients gets its own new clientList, when updateClient=true, otherwise it stays empty

        let emptyBaseInfo = copyObject(this.infos);
        emptyBaseInfo.clients = {};
        let sendObj = {name: 'room', data: {arg: 'infoUpdate', roomName:this.name, opt: emptyBaseInfo}}

        if (updateClients){

            for (let i = 0; i<this.clientsRequestingInfos.length; i++){
                let tabId = this.clientsRequestingInfos[i];
    
                // send infos with clients
                emptyBaseInfo.clients = this.getPersonalizedClientsInfos(tabId);

                this.clients[tabId].processor.sendNote(sendObj);

            }
        } else {
            for (let i = 0; i<this.clientsRequestingInfos.length; i++){
                let tabId = this.clientsRequestingInfos[i];

                // infos without clients
                this.clients[tabId].processor.sendNote(sendObj);
                
            }
        }


    }

    /**
     * Create an info-object specific for the mentioned client (e.g. without its own data in the rooms-list)
     * @param {string} tabId The tabId to exclude
     */
    getPersonalizedClientsInfos(tabId) {
        let tabIdHash = this.createHash(tabId);
        let persClients = copyObject(this.infos.clients);
        delete persClients[tabIdHash]; // probably does nothing, when the client is read-only + infos are stored only for writing clients but still requested the infos
        return persClients
    }

    /**
     * func (called from the wsProcessor/requestHandling): Call a function in this room. However, these functions must be available first...
     * the functions must be async. They get just one argument: The data to be processed. On success/failure they must return an object with the schemas defined below 'response', doObj','undoObj' and 'isAchange' as properties and their values, on failure an object with properties 'message' and 'code', storing the error message and the error code
     * @param {string} tabId The tabId needed for identification of the client. 
     * @param {function} respFunc The responseFunction from the request, i.e. has two two arguments: (data, errorCode=0). On success, data=ID. If there is no 
     * @param {object} request An object storing the functionName to call (func) and the data to process (data).
     */
    func(tabId, respFunc, request){

        if (!(this.isClient(tabId))){
            respFunc("You are not client of the room '"+this.name+"'.",19)
            return;
        }

        // check if request has the right format
        let reqSchema = {
            type:'object',
            properties: {
                funcName:{type: 'string'},
                ID:{type: 'string'},
                data:{} // should accept any type
            },
            required:['funcName', 'ID']
        } 

        // check if necessary arguments exist
        if (!(this.ajv.validate(reqSchema, request))){
            respFunc("The request '"+ JSON.stringify(request) +"' does not fulfill the schema '"+ JSON.stringify(reqSchema) +"'.",17);
            return;
        } 

        // check if the function exists:
        if (request.funcName in this.functionsReadOnly){
            // no checks needed here --> start directly
            // differentiate async and non async functions
            let prom = this.functionsReadOnly[request.funcName](request.data);
            if (prom instanceof Promise){
                prom.then((ret)=>{
                
                    // send response
                    // must have the same format as for writign changes (data, ID), except the ID --> only data
                    
                    //ret.ID = id;
                    respFunc({data: ret}); // does not include an ID since we did not change anything
    
                }).catch((err)=>{
                    if (developMode){
                        let schemaFail = {
                            type: 'object',
                            properties: {
                                message:{type: 'string'},
                                code: {type: 'number'}
                            },
                            required: ["message", "code"]
                        }
                        // check schema
                        if(!(this.ajv.validate(schemaFail, err))){
    
                            // if it was not an error we have created but a regular node error, then JSON.stringify is empty. --> make sure this is not the case
                            let errStr;
                            if (err instanceof(Error)){
                                errStr = err;
                            } else {
                                JSON.stringify(request.funcName);
                            }
    
                            let text = "Error: The error-object returned from the room-function '"+ errStr +"' in room '"+ this.name +"' does not fulfill the failure-schema.";
                            this.logger.log(3, text)
                            respFunc("Error on the server: " + text, 11)
                            return;
                        }
                    }
                    // the error code must be larger than 21! (0=success, 1-10=connection failures, 11-20=Server internal room problems, >=21= room funciton specific failures)
                    if (err.code<21){
                        // use the code 99 for wrong error codes in the room implementation
                        err.code = 99;
                    }
                    respFunc(err.message, err.code); 
                });
            } else {
                // the function was a regular function; simply send the answer
                // send response
                // must have the same format as for writign changes (data, ID), except the ID --> only data
                respFunc({data: prom}); // does not include an ID since we did not change anything
            }
            
        }
        else if (request.funcName in this.functionsWrite){

            // do all checks that can be done before we have to decide whether the request is processed immediately or has to be put on the stack. 

            // check for writing rights
            if (!(this.clients[tabId].writing)){
                respFunc("Client has no rights to do writing changes!",18);
                return
            }

            // check if the last request was identical to the current one (this happens when the connection is lost after the request arrives but before the answer was sent) --> then we simply send the response without processing it again
            if (request==this.lastChange.request){
                // TODO: problem here could appear: when the first request is not completely processed then this.lastChange.response is empty but still returned!
                respFunc(this.lastChange.response);
                return;
            }

            // check if the ID matches --> this check needs to be repeated in _startWriteFunction!
            let currentID = this.ID;
            if (request.ID != currentID) {
                if (this.conflictChecking){
                    if(this.funcName in this.functionsConflictChecking){
                        // try to do conflict checking (and in the future maybe even conflict handling (=solving))
                        
                        // TODO: implement. 
                        this.logger.log(10, 'Conflict checking is not implemented yet!');
                        return;
                        // if  no conflict, simply continue (no return)

                        // on error in the conflictCheckingFunction: 
                        //respFunc("An error occured during conflict checking. The request is rejected.", 14);

                        // if the conflict checking really found a conflict and thus cannot process the request:
                        // respFunc("Conflict checking found a conflict and thus cannot process the data. The request is rejected.", 15);
                        // TODO future: here we would implement complex conflict handling strategies
                    } else {
                        respFunc("There is no conflict checking for this function. The request is rejected.", 14);
                        return;
                    }
                } else {
                    respFunc("The client is outdated and the server has no conflict checking. The request is rejected.", 13);
                    return;
                }
            }


            // check whether something is running right now and put the change on the stack if so; process it directly otherwise
            if (this.busy){
                this.functionsWorkStack.push({tabId:tabId, respFunc: respFunc, request:request, ID:currentID, type:"ws"}) // "ws"-type request (in contrast to server requests)
                this.logger.log(67, "Need to put a change on the stack since multiple changes were requested at the same time. Client " + tabId + " with a request to the '" + request.funcName + "'-function has to wait...");
            } else {
                // do start the function
                this._startWriteFunction(tabId, respFunc, request, currentID); 
            }
        } else {
            respFunc("The function '" + request.funcName + "' is not available on the server-room.",19);
            return;
        } 

    }

    /**
     * start processing a write request made by the server itself (e.g. another room). 
     * @param {string} funcName The name of the function to call
     * @param {any} data The data used for processing
     * @param {function} resolve The resolve function of the promise
     * @param {function} reject The reject function of the promise 
     * @param {string} id !!! to be used only by rSideChannel !!! (the new ID that shall be used)
     * @param {string} oldId !!! to be used only by rSideChannel !!! (the old ID to be used for the ID check; NOTE: normally, no ID check is done for serverWriteFunctions, but for teh sideChannel it must be done, since doing the check inside the sideChannel does not work, since it must be done after any previous changes are applied.)
     * @param {string} tabIdExclude !!! to be used only by rSideChannel !!! (the tabId which shall not receive the broadcast)
     * @returns the response
     */
    _startWriteFunctionServer(funcName, data, resolve, reject, id=undefined, oldId=undefined, tabIdExclude=undefined){

        // TODO: remove
        console.log(`_startWriteFunctionServer: ${funcName} in ${this.name}`)

        // check the ID, if it is given; this is actually only needed for rSideChannel, since we cannot do the check in rSideChannel, but we must do it here, since it must be after any previous changes are applied.
        // TODO: when we are here, the ID is not updated yet! Probably, the next function is strated before the ID of the last change ist stored;

        if (oldId && oldId != this.ID){
            reject({message: "The client is outdated.", code:13});
            return;
        }

        if (!(funcName in this.functionsWrite)){
            reject({message: "The function '" + funcName + "' is not available on the server-room.", code:19});
            return;
        }

        this.busy = true;

        this.functionsWrite[funcName](data).then((ret)=>{
            //ret = {isAchange, response, doObj, undoObj, preventBroadcastToCaller};

            if (developMode){
                // check schema

                if(!(this.validateSuccess(ret))){
                    let text = "Error: The object ("+JSON.stringify(ret)+") returned from the room-function '"+ funcName +"' in room '"+ this.name +"' does not fulfill the success-schema. schema-error: " + this.ajv.errorsText();
                    this.logger.log(3, text)
                    throw {message:"Error on the server: " + text, code:11};
                }
            }

            // create the ID and broadcast to the clients: 
            if (ret.isAchange){
                this._processChange(ret.doObj, ret.undoObj, tabIdExclude, id)
            }

            // resolve the promise the requesting function is waiting for 
            // NOTE: the order of the next two calls does not matter, since resolve is anyway handled last. This is not ideal, since it means that any other change on the workStack is handled before calling resolve when all those cally are sync!
            
            // call the next writingFunction, if there is any.
            this.finishedFunc();
            
            resolve(ret.response)

         }).catch(err=>{
             reject(err);
             this.finishedFunc();
         });

    }

    /**
     * startProcessing a write request. This function is either called by func or via the requestStack. 
     * @param {*} tabId 
     * @param {*} respFunc 
     * @param {*} request 
     * @param {string} ID The id when the last check for ID and conflict was done. If it did change, we have to repeat the check.
     */
    _startWriteFunction(tabId, respFunc, request, ID=''){
        // old: sync
        //this.functions[request.funcName](tabId, request.data, respFunc)

        // TODO: remove
        console.log(`_startWriteFunction: ${request.funcName} in ${this.name}`)

        if (!(this.isClient(tabId))){
            respFunc("You are not client of the room '"+this.name+"'.",19)
            return;
        }
        
        // check if the ID matches if the ID has changed since the last check
        if (this.ID!=ID && request.ID != this.ID) {
            if (this.conflictChecking){
                if(request.funcName in this.functionsConflictChecking){
                    // try to do conflict checking (and in the future maybe even conflict handling (=solving))
                    
                    // TODO: implement. 
                    this.logger.log(10, 'Conflict checking is not implemented yet!');
                    return;
                    // if  no conflict, simply continue (no return)

                    // on error in the conflictCheckingFunction: 
                    //respFunc("An error occured during conflict checking. The request is rejected.", 14);

                    // if the conflict checking really found a conflict and thus cannot process the request:
                    // respFunc("Conflict checking found a conflict and thus cannot process the data. The request is rejected.", 15);
                    // TODO future: here we would implement complex conflict handling strategies
                } else {
                    respFunc("There is no conflict checking for this function. The request is rejected.", 14);
                    return;
                }
            } else {
                respFunc("The client is outdated and the server has no conflict checking. The request is rejected.", 13);
                return;
            }
        }

        this.busy = true;

        // new: async functions
        // since we want to react differently on errors in the first async part and in the second (in then()), we actually need that the code within "then" has its own .catch and does not share it with the outer async function. Note that the chain is never stopped after a catch; So in .then1.catch1.then2.catch2 the then2 is always executed, which is why we do not want this beautiful chain here.

        this.functionsWrite[request.funcName](request.data).then((ret)=>{

            var serverProcessing =  async (ret)=>{
                if (developMode){
                    // check schema
    
                    if(!(this.validateSuccess(ret))){
                        let text = "Error: The object ("+JSON.stringify(ret)+") returned from the room-function '"+ request.funcName +"' in room '"+ this.name +"' does not fulfill the success-schema. schema-error: " + this.ajv.errorsText();
                        this.logger.log(3, text)
                        respFunc("Error on the server: " + text, 11)
                        return;
                    }
                }
                
                // the request could include reading only and thus no new ID and no broadcast of any changes must be sent to other clients.
                if (ret.isAchange){
    
                    // create the new ID; _processChange will add the id to doObj and set it as new this.ID
                    let id = this.uuidv4();
                    let response = {};
                    response.data = ret.response; 
                    response.ID = id;
                    
                    // send response
                    respFunc(response);
    
                    // new: part of this function is in _processChange, since there is now the possibility for non-response related change-broadcasts (with processChange() (without _underline))
                    // as we needed to define the id already here to be able to send the response to requesting client, we have to pass it to _processChange 
                    // if requested, do not send broadcast to the calling client; however, by default we should also send the broadcast to the calling client. 
                    if (ret.preventBroadcastToCaller){
                        this._processChange(ret.doObj, ret.undoObj, tabId, id)
                    } else {
                        this._processChange(ret.doObj, ret.undoObj, undefined, id)
                    }
    
                    // store the last change separately. This is needed for the case that the response could not be sent, but the change was still processed on the server: The client will then send the same change request again and the server will directly answer with the response that the last time did not reach the client without actually processing the request.
                    this.lastChange.request = request;
                    this.lastChange.response = response; // not the response-data (ret.response), but the comnplete sent object

                } else {
                    // simply send response. But it must have the same format, therefore put the data in front
                    respFunc({data:ret.response});

                }

                // either just finish (busy=false) or start next function to be processed:
                this.finishedFunc();
            }

            return serverProcessing(ret).catch((err)=>{
                // catch for the roomServer-functino itself; not for errors made by the implemented writeFuntion in the room

                let text = "Error in processing the change from the room-function '"+ request.funcName +"' in room '"+ this.name +"'. Error: " + err.toString();
                this.logger.log(3, text)
                respFunc("Error on the server: " + text, 11)
                this.finishedFunc();
                return;
            })

        }).catch((err)=>{
            // catch for the writeFunction defined in the respective room

            if (developMode){
                // check schema
                if(!(this.validateFail(err))){

                    // if it was not an error we have created but a regular node error, then JSON.stringify is empty. --> make sure this is not the case
                    let errStr;
                    if (err instanceof(Error)){
                        errStr = err;
                    } else {
                        JSON.stringify(request.funcName);
                    }

                    let text = "Error: The error-object returned from the room-function '"+ request.funcName +"' in room '"+ this.name +"' does not fulfill the failure-schema. Error: " + errStr;
                    this.logger.log(3, text)
                    respFunc("Error on the server: " + text, 11)
                    return;
                }
            }
            // the error code must be larger than 21! (0=success, 1-10=connection failures, 11-20=Server internal room problems, >=21= room funciton specific failures)
            if (err.code<21){
                // use the code 99 for wrong error codes in the room implementation
                err.code = 99;
            }
            respFunc(err.message, err.code); 

            // even if there was a failure, we have to call the next waiting writeFunction
            this.finishedFunc();
        })
    }

    /**
     * process a change that is not just an answer to a client request, but e.g. an additional change from a client. The actual processing is done in _processChange.
     * If the properties do not pass the validation, the function returns false, otherwise true. However, the error will not be reported on any client.
     * @param {*} doObj 
     */
    processChange(doObj, undoObj){
        // validate both objects and call _processChange
        if (this.validateDoObj(doObj) && this.validateUndoObj(undoObj)){
            this._processChange(doObj, undoObj);

            // reset the lastChange object, since this processChange is not the direct reposnse to a request!
            this.lastChange.request = {};
            this.lastChange.response = {}; 

            return true;
        } else {
            return false;
        }
        
    }

    /**
     * _processChange: defien a new ID, put the changes on the stack, broadcast the changes to all clients 
     * @param {object} undoObj 
     * @param {object} doObj 
     * @param {string} tabId The tabId of the client that should not receive the broadcast
     * @param {string} id If id is defined, then _processChange will not get a new random id, but use the given one. This is needed e.g. on usual requests, where the response to the requesting client needs to be sent before the broadcast and thus also the id needs to be defined before _processChange is called. 
     */
    _processChange(doObj, undoObj, tabId=undefined, id=undefined){
        // create the new ID and put the old and new one to the respective changeObjects on the stack
        undoObj.ID = this.ID;
        doObj.oldID = this.ID; // added 2022-02
        if (!id){
            id = this.uuidv4();
        }
        this.ID = id;
        doObj.ID = id;

        // store the last change separately. This is needed for the case that the response could not be sent, but the change was still processed on the server: The client will then send the same change request again and the server will directly answer with the response that the last time did not reach the client without actually processing the request.
        /*this.lastChange.request = request;
        this.lastChange.response = response; // not the response-data (ret.response), but the comnplete sent object
        */

        /**
         * Does the following:
         * - put the changes on the stack together with their ID
         * - save the stack to MongoDB
         * - send all clients (except the sender with the given tabId) the changes
         * - notify the side channel about the change (to be broadcasted to other servers)
         * - if there is a change that was not yet processed because another change was running: start this function
         */

        // write entry on the changes stack
        // make sure the max length is not exceeded
        if (this.maxStackLength>=0){
            if (this.stack.length==this.maxStackLength){
                // delete the oldest (=first) elements
                this.stack.shift()
                this.stackIDs.shift()
            }
        }
        
        if (this.maxStackLength != 0){
            this.stack.push({doObj: doObj, undoObj: undoObj}) // Info: the id is within the doObj
            this.stackIDs.push(this.ID);
        }
        
        // store new stack to Mongo:
        this.storeStackAndID();

        // send the change to all other (<>tabId) connected clients
        this._broadcastChange(doObj, tabId);

        if (this.reportToSideChannel){
            // notify the sideChannel
            let changeData = {
                // TODO: for the sideChannel, the roomName must contain the meetingShortname ON THE SECONDARY SERVER. How, can we handle this? It cannot be done on the secondary server, since it is too late when the data arrives there; it would automatically be processed by noteHandler and it would not be possible to distinguish for the noteHandler whether the meetignShortname has to be translated or not. Therefore, we probably have to implement the clients meetingShortname in the "enter" function and add it accordingly during the broadcast process!
                roomName: this.name,
                funcName: doObj.funcName,
                data: doObj.data,
                ID: doObj.ID,
                // TODO: add somehow the changes made in other rooms!
            }
            // the event is always (when not rBackup and rSideChannel) raised; however, only main servers listen to it!
            this.eH.raise(`${this.meetingShortname}:changeForSideChannel`, changeData);
        }


        // raise event reporting the change to listeners
        this.eH.raise(`${this.name}:change`, doObj);

        return this.ID;
    }

    /**
     * The "send part" of sending a change-broadcast to all (except tabId) clients. _broadcastChange Wraps the usual doObj in the correct format for sending and broadcasts it to all the clients except the tabIdExclude. This function is called e.g. from startWriteFunction and processChange 
     * @param {*} doObj 
     * @param {*} tabIdExclude 
     */
    _broadcastChange(doObj, tabIdExclude){

        // broadcast for room clients (not in a dataset)
        let data={
            // the roomName is added in broadcast
            arg: 'function',
            opt: doObj
        }
        this.broadcast(data, tabIdExclude, true); // not for clients listening to datasets!

        // loop over all roomDatasets and call their broadcast-function
        for (let datasetName in this.datasets){
            this.datasets[datasetName]._broadcastChange(doObj, tabIdExclude)
        }

    }


    /**
     * broadcast Send some data to every connected client
     * @param {object} obj The object with the changes to do; must be have the following properties (see also 'pushChange' for schema): funcName, data, ID (the new UUID)
     * @param {wsConnectionUUID} tabIdExclude Exclude this wsConnection-UUID form the broadcast (e.g. because the request came fomr this UUID)
     * @param {boolean} roomDatasetOnly Set to true, if the broadcast should only go to clients of the room-data itself and not of a roomDataset (e.g. during broadcasts of changes, which are handled separately in the roomDatasets)
     */
    broadcast(obj, tabIdExclude, roomDatasetOnly=false){

        // broadcast to clients of the room itself (and not just of a roomView)
        // currently the potential to send one data-package per client, eventually with the data of several views, is left unused 

        // extend the object with the roomName
        obj.roomName = this.name;

        // loop over all clients and send them the data (except the sender)
        for (let tabId in this.clients){
            if ( !roomDatasetOnly || this.clients[tabId].datasetName==''){
                //DISCONTINUED for (let tabId of this.roomClients){
                if (tabId!=tabIdExclude){
                    // wrap the object to be sent to the room-handler
                    let sendObj = {
                        name:'room',
                        data:obj
                    }
                    
                    this.clients[tabId].processor.sendNote(sendObj);
                }
            }

        }
    }

    /**
     * FUTURE: if the rights for certain function shall be further specified, it could be implemented in a generic way instead of in the fucntion itself. Then, this function here could be used for it. (So far this was not of any need.)
     * add a function that is then callable for messages from the server (either the result of a request or the broadcast following a request by another client)
     * TODO: all the rights stuff is NOT yet implemented
     * @param {string} name The name of the function. 
     * @param {function} func The actual function. The "this" object will be bound to that function. 
     * @param {*} rightsAllow Either -1 (default; =allow all) or an array with all the group/user IDs that are allowed. Any user/group that matches one of the given IDs will be allowed.  
     * @param {*} rightsDenyOverrule Every user that is in a group listed here, will not be allowed to access this function, independent whether it would match an allowed group id. (Thus it overrides it.)
     * 
     */
    _addFunction(name, func){
        // TODO: all to be done

    }

    /**
     * This function is called when a note to the room is incoming.
     * @param {string} tabId The tabId of the requestign client
     * @param {wsProcessor} wsProcessor The wsProcessor-instance of the requesting client (e.g. needed for multiple answers)
     * @param {string} arg The argument/function to be processed (what shall be done)
     * @param {any} opt The data to be processed
     * @param {object} session The sesison object as returned by express-session
     */
    wsNoteIncoming(tabId, wsProcessor, arg, opt, session){

        if (this.closing){
            return;
        }

        // call the respective function on this room
        if (arg=='leave'){

            // I dont know what options could apply here...
            this.leaveNote(tabId)

        }else if(arg=='changeClientName'){
            this.changeClientName(tabId, opt);

        } else if(arg=='returnWritingTicket'){
            this.returnWritingTicket(tabId);

        } else{
            this.logger.log(75,`This argument ${arg} is not a valid argument.`);
        }
    }

    // new 2022-02: async, since getPersonalizedData is async...
    /**
     * This function is called when a request to the room is incoming.
     * @param {string} tabId The tabId of the requestign client
     * @param {wsProcessor} wsProcessor The wsProcessor-instance of the requesting client (e.g. needed for multiple answers)
     * @param {function} responseFunc The function to be called for the response
     * @param {string} arg The argument/function to be processed (what shall be done)
     * @param {any} opt The data to be processed
     * @param {object} session The session object as returned by express-session
     */
    async wsRequestIncoming(tabId, wsProcessor, responseFunc, arg, opt, session){
        // call the respective function on this room

        if (this.closing){
            // TODO: find a free error code for closing.
            responseFunc('The server room is closing.', 12)
        }

        if (arg=='enter'){

            // the options might store: writing=true, ID=123uuid 
            this.enter(tabId, wsProcessor, responseFunc, opt, session)
            
        }else if (arg=='leave'){

            // actually not used so far as leave is sent through a note

            // I dont know what options could apply here...
            this.leaveRequest(tabId, responseFunc, opt)

        }else if (arg=='function'){

            // opt must store everything like 'what function to call', 'the parameters of this function'
            this.func(tabId, responseFunc, opt)

        }else if (arg=='fullData'){

            let client;
            // make sure the client is part of the room!
            if (!this.isClient(tabId)){
                let o = {message:'The client is not in the room!' , code: 99};
                throw o;
            } else {
                client = this.clients[tabId];
            }

            // send the complete data-object (either of the room or the correct dataset!) to the client
            let ret = {};
            ret.ID = this.ID;

            // find out what dataset to send
            let n = this.clients[tabId].datasetName;
            if (n===''){
                ret.data = await this.getPersonalizedData(client);
            } else {
                // personalized data does not exist (yet) for datasets
                ret.data = this.datasets[n].data;
            }

            responseFunc(ret,0);
        }else if(arg=='changeClientName'){
            // this could actually be done via acked note instead of request/reponse
            this.changeClientName(tabId, opt);
            responseFunc(true,0);

        } else if (arg=='revokeWritingTicket') {
            this.revokeWritingTicket(tabId, responseFunc, opt)
            
        } else if(arg == 'requestWritingTicket'){
            // the method has no options so far
            this.requestWritingTicket(tabId, responseFunc);

        } else{
            responseFunc(`This argument ${arg} is not a valid argument. `, 3);
        }
    }

    /**
     * Any room may provide a getPersonalizedData function meant to provide a client specific data-object on enter and on fullReload.
     * 
     * @param {object} client The client-object of the requesting client;  
     * @returns object
     */
    async getPersonalizedData(client){
        return this.data;
    }

    /**
     * delete all currently stored offline clients. 
     * This is requried e.g. when backup data is imported, from another server, where unfortunately (?) the offlineClients are also stored in the data. 
     */
    async resetWritingTickets(){
        this.writingTickets = [];
        await this.storeWritingTickets();

        await this.resetOnlineClients();

        // do the same for subrooms!
    }

    /**
     * delete all currently stored offline clients. 
     * This is requried e.g. when backup data is imported, from another server, where unfortunately (?) the offlineClients are also stored in the data. 
     */
    async resetOfflineClients(){
        this.offlineWritingClients = {};
        await this.storeOfflineWritingClients();
        
        // do the same for subrooms!
    }

    /**
     * delete all currently stored offline clients. 
     * This is requried e.g. when backup data is imported, from another server, where unfortunately (?) the offlineClients are also stored in the data. 
     */
    async resetOnlineClients(){
        this.onlineWritingClients = {};
        await this.storeOnlineWritingClients();
        
        // do the same for subrooms!
    }

    /**
     * Store the current stack and ID to MongoDB; should be called after every change.
     */
    async storeStackAndID(){
        await this.storeID();
        await this.storeStack();
    }
    async storeID(){
        try {
            await this.collection.updateOne({type:'ID'}, {$set:{ID: this.ID}})
        } catch (e){
            this.logger.log(3, `Error in MongoDB during storeID in ${this.name}: ${JSON.stringify(e)}`)
            throw e;
        }   
    }
    async storeStack(){
        try {
            await this.collection.updateOne({type:'stack'}, {$set:{stack: this.stack}})
        } catch (e){
            this.logger.log(3, `Error in MongoDB during storeStack in ${this.name}: ${JSON.stringify(e)}`)
            throw e;
        }
        
    }
    async storeWritingTickets(){
        try {
            await this.collection.updateOne({type:'writingTickets'}, {$set:{writingTickets: this.writingTickets}})
        } catch (e){
            this.logger.log(3, `Error in MongoDB during storeWritingTickets in ${this.name}: ${JSON.stringify(e)}`)
            throw e;
        }
    }
    async storeOfflineWritingClients(){
        try {
            await this.collection.updateOne({type:'offlineWritingClients'}, {$set:{offlineWritingClients: this.offlineWritingClients}})
        } catch (e){
            this.logger.log(3, e)
            throw e;
        }
    }
    async storeOnlineWritingClients(){
        try {
            await this.collection.updateOne({type:'onlineWritingClients'}, {$set:{onlineWritingClients: this.onlineWritingClients}})
        } catch (e){
            this.logger.log(3, e)
            throw e;
        }
    }

    /**
     * To be called when the processing of a request is finished. Will call the next element on the functionsWorkStack, if there is something.
     */
    finishedFunc(){
        if (this.functionsWorkStack.length>0){
            // get first element and remove it from stack
            let obj = this.functionsWorkStack.shift();

            // do start the function
            if (obj.type=="ws"){
                this._startWriteFunction(obj.tabId, obj.respFunc, obj.request, obj.ID); 
            } else if (obj.type=="server") {
                this._startWriteFunctionServer(obj.funcName, obj.data, obj.resolve, obj.reject, obj.id, obj.oldId, obj.tabIdExclude); 
            } else if (obj.type=="close") {
                // if the room shall be closed but there are still functions on the work stack, then we need to wait until the work stack was worked finished until we really close the room.
                obj.close();
            }
        }else{
            this.busy = false;
        }
    }

    /**
     * Call a server function that is readOnly. To be used by other server functions/other rooms to get data from this room.
     * @param {string} funcName The name of the function
     * @param {any} data The data
     * @returns Promise of the respective function. If the function does not exist, the function fails/raises an error.
     */
    async serverFuncReadOnly(funcName, data){
        return this.functionsReadOnly[funcName](data)
    }

    /**
     * returns a promise which is resolved when the room is ready or instantly returns true
     */
    _roomReady(){
        if (this.ready){
            return Promise.resolve(true);
        } else {
            return new Promise((resolve)=>{
                // add a function to _onReadyFunctions to make sure the Promise is resolved then.
                this._onReadyFunctions.push(()=>{resolve(true)});
            })
        }
    }

    /**
     * Call a serverFunction that writes data. To be used by other server functions/other rooms to get data from this room.
     * @param {string} funcName The name of the function
     * @param {any} data The data used for processing the request
     * @param {string} id !!! to be used only by rSideChannel !!!
     * @param {string} oldId !!! to be used only by rSideChannel !!! (the old ID to be used for the ID check; NOTE: normally, no ID check is done for serverWriteFunctions, but for teh sideChannel it must be done, since doing the check inside the sideChannel does not work, since it must be done after any previous changes are applied.)
     * @param {string} tabIdExclude The tab ID of the client which shall be excluded from the broadcast. !!! to be used only by rSideChannel !!!
     * @returns Promise / The response of the function
     */
    async serverFuncWrite(funcName, data, id=undefined, oldId=undefined, tabIdExclude=undefined){

        return new Promise(async (resolve, reject)=>{

            // first, make sure that this room is ready; this is not necessarily the case, when changes come in via sideChannel for a dynamic room, which was just created.
            await this._roomReady();

            if (this.busy){

                // if there is already the special close-function on the work stack, make sure that this server request is still handled before the close event
                let insertPos = this.functionsWorkStack.length;
                for (let i=0; i<this.functionsWorkStack.length; i++){
                    if (this.functionsWorkStack.type == "close"){
                        insertPos = i;
                    }
                }

                this.functionsWorkStack.splice(insertPos,0,{funcName, data, resolve, reject, type:"server", id, oldId, tabIdExclude}) // "server"-type request
                this.logger.log(67, `${this.name}: Need to put a change on the stack since multiple changes were requested at the same time. Change requested by server.`);
            } else {
                // do start the function
                this._startWriteFunctionServer(funcName, data, resolve, reject, id, oldId, tabIdExclude); 
            }
        })

    }


    /**
     * uuidv4: Creates a unique ID according to RFC 4122, version 4. Credits go to: https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript#2117523
     * This id shall be used for stamps.
     */
    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Check if this tabId is a client of this room. Otherwise any client could send/request messages
     * @param {string} tabId The tabId to check
     */
    isClient(tabId){
        if (this.clients[tabId]){
            return true;
        }else {
            this.logger.log(7, "tabId '" + tabId + "' is not a client of the room '"+this.name+"'.");
            return false;
        }
    }

    /**
	 * create a random string 
	 * @param {integer} length 
	 */
	randString(length) {
		var result           = '';
		var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var charactersLength = characters.length;
		for ( var i = 0; i < length; i++ ) {
		   result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
    }

    /**
     * Add a schema for a subset of the data, which can be ordered by the clients. (Currently, all subschemas are treated separately and clients can only register for one subschema. Eventuelly later automatically create combinations of subschemas and treat them the same.)
     * @param {string} schemaName The name of the subdata to be derived with this schema
     * @param {object} schema The jsonschema for the subdata. See propertySelection for more details.
     * @param {function} rightsCheck A function to check the rights of a client to register to this schema.
     */
    addSubSchema(schemaName, schema, rightsCheck = ()=>{}){
        // TODO
        // should the different subschemas be implemented in a separate class as the views were/are, e.g. because we also have ato add code for the rights-checking?
        // should the subdata be created always or only when a client is connected with this requirement? (The views-approach would allow this.)
        // additionally: we do not only need to create a subset of data, but also we have to filter the data
    }


    /**
     * DISCONTINUED: Start a dynamic roomView. The function shall be implemented by the inheriting classes. It must return the roomView object if the roomView could be started and false if not. This function here always returns false; thus inheriting classes do not need to implement this function when there are no roomViews.
     * @param {string} roomViewName The name of the requested roomView
     */
    /*startDynamicRoomView(roomViewName){
        // this function can be implemented by inheriting roomXYZ classes, if they provide roomViews.
        return false;
    }*/

    /**
     * Try to start a dynamic room dataset. This function shall be overriden by the inheriting class if needed. 
     * @param {string} datasetName The name of the dataset
     * @returns {boolean} returns the dataset on success, and false if it could not be created.
     */
    startDynamicRoomDataset(datasetName){
        return false;
    }

    /**
     * Try to start a dynamic subroom. This function shall be overriden by the inheriting class if needed. 
     * @param {string} subroomName The name of the subroom
     * @returns {boolean} returns the room on success, and false if it could not be created.
     */
    startDynamicSubroom(subroomName){
        // IMPORTANT: the dynamic room creation MUST provide the reference to parentRoom=this to the constructor of the subroom! 

        return false;
    }

    /**
     * Called as soon this.collection is set, i.e. when the collection of this room is ready.
     */
    onMongoConnected(){

    }

    /**
     * Called as soon as the room gets ready
     */
    onRoomReady(){

    }

    /**
     * Called as soon as the room gets ready; does everything needed for the roomServer itself and then calls onRoomReady, which is meant for the inheriting class 
     */
    _onRoomReady(){
        // the writing tickets cannot be revoked before the room is ready; thus, if the mode was already set to secondary, we now have to revoke the writing tickets
        if (this.secondaryMode){
            this._revokeAllWritingTickets();
        }

        // recreate all room-datasets, since now we have all data
        this.recreateRoomDatasets() 

        // also invoke the same funciton on inheriting classes, if needed:
        this.onRoomReady();

        // there might be some functions waiting to be executed as soon as te room is ready.
        for (let f of this._onReadyFunctions){
            f();
        }
        this._onReadyFunctions = [];
    }

    /**
     * Called after a client successfully entered the room; can be implemented in an inheriting class
     * @param {string} tabId 
     * @param {string} datasetName 
     * @param {any} enterOptions e.g. a token
     * @param {object} session
     */
    async clientEntered(tabId, datasetName, enterOptions, session){

    }

    /**
     * Called after a client has left the room; can be implemented in an inheriting class
     * @param {string} tabId 
     * @param {string} datasetName 
     * @param {any} enterOptions e.g. a token
     * @param {object} session 
     */
    async clientLeft(tabId, datasetName, enterOptions, session){

    }

    /**
     * A function called when the room is closed, e.g. when the meeting is deactivated. Remove all clients and do the room specific cleanup (close) implemented by the inheriting room.
     */
    async closeRoom(){

        // make sure no further requests are handled
        this.closing = true;

        return new Promise((resolve, reject)=>{
            
            let close = async ()=>{
                // send close to all clients
                // broadcast for room clients (not in a dataset)
                let data={
                    // the roomName is added in broadcast
                    arg: 'close',
                    opt: null
                }
                this.broadcast(data);
    
                await this.close();
                resolve();
            }
    
            // make sure that we do not close a room before not all ganging requests were handled 
            if (this.functionsWorkStack.length==0){
                close();
            } else {
                this.functionsWorkStack.push({close, type:"close"})
            }
        })


    }

    /**
     * A function called when the room is closed, e.g. when the meeting is deactivated. Shall be implemented by the inheriting room if needed.
     */
    async close(){

    }

    /**
     * Recreate all room datasets
     */
    recreateRoomDatasets(){
        
        for (let datasetName in this.datasets){
            this.datasets[datasetName].recreateDataset()
        }
    }

    /**
     * Function called to change the mode of the room. This function is called in rBackup, when the mode of the server changes. Probably no other rooms should call this function.
     * @param {boolean} secondaryNow set to true if the room shall be in secondary mode now
     */
    _changeMode(secondaryNow){
        if (secondaryNow != this.secondaryMode){
            this.secondaryMode = secondaryNow;
            if (secondaryNow){
                // revoke/reset all writing tickets
                this._revokeAllWritingTickets()
                // the function does not do anything, when the server is not ready yet. However, it will be automatically called when this room is in secondary mode and ready turn to true 

            } else {
                // allow writing tickets again
                this.maxWritingTickets = this.maxWritingTicketsDefault;

                // notify the clients that they can get a writing ticket again. This is achieved by sending an infoUpdate. The clients will then automatically ask for a wrinting ticket if needed. 
                this.broadcastInfos(true);

            }

            // start the same on all subrooms
            for (let subroomName in this.subrooms){
                this.subrooms[subroomName]._changeMode(secondaryNow);
            }
        }
    }

    /**
     * revoke all writing tickets, e.g. when the room changes to secondary mode
     * IMPORTANT: this function only works after the room is ready  
     */
    _revokeAllWritingTickets(){
        if (this.ready){
            // revoke/reset all writing tickets
            this.maxWritingTickets = 0;

            // revert connected clients to non-writing
            // send each writing client a note with the arg ==  writingTicketRevoked
            const sendObj = {name: 'room', data: {arg: 'writingTicketRevoked', roomName:this.name, opt: null}}
            for (const clientName in this.clients){
                const client = this.clients[clientName];
                if (client.writing){
                    client.processor.sendNote(sendObj);

                    client.writing = false;
                    client.writingTicketID = undefined;
                }
            }

            // reset all offline clients
            this.resetOfflineClients();
            // reset the tickets
            this.resetWritingTickets();

            // this finally makes
            this.broadcastInfos(true);
        }
    }

    /**
     * DISCONTINUED recreate the datasets of all views
     * @param {boolean} broadcastChanges True if a broadcast should be sent to all view-clients given there was a change 
     * @param {string} tabIdExclude The tabId of the client not needing the broadcast
     */
    /*viewsRecreateDataset(broadcastChanges, tabIdExclude=''){
        for (let view in this.roomViews){
            this.roomViews[view].recreateDataset(broadcastChanges, tabIdExclude);
        }
    }*/

    /**
     * Create the list of clients specifically for the client with the given tabId. Does NOT include itself and does not show any tabId, only the hashes
     * @param {string} tabId 
     */
    /*createSpecificClientInfos(tabIdExclude){
        let  specClientInfo = {};
        
        for (let tabId in this.clientInfos){
            if (!tabId==tabIdExclude){
                specClientInfo[this.createHash(tabId)] = this.clientInfos[tabId];
            }
        }

        return specClientInfo;
    }*/
    
    /**
     * Create the hashed salted string for a certain id (e.g. sid or tabId); used as unique identifier for clients without showing the id to others (security!)
     * @param {string} id 
     */
    createHash(id){
        return crypto.createHash('sha256').update(this.clientHashString + id).digest('hex');
    }

    /**
     * recursive function to translate booleans. If the object to be checked is large and only very few subobjects have to be checked, call the function directly on them and not on the full object, since all of it would have to be touched, which was unnecessary! 
     * @param {object} data any object or boolean value to be translated
     */
    translateBooleans(data){
        let t = typeof(data)
        if (t=='boolean'){
            return 1*data;

        } else if (t=='object'){
            // loop over the object and call this function recursively
            for (let key in data){
                data[key] = this.translateBooleans(data[key])
            }
            return data;

        }else{
            return data;
        }
    }

    /**
     * returns the index and the object itself of the first object where the property prop is equal to value 
     * @param {array of objects} arr 
     * @param {string} prop 
     * @param {*} val 
     * @return {array} [index, the object]
     */
    findObjInArrayByProp(arr, prop, val){
        for (let i=0; i<arr.length;i++){
            if (arr[i][prop] == val){
                return [i, arr[i]];
            }
        }
        return [-1, {}];
    }

    /**
     * Transfer the values of the properties in objFrom to the properties in objTo. Recursive. 
     * If updateOnly=false (default), then properties that do exist only in objTo will be deleted. 
     * @param {object or array} objFrom 
     * @param {object or array} objTo 
     * @param {boolean} updateOnly If true, properties in objTo are not deleted when they do not exist in objFrom. Default: false 
     */
    propertyTransfer(objFrom, objTo, updateOnly=false){

        if (Array.isArray(objFrom)){

            if (!Array.isArray(objTo)){
                console.log('objTo was not of type array, but objFrom was. The property transfer would fail and thus is aborted.')
                return
            }

            // use pop and push to alter the length of the array. Note that we do not detect moved elements. We rather delete or add elements at the end and just transfer the values at each position. (Push is actually not needed, since assigning to elements outside the range is possible.)
            while (objTo.length>objFrom.length){
                objTo.pop();
            }
            /*
            let l = objTo.length; 
            for (let i=0;i<l-objFrom.length;i++){
                // delete the last elements
                objTo.pop();
            }*/

            // copy the elements
            for (let i=0;i<objFrom.length;i++){
                // pay attention to objects and arrays --> recursive calls needed
                if (typeof(objFrom[i])=='object' && objFrom[i] !== null){
                    if (typeof(objTo[i])!='object' || objTo[i] === null){ // null is an object, but we need to set ot to the correct type (array or object) for the next step
                        // if this is not done here and if objTo[i] is just a property, the recursive call on propertyTransfer will not occur byReference, as it must be to work.
                        if (Array.isArray(objFrom[i])){
                            objTo[i] = [];
                        } else {
                            objTo[i] = {};
                        }
                    } else {
                        // is it of the same type? otherwise reset the element in objTo
                        if (Array.isArray(objTo[i]) && !Array.isArray(objFrom[i])){
                            objTo[i] = {};
                        } else if (!Array.isArray(objTo[i]) && Array.isArray(objFrom[i])){
                            objTo[i] = [];
                        }
                    }
                    this.propertyTransfer(objFrom[i], objTo[i], updateOnly);
                } else {
                    objTo[i] = objFrom[i];
                }
            }
            
        } else {

            if (Array.isArray(objTo)){
                console.log('objTo was of type array, but should be a normal object as objFrom. The property transfer would fail and thus is aborted.')
                return
            }

            // is a regular object
            // copy new to objTo
            for (let prop in objFrom){
                // TODO: how to handle when objTo is null? Currently fails at 2842
                if (typeof(objFrom[prop])=='object' && objFrom[prop] !== null){ // null interestingly is an object...

                    if (objTo[prop] === null || !(prop in objTo)){
                        if (Array.isArray(objFrom[prop])){
                            objTo[prop] = [];
                        } else {
                            objTo[prop] = {};
                        }
                    } else {
                        // is it of the same type? otherwise reset the property in objTo
                        if ((typeof(objTo[prop])!='object' || Array.isArray(objTo[prop])) && !Array.isArray(objFrom[prop])){
                            objTo[prop] = {};
                        } else if ((typeof(objTo[prop])!='object' || !Array.isArray(objTo[prop])) && Array.isArray(objFrom[prop])){
                            objTo[prop] = [];
                        }
                    }
                    // transfer the property
                    this.propertyTransfer(objFrom[prop], objTo[prop], updateOnly);
                } else {
                    // just copy from/to
                    // the problem is that if properties are added in the property transfer, using the simple assignement does not raise any observer set by Vue. Thus vue will not be updated! 
                    objTo[prop] = objFrom[prop];

                    // TEST: if the property is not available in objTo, do not assign it to a property, but use a method that is observed
                    //objTo = Object.assign(objTo, {[prop]:objFrom[prop]}) // does not work

                }
            }
            // delete all properties in objTo, which are not present in objFrom
            if (!updateOnly){
                for (let prop in objTo){
                    if (!(prop in objFrom)){
                        delete objTo[prop];
                    }
                }
            }
        }


    }

}

//module.exports = roomServer;
export default roomServer