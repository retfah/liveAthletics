// MAIN TODO: 
// - error handling: what happens if the connection is closed before everything was sent? --> we need something as is implemented for the pages, where there is a list of 
// - the syn-ack stuff might be important if there is no feedback whether or not the message could be sent. With ws in node, the information about whether it could be sent is available. But on the client? If it is not available there, we must care about, what happens if anote/request message does not arrive respectively if it is not acknowledged. For requests, at least the sending is retried until acknowledgement and thus for requests a more complex implementation (acknowledging the arrival of the request and the response) is not absolutely needed, given the software basing on it is able to handle the case of missing acknowledgement. 
// - REMOVE all syn/ack differentiation: Websockets run on TCP; that means, we do not need the syn/ack stuff, as it is guaranteed that the messages do arrive, as long as there is a connection (Yes, but what if it fails during sending?)
// the implementation shall be such that we assume a non-reliably Websocket connectoin, meaning that when we send data, we do not rely on a feedback of the Websocket-implementation whether the data has arrived or not (as this is not available in some implementations), but we wait on our own feedback from the wsExtension of teh partner. 


// this file shall contain all stuff needed for the framwwork that extends the basic websocket-capabilities with syn/ack notes and requests. Thus this fraework is one layer above ws
// The same code shall be runnable on the client and the server

// rooms are actually one layer above, since entering a room and leaving it are simple requests (with hopefully response true)

/** --- TODO ---- 
 * - some stuff written to the stacks is actually never needed again --> dont store this for perfomance reasons.
 * - many things are not hacking safe; e.g. calls on the stack with fake stamps that do not exist as indices
 * - think about: what happens, if an ack does not arrive? make sure the 're-sent' syn does not result in a second execution of something.
 * 
*/

/**
 * Error Codes:
 * 1-10: reserved for errors in the connection :
 * 1, request, noteAck: no answer during all the attempts, but the connection is running. The server might still be working on the request, but the request is closed now anyway. That means, if the answer arrives later, it will not be processed anymore! TODO: should we implement another system, where the requesting function can decide, whether it want to wait furtehr or to delete the reqreust ffrom the stack?
 * 2, request, noteAck: no response until the connection was lost. (independent on the number of attempts made until the loss of connection)
 * 3, request: (TODO) no response until timeout, but the request was received on the server. 
 * 11-...: error codes for stuff running over the websocket-connection through the wsExtension
 *   rooms: 
 * 	   11-20: error codes for internal server errors (e.g. if a function returns non-correct objects)
 * 	   21-: error codes for in-function errors, specifically for each function; e.g. when the data cannot be processed
 */


/**
 * The class extending the basic ws connection with four different types of data trasfer: notes with/without acknowledgements and request/response with/without acknowledgement
 * NOTE: currently, when this class is used, a global logger-object called logger must exist! --> change this in the long run
 */
