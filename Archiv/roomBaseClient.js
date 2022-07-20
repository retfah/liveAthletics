
/**
 * The frame for room class implementations on the client. Holds the stacks and handles the interaction with the roomManager
 */
class room {

    /**
     * Constructor
     * @param {socketProcessor2} wsp The websocket processor 
     * @param {boolean} writing True if this client-room is also intended to invoke changes. False if this room is only listening to changes from the server.
     */
    constructor(wsp, writing){
		this.wsp = wsp;

		// writing: does this client-room only listen to what comes from the server or does it also change room data: True if it also changes and thus needs writing rights (active, contributor), false if it is only listening (passive, observer). If not writing, being out of sync is no problem. If writing, we have to keep track of local changes when offline using stacks and we must have conflict handling when out of sync and working on different branches than the server.
		this.active = writing;

        // the version stores the version that was last synced with the server. On changes, the client sends its current ID together with the changes to the server. The server will compare the ID with its actual ID and apply the changes if the IDs match. (Otherwise some conflictHandling might be started in the future.) It will then create a new ID (whitch is NOT simply an auto-increment-integer, but a UUID in order to prevent hacking) and return this ID to the client that sent the changes and together with the change to all other clients in this room. 
		
		// through the wsp, try to connect to the room on the server. Tell the server the rights you need (read/write or just read)
		
        // as answer we get the current ID
        this.ID = 123;

		// TODO: introduce this concept on the Server
        // we must differentiate blocking and non-blocking changes: while blocking changes will fail or lead to conflict handling when the version of the sending client is different from the server, non-blocking changes will still work. So far I thought non-blocking changes are mainly if we create new entries (e.g. new athlete), but actually every change might be non-blocking (changing a result, that was not changed by another client since the last sync, is non-blocking). If the server is smart enough, it will compare the requested changes with the changes done since the version sent from the client and decide based on this whether it is conflicting / blocking or not. 



        // listen to "WSconnectionChanged" event
		this.eH.eventSubscribe("wsConnectionChanged", (connected)=>{
            // if now disconnected, set the respective property, that prevents from trying to send something

            // if now connected, try to sync in some way...
            
		})
        
		
	}
	
	// need to register to an event that is raised when the connection is reestablished; then we want to send all our events on the waiting stack (in the correct order!)
	
	// on changes on the client, give it to the stack manager:
	// - the stack manager shall also create a javascript object, that describes the current state (connection, ) and can be linked to a Vue.js Element that shows this information
	// there might be one stack manager; but multiple rooms; this makes sense, since we want only one indicator for the connection. But we must be able to differentiate between the rooms for the versions!!!
	// if we have a connection:
	// -> directly send the change (put it on the 'processing-stack')
	// else (=no connection)
	// - put the change on the stack
	// - the stack automatically 

	// for every change on the stack we must know how to undo it (and in the same terminology as for changes!), because:
	// - the server replies to our change-request with 'outdated'; this means he at the same time has new incremental changes to send to the client
	//  - thus the client must either:
	//   - undo its changes and accept the changes from the server (normally)
	//   - actively override the server --> the changes that must be undone now on all the clinets and the server must be known --> this means the server must know the undo functtoins for the respective past changes; the server must create these undo functions itself in order to prevent "evil client" problems (however, we could also say that evil clients are no problem, especially if we have a login and know who is in the network --> but can we always know or do we have to assume evils?)
	// - there is an error on the server on applying the changes, for example because the client wants to do something that is not possible or allowed (generally, the non-evil client should ask only for possible changes.)
	
	// can/should we be allowed to create bundles of changes? (e.g. when the connection is lost, a bundle of changes will be sent to the server and get only one) --> it would be more practical to have it!

}

