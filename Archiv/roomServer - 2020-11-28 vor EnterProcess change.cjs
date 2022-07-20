// here we implement the base class for the rooms on the server.

/**
 * Newest thoughts on rooms (2019-12-07):
- rooms are organized around tables and based on 'what tables are used together'?
- every room can (must?) have views: 
	- a view does not have logic to access the DB, but presents to its clients the data or a subset of it. 
	- a client subscribes/listens to a room or one of its views. The room must provide the connection for the view.  
	- the accessing rights are checked for/within the view. Usually no checks needed on room level and on functions level (However, e.g. changePassword-function must check e.g. that users only change their own password)
- Subrooms could be rooms e.g. for each entry of a table the parent room is representing (e.g. one competition).
	- Subrooms are actually regular, full (vollwertig), independent rooms. 
	- However, a 'parent' room could (should, must?) start the subrooms. Subrooms could also be started dynamically. 
	- As should be possible with all rooms, they can have interdependencies, i.e. one room listens to the other room and vice versa. 
- Writing access to the same tables or rows should not be available in multiple rooms, but only in one. Through the dependencies, the other room can take notice of it (eventually through the global event system; or use a local one.).
- one room usually only handles one main table and possibly also tables related to this table (1:n, i.e. an entity in the main table is referenced n times in the related table). The opposite (the inheriting table is the main table) does not work, since then the referenced super table would be referenced n-times!

 */

/**
 * IMPLEMENTING VIEWS
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
 */

/** basic important stuff:
 * - for writing, one change at a time! No concurrent changes. Have a waiting stack with changes.
 * - on incoming changes: try to process* the changes. Then send the changes to all members of the room with the new version number except the sender of the change. Acknowledge to the sender at least with the new version number.
 *   * Check all inputs first (something outdated and conflicting?), use transactions in MySQL for complex queries. Try to process the query/transaction. On success, proceed; otherwise start rollback (if needed).
 * - the roomServer (parent of specific implementations) has the task to do all the websocket-stuff and to coordinate the available function-calls of this specific room. The specific room implementation does (normally?) not need to do anything to the websocket stuff
 * - ATTENTION: a lot of the stuff done here, especially those relying on UUIDs for the clients, are prone to session-hijacking if the connection between server and client is not encrypted!!!
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
 *     - always check out writing tickets, simply put the max number (maxWritingTicktes=-1 e.g. inf) to very high when not limited (solving case 2)
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
- add the possibility to change between writing and non-writing without having to reconnect to the room. 
- 
*/ 


// error code <=10 are for errors in the transmission and handling
// error-codes >20 are for specific errors returned in the functions defined in the inheriting classes
/**
 * 11: general Server errors (which have nothing to do with wrong data from the client), e.g. the function returns an object with the wrogn format
 * 12: the requested function is not available in this room
 * 13: the client is outdated and thus the request cannot be processed (only when conflictChecking=false)
 * 14: conflict checking impossible: conflictCheckingFunction not available or erronous
 * 15: conflict checking negative result: checking successfully done, but change seems to be conflicting and thus is rejected. 
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
 */

//const Ajv 			= 	require('ajv'); // check JOSN input with schema

// the info returned to any clientnRoom contains the following information: 
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

each client is an object with sidHash={connected, name, writing, sidHash }
*/

/**
 * 
 */
class roomServer{