//wsExtensionClass: class wsExtensionClass {
	module.exports  = class wsExtensionClass{

		/**
		 * 
		 * @param {function} sendingFunc The function to be called for sending a message with the only parameter beeing the message.
		 * @param {function} incomingNoteFunc The function called when a note arrives. One parameter: the note. TODO: probably some info about the wsConnection / the webSocket-Partner is needed too and should be part of a second parameter.
		 * @param {function} incomingRequestFunc The function called when a request arrives. Two parameters: the request, the function to respond. The function to respond takes one argeument: the reponce. TODO: probably some info about the wsConnection / the webSocket-Partner is needed too and should be part of a second parameter.
		 * @param {logger} logger The logger instance
		 */
		constructor(sendingFunc, incomingNoteFunc, incomingRequestFunc, logger){
			// the constructor initializes everything (e.g. stacks) after the connection has been established
			this.stackNoteAck = {}; // stack for acknowledged notes
			this.stackRequest = {}; // stack for non-acknowledged requests
			this.stackRequestAck = {}; // stack for acknowledged requests
			this.sendingFunc = sendingFunc; // the function that has to be called for sending messages; the wsExtension class will call the sendingFunc with one argument: the message
			this.logger = logger
	
			// a variable to be set to true as soon as the connection is getting or is closed. It serves the purpose that the instance of this wsExtension knows when it has no sense anymore to retry to send something. 
			this.closing = false;

			// add functions to which the messages are passed to; they will be called with one or two arguments: (1): the message, (2): the function to be called to send the response (for request/response only; the argument is the message to be sent)
	
			// TODO: probably it would make sense that requests are automatically answered with an error when an error occurs on the server, such that a client does not need to wait and retry several times, as processing the request will likely fail over and over again. 
			this.incomingNoteFunc = incomingNoteFunc;
			this.incomingRequestFunc = incomingRequestFunc;
			// ... other such functions
		}
	
		/**
		 * sendError: send an error message back to the client
		 * @param {string} error The error message to be sent 
		 */
		sendError(error){
			var mess = {};
			mess.type = "error";
			mess.data = error;
			this.sendingFunc(JSON.stringify(mess));
		}
	
		/**
		 * sendNote:	send a normal note that does not get acknowledged. It is tried to send the note once. When it gets lost, nobody cares.
		 * @param {string} note The note to be sent. 
		 */
		sendNote (note){
			// prepare
			var mess = {};
			mess.type = "note";
			mess.stamp = this.uuidv4();
			mess.data = note;
			
			// send
			this.sendingFunc(JSON.stringify(mess));
		}
	
		/**
		 * sendNoteAck: send a note with acknwoledgement to B. On success (=message recieved by B and on ws-extended-level successfully parsed), the success callback is executed, failure otherwise. The difference to 'request' is that success for a request includes the processing on the partner and it returns 'success' only if the processing on the partner was succeeful while here success is already sent when the note was handles over to the requective funciton on the server.
		 * @param {string / binary} message The message to be sent as string or binary. 
		 * @param {callback} success A callback with parameters TODO.
		 * @param {callback} failure A callback with two self explanatory parameters: code (int) and message (string)
		 * @param {object} opt Object storing parameters for the transmission.:
		 * @param {integer} opt.retryNumber How many times sending should be retried (default = 5 --> 6 attempts)
		 * @param {integer} opt.retryInterval How many milliseconds sending should be retried (default = 1000ms)
		 */
		sendNoteAck (note, success=()=>{}, failure=(errCode, errMsg)=>{}, opt={}){
			var uuid = this.uuidv4(); // get the unique ID for this transmission
			// prepare message to be sent
			var mess = {}
			mess.type = "noteSyn"; // will be answered with noteAck, if everything goes as expected
			mess.stamp = uuid;
			mess.data = note;
			let messString = JSON.stringify(mess);
	
			// create everything needed on the server
			let stackObj = {}
			stackObj.cbSuccess = success;
			stackObj.cbFailure = failure;
			stackObj.message = messString;
			opt.retryNumber = opt.retryNumber || 5; // how many times to retry sending, when no ack has arrived yet; 
			opt.retryAttempts = 0; // no retry yet; this number is increased with every retry until retrynumber is reached --> then the failure-callback is executed	
			opt.retryInterval = opt.retryInterval || 1000; // in ms
			stackObj.opt = opt;
			this.stackNoteAck[uuid] = stackObj;
			// make sure we can access the "this" in the anonymous function
			var self = this;
			// send again if needed; if the acknowledgement already arrived, the interval is stopped by the Ack-arrival and is not executed anymore.
			opt.interval = setInterval(()=>{
				if (stackObj.opt.retryAttempts==stackObj.opt.retryNumber){
					this.logger.log(99, "The following message could not be sent: " + stackObj.message) // write message to log. Only in debugging-mode, as in general the sending function should decide to log or not in the failure callback
					stackObj.cbFailure("Failed to send message within " + (stackObj.opt.retryAttempts+1) + " attempts.", 1) // failure callback
					clearInterval(stackObj.opt.interval); // stop the interval
				} else { 
					// some more attempts to do --> send the message again if there is still a connection

					if (this.closing){
						this.logger.log(99, "The following message could not be sent: " + stackObj.message) // write message to log. Only in debugging-mode, as in general the sending function should decide to log or not in the failure callback
						stackObj.cbFailure("Failed to send message within " + (stackObj.opt.retryAttempts+1) + " attempts because the connection was closed before all attempts were made.", 2) // failure callback
						clearInterval(stackObj.opt.interval); // stop the interval
					} else {
						stackObj.opt.retryAttempts += 1;
						self.sendingFunc(stackObj.message);
					}
				}
			},opt.retryInterval)
			
			// send the message
			this.sendingFunc(messString);
		}
	
		/**
		 * sendRequest: send a request. wait for an answer for some seconds, repeat the request then if no answer has arrived for a few times and finally either call success on success or failure on failure
		 * @param {string / object / binary} message The message to be sent as string or binary. 
		 * @param {callback} success A callback with the response as parameter.
		 * @param {callback} failure A callback with two self explanatory parameters: message (string) and code (int)
		 * @param {object} opt Object storing parameters for the transmission.:
		 * @param {integer} opt.retryNumber How many times sending should be retried (default = 5 --> 6 attempts)
		 * @param {integer} opt.retryInterval How many milliseconds sending should be retried (default = 1000ms)
		 */
		sendRequest (request, success=(response)=>{}, failure=(errMsg, errCode)=>{}, opt={}){

			var uuid = this.uuidv4(); // get the unique ID for this transmission
			// prepare message to be sent
			let mess = {};
			mess.type = "request"; // will be answered with noteAck, if everything goes as expected
			mess.stamp = uuid;
			mess.data = request;
			
			let messString = JSON.stringify(mess);

			// create the object for the stack: stores everything needed/defined in this message
			let stackObj = {};
			stackObj.cbSuccess = success;
			stackObj.cbFailure = failure;
			stackObj.message = messString; 

			// initialize the options of the request
			opt.retryNumber = opt.retryNumber || 5; // how many times to retry sending, when no ack has arrived yet; 
			opt.retryAttempts = 0; // no retry yet; this number is increased with every retry until retrynumber is reached --> then the failure-callback is executed	
			opt.retryInterval = opt.retryInterval || 1000; // in ms
			stackObj.opt = opt;

			// add to stack
			this.stackRequest[uuid] = stackObj;

			var self = this;
			
			// start the interval of checking if the response has arrived already. Store the interval-handle to be able to stop it as soon as the reqponce has arrived.
			opt.interval = setInterval(()=>{

				if (stackObj.opt.retryAttempts==stackObj.opt.retryNumber){
					this.logger.log(99, "The following message could not be sent: " + stackObj.message) // write message to log. Only in debugging-mode, as in general the sending function should decide to log or not in the failure callback
					stackObj.cbFailure("Failed to send message within " + (stackObj.opt.retryAttempts+1) + " attempts.", 1) // failure callback
					clearInterval(stackObj.opt.interval); // stop the interval
					delete self.stackRequest[mess.stamp]; // delete the request from the stack. Otherwise it could happen, that a late arrival of a response, after the error funciton was already raised, would still result in calling the success-function, what the calling funcitons would not be prepared for!
				} else { // some more attempts to do --> send the message again
					if (this.closing){
						this.logger.log(99, "The following message could not be sent: " + stackObj.message) // write message to log. Only in debugging-mode, as in general the sending function should decide to log or not in the failure callback
						stackObj.cbFailure("Failed to send message within " + (stackObj.opt.retryAttempts+1) + " attempts, because the connection was closed before all attempts were made.", 2) // failure callback
						clearInterval(stackObj.opt.interval); // stop the interval 
					} else {
						stackObj.opt.retryAttempts += 1;
						self.sendingFunc(stackObj.message);
					}
				}
			}, opt.retryInterval)

			// finally, send the request
			this.sendingFunc(messString);
		}
	
		/**
		 * sendRequestAck: send a request with  acknowledgements for each way.
		 * opt must allow to set how many answers are expected before closing the event and rainsing an error if not all were answered. This can be important if the partner has multiple functions listening to the same request and all of them will send some data back. 
		 * @param {string / object / binary} message The message to be sent as string or binary. 
		 * @param {callback} success A callback with the response and the counter as parameter. The counter indicates the number of the response that arrived (might be importnat for requests with multiple responses).
		 * @param {callback} failure A callback with two self explanatory parameters: code (int) and message (string)
		 * @param {object} opt Object storing parameters for the transmission.:
		 * @param {integer} opt.retryNumber How many times sending should be retried (default = 5 --> 6 attempts)
		 * @param {integer} opt.retryInterval How many milliseconds sending should be retried (default = 1000ms)
		 * @param {integer} opt.answerNumber How many answers are expected (default=1). Setting it to zero allows to wait for infinite reponses or until a reponse has the flag 'lastReponse'. Attention: not ending many requests might lead to problems if the stack grows too much!
		 * @param {integer} opt.answerTimeoutFirst How many milliseconds to wait at max for the reponses after request-ack did arrive
		 * @param {integer} opt.answerTimeoutInterval How many milliseconds to wait at max for the next reponse to arrive, after the first did arrive
		 */
		//@param {integer} opt.answerTimeoutLast How many milliseonds to wait for the last reponse, after the request-ack --> not implemented yet
		/*sendRequestAck (request, success=(response, counter)=>{}, failure=(errCode, errMsg)=>{}, opt={}){
			// get the unique ID for this transmission
			var uuid = this.uuidv4(); 

			// prepare message to be sent
			let mess = {};
			mess.type = "requestSyn"; // will be answered with noteAck, if everything goes as expected
			mess.stamp = uuid;
			mess.data = request;

			let messString = JSON.stringify(mess);

			// create the object for the stack: stores everything needed/defined in this message
			let stackObj = {};
			stackObj.cbSuccess = success;
			stackObj.cbFailure = failure;
			stackObj.message = messString; 

			// initialize the options of the request
			opt.retryNumber = opt.retryNumber || 5; // how many times to retry sending, when no ack has arrived yet; 
			opt.retryAttempts = 0; // no retry yet; this number is increased with every retry until retrynumber is reached --> then the failure-callback is executed	
			opt.retryInterval = opt.retryInterval || 1000; // in ms
			opt.answerNumber = opt.answerNumber || 1; // how many answers are expected; 0 = infinite
			opt.answerTimeoutFirst = opt.answerTimeoutFirst || 5000; // how long to wait after request-ack for the first reponse
			opt.answerTimeoutInterval = opt.answerTimeoutInterval || 5000; // how long to wait after each reponse 
			opt.state = 1;  // state: 	1 = request-syn sent
							//			2 = request-ack arrived
							// 			3 = response-syn arrived, reponse ack sent?

							// when to close the request, without waiting for an answer
							// what to do when a reponse arrives that is not on te stack (anymore) (e.g. when the reponse ack did not arrive or the request was closed as the answer took too long to arrive)
			stackObj.opt = opt;

			// add to stack
			this.stackRequestAck[uuid] = stackObj;

			var self = this;
			// TODO: continue here!
			// start the interval of checking if the response has arrived already. Store the interval-handle to be able to stop it as soon as the reqponce has arrived.
/*			opt.interval = setInterval(()=>{

				if (stackObj.opt.retryAttempts==stackObj.opt.retryNumber){
					this.logger.log(99, "The following message could not be sent: " + stackObj.message) // write message to log. Only in debugging-mode, as in general the sending function should decide to log or not in the failure callback
					stackObj.cbFailure("Failed to send message within " + stackObj.opt.retryAttempts + " attempts.",1) // failure callback
					clearInterval(stackObj.opt.interval); // stop the interval
				} else { // some more attempts to do --> send the message again
					stackObj.opt.retryAttempts += 1;
					self.sendingFunc(stackObj.message);
				}
			}, opt.retryInterval)*/
			/*
			// finally, send the request
			this.sendingFunc(messString);

		}*/
	
	
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
	
	
		// the function that processes the incoming messages;
		// with that kind of class structure, onMessage has automatically also access to the stackNoteAck and stuff
		_onMessage(messageRaw){
	
			// - there are different types of messages that are handled differently
			//  - note: 'one way'; A sends B a message and does not expect an immidiate reqponse on that message
			//  - request: 'two way'; A sends B a request for some data and B answers it directly
			// - there are two possibilities requests and messages:
			//  - with acknowledgement
			//  - without acknowledgement
			// - note is 1/2 way and requests are 2/4 way (without/with acknowledgement)
			// - all messages must have a unique identifier that is valid for the whole note/request (including the Acks and response): RFC 4122 UUID version 4 is used.
			// - thus, the following message types must exist
			//           Note without Acknowledegemnt
			//  - note: note without acknowledgement; A sends B something and dont care what B does with it 
			//           Note with acknowledgement
			//  - noteSyn: A sends B a note and B has to acknowledge having received the note with noteAck; B does not report what it does with the note and whether it could be processed on a higher layer (it certainly could be processed on websocket-layer, as otherwise it could not acknowledge it)
			//  - noteAck: B acknowledges having received a note from A 
			//           Request without acknowledgement (probably not needed since RequestAck is better)
			//  - Request:  A sends B a request, B processes the request and sends it back to A (response)
			//  - response: B sends A the requested data
			//           Request with Acknowledgement
			//  - RequestSyn: A sends B a request and wants acknowledgement (RequestAck)
			//  - RequestAck: B acknowledges having received the request from A and will start processing it and then send it back with reponceSyn 
			//  - responseSyn: B sends the requested data back to A and awaits the acknowledgement of A having received it
			//  - responseAck: A acknowledges having received the response
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
			
			this.logger.log(99, "Message recieved per ws: " + messageRaw); // can a  class access a global object
	
			var message = {}
			try{
				message = JSON.parse(messageRaw); 
			}catch(error){
				// TODO
				// send Error to client
	
			}
			if (!('type' in message)) {
				// the websocket request cannot be parsed without type and thus is simply dropped
				this.logger.log(7, 'The message "' + messageRaw + '" has no "type"-property and thus is deleted/dropped.')
				return;
			}
	
			// switch / case would be nice here and exists in JS; but it requires the unhandy use of "break;"" at the end of every case in order not to go though all the rest, so dont use it!
			var self = this;
			var messagetypes = {
				note: ()=>{

					// process the message
					self.incomingNoteFunc(message.data);
				},
				noteSyn: ()=>{ 
					// process the message (make sure we did not already receive it!) and respond with noteAck
					let respond = {};
					respond.type = "noteAck";
					respond.stamp = self.uuidv4();
					respond.synStamp = message.stamp;
					// no respond.data here...
	
					// acknowledge receiving the message
					self.sendingFunc(JSON.stringify(respond));
					
					// process the message
					self.incomingNoteFunc(message.data);
				},
				noteAck: ()=>{
					// check validity
					if (!message.synStamp){
						self.sendError("noteAck is not valid without synStamp!");
					} else {

						if (message.synStamp in self.stackNoteAck){

							// call the success-callback
							self.stackNoteAck[message.synStamp].cbSuccess();

							// stop the interval and delete the open MessSyn-element in the queue
							clearInterval(self.stackNoteAck[message.synStamp].opt.interval);
							delete self.stackNoteAck[message.synStamp];

						} else {
							this.logger.log(3, 'Stamp was not on stack. This happens when 1) (unlikely) somebody tries to hack you or 2) (likely) the server was very busy and could not send you an answer within you default waiting time so you sent the requst again and the server finally also processed every request (n-1 times for nothing...) or 3) (little likely) two responses were sent for the same request and thus the request was already removed from the stack. It is not allowed to have more than one response (currently) and thus the now received (second or later) response is unhandled/deleted.')
						}
					}
				},
				request: ()=> {
					// process the request by answering it accordingly
					// call the incomingRequestFunction and pass it the function to be called witrh the reponce as argument

					// if the failurecode=0, everything is normal
					// if there was an error, the failurecode is the respective code and the response is the error-message as string.
					// create the reponce-funciton
					let responseFunc = (response, failureCode=0)=>{
						// create the response
						let respond = {};
						respond.type = "response";
						respond.stamp = self.uuidv4();
						respond.requestStamp = message.stamp;
						respond.failureCode = failureCode; // this flag is used to report an error (new 3.2019)
						respond.data = response;

						// send the response
						self.sendingFunc(JSON.stringify(respond))
					};

					// process the request
					self.incomingRequestFunc(message.data, responseFunc);

				},
				response: ()=> {
					// a reponse to a request is received, process it and delete the request from the stack

					if (!message.hasOwnProperty('requestStamp') || !message.hasOwnProperty('failureCode')){
						self.sendError("response is not valid without properties 'requestStamp' and 'failureCode'!");
					} else {
						if (message.requestStamp in self.stackRequest){
							if (message.failureCode){ // failurecode is the statusCode; 0=no failure and the success-callback is called
								// call the failure callback
								self.stackRequest[message.requestStamp].cbFailure(message.data, message.failureCode);
							}else{
								// call success callback
								self.stackRequest[message.requestStamp].cbSuccess(message.data);
							}
							// stop the interval and delete the request from the stack
							clearInterval(self.stackRequest[message.requestStamp].opt.interval);
							delete self.stackRequest[message.requestStamp];
						} else {
							this.logger.log(3, 'Stamp was not on stack. This happens when 1) (unlikely) somebody tries to hack you or 2) (likely) the server was very busy and could not send you an answer within your default waiting time so you sent the requst again and the server finally also processed every request (n-1 or even n times (when none of the replys came within the time between the first and the last request) for nothing...) or 3) (little likely) two responses were sent for the same request and thus the request was already removed from the stack. It is not allowed to have more than one response (currently) and thus the now received (second or later) response is unhandled/deleted.')
						}
						
					}

				},
				/*requestSyn: function() {
				},
				requestAck: function() {
				},
				responseSyn: function() {
				},
				responseAck: function() {
				},*/
				error: ()=> {
					this.logger.log(7, 'A client returned an error for a ws-package: ' + message.data.toString());
				}
			}
	
			if (typeof(messagetypes[message.type]) == 'function'){
				messagetypes[message.type]()
			} else {
				this.logger.log(7, message.type + ' is not a supported type of WebSocket data.');
			}
	
			this.logger.log(99, "message arrived: " + messageRaw.toString()) 
		}
	
	}