/**
 * MAJOR CHANGES
 * 2020-02: The rooms are stored in an array instead of an object, since vue.js cannot react on changes on objects appropriately
 * 2022-12: The rooms are not stored anymore in the data object, but separately to avoid conflicts of the two vue instances (vueRoomManager + the actual vue of the data)
 */



/**
 * The room manager provides a frontend to show information about the status of the connection and the single rooms.
 */
class roomManager{
	
	// do we have a connection?
	// status of all active rooms (online, active or passive, )

	/**
	 * Constructor: construct a roomManager instance. 
	 * @param {string} indicatorID The name of the element, where the color shall indicate the status of the ws-connection and which is used to click on and show the roomManager-vues. The indicator element must call roomManagerInstance.data.wsWindowShown=true; on click! (default='', meaning, there is no indicator). There must be two css-classes 'connected' and 'disconnected' which are assigned then by the roomManager.
	 */
	constructor(indicatorID=''){

		// the room-indicator shown to the users
		this.indicatorID = indicatorID;
		// the previoud approach with adding a moving ball, when a request is pending had the shortcoming that the outer div needed a fixed width, which contrasts the other elements in the top row, which are as large as to fill the line; 
		// the new approach is to avoid modifying the content of the indicator element, but only changing its css (e.g. background modification)
		// OLD: if there is an indicator, we modify it a little here and add a circle, to be used as a request-indicator (when somethign is requested from te server): 
		/* if (this.indicatorID){
			var el = document.getElementById(this.indicatorID);
			// all previoud content will be moved in div, which is a child of the indicatorElement. This is needed just to make sure that the positioning of the content is not static, so that the stacking order gets correct (e.g. circle behind text)
			var contentText = el.innerHTML;
			// remove the previous content (to add it later on in the child div)
			el.innerHTML = '';

			// I'd like to have a circle centered in the indicator, which is going left to right and back in the indicator
			el.classList.add('requestPendingContainer');
			
			// create the circle
			let circle = document.createElement('div');
			circle.id = 'requestPendingCircle';
			//circle.classList.add('requestPendingCircle'); // will be added via Vue
			el.prepend(circle);

			// add the actual content again (since it is further down it will be in front)
			let contentDiv = document.createElement('div');
			contentDiv.innerHTML = contentText;
			contentDiv.style = "position: absolute; width: 100%;" // some formatting to make sure the content is correctly on top of the circle and the centering still works --> TODO: find another solution, because with this solution the flex wrap does not work properly. Without this setting the flex stuff would work.
			el.append(contentDiv);
		}*/

		// the eventhandler (eH) and the websocketHandler (wsHandler) are gobal objects and thus do not need to be storen in here (and probably are not even used)

		let clientName;
		// get or create the name of the client
		if ('localStorage' in window){
			if (window.localStorage.clientName){
				clientName = window.localStorage.clientName
			}
		}
		// when still empty, create a new string
		if (!clientName) {
			clientName = this.randName(8);
		}
		
		// the data object; shared with the vue-instance (this is the reason why we need this stupid data object in the roomManager and we cannot simply have all those properties directly in the roomManager-class)
		// rooms are separately, so that the vue of the room Manager does not refer to the same data as the actual vue.
		this.rooms = []; // all room instances
		this.data = {
			// general ws-connection stuff:
			clientName: clientName, 
			connected: '', // must be changed after the vue is initialized, thus is '' and not true or false
			connecting: false, // unused so far
			tabId: 0, // unused so far
			wsWindowShown: false,
			clientWindowShown: false,
			revokeWindowShown: false,
			revokeClient: undefined,

			// messages: storing objects with the following information: {time:<datetime object>, message: "REQUIRED a string to be shown", room:<REQUIRED reference to the room>, errCode:<OPT the error code as numeric>, errMsg: "OPT the error msg"", info:"OPT the info of the request", request:{"OPT the request as it was sent to the server"}}
			// only the time, message and the reference to the room are required. The others exist for possible future purposes. (NOTE: eventually we need them for )
			/*messagesExample: [{type:"generalError", time: new Date(), handling:"sendAgainTimeout", timeout:10, room:{name:"rExample"}, errCode:2, errMsg:"Request timed out!", info:"change sendagain", request:{this:"is", an:"object"}, popUp:false, deletedStack:undefined}, 
			{type:"generalError", time: new Date(), handling:"deleteRollback", timeout:10, room:{name:"rExample"}, errCode:2, errMsg:"Request timed out!", info:"change rollback", request:{this:"is", an:"object"}, popUp:true, deletedStack:{some:"properties", hello:"world", life:42}}], */
			messages: [],
			highlightedMsg:-1, // show an overlay with ful details about the error.

			// new 2022-12: room objects, storing copies of the room-data relevant for the vue instance
			rooms:[],
			// properties for the list of connected clients in the specified/selected room:
			roomSelected:undefined,
			clientsLoaded: true,
			any: 0 // this variable is never used on the frontend, but is used to make Vue redraw everything on increasing it everytime we want to redraw
			/*,
			clients:[
				{name:'Peter Parker', connected:true, writingRights: false},
				{name:'Superman', connected:false, writingRights: true}
			]*/
		};

		// listen to "WSconnectionChanged" event
		eH.eventSubscribe("wsClosed", (connected)=>{
			this.data.connected = false;

		})

		// listen to sid reported
		eH.eventSubscribe("TabIdSet", (tabId)=>{
			// now we are connected and can send messages
			this.data.connected=true;
			this.data.tabId = tabId;

			// the rooms should listen to TabIdSet themselves
		});

		// 
		eH.eventSubscribe("roomInfoChange",(room)=>{
			this.setRoomVueData(room);
			logger.log(99, `roomManager: data changed for room ${room.name}`);
		})
		
		// Vue.js stuff
		//this.vueRoomManager = new Vue({
		let vueRMconfig = {
			data:()=> {return this.data},
			computed :{
				roomSelectedObject: function(){ 
					return this.rooms.find(r=>r.name==this.roomSelected);
				},
				clients: function(){
					return this.roomSelectedObject.infos.clients;
				},
				requestPending: function(){ // on purpose not an arrow-function
					// boolean, set to true if in any room a request is open; false if not; 
					let requestPend = false;
					for (let room of this.rooms){
						if (room.stackLength>0){
							requestPend = true;
						}
					}

					// additional task: format the indicator, if available
					if (indicatorID){
						let el = document.getElementById(indicatorID); // the element has the same name as the css-class	
						if (requestPend){
							if (!el.classList.contains('requestPending')){
								el.classList.add('requestPending');
							}
							
						}else{
							if (el.classList.contains('requestPending')){
								el.classList.remove('requestPending');
							}
						}
						/*let el = document.getElementById('requestPendingCircle'); // the element has the same name as the css-class	
						if (requestPend){
							if (!el.classList.contains('requestPendingCircle')){
								el.classList.add('requestPendingCircle');
							}
							
						}else{
							if (el.classList.contains('requestPendingCircle')){
								el.classList.remove('requestPendingCircle');
							}
						}*/
					}

					return requestPend;
				},
				roomManagerTranslations: ()=>{
					// create an object storing several translations in an object (e.g. for all the error handling strategy string messages) for the current language.
					// since we cannot translate text in here (but only in ejs files) and since we want to be able to put in one translates string into another translated string with the mustage notation, probably the best way to do this is to create an object with the possible options to be plugged in.
					// PROBLEM: how to inject text in those strings? The mustage notation does not work, since the text itself is injected (and to my knowledge injection is not done recursively) --> the problem can be avoided when we call an special eval function (evalAsTemplateString) which injects what we need on the fly. 
					let handlingStrings = {}

					// every string that we need here is in its own div, where the id is the property name to be referenced in the final object
					let divs = document.getElementById("roomManagerTranslations");

					for(let el of divs.children){
						handlingStrings[el.id.slice(3)] = el.innerText;
					}

					return handlingStrings
				}
			},
			watch: {
				// probably not needed AND leads to Vue-Error (stack depth exceeded):
				/*rooms: {
					deep:true, // also changes in nested data shall raise this watcher
					handler:function(rOld, rNew){
					// recompute the clients variable (actually just recalc everything, found no better way yet. Note: I think the problem lies in the dependency of clients from the variable roomSelected: only the variable 'roomSelected' is reactive and thus can provoke an update, but not changes in the infos.clients)
					this.$forceUpdate();
					console.log('roomChange')
					},
					immediate:true // false is the default I think
				},*/
				connected: (conNew, conOld)=>{
					// as the always shown element is outside the vueDiv, we have to set its background via javascript
					if (this.indicatorID){
						var el = document.getElementById(this.indicatorID);
						if (conNew) {
							if (el.classList.contains('disconnected')){
								el.classList.remove('disconnected');
							}
							el.classList.add('connected');
						} else {
							if (el.classList.contains('connected')){
								el.classList.remove('connected');
							}
							el.classList.add('disconnected');
						};
					}
				},


				
			},
			methods: {
				getUuidSlice: function(uuid){
					// At initialization, the uuid unfortunately is 0; so we need to handle this here.
					if (typeof (uuid)=="string"){
						return uuid.slice(30);
					}
					return '';
					
				},
				clientNameChanged : (event)=>{
					// store to localStorage
					if ('localStorage' in window){
						window.localStorage.setItem('clientName', this.data.clientName)
					}
					
					// report to roomServers
					for (let room of this.rooms){
						room.setClientName(this.data.clientName);
					}
					
				},
				revokeWritingTicket: (sidHash, roomName)=>{ // must be an arrow function !!!
					// revoke the writing ticket for the selected client (all the rest will be done in roomClient)
					// first find teh room
					let room;
					if (room = this.rooms.find(r=>r.name == roomName)){
						room.revokeWritingTicket(sidHash);
					}	
				},
				revokeClientClick:(client)=>{
					if (client.writing && !(client.connected) ){
						this.data.revokeClient = client.sidHash; 
						this.data.revokeWindowShown = true;
					} 
				},

				showMessOutdated: function(revokedChanges, filename=""){
					// show the dialog
					this.messOutdated = true;

					// prepare the download
					this.prepareDownload(revokedChanges, filename)
				},
				showMessChangeErr: function(revokedChanges, filename=""){
					// show the dialog
					this.messChangeErr = true;

					// prepare the download
					this.prepareDownload(revokedChanges, filename)
				},
				showMessConnTimeout: function(revokedChanges, filename=""){
					// show the dialog
					this.messConnTimeout = true;

					// prepare the download
					this.prepareDownload(revokedChanges, filename)
				},
				showMessConnErr: function(revokedChanges, filename=""){
					// show the dialog
					this.messConnErr = true;

					// prepare the download
					this.prepareDownload(revokedChanges, filename)
				},

				prepareDownload: function(){
					// revokedChanges must be any kind of object
					let msg = this.messages[this.highlightedMsg];
					let revokedChanges = msg.deletedStack;
					let filename = msg.time.toLocaleTimeString() + " " + msg.room.name + ": reverted changes.json";
					var json = JSON.stringify(revokedChanges);
					var blob = new Blob([json], {type: "application/json"});
					var url  = URL.createObjectURL(blob);

					var a = this.$refs.download; 
					if (filename){
						a.download = filename;
					}else {
						a.download = "backup.json";
					}
					a.href = url;
				},

				evalAsTemplateString: function(text){ // with this eval function, the text may contain template references to the vue instance (as "this"), since the vue instance is bound this function on execution. NOTE: for this reason, it is not possible to manually bind the function to something else! It will be overriden by Vue! 
					// evaluate the given text as a template string
					let ret;
					try{
						ret = eval("`"+text+"`");
					}
					catch (err){
						ret = text;
					}
					return ret;
				}, 

				boundEvalAsTemplateString: function(text, bindObj){ // with this eval function, the text may contain template references to "this", whereby this will refer to the object provided as the second parameter (bindObj) 

					function f(text){
						// evaluate the given text as a template string
						let ret;
						try{
							ret = eval("`"+text+"`");
						}
						catch (err){
							ret = text;
						}
						return ret;
					}
					return f.bind(bindObj)(text);

				}, 
				closeMsg: function(){
					// called when the message-overlay is closed

					// remember that the current message was already shown as a popup
					this.messages[this.highlightedMsg].popUp = false;

					// check whether there are other messages that need to be shown automatically (popUp=true)
					for (let i=0; i<this.messages.length;i++){
						if (this.messages[i].popUp){
							this.highlightedMsg = i;
							return;
						}
					}

					// if no other message is to be shown as a pop up, just hide the current one
					this.highlightedMsg = -1;
				},

			}
	
		};
		this.vueRoomManager = Vue.createApp(vueRMconfig).mount('#vueRoomsManager');

		// transfer back the proxied data to this instance
		this.data = this.vueRoomManager.$data;

		// initially set the status of the wsConnection:
		// NOTE: do not move this before setting vueRoomManager, because we need to raise the connected-watcher!
		this.data.connected = wsHandler.connected;

		//this.data.clientWindowShown = true;

		//document.getElementById('wsWindow').classList.remove('wsWindowHidden');

	}