    /** Constructor for the general Server-room implementation. This super-constructor MUST be called before the rest of the child-constructor.
     * @method constructor
     * @param {eventHandler} eventHandler The eventhandler instance
     * @param {mongoDb} mongoDb The mongoDb instance to be used. The collection-name is the name of the room.
     * @param {logger} logger A/The logger instance
     * @param {string} name The name of the room. Used e.g. in the mongoDb.
     * @param {boolean} storeReadingClientInfos Should the server also save infos (name, writingRights, connection) about clients that only do read?
     * @param {integer} maxWritingTicktes The maximum number of connections that are allowed to be in writing mode at the same time (i.e. that are given a writing ticket). -1=unlimited
     * @param {boolean} conflictChecking If true, the inheriting class's functions do provide conflict checking, e.g. even when a client was outdated on sending the changes, they can get processed if the change is not conflicting with another change made in the meantime. If false, every change request by an outdated client will be rejected.
     * //@param {socketProcessor2} wsProcessor UNUSED The websocket processor instance; needed obviously for the  
     * //@param {roomManager} roomManager UNUSED The room manager instance. Needed for showing the status information to the user.
     */
    constructor(eventHandler, mongoDb, logger, name, storeReadingClientInfos=false, maxWritingTicktes=-1, conflictChecking=false){

        // make sure the name does not contain /, which is needed for structuring event names.
        if (name.search('/')>=0){
            this.logger.log(1, 'Room names must not contain "/" in their name! The following name was tried: '+ name);
            throw new Error('cannot have a room with a / in the name!')
        }

        // set references
        this.eH = eventHandler;
        this.mongoDB = mongoDb;
        this.collection; // will be filled my MongoDBinit
        this.logger = logger;
        this.name = name;
        //this.rM = roomManager; // eventually needed
        //this.wsProcessor = wsProcessor;  // why have I put this here?

        // should the server store clientInfos for reading clients?
        // TODO: set this to false when the server is a live-online server and the clients would be numerous!
        this.storeReadingClientInfos = storeReadingClientInfos;
        // create a random part for the clientSid hashing.
        this.clientHashString = this.randString(20);

        this.ID; // will be set when Mongo is initialized

        this.clientsRequestingInfos = []; // a list of sid's of the clients that want to get updates about the connected clients
        // important: it must be prevented that many live clients are requesting this list, as it woudl cause a lot of unnecessary server traffic.
        // TODO: eventually simplyfy all that shit. It is way too complicated for what it is needed. No automatical updates about clients, only a list on request. 


        // create an empty object for storing the connected clients.
        // each has the following properties:
        // processor: wsProcessor, writing, writingTicketID, name:clientName, storeInfos, views:['', 'roomViewXY', 'roomViewAB', ...]};
        this.clients = {}; // all clients connected to the room, independent whether to a roomView or multiple and/or the room itself
        this.roomClients = []; // list of clients listening to the room data
        this.offlineWritingClients = {}; // without the processor, as the client is disconnected; hashed index!
        // both objects are source to create the client Infos object.
        //this.sidHashed = {}; // property=sidhashed, value=sid

        // initialize everything for the writing tickets and conflict checking:
        this.maxWritingTicktes = maxWritingTicktes;
        this.writingTickets = []; // the property is the writingTicketID of the client. The value is an object storing additional information about the client to make it indetifyable (needed if we wanted to kick one specific client from the list, because it did not appropriately leave the room); the writing tickets are stored to Mongo and are restored on restart (for the case the server crashes, which is exactly the reason why we are doing the fun of conflict checking)
        // TODO: backup servers probably also must have a (the same?) writing-ticket list!
        this.conflictChecking = conflictChecking;

        // create the info object
        this.infos = {numClients: 0, numClientsWriting:0, maxWritingTickets:maxWritingTicktes, clients:{}};
        // if there is toJSON method in an object, the JSON.stringify converter will use it, otherwise it will do it on its won, but then 'forgets' the getter-properties
        /*this.infos = {maxWritingTickets:maxWritingTicktes, clients:{}};
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

        // TODO: obiges geht so NICHT, weil wir die clients ja jeweils ersetzen wollen und es so sonst dann doch immer alle clients mitliefert!
        
        // herein the complete dataset MUST be stored (by the inheriting class)
        this.data = {};

        // all the functions are stored in one of the following objects
        // the functions must be async. They get just one argument: The data to be processed. On success/failure they must return an object with the schemas defined below 'response', doObj','undoObj' and 'isAchange' as properties and their values, on failure an object with properties 'message' and 'code', storing the error message and the error code
        this.functionsReadOnly = {};
        this.functionsWrite = {};

        // if there shall be conflict checking, the conflict-checking functions (not the functions themselves) must be stored in the following object and have the same name as the function itself. 
        this.functionsConflictChecking = {};

        // automatic json-schema proofing:
        this.ajv = ajv; // options can be passed, e.g. {allErrors: true}

        // max stack length
        this.maxStackLength = 20; // TODO: set this limit reasonably for the Server used. Maybe no limit is needed at all

        // always store last processed change(!)-request (after applying successfully the changes in the DB etc, but without requiring that the new sid and other responses could be sent). This is to cover the case that the connection is lost during the processing. Then if the next change request (e.g. after reconnection) is the same as the last one, we simply return the response and do not process the request once again. If there were other changes (from other clients) since this interuption of the connection, then the client has to reload everything anyway and we answer with an error (because the ID has changed then)
        this.lastChange = {};
        this.lastChange.request = {};
        this.lastChange.response = {}; 

        // asynchronously initialize the stack by connecting to MongoDB
        this.ready = false;
        this.initMongoStack().then(()=>{this.ready = true;}).catch((err)=>{throw err});

        // we need to make sure that only one change is processed at a time; introduce a workStack for the fucntion processing
        this.functionsWorkStack = [];
        this.busy = false; // is there currently a function running; then we have to put new functionCalls on the stack.

        // store this room's roomViews: 
        this.roomViews = [];


        // schema definitions: 
        let schemaDoObj = {
            type:'object',
            description: 'object storing the change to be processed on the clients (actually often (always?) the same as the request). Must contain the funcitonName to be called and the parameters',
            properties: {
                //ID: {type: "string"},  // not yet inside, as the ID is generated here!
                funcName: {type: "string"}, 
                data: {} //type: "object"} // can be anything!
            },
            required: ["funcName", "data"]
            
        }

        let schemaUndoObj = {
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

        let schemaSucc = {
            type: 'object',
            properties: {
                response: {
                    type: ['boolean', 'string', 'object', 'null', 'number', 'array'], // 'any' does not exist --> need an array with all possibilitis
                    description: 'what to return to the requesting client'
                },
                doObj: schemaDoObj,
                undoObj: schemaUndoObj,
                isAchange: {
                    type: 'boolean', 
                    description: 'true if a change has been processed. If true, the changes defined in doObj/undoObj will be sent to all the other clients and stored on the stack together with a new sid, otherwise only the response will be returned to the requesting client.'
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
        let schemaFail = {
            type: 'object',
            properties: {
                message:{type: 'string'},
                code: {type: 'number'}
            },
            required: ["message", "code"]
        }

        // prepare ajv validations
        this.validateDoObj = this.ajv.compile(schemaDoObj);
        this.validateUndoObj = this.ajv.compile(schemaUndoObj);
        this.validateSuccess = this.ajv.compile(schemaSucc);
        this.validateFail = this.ajv.compile(schemaFail);

    }

    async initMongoStack(){

        var initStackDocument = async ()=>{ // it seems like also arrow functions can by async (...wow, cool), then we dont need th bind at the end
            //await this.collection.insertOne({type:'stack', stack:[]})
            try {
                await this.collection.updateOne({type:'stack'},{$set:{stack:[]}},{upsert:true}) // upsert:true --> if none exists, create it!
            } catch (e){
                this.logger.log(3, e)
                throw e;
                
            }
            this.stack = [];
            this.stackIDs = [];
        }//.bind(this); // not needed with the arrow function

        try {
            // load Mongo stuff (e.g. stack)
            // get former changes and the version number from the MongoDB
            // the collection is given by the name (should automatically create the collection if it does not exist)
            this.collection = this.mongoDB.collection(this.name);

            let cursor = await this.collection.find({type:'stack'}) // returns a cursor to the data

            // there should be only one document:
            if (await cursor.count()>1){
                let errMsg = "Too many documents with type:'stack' for room named '" + this.name + "'.";
                this.logger.log(3, errMsg);
                throw new Error(errMsg);

            } else if(await cursor.count()==0) {
                // create new (empty) document of type stack
                await initStackDocument();

            } else {
                // everything normal:
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
            cursor = await this.collection.find({type:'ID'}) // returns a cursor to the data
            if (await cursor.count()>1){
                let errMsg = "Too many documents with type:'ID' for room named '" + this.name + "'.";
                this.logger.log(3, errMsg);
                throw new Error(errMsg);

            } else if(await cursor.count()==0) {
                // create new  document of type ID with the newly created ID:
                this.ID = this.uuidv4();
                await this.collection.insertOne({type:'ID', ID:this.ID})

            } else {
                // everything normal:
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
            cursor = await this.collection.find({type:'writingTickets'}) // returns a cursor to the data
            if (await cursor.count()>1){
                let errMsg = "Too many documents with type:'writingTickets' for room named '" + this.name + "'.";
                this.logger.log(3, errMsg);
                throw new Error(errMsg);

            } else if(await cursor.count()==0) {
                // create new document of type  with the newly created ID:
                this.writingTickets = [];
                await this.collection.insertOne({type:'writingTickets', writingTickets:[] })

            } else {
                // everything normal:
                let doc = await cursor.next();
                this.writingTickets = doc.writingTickets;
            }

            // get the list of disconnected writring clients
            cursor = await this.collection.find({type:'offlineWritingClients'}) // returns a cursor to the data
            if (await cursor.count()>1){
                let errMsg = "Too many documents with type:'offlineWritingClients' for room named '" + this.name + "'.";
                this.logger.log(3, errMsg);
                throw new Error(errMsg);

            } else if(await cursor.count()==0) {
                // create new document of type  with the newly created ID:
                this.offlineWritingClients = {};
                await this.collection.insertOne({type:'offlineWritingClients', offlineWritingClients:{} })

            } else {
                // everything normal:
                let doc = await cursor.next();
                this.offlineWritingClients = doc.offlineWritingClients;
            }

            // check if every writingTicketID is available in offlineWritingClients and vice versa; delete if not available in both
            // (this actually should not be necessary, but was at least helpful during developement and should probably stay here as it can solve problems with a restart)
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
            this.storeWritingTickets()


        } catch (e){
            this.logger.log(3, e)
            throw e;
        }

    }

    /**
     * @method enter A request by a client to get connected to this room
     * @param {string} sid The sid needed for identification of the client. It does NOT necessary need to be an sid stored as cookie on the client, e.g. for Server to Server communication.
     * @param {wsExtension} wsProcessor The Websocket connection (extended with my specific funcitons providing notes and requests) of the calling client. 
     * @param {function} respFunc The responseFunction from the request, i.e. has two two arguments: (data, errorCode=0)
     * @param {object} opt The options-object. properties according to the following schema: {"type":"object", "properties":{"writing":{"type": boolean, "description": "optional, whether or not this connection also intends to write in this room"}, writingTicketID:{"type":"string", "description":"optional, the former writing-ticket-ID"} , "ID":{"type": "string", "description":"optional, the UUID of the current data-status present on the client"}, "name": {"type":"string", "description": "optional, a name of the client used to identify it. Used on the server only if writing is true"}, "roomView":{"type":"string", description:"optional, if set, the client does not want to be registered to the room, but actually to a roomView."}}}
     * 
     */
    enter(sid, wsProcessor, respFunc, opt){

        //this.logger.log(99, 'Client '+sid+' wants to enter the room '+this.name);

        // create the hashed sid
        let sidHash = this.createSidHash(sid);

        // do not answer when server is not ready yet. The client will retry anyway.
        if (!this.ready){
            respFunc("Server is not yet ready. Please be patient", 17)
            return;
        }

        // check that the client is not connected yet (mostly needed during debugging, when a client might repeat its enter-request, during the server is at a breakpoint)
        if (sid in this.clients){
            respFunc("Client is already in room.", 18)
            return;
        }
        
        // TODO: check if this clients has the rights to access the room and for writing
        // error code 19

        let writing;
        if (opt.writing){
            writing = true;
        } else{
            writing = false;
        }

        // the clients name
        let name='';
        if (opt.name){
            name = opt.name;
        }
        let storeInfos = false;
        if (opt.storeInfos){
            storeInfos = opt.storeInfos;
        }

        let requestedRoomView='';
        if (opt.roomView){
            requestedRoomView = opt.roomView;
        }

        // check whether the roomView exists and/or can be started; otherwise, the 'enter' process must be stopped
        // however, do NOT enter the roomView yet
        if (requestedRoomView){
            if (!this.enterView(requestedRoomView, sid)){
                respFunc("The roomView does not exist or client has no rights to enter the roomView", 19)
                return;
            }
        }
        
        let writingTicketID = undefined;

        // if the client is found on the offlineWrtingClients list, then it still has a ticket reserved
        // delete from offlineWritingClients list, if it was on it
        if (sidHash in this.offlineWritingClients){
            if (!writing){
                // the client formerly had writing rights, but does not need them anymore --> delete the writing ticket
                this.returnWritingTicketByID(this.offlineWritingClients[sidHash].writingTicketID);
            }else {
                writingTicketID = this.offlineWritingClients[sidHash].writingTicketID;
            }
            delete this.offlineWritingClients[sidHash];
            this.storeOfflineWritingClients;

        } else {

            // check if the client can get a regular writing ticket, but first check that if the client provided a writingTicketID in the options, if this would be still valid --> then the client got a new sid, but has an old and valid writingTicketID (or wants to hack us) --> delete the offlineClient for that writingTicketID from the offlineWritingClientsList (should not happen too often...)
            if (writing){

                if (opt.writingTicketID && this.writingTickets.indexOf(opt.writingTicketID)>=0){
                    // if the sid has changed, but the writingTicked stayed the same, we have to remove it from the offlineWritingClientsList in a less efficient way:
                    for (let clientSidHashed in this.offlineWritingClients){
                        if (this.offlineWritingClients[clientSidHashed].writingTicketID==opt.writingTicketID){
                            delete this.offlineWritingClients[clientSidHashed];
                            this.storeOfflineWritingClients;
                        }
                    }

                    // the client can keep his writing ticket:
                    writingTicketID = opt.writingTicketID;
                } else {
                    // either the client did not yet have a writingTicket or has an invalid one --> try to gather a new writing ticket:
                    
                    // try to checkout a ticket
                    if (this.maxWritingTicktes!=-1 && this.writingTickets.length >= this.maxWritingTicktes){
                        // new 2020-01: there is no error when no writing ticket can be gathered. the client is connected anyway, but without writing ticket. The client shall leave the room when he does not want to be connected anymore. 
                        //respFunc("No (new) writing tickets available anymore. If the client already had a ticket, then it was invalid.", 18)
                        writing=false;
                        //return
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

        // listen to ws-disconnect events: (the listener is also used for disconnecting from the event!)
        let listener = ()=>{

            this.logger.log(99, 'Client '+sid+' got disconnected from room '+this.name + ' without properly leaving first.');

            // do not listen to the same event anymore, as the client is not connected anymore
            // NOTE: we do not have to listen for a reconnect, since the client will make the request to the room again if needed
            this.eH.eventUnsubscribe('wsClientDisconnect/'+sid, this.name + '/' + sid);

            // if the client requested Infos about all the other clients, also delete it from this list
            if (storeInfos){
                this.clientsRequestingInfos.splice(this.clientsRequestingInfos.indexOf(sid),1);
            }

            // leave all roomViews (including the room itself):
            this.clients[sid].views.forEach((el, ind)=>{
                if (el=''){
                    // the client listened to the room data
                    let i = this.roomClients.indexOf(sid);
                    if (i>=0){
                        this.roomClients.splice(i,1);
                    }
                }else {
                    this.roomViews[el].leave(sid);
                }
            })

            // if the client had writing rights: move the client from the clients list to the offlineWritingClients list and remove its processor, but do not delete the writingTicket from the list!
            let writing = this.clients[sid].writing;
            if (writing){
                let client = this.clients[sid];
                delete client.processor;
                this.offlineWritingClients[sidHash] = client;
                this.storeOfflineWritingClients();
            }

            // always delete the client from the clients list:
            delete this.clients[sid];
            //delete this.sidHashed[sidHash];

            // send the updated clientInfo to every listening client
            // update the clientInformation and sent them to the clients
            if (this.storeReadingClientInfos || writing){
                // also change client list
                this.broadcastInfos(true); 
            } else {
                // no need to change client list
                this.broadcastInfos(false); 
            }
        }
        this.eH.eventSubscribe('wsClientDisconnect/'+sid, listener, this.name + '/' + sid);

        // define the data-object to return
        let data = {};
        if (writingTicketID){ 
            data.writingTicketID = writingTicketID;
        }
        data.ID = this.ID;

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
                data.data = this.data; 
            }
            
        } else {
            data.type = 'full';
            data.data = this.data; 
        }

        // add to the room (if the client was already registered, it will not be duplicate)
        this.clients[sid] = {processor: wsProcessor, writing:writing, writingTicketID:writingTicketID, name:name, storeInfos:storeInfos, sidHash:sidHash, views:[]};
        //this.sidHashed[sidHash] = sid; // be able to retranslate the sid
        if (storeInfos) {
            this.clientsRequestingInfos.push(sid);
        }

        // update the clientInformation and sent them to the clients
        if (this.storeReadingClientInfos || writing){
            // also change client list
            this.broadcastInfos(true); 
        } else {
            // no need to change client list
            this.broadcastInfos(false); 
        }

        // even if the infos will be broadcast shortöy, we have to send it here for one case: non-writing client that wants the infos; because the broadcast would not send the clients since they did not change
        if (storeInfos){
            if ((!this.storeReadingClientInfos) && (!writing)){
                data.infos = this.infos;
            } else {
                // we have to create a client specific info-object
                data.infos = copyObject(this.infos);
                data.infos.clients = this.getPersonalizedClientsInfos(sid);
            }
        }

        this.logger.log(99, "Successfully entered the room '" + this.name + "'. SID: "+ sid + " Name: "+ name)

        // send the response with the data
        this.logger.log(99,data);
        respFunc(data, 0);
        
    } // end enter

    /**
     * Leave the room. Just remove the entry in the clients array. 
     * Returns true on success. (actually this might be/is unused, since clients do not want to wait for an answer until they close the connection, so Note is used instead of request)
     * @param {*} sid  
     * @param {object} opt
     */
    leaveRequest(sid, respFunc, opt) {

        if (!(this.isClient(sid))){
            respFunc("You are not client of the room '"+this.name+"'.",19)
            return;
        }

        let sidHash = this.clients[sid].sidHash;
        let writing = this.clients[sid].writing;

        this.returnWritingTicket(sid);

        // unsubscribe from the disconnect event!
        this.eH.eventUnsubscribe('wsClientDisconnect/'+sid, this.name + '/' + sid);

        if (this.clients[sid].storeInfos){
            this.clientsRequestingInfos.splice(this.clientsRequestingInfos.indexOf(sid),1);
        }

        // leave all roomViews (including the room itself):
        this.clients[sid].views.forEach((el, ind)=>{
            if (el=''){
                // the client listened to the room data
                let i = this.roomClients.indexOf(sid);
                if (i>=0){
                    this.roomClients.splice(i,1);
                }
            }else {
                this.roomViews[el].leave(sid);
            }
        })

        delete this.clients[sid];
        //delete this.sidHashed[sidHash];

        // always returns true, as nothing cna go wrong (except when the connection would get lost)
        respFunc(true);

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
     * Leave the room. Just remove the entry in the clients array. 
     * Returns true on success.
     * @param {*} sid  
     * @param {object} opt
     */
    leaveNote(sid, opt){
        if (!(this.isClient(sid))){
            this.logger.log(75, "leave: Sid '" +sid+"' is not a client of the room '"+this.name+"'.")
            return;
        }

        let sidHash = this.clients[sid].sidHash;
        let writing = this.clients[sid].writing;

        this.returnWritingTicket(sid);

        // unsubscribe from the disconnect event!
        this.eH.eventUnsubscribe('wsClientDisconnect/'+sid, this.name + '/' + sid);

        if (this.clients[sid].storeInfos){
            this.clientsRequestingInfos.splice(this.clientsRequestingInfos.indexOf(sid),1);
        }

        delete this.clients[sid];
        //delete this.sidHashed[sidHash];

        // update the clientInformation and sent them to the clients
        if (this.storeReadingClientInfos || writing){
            // also change client list
            this.broadcastInfos(true); 
        } else {
            // no need to change client list
            this.broadcastInfos(false); 
        }
    }

    // TODO
    getView(roomView){
        // check if this roomView exists; otherwise call startDynamicRoomView and if it can be started, add it to the list of existing roomViews
        if (roomView in this.roomViews){
            return this.roomViews[roomView];

        }else{
            let val = this.startDynamicRoomView(roomView, sid)
            
            this.clients[sid].views
        }
    }

    // TODO
    enterView(roomView, sid){
        // check if this roomView exists; otherwise call startDynamicRoomView and if it can be started, add it to the list of existing roomViews
        if (roomView in this.roomViews){
            let ret = this.roomViews[roomView].enter(sid);
            // if the client was already in the roomView, it will return false, true on success.
            if (ret){
                this.clients
            }

        }else{
            if(val = this.startDynamicRoomView(roomView, sid)){
                
            }
            
            this.clients[sid].views
        }

        /*check if this roomView exists; otherwise call startDynamicRoomView and if it can be started, add it to the list of existing roomViews
 *  - add client to the view by calling enter(clientSID) on the view. This function usually just adds the SID to the list of clients, but by inheritance this process could be overwritten, e.g. to check accessing rights. Returns true on success.
 *  - TODO: if entering view was successful, store the clients 'subscription' to the view in the clients object, in order to know which views it is listening to and which views need to left on leave
 *  - if entering is unsuccessful and it was a newly created dynamic room, close it again.
*/
    }

    /**
     * Try to start the given roomView dynamically (e.g. a roomView for a certain user with certain rights)
     * @param {string} roomView The name of the requested room view 
     * @returns false if no dynamic roomView can be started or the started roomView 
     */
    startDynamicRoomView(roomView){
        return false;
    }

    /**
     * change the name of the client with the given sid to the new name and report it to every other client
     * @param {string} sid 
     * @param {*} name 
     */
    changeClientName(sid, name){

        if (!(this.isClient(sid))){
            return;
        }

        let nameOld = this.clients[sid].name;
        let writing = this.clients[sid].writing;
        this.clients[sid].name = name;
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
     * @param {string} sid The sid of the client (We do not use the writingTicketID directly in order that we can make sure the client is part of the room and not an evil client, that probably would not get rights to enter the room, can also try to return a random writingTicket)
     */
    returnWritingTicket(sid){

        if (sid in this.clients){
            // get the id
            let id = this.clients[sid].writingTicketID;

            this.returnWritingTicketByID(id);
        } else {
            this.logger.log(75, 'Client with sid "'+sid+'" is not member of the room '+this.name);
        }
        
    }

    /**
     * Return the writingTicket when we already know the id and not only th sid. 
     * @param {string} id The writingTicketID
     */
    returnWritingTicketByID(id){
        // give the writing ticket back
        let ind = this.writingTickets.indexOf(id);
        if (ind>=0){
            this.writingTickets.splice(ind,1);
            this.storeWritingTickets;
            this.logger.log(99, 'Successfully returned writingTicket "'+id+'" in room '+this.name);
            return true;
        } else {
            this.logger.log(75, 'WritingTicketID "'+id+'" did not exist in the room '+this.name+ ' and thus is not deleted.');
            return false;
        }
    }

    /**
     * process the incoming request for a writing ticket for a client that previously did not have a writing ticket
     * @param {*} sid 
     * @param {*} respFunc 
     */
    requestWritingTicket(sid, respFunc){

        // TODO: at the beginning of most/every function we have to check whether the sid is part of this room! (as done here)

        // check that the client did not yet have a writing ticket
        if (!this.isClient(sid)){
            respFunc("You are not a client of room '"+this.roomName+"'.", 17);
            return;
        }
        if (this.clients[sid].writing){
            respFunc('Cannot get another writing ticket. No stockpiling here!',18);
            return;
        }
        if (this.maxWritingTicktes!=-1 && this.writingTickets.length >= this.maxWritingTicktes){
            respFunc("No (new) writing tickets available anymore. ", 19);
            return;
        } else{

            // create a new ticket
            let writingTicketID = this.uuidv4()
            this.writingTickets.push(writingTicketID);
            this.storeWritingTickets();

            // store the ticket to the client infos
            this.clients[sid].writing = true;
            this.clients[sid].writingTicketID = writingTicketID;
            
            let resp = {writingTicketID: writingTicketID};

            respFunc(resp);
        }

    }


    /**
     * Reset the list of writing tickets. This might be needed, when a client with writing rights does not properly leave the room when finished. Always return true
     * @param {function} responseFunc The responseFunction from the request, i.e. has two two arguments: (data, errorCode=0). On success, data=ID. 
     * @param {object} opt Not used yet. Could be used e.g. for kicking specifically one client. 
     */
    writingTicketsReset(responseFunc, opt){
        this.writingTickets = [];
        this.storeWritingTickets();
        responseFunc(true,0);
    }

    /**
     * revoke the writing ticket of the client with the sidHash given. Only of offline clients the writing Ticket can be revoked 
     * @param {string} sid The sid of the client that wants to revoke the sid of another client and eventually (opt.writingWanted) wants a writing ticket for its own.
     * @param {function} responseFunc The responseFunction from the request, i.e. has two two arguments: (data, errorCode=0). On success, data=ID. 
     * @param {object} opt
     */
    revokeWritingTicket(sid, respFunc, opt){
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
            this.storeOfflineWritingClients;

        } else {
            respFunc('Could not find offline client with given sidHash.',17);
        }

        if (opt.writingRequested){
            // check that the client does not already have a writing ticket
            if (this.clients[sid].writing){
                respFunc('Cannot get another writing ticket. No stockpiling here!',18)
            } else{
                // get a writing ticket for the client and return it

                // create a new ticket
                let writingTicketID = this.uuidv4()
                this.writingTickets.push(writingTicketID);
                this.storeWritingTickets();
                this.clients[sid].writingTicketID = writingTicketID;
                this.clients[sid].writing = true;

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
            // this is how it must look for each client:
            // sidHash:{connected, name, writing, sidHash }

            // reset all
            this.infos.clients = {}

            // add all connected clients
            for (let sid in this.clients){
                if (this.storeReadingClientInfos || this.clients[sid].writing){
                    let client = this.clients[sid];
                    this.infos.clients[client.sidHash] = {name:client.name, connected:true, writing:client.writing, sidHash:client.sidHash}
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

        // start the broadcasting.

        // every clients gets its own new clientList, when updateClient=true, otherwise it stays empty

        let emptyBaseInfo = copyObject(this.infos);
        emptyBaseInfo.clients = {};
        let sendObj = {name: 'room', data: {arg: 'infoUpdate', roomName:this.name, opt: emptyBaseInfo}}

        if (updateClients){

            for (let i = 0; i<this.clientsRequestingInfos.length; i++){
                let sid = this.clientsRequestingInfos[i];
    
                // send infos with clients
                emptyBaseInfo.clients = this.getPersonalizedClientsInfos(sid);

                this.clients[sid].processor.sendNoteAck(sendObj);

            }
        } else {
            for (let i = 0; i<this.clientsRequestingInfos.length; i++){
                let sid = this.clientsRequestingInfos[i];

                // infos without clients
                this.clients[sid].processor.sendNoteAck(sendObj);
                
            }
        }


    }

    /**
     * Create an info-object specific for the mentioned client (e.g. without its own data in the rooms-list)
     * @param {string} sid The sid to exclude
     */
    getPersonalizedClientsInfos(sid) {
        let sidHash = this.createSidHash(sid);
        let persClients = copyObject(this.infos.clients);
        delete persClients[sidHash]; // probably does nothing, when the client is read-only + infos are stored only for writing clients but still requested the infos
        return persClients
    }

    /**
     * func: Call a function in this room. However, these functions must be available first...
     * the functions must be async. They get just one argument: The data to be processed. On success/failure they must return an object with the schemas defined below 'response', doObj','undoObj' and 'isAchange' as properties and their values, on failure an object with properties 'message' and 'code', storing the error message and the error code
     * @param {string} sid The sid needed for identification of the client. It does NOT necessary need to be an sid stored as cookie on the client, e.g. for Server to Server communication.
     * @param {function} respFunc The responseFunction from the request, i.e. has two two arguments: (data, errorCode=0). On success, data=ID.
     * @param {object} request An object storing the functionName to call (func) and the data to process (data).
     */
    func(sid, respFunc, request){

        if (!(this.isClient(sid))){
            respFunc("You are not client of the room '"+this.name+"'.",19)
            return;
        }

        // check if request has the right format
        let reqSchema = {
            type:'object',
            properties: {
                func:{type: 'string'},
                ID:{type: 'string'},
                data:{} // should accept any type
            },
            required:['func', 'ID']
        } 

        // check if necessary arguments exist
        if (!(this.ajv.validate(reqSchema, request))){
            respFunc("The request '"+ JSON.stringify(request) +"' does not fulfill the schema '"+ JSON.stringify(reqSchema) +"'.",17);
            return;
        } 


        // check if the function exists:
        if (request.func in this.functionsReadOnly){
            // no checks needed here --> start directly
            this.functionsReadOnly[request.func](request.data).then((ret)=>{
                
                // send response
                //ret.ID = id;
                respFunc(ret); // does not include an ID since we did not change anything

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
                    if(!(this.ajv.validate(schemaFail, ret))){
                        let text = "Error: The error-object returned from the room-function '"+ request.func +"' in room '"+ this.name +"' does not fulfill the schema.";
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
        }
        else if (request.func in this.functionsWrite){

            // do all checks that can be done before we have to decide whether the request is processed immediately or has to be put on the stack. 

            // check for writing rights
            if (!(this.clients[sid].writing)){
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
                this.functionsWorkStack.push({sid:sid, respFunc: respFunc, request:request, ID:currentID})
                this.logger.log(67, "Need to put a change on the stack since multiple changes were requested at the same time. Client " + sid + " with a request to the '" + request.func + "'-function has to wait...");
            } else {
                // do start the function
                this._startWriteFunction(sid, respFunc, request, currentID); 
            }
        } else {
            respFunc("The function '" + request.func + "' is not available on the server-room.",12);
            return;
        } 

    }

    /**
     * startProcessing a write request. This function is either called by func or via the requestStack. 
     * @param {*} sid 
     * @param {*} respFunc 
     * @param {*} request 
     * @param {string} ID The id when the last check for ID and conflict was done. If it did change, we have to repeat the check.
     */
    _startWriteFunction(sid, respFunc, request, ID=''){
        // old: sync
        //this.functions[request.func](sid, request.data, respFunc)

        if (!(this.isClient(sid))){
            respFunc("You are not client of the room '"+this.name+"'.",19)
            return;
        }
        
        // check if the ID matches if the ID has changed since the last check
        if (this.ID!=ID && request.ID != this.ID) {
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

        // new: async functions
        this.functionsWrite[request.func](request.data).then((ret)=>{
            if (developMode){
                // check schema

                if(!(this.validateSuccess(ret))){
                    let text = "Error: The object ("+JSON.stringify(ret)+") returned from the room-function '"+ request.func +"' in room '"+ this.name +"' does not fulfill the schema. schema-error: " + this.ajv.errorsText();
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
                    this._processChange(ret.doObj, ret.undoObj, sid, id)
                } else {
                    this._processChange(ret.doObj, ret.undoObj, undefined, id)
                }

                

                // store the last change separately. This is needed for the case that the response could not be sent, but the change was still processed on the server: The client will then send the same change request again and the server will directly answer with the response that the last time did not reach the client without actually processing the request.
                this.lastChange.request = request;
                this.lastChange.response = response; // not the response-data (ret.response), but the comnplete sent object

                /**
                 * Does the following:
                 * - put the changes on the stack together with their ID
                 * - save the stack to MongoDB
                 * - send all clients (except the sender with the given sid) the changes
                 * - if there is a change that was not yet processed because another change was running: start this function
                 */

                // write entry on the changes stack
                // make sure the max length is not exceeded
                /*if (this.maxStackLength>=0){
                    if (this.stack.length==this.maxStackLength){
                        // delete the oldest (=first) elements
                        this.stack.shift()
                        this.stackIDs.shift()
                    }
                }
                
                this.stack.push({doObj: ret.doObj, undoObj: ret.undoObj}) // Info: the id is within the doObj
                this.stackIDs.push(this.ID);
                
                // store new stack to Mongo:
                this.storeStackAndID();

                // send the change to all other (<>sid) connected clients
                this._broadcastChange(ret.doObj, sid)
                */

                // either just finish (busy=false) or start next function to be processed:
                this.finishedFunc();
            } else{
                // simply send response
                respFunc(ret.response);
            }


        }).catch((err)=>{
            if (developMode){
                // check schema
                if(!(this.validateFail(err))){
                    let text = "Error: The error-object returned from the room-function '"+ request.func +"' in room '"+ this.name +"' does not fulfill the schema. Error: " + err.toString();
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
     * @param {string} sid The sid of the client that should not receive the broadcast
     * @param {string} id If id is defined, then _processChange will not get a new random id, but use the given one. This is needed e.g. on usual requests, where the response to the requesting client needs to be sent before the broadcast and thus also the id needs to be defined before _processChange is called. 
     */
    _processChange(doObj, undoObj, sid=undefined, id=undefined){
        // create the new ID and put the old and new one to the respective changeObjects on teh stack
        undoObj.ID = this.ID;
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
         * - send all clients (except the sender with the given sid) the changes
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
        
        this.stack.push({doObj: doObj, undoObj: undoObj}) // Info: the id is within the doObj
        this.stackIDs.push(this.ID);
        
        // store new stack to Mongo:
        this.storeStackAndID();

        // send the change to all other (<>sid) connected clients
        this._broadcastChange(doObj, sid)

        return this.ID;
    }

    /**
     * The "send part" of sending a change-broadcast to all (except sid) clients. _broadcastChange Wraps the usual doObj in the correct format for sending and broadcasts it to all the clients except the sidExclude. This function is called e.g. from startWriteFunction and processChange 
     * @param {*} doObj 
     * @param {*} sidExclude 
     */
    _broadcastChange(doObj, sidExclude){
        
        let data={
            // the roomName is added in broadcast
            arg: 'function',
            opt: doObj
        }
        
        this.broadcast(data, sidExclude);
    }

    /**
     * broadcast Send some data to every connected client
     * @param {object} obj The object with the changes to do; must be have the following properties (see also 'pushChange' for schema): funcName, data, ID (the new UUID)
     * @param {wsConnectionUUID} sidExclude Exclude this wsConnection-UUID form the broadcast (e.g. because the request came fomr this UUID)
     */
    broadcast(obj, sidExclude){

        // extend the object with the roomName
        obj.roomName = this.name;

        // loop over all clients and send them the data (except the sender)
        for (let sid in this.clients){
            if (sid!=sidExclude){
                // wrap the object to be sent to the room-handler
                let sendObj = {
                    name:'room',
                    data:obj
                }
                
                this.clients[sid].processor.sendNoteAck(sendObj);
                //this.clients[sid].sendNote(); // should we send it as note, where we do not know whether it has arrived or as request, where we can get an acknowledgement? Or maybe I'll reimplement noteAck...
            }
        }
    }

        /**
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
            this.logger.log(3, e)
            throw e;
        }   
    }
    async storeStack(){
        try {
            await this.collection.updateOne({type:'stack'}, {$set:{stack: this.stack}})
        } catch (e){
            this.logger.log(3, e)
            throw e;
        }
        
    }
    async storeWritingTickets(){
        try {
            await this.collection.updateOne({type:'writingTickets'}, {$set:{writingTickets: this.writingTickets}})
        } catch (e){
            this.logger.log(3, e)
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

    /**
     * To be called when the processing of a request is finished. Will call the next element on the functionsWorkStack, if there is something.
     */
    finishedFunc(){
        if (this.functionsWorkStack.length>0){
            // get first element and remove it from stack
            let obj = this.functionsWorkStack.shift();

            // do start the function
            this._startWriteFunction(obj.sid, obj.respFunc, obj.request, obj.ID); 
        }else{
            this.busy = false;
        }
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
     * Check if this sid is a client of this room. Otherwise any client could send/request messages
     * @param {string} sid The sid to check
     */
    isClient(sid){
        if (this.clients[sid]){
            return true;
        }else {
            this.logger.log(7, "SID '" + sid + "' is not a client of the room '"+this.name+"'.");
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
     * Start a dynamic roomView. The function shall be implemented by the inheriting classes. It must return the roomView object if the roomView could be started and false if not. This function here always returns false; thus inheriting classes do not need to implement this function when there are no roomViews.
     * @param {string} roomViewName The name of the requested roomView
     */
    startDynamicRoomView(roomViewName){
        // this function can be implemented by inheriting roomXYZ classes, if they provide roomViews.
        return false;
    }

    /**
     * Create the list of clients specifically for the client with the given sid. Does NOT include itself and does not show any sid, only the hashes
     * @param {string} sid 
     */
    /*createSpecificClientInfos(sidExclude){
        let  specClientInfo = {};
        
        for (let sid in this.clientInfos){
            if (!sid==sidExclude){
                specClientInfo[this.createSidHash(sid)] = this.clientInfos[sid];
            }
        }

        return specClientInfo;
    }*/
    
    /**
     * Create the hashed salted string of the sid; used as unique identifier for clients without showing the sid to others (security!)
     * @param {string} sid 
     */
    createSidHash(sid){
        return crypto.createHash('sha256').update(this.clientHashString + sid).digest('hex');
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
     */
    findObjInArrayByProp(arr, prop, val){
        for (let i=0; i<arr.length;i++){
            if (arr[i][prop] == val){
                return [i, arr[i]];
            }
        }
        return [-1, {}];
    }

}

module.exports = roomServer;