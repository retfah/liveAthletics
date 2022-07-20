

// backup of within wss.on();

	ws.stackNote = {};
	
	/**
	 * uuidv4: Creates a unique ID according to RFC 4122, version 4. Credits go to: https://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript#2117523
	 * This id shall be used e.g. 
	 */
	function uuidv4() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
				var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
				return v.toString(16);
		});
	}
		  
	// not used in that kind of implementation:
	// /**
	//  * _send: Send bulk ws-messages. The ws-partner is likely not able to process it and may raise an error! Use the usual functions to send data.
	//  * @param {variable} ...args The same arguments as ws.send has.
	//  */
	// function _send (...args) {
	// 	super.ws.send(...args)
	// }
	
	// /**
	//  * send: override the ws.send function to make sure it is not used by accident.
	//  */
	// function send (){
	// 	logger.log(7, "The function send on the wsServerExtended-class shall not be used. Use the official send funcitons like sendNote, sendNoteAck, etc or if really (!) needed, use _send.");
	// }

	/**
	 * sendError: send an error message back to the client
	 * @param {string} error The error message to be sent 
	 */
	function sendError(error){
		var mess = {};
		mess.type = "error";
		mess.data = error;
		ws.send(JSON.stringify(mess));
	}

	/**
	 * sendNote:	send a normal note that does not get acknowledged. It is tried to send the note once. When it gets lost, nobody cares.
	 * @param {string} note The note to be sent. 
	 */
	function sendNote (note){
		// prepare
		var mess = {};
		mess.type = "note";
		mess.stamp = this.uuidv4();
		mess.data = note;
		
		// send
		ws.send(mess);
	}

	/**
	 * sendNoteAck: send a note with acknwoledgement to B. On success (=message recieved by B and on ws-extended-level successfully parsed), the success callback is executed, failure otherwise. 
	 * @param {string / binary} message The message to be sent as string or binary. 
	 * @param {callback} success A callback with parameters TODO.
	 * @param {callback} failure A callback with two self explanatory parameters: code (int) and message (string)
	 * @param {object} opt Object storing parameters for the transmission.
	 */
	function sendNoteAck (note, success=()=>{}, failure=()=>{}, opt={}){
		var uuid = uuidv4(); // get the unique ID for this transmission
		// prepare message to be sent
		var mess = {}
		mess.type = "noteSyn"; // will be answered with noteAck, if everything goes as expected
		mess.stamp = uuid;
		mess.data = note;

		// create everything needed on the server
		let stackObj = {}
		stackObj.cbSuccess = success;
		stackObj.cbFailure = failure;
		stackObj.message = mess;
		opt.retryNumber = opt.retryNumber || 5; // how many times to retry sending, when no ack has arrived yet; 
		opt.retryAttempts = 0; // no retry yet; this number is increased with every retry until retrynumber is reached --> then the failure-callback is executed	
		opt.retryInterval = opt.retryInterval || 1000; // in ms
		stackObj.opt = opt;
		ws.stackNote[uuid] = stackObj;
		// make sure we can access the "this" in the anonymous function
		var self = this;
		// send again if needed; if the acknowledgement already arrived, the interval is stopped by the Ack-arrival and is not executed anymore.
		opt.interval = setInterval(()=>{
			if (stackObj.opt.retryAttempts==stackObj.opt.retryNumber){
				logger.log(99, "The following message could not be sent: " + stackObj.message.toString()) // write message to log. Only in debugging-mode, as in general the sending funciton should decide to log or not in the failure callback
				stackObj.cbFailure(1, "Failed to send message within " + stackObj.opt.retryAttempts + " attempts.") // failure callback
				clearInterval(stackObj.opt.interval); // stop the interval
			} else { // some more attempts to do --> send the message again
				stackObj.opt.retryAttempts += 1;
				self.send(stackObj.message);
			}
		},opt.retryInterval)
		
		// send the message
		ws.send(JSON.stringify(mess));
	}

	/**
	 * 
	 */
	function sendRequest (request, responce){

	}

	/**
	 * 
	 * opt must allow to set how many answers are expected before closing the event and rainsing an error if not all were answered. This can be important if the partner has multiple functions listening to the same request and all of themm will send some data back. 
	 */
	function sendRequestAck (request, responce, success=()=>{}, failure){

	}

	// the function that processes the message is external in order to be able to easily copy it to the client. 
	//ws.on('message', (mess)=>{wsExt._onMessage(mess,ws);});
	//ws.on('message', _onMessage);

	function _onMessage(messageRaw){

		// - there are different types of messages that are handled differently
		//  - note: 'one way'; A sends B a message and does not expect an immidiate reqponse on that message
		//  - request: 'two way'; A sends B a request for some data and B answers it directly
		// - there are two possibilities requests and messages:
		//  - with acknowledgement
		//  - without acknowledgement
		// - note is 1/2 way and requests are 2/4 way (without/with acknowledgement)
		// - all messages must have a unique identifier that is valid for the whole note/request (including the Acks and responce): RFC 4122 UUID version 4 is used.
		// - thus, the following message types must exist
		//           Note without Acknowledegemnt
		//  - note: note without acknowledgement; A sends B something and dont care what B does with it 
		//           Note with acknowledgement
		//  - noteSyn: A sends B a note and B has to acknowledge having received the note with noteAck; B does not report what it does with the note and whether it could be processed on a higher layer (it certainly could be processed on websocket-layer, as otherwise it could not acknowledge it)
		//  - noteAck: B acknowledges having received a note from A 
		//           Request without acknowledgement (probably not needed since RequestAck is better)
		//  - Request:  A sends B a request, B processes the request and sends it back to A (responce)
		//  - Responce: B sends A the requested data
		//           Request with Acknowledgement
		//  - RequestSyn: A sends B a request and wants acknowledgement (RequestAck)
		//  - RequestAck: B acknowledges having received the request from A and will start processing it and then send it back with reponceSyn 
		//  - ResponceSyn: B sends the requested data back to A and awaits the acknowledgement of A having received it
		//  - ResponceAck: A acknowledges having received the responce
		//           General
		//  - Error: if anything goes wrong when B processes the websocket-layer --> simply send A an error and the identifier 
		//  - TODO: Room-stuff
		//
		// ACK should not be sent before the message was succefully processed on the ws-layer

		// Note: noteSyn, RequestSyn, ResponceSyn: all of them require having a system that sends the syn, awaits for ack and sends the syn again if the ack is not received with a certain maount of time. This system is always the same --> TODO: find a way how this can be done with only one function!

		//  -  the server probably needs to have a list of requests that are currently processed in order to drop the same request if the client sends it again, when it did not receive the requestAck
		//
		// --> the acknowledgements shall be handled with closures (to know what to do when it arrives or does not arrive). Additionally a list of all open requests
		// - custom ping/pong messages could be implemented in the future, when needed. The Websocket protocol itself knows some kind of ping/pong, but which cannot be handled/accessed/controlled by the user. So, a custom implementation would be on top of that as a normal note. 
		// - access / leaving groups (internally uses note with ack)
		// - broadcasts in group (currently not form the client!)
		// - broadcast overall (currently not from the cleint!)
		// - ...

		/* 
		every message should have:
		- type: note, noteSyn, noteAck, request, response, requestSyn, requestAck, responseSyn, responseAck, ...
		- stamp: a unique hash
		- 
		- a reponse must have a unique identifier too to be able to count the different reponses
		[[[- eventName: the name of the event that shall be called at the partner. It can be empty too. All functions listening to that event are called one after the other. ATTENTION: It must be possible to define some events that allow only one function listening. This can be very important for ]]]
		*/




		// GEDANKEN: 
		/*
		- eventuell macht es Sinn, die Unterscheidung nach eventName auf eine weitere Schicht nach unten zu delegieren, da dies nicht direkt mit der ganzen Syn/Ack geschichte zu tun hat

		*/



		// notes: 
		// - one Event is not one room, so it is not reasonable to use the events itself and simply create an event as a room
		// - can a room be an event? maybe yes. So a room would be a normal event. This room would listen to all possible events for that room and simply spread the event to the other clients --> could work, except that then also the sending client recieves the event again...
		// - we dont need events on the server, just rooms?!? The server could either be called explicitly based on the event raised or he also subscribes to that room. 
		// - how does the note/request system work together woth the rooms/events? Do we treat all messages and requests the same and simply hand them over to the events? Or do we need special types for the room stuff and for the other stuff? --> actually the rooms belong to the websocket-stuff, as it is kind of a broadcast.

		// the solution is: (normally in our use, where the server has to act:) no message from a client should automatically be sent to any other clients, but the server should do that. (If for example a faked result a client sends to the server, the server must process the result and realize that it is wrong and thus NOT send thie result to the other clients!) If there is need to broadcast from clients, a dummy function on the server can be defined that does exactly this. but for the liveResults/Athleteica functionality this should not be needed. In Socket.IO it is also not possible to emit to rooms from the clients. 

		// events could be cascaded: events can have parents that are cllaed too: e.g. a client adds a result in the event xy, so every client showing this event must get the information, but also the general event for new/changed results in any event must be called (e.g. for live Results)

		// messageRaw should be a json object:
		
		logger.log(99, "Message recieved per ws: " + messageRaw);

		var message = {}
		try{
			message = JSON.parse(messageRaw); 
		}catch(error){
			// TODO
			// send Error to client

		}
		if (!('type' in message)) {
			// the websocket request cannot be parsed without type and thus is simply dropped
			logger.log(7, 'The message "' + messageRaw.toString() + '" has no "type"-property and thus is deleted/dropped.')
			return;
		}

		// switch / case would be nice here and exists in JS; but it requires the unhandy use of "break;"" at the end of every case in order not to go though all the rest, so dont use it!
		messagetypes = {
			note: function (){
				// process the message
				console.log(message);
				console.log("the data that was sent: " + message.data);
			},
			noteSyn: function (){ 
				// process the message (make sure we did not already receive it!) and respond with noteAck
				let respond = {};
				respond.type = "noteAck";
				respond.stamp = uuidv4();
				respond.synStamp = message.stamp;

				ws.send(JSON.stringify(respond));
			},
			noteAck: function(){
					// check validity
				if (!message.synStamp){
					sendError("noteAck is not valid without synStamp!");
				} else {
					// stop the interval and delete the open MessSyn-element in the queue
					clearInterval(ws.stackNote[message.synStamp].opt.interval);
					delete ws.stackNote[message.synStamp];
				}
			},
			request: function () {
				// process the request by answering it accordingly
			},
			response: function() {
				// a reponse to a request is received
			},
			requestSyn: function() {
			},
			requestAck: function() {
			},
			responseSyn: function() {
			},
			responseAck: function() {
			},
			error: function () {
				logger.log(7, 'A client returned an error for a ws-package: ' + message.toString());
			}
			// TODO extend with room-stuff
				
		}

		if (typeof(messagetypes[message.type]) == 'function'){
			messagetypes[message.type]()
		} else {
			logger.log(7, message.type + ' is not a supported type of WebSocket data.');
		}

		/*switch(message.type){
			case 'note':
				// process the message
				console.log(message);
				console.log("the data that was sent: " + message.data);
			case 'noteSyn': 
				// process the message (make sure we did not already receive it!) and respond with noteAck
				let respond = {};
				respond.type = "noteAck";
				respond.stamp = uuidv4();
				respond.synStamp = message.stamp;

				ws.send(JSON.stringify(respond))

			case 'noteAck':
					// check validity
				if (!message.synStamp){
					sendError("noteAck is not valid without synStamp!");
				} else {
					// stop the interval and delete the open MessSyn-element in the queue
					clearInterval(ws.stackNote[message.synStamp].opt.interval);
					delete ws.stackNote[message.synStamp];
				}

			case 'request': 
				// process the request by answering it accordingly

			case 'response':
				// a reponse to a request is received
			
			case 'requestSyn':

			case 'requestAck':

			case 'responseSyn':

			case 'responseAck':

			case 'error':
				logger.log(7, 'A client returned an error for a ws-package: ' + message.toString());

			// TODO extend with room-stuff

			default:
				logger.log(7, message.type + ' is not a supported type of WebSocket data.');
		}*/

		logger.log(99, "message arrived: " + messageRaw.toString()) 
	}
	ws.addEventListener('message',(data)=>{logger.log(99, "message arrived2: " + data.toString()) })