	/**
	 * create a random name for the client (if it was not set before)
	 * @param {integer} length 
	 */
	randName(length) {
		var result           = '';
		var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var charactersLength = characters.length;
		for ( var i = 0; i < length; i++ ) {
		   result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}

	/**
	 * Show or hide the wsRooms window
	 */
	/*toggleWsRooms() {
		if (this.data.wsWindowShown){
			this.data.wsWindowShown = false;

		}
	}*/

	// create "copy" of room data for the vue and add/update it to/in room.data
	// called by registerRoom as well as by the room itself, when any of the data is changed.
	setRoomVueData(room){
		// some of the properties are probably not needed
		const roomInfo = {
			name: room.name, // needed
			ID: room.ID,
			clientName: room.clientName, 
			stackLength: room.stack.length, // new 2022-12 (before the stack length was accessed directly, now we provide this informaiton separately)
			connected: room.connected, // needed
			connecting: room.connecting,
			dataPresent: room.dataPresent,
			dataSent: room.dataSent,
			infos: room.infos, // needed
			storeInfos: room.storeInfos,
			writingTicketID: room.writingTicketID, // needed
			writingWanted: room.writingWanted,
		};
		// check if the room-info already exists
		let i = this.data.rooms.findIndex(r=>r.name==room.name);
		if (i<0){
			// is a new room
			this.data.rooms.push(roomInfo);
		} else {
			// use the propertyTransfer funciton availbale in each room.
			room.propertyTransfer(roomInfo, this.data.rooms[i])
		}
	} 

	// 2022-12: seems to be unused
	/**
	 * 
	 * @param {roomClient-object} room 
	 */
	// registerRoom(room){

	// 	// TODO: when te same room was added twice (e.g. because two shown parts of the window wanted to open its own, identical rooms, then the latter would overwrite the first)
	// 	// --> thus we need to rethink the starting of rooms and how they are linked to data!
	// 	// --> a room should probably NOT handle the vue, but only process the data, such that multiple Vue's could be connected to the same data.
		
	// 	// put the room into the data structure
	// 	this.rooms.push(room);
	// 	// create data.rooms with all information for the vueRoomManager
	// 	// some of the properties are probably not needed
	// 	this.setRoomVueData(room)

	// 	// let the room know the name of the client and report it to the server
	// 	// we cannot do that here yet when the sid was not reported yet TODO
	// 	room.setClientName(this.data.clientName);
	// }

	// TODO: shall vue-instances and other code blocks really request writing and storeInfos or should this always be defined by the room/vue itself?
	// if the the vue-instances do decide, then we need to register them appropriately, such that if one instance requires writing and the other not, we can return the wirting ticket as soon as the writing-instance leaves the room. 
	/**
	 * returns the reqeusted room. if the room is not connected, it tries to connect.  
	 * @param {roomClientVue} v The instance of the room client view that wants to
	 * @param {string} roomName 
	 * @param {boolean} writing Try to get writing rights or not.
	 * @param {boolean} storeInfos Store the information about other clients or not, default=true
	 * @param {string} path If path is given, the room will automatically be loaded from that path if it does not already exist. Should be an absolute path, as otherwise it is reqlative to the page we currently are in! i.e. '//localhost/filename.js'
	 * @param {string} className The class-name of the room-client-class. If not given, it is taken the same as the room-name
	 * @param {string} datasetName The name of the requested dataset; by default='' (room data)
	 * @returns returns the room. Please note that the requests made for 'writing' and 'storeInfos' are probably not set appropriately  
	 */
	async getRoom(v, roomName, writing=false, storeInfos=true, path='', className='', datasetName=''){
		let room;
		let index;
		[index,room] = this.findObjInArrayByProp(this.rooms, 'name', roomName);
		if (index>=0){
			// register roomClientVue in the room
			room.registerVue(v);

		} else {
			// try to load the room
			if (path){
				// should work without rM room = await this.loadRoom(v, path, roomName, className, rM)//.catch((err)=>{`The room could not be loaded: ${err}`});
				//(v, path, roomName, className,  writing, storeInfos, datasetName)
				room = await this.loadRoom(v, path, roomName, className, writing, storeInfos, datasetName)//.catch((err)=>{`The room could not be loaded: ${err}`});
				
			} else {
				throw new Error ('Room does not exist and no path is given.');
			}
		}

		// as of here, 'room' exists

		if (room.connected){
			// check if writing and storeInfos are "correct"
			if (writing && !(room.writingWanted)){
				room.requestWritingTicket();
			}

			// TODO: check storeInfos and request if required! (currently would need leave and reconnect!)

		} else {
			// NOTE: we might end up here not only when the room is new, but also when we simply have no connection!

			// set writing and storeInfos
			if (writing){ // the if ensures that we do not change from write to non-write with an additional connected vue-instance.
				room.writingWanted = writing;
			}
			if (storeInfos){ // the if ensures that we do not change from write to non-write with an additional connected vue-instance.
				room.storeInfos = storeInfos;
			}

			// try to connect
			room.connect(writing, ()=>{
				// success
			}, (msg, code)=>{
				// failure

				if (code==123){
					// try to connect without writing rights
					room.connect(false, ()=>{}, (msg, code)=>{
						throw new Error();
					});
				}
			})
			
		}

		return room;
	}

	/**
	 * 
	 * @param {*} roomName 
	 * @param {*} viewName 
	 * @param {*} writing 
	 * @param {*} storeInfos 
	 * @param {string} path If path is given, the room will automatically be loaded from that path if it does not already exist. 
	 */
	async getView(roomName, viewName, writing, storeInfos, path=''){
		// TODO
	}

	/**
	 * Load a room, but od not yet connect it; This function does NOT check if the room does not already exist!
	 * @param {roomClientVue} v The view that finally shall be linked to the room
	 * @param {string} path Should be an absolute path, as otherwise it is reqlative to the page we currently are in! i.e. '//localhost/filename.js'
	 * @param {string} roomName The name of the room.
	 * @param {string} className The class-name of the room-client-class. If ='' or =False, it is taken the same as the room-name
	 * //@param {roomManager} rM
	 * @param {string} datasetName The name of the dataset that is called
	 * @throws Errors are thrown
	 * @returns The newly loaded room. It is NOT connected yet.
	 */
	async loadRoom(v, path, roomName, className,  writing, storeInfos, datasetName){

		// load the room from the path
		// Attention: dynamical imports as we do here are a pretty new (2019) feature. 
		return import(path).then((mods)=>{

			// default className
			if (!className){
				className = roomName;
			}

			// create the room, but do NOT connect it yet
			if (className in mods){
				
				//(v, wsHandler, eventHandler, rM, writing=false, storeInfos='', datasetName='', roomName)
				let room = new mods[className](v, wsHandler, eH, this, writing, storeInfos, datasetName, roomName); // rooms must not have any arguments apart of wsHandler and eventHandler

				// check if the new room has the same name as the given name; otherwise destroy the room again, do not add it to the rooms and return false
				if (room.name==roomName){
					
					this.rooms.push(room);
					this.setRoomVueData(room);
					return room;

				} else {
					throw new Error('The property name of the room must be the roomName. Could not load the room.');
				}
			} else {
				throw new Error('The room does not exist in the module in the given path.');
			}
		})
	}

	

	/**
	 * Deletes the room from the list of rooms. 
	 * @param {string} name The name of the room. (is used as identifier; must be unique)
	 */
	deleteRoom(name){
		let [index, room] = this.findObjInArrayByProp(this.rooms, 'name', name);
		if (index>=0){
			// room existed
			this.rooms.splice(index,1)
			// room should also be present in the data object; delete it there as well
			let i = this.data.rooms.findIndex(r.name ==name)
			if (i>=0){
				this.data.rooms.splice(i,1);
			}
		} else {
			// error:
			// TODO
		}
		
	}

	/**
	 * Called by the ws-note-handler if a change for a room is incoming
	 * @param {object} data An object with properties "arg", "roomName" and eventually "opt"
	 */
	wsNoteIncoming(data){
		/* data: {
			roomName:'roomXY',
			arg: 'function',
			opt: {}
		}*/

		// data must have the following arguments: arg, roomName, opt (optional)
		if (!('arg' in data && 'roomName' in data)){
			logger.log(5, "The received room-note (" + JSON.stringify(data) + ") has no 'arg' and/or 'roomName' property!")
			return;
		}
		let [index, room] = this.findObjInArrayByProp(this.rooms, 'name', data.roomName);
		if (index == -1){
			logger.log(5, "The room '" + data.roomName + "' does not exist.");
			return;
		}

		// everything ok

		// let the room do the rest
		let opt = data.opt ?? {};
		room.wsNoteIncoming(data.arg, opt)
		
	}

	/*
	<div v-if="msg.type=='generalError'">
	<%= __("Error while sending the request '{{msg.info}}' of room {{msg.room.name}}). Code: {{msg.errCode}}, message: {{msg.errMsg}}. {{handling}} (Request content: {{JSON.stringify(msg.request)}})") %> 
</div>
<div v-else-if="msg.type=='outdatedRollback'">
	<%= __("The room {{msg.room.name}} was outdated. The request '{{msg.info}}' and all subsequent requests were rolled back. (Request content: {{JSON.stringify(msg.request)}})") %>
</div>*/

	/**
	 * create a general error message (for room stuff)
	 * @param {roomClient} room reference to the roomClient
	 * @param {string} requestInfo The information describing the request in words
	 * @param {numeric} errCode Numeric code of the error as reported by the server
	 * @param {string} errMsg the error in words
	 * @param {string} handling The handling strategy aplied in words (e.g. delete and continue, or delete and rollback, or wait for reconnection, or...)
	 * @param {object} request The full request object, which will be stringfied for showing
	 * @param {boolean} popUp optional, default=false, instantly show the message to the user (e.g. because the data will be changed due to an error)
	 * @param {object} deletedStack Optional, The stack that was reverted and is provided here for download
	 */
	messageGeneralError(room, requestInfo, errCode, errMsg, handling, request, popUp=false, deletedStack=undefined){
		
		let msgLength = this.data.messages.push({
			type: "generalError",
			time: new Date(),
			room: room,
			info: requestInfo,
			errCode: errCode,
			errMsg: errMsg,
			handling: handling,
			request: request,
			popUp: popUp,
			deletedStack: deletedStack
		})

		// check if a message is already shown
		if (popUp && this.data.highlightedMsg == -1){
			// directly show this message
			this.data.highlightedMsg = msgLength-1
		}
		// otherwise the message will be shown as soon as it is the next message to be shown.
	}

	/**
	 * create a general error message (for room stuff)
	 * @param {numeric} timeout The timeoiut in seconds to wait
	 * @param {roomClient} room reference to the roomClient
	 * @param {string} requestInfo The information describing the request in words
	 * @param {numeric} errCode Numeric code of the error as reported by the server
	 * @param {string} errMsg the error in words
	 * @param {object} request The full request object, which will be stringfied for showing
	 * @param {boolean} popUp optional, default=false, instantly show the message to the user (e.g. because the data will be changed due to an error)
	 * @param {object} deletedStack Optional, The stack that was reverted and is provided here for download
	 */
	messageSendAgainTimeoutError(timeout, room, requestInfo, errCode, errMsg, request, popUp=false, deletedStack=undefined){
	
		let msgLength = this.data.messages.push({
			type: "generalError",
			time: new Date(),
			room: room,
			info: requestInfo,
			errCode: errCode,
			errMsg: errMsg,
			handling: "sendAgainTimeout",
			request: request,
			popUp: popUp,
			deletedStack: deletedStack,
			timeout: timeout,
		})

		// check if a message is already shown
		if (popUp && this.data.highlightedMsg == -1){
			// directly show this message
			this.data.highlightedMsg = msgLength-1
		}
		// otherwise the message will be shown as soon as it is the next message to be shown.
	}

	/**
	 * create an error message for the case the client is outdated
	 * @param {roomClient} room reference to the roomClient
	 * @param {string} requestInfo The information describing the request in words
	 * @param {object} request The full request object, which will be stringfied for showing
	 * @param {boolean} popUp optional, default=false, instantly show the message to the user (e.g. because the data will be changed due to an error)
	 * @param {object} deletedStack Optional, The stack that was reverted and is provided here for download
	 */
	messageOutdatedRollbackError(room, requestInfo, request, popUp, deletedStack){
		let msgLength = this.data.messages.push({
			type: "outdatedRollback",
			time: new Date(),
			room: room,
			info: requestInfo,
			request: request,
			popUp: popUp,
			deletedStack: deletedStack
		})

		// check if a message is already shown
		if (popUp && this.data.highlightedMsg == -1){
			// directly show this message
			this.data.highlightedMsg = msgLength-1
		}
		// otherwise the message will be shown as soon as it is the next message to be shown.
	}

	messageNoConnection(room, requestInfo, request, handling, popUp=false){
		let msgLength = this.data.messages.push({
			type: "noConnection",
			time: new Date(),
			room,
			info: requestInfo,
			request,
			popUp,
			handling,
		})

		// check if a message is already shown
		if (popUp && this.data.highlightedMsg == -1){
			// directly show this message
			this.data.highlightedMsg = msgLength-1
		}
		// otherwise the message will be shown as soon as it is the next message to be shown.
	}

	messageRequestPending(room, requestInfo, request, handling, popUp=false){
		let msgLength = this.data.messages.push({
			type: "requestPending",
			time: new Date(),
			room,
			info: requestInfo,
			request,
			popUp,
			handling,
		})

		// check if a message is already shown
		if (popUp && this.data.highlightedMsg == -1){
			// directly show this message
			this.data.highlightedMsg = msgLength-1
		}
		// otherwise the message will be shown as soon as it is the next message to be shown.
	}

	/**
     * returns the index and the object itself of the first object where the property prop is equal to value 
     * @param {array of objects} arr the array
     * @param {string} prop the property to look for
     * @param {*} val the value the property should have
	 * @return {array} [index, object] If no matching object is found, [-1, {}] is returned
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
