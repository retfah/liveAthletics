
// TODO: change the text to mention that the responding party can decide between response and repsonseAck and that therefore there is only one common requestStack 

/**
 * How WebSockets and TCP work; especially how connection errors are detected
 * TCP: 
 * - opens a connection between client and server, which in the case of ws is kept open. 
 * - Starting up the connection is acknowledged (Syn, Syn/Ack, Ack), as well as every piece of data sent through the tcp connection. 
 * - TCP does not necessarily have heartbeat signal to realize when the connection has failed. In contrast: it might try for hours to connect to a unreachable server or resend some data without raising an error to the calling application. 
 * - Heartbeats basically exist in the form of TCP-keep-alive packages, which can help to notify routers between both ends to keep the connection open. (Note that this might be e.g. important for NAT-Routers.) In an experimental investigation with wireshark the same browser/OS combination on two different computers once "never" (>several minutes) sent keep-alive packages, while the other sent one every 45s. !!! Additionally, I don't know whether a connection error would be raised on keep-alive-ack-failure or not!!! So we cannot rely on tcp-things to detect a connection error. If e.g. a netweork cable was removed on one side, this computer might raise on error, since removing the cable is electrically realized. (Exemplary investigation: the browser does not realize it or at least does not change the ready-state of the ws-connection.) The other end of the connection woudl not realize it (=> the connection is then called half-open). 
 * - The only way, how a failed tcp-connection can be detected if by some sort of heartbeats/keep-alive packages and timeouts. See e.g. https://www.codeproject.com/Articles/37490/Detection-of-Half-Open-Dropped-TCP-IP-Socket-Conne
 * 
 * WebSocket: 
 * - RFC 6455: https://tools.ietf.org/html/rfc6455
 * - WsApi (in browsers): https://html.spec.whatwg.org/multipage/web-sockets.html
 * - Connection is established through an "Upgrade" from a regular http connection, which is tcp as well. The underlying tcp connection will then be kept open. 
 * - WS knows 4 states (in WsApi in browsers called readyState, number in parantheses: CONNECTING (0), OPEN (1), CLOSING (2); CLOSED (3). It is connecting dureing the handshakes at the beginning and then open. As soon as one client wants to close the connection, the status on the client is closing, until the closing ack arrives at the client again, when the status changes to closed. 
 * - WS defines special ping and pong frames, meant to check the connection state. An incoming ping frame MUST be answered with pong. In the WsApi used in browsers, it is unfortunately not possible yet (2021-03) to send pings or raise an event on incoming pings. Therefore, the ping/pong must be implemented in wsExtension!
 * - Unfortunately, ws does not raise an error if sending a request fails (or at least it is not documented). Probably because it would first retry sending for some undocumented time.
 * - Experiment: removing the ethernet cable does not change the state of the connection (still OPEN...). It took roughly 18 seconds after "sending" (trying to) a message over the dead connection until the onerror/onclose event (one of those events; actually I dont know when onerror is raised) was raised. This shows again, that some kind of heartbeam must be implemented in wsExtension.
 * - Experiment: shutting down or killing the server (on Windows) is NOT equivalent to a detached cable! It seems that the sockets handling is done by the OS and killing the server means that the reserved port gets free and the socket related to it are closed with a final RST/ACK (i.e. not a normal closing, but a least a message is sent). This leads to a termination of the connection on the client, which is not the same as if the cable was detached, where no closingEvent would be raised. 
 * 
 * wsExtension: 
 * - This class is basically a wrapper around a ws-connection, implementing heartbeats (ping/pong) on application level and providing its own syn/ack for requests and notes. 
 * - Acknowledged notes/requests raise events on failure, after a certain timeout. (Successfull events raise success-events on success.)
 * - Implementation of ping/pong: 
 *   - 1. assume a basic round trip time, e.g. rtt=1s
 *   - 2. send a ping every max(2s, 10*rtt) and wait max(10s, 50*rtt) for responses. If no response is received within this duration, the connection is deemed failed and thus explicitly closed. 
 *   - always monitor the rtt; e.g. recalculate it as the mean over the last n pings. (I suggest to use n=2 only, to react fastly if the connection gets slower/congested or the server has a high workload.) 
 * - Implementation of acknowledged notes: 
 *   - one side sends a note, the other side immediately answers with an ack (I mean an ack in wsExtension, not an ack on tcp level).
 *   - possible outcomes from the point of view of the sender:
 *     - success: ack arrives --> success called
 *     - fail 1: ack does not arrive on time
 *     - fail 2: before timeout, the connection is deemed broken
 *   - possible outcomes from the point of view of the receiver:
 *     - fail 1: ack cannot be sent, if in the extremely (!) rare case that the connection closes between receiving the note and sending the ack
 *  - Implementation of acknowledged requests:
 *    - one side sends out a request, the other side immediately sends ack; if the ack does not arrive within a certain period of time (which should be lower than 10s given by the ping-stuff) the request is resent (given the connection is still up)
 *    - possible outcomes on requesting party:
 *      - success 1: request-ack and response arrive, response-ack is sent
 *      - "success" 2: extremely rare case: response arrives, but connection terminates before response-ack is sent
 *      - fail 1: request-ack does not arrive, since the connection is lost before it arrived and before the timeout is over
 *      - fail 2: request-ack does not arrive in time, but connection iO.
 *      - fail 3: request-ack arrived, but the connection is lost before the reqponse arrived and before the timeout is over
 *      - fail 4: request-ack arrived, but no response arrived on time, but connection iO.
 *    - possible outcomes on the responding party:
 *      - success: when the requestAck arrives within the timeout
 *      - (fail 0: the requestAck cannot be sent, since the conenction is already closed. In that extremely rare case, the request shall not be processed at all.)
 *      - fail 1: response cannot be sent since the connection was lost already
 *      - fail 2: responseAck did not arrive within the timeout
 *  - Implementation of unacknowledged requests
 *      - see error codes of ack-notes
 *      - possible outcomes on requesting party:
 * 		  - success 1: response arrives
 *        - fail 1: connection fails before reqponse arrives
 *        - fail 2: no response arrives within the timeout
 *      - possible outcomes on the responding party:
 *        - fail 1: connection closed while the request was processed
 * 
 */

// Why this is needed: 
// - Websockets run on TCP, which basically would guarantee that messages arrive thank to the acknowledgements. But since the information about whether a message was successfully is not given to the webSocket class, we still need to create out own syn/ack on the websocket level. 


// MAIN TODO: 
// - check all error codes again!
// - the syn-ack stuff might be important if there is no feedback whether or not the message could be sent. With ws in node, the information about whether it could be sent is available. But on the client? If it is not available there, we must care about, what happens if anote/request message does not arrive respectively if it is not acknowledged. For requests, at least the sending is retried until acknowledgement and thus for requests a more complex implementation (acknowledging the arrival of the request and the response) is not absolutely needed, given the software basing on it is able to handle the case of missing acknowledgement. 


// this file shall contain all stuff needed for the framwwork that extends the basic websocket-capabilities with syn/ack notes and requests. Thus this fraework is one layer above ws
// The same code shall be runnable on the client and the server

// rooms are actually one layer above, since entering a room and leaving it are simple requests (with hopefully response true)

/** --- TODO ---- 
 * - some stuff written to the stacks is actually never needed again --> dont store this for perfomance reasons.
 * - many things are not hacking safe; e.g. calls on the stack with fake stamps that do not exist as indices
 * - think about: what happens, if an ack does not arrive? make sure the 're-sent' syn does not result in a second execution of something.
 * - 
*/

/**
 * Error Codes:
 * // TODO: recheck the codes!
 * 1-10: reserved for errors in the connection :
 * 1, request: no response until timeout, neither an ack nor the response
 * 2, request: no response until timeout, but ack received
 * 3, request: connection lost before an ack (for the request) arrived. The request might get processed anyway!
 * 4, request: connection lost before the response arrived, but the request was acknowledged
 * 5, request: timeout after response received, but before execution
 * 6, request: connection lost after response received, but before execution
 * 7, request: request certainly not processed, as ack before executionAckCount did not even arrive.
 * 1, request (status): number of interval reached, after response execution, before last ack
 * 2, request (status): connection lost, after response execution, before last ack
 * 1, noteAck: no answer during all the attempts, but the connection is running. The server might still be working on the request, but the request is closed now anyway. That means, if the answer arrives later, it will not be processed anymore! TODO: should we implement another system, where the requesting function can decide, whether it want to wait furtehr or to delete the reqreust ffrom the stack?
 * 2, request, noteAck: no response until the connection was lost. (independent on the number of attempts made until the loss of connection)
 * 11-...: error codes for stuff running over the websocket-connection through the wsExtension
 *   rooms: 
 * 	   11-20: error codes for internal server errors (e.g. if a function returns non-correct objects)
 * 	   21-: error codes for in-function errors, specifically for each function; e.g. when the data cannot be processed
 */

/**
 * INFORMATION ABOUT THE CALLBACKS:
 * 
When is which callback called?:
- in the sendRequest on the caller (in general client):
  - successCB: as soon as the opt.executeAckCount, defined by the responder (server) (!), is reached and thus the response can be executed
  - failureCB: whenever an error occurs (connection or during processing on the server; can be differentiated by the errCode)
  - statusCB: whenever ANY response/ack/whatever arrives. The caller must differentiate at what state the . 
  - opt.executeAckCount (defined by the caller/client): has no influence on when (after how many acks) the successCB on itself is executed
  - successCB: (response) =>{}
  - failureCB: (errMsg, errCode, status, lastIncomingAckCount) => {}
  - statusCB: (status, lastIncomingAckCount) => {} 
    - status: 
	  1 = request sent, but execution on responder was not yet started
	  2 = request sent and responder (server) might have started to process the request
	  3 = responder (server) has started to process the request (i.e. at least one ack after opt.executeAckCount has arrived on the caller)
	  4 = response received, not started to process (because of opt.executeAckCount sent from responder (server))
	  5 = response recieved, started to process (or starts now)
  
- when sending the response on the responder/server:
  - there is no successCB, as it is not clear, when success is reached: when the responder sends the ack (or the response itself when executeAckCount=0) that will start the execution on the caller/client and this message is not acknowledged (e.g. because of an interruption in the connection before an ack could be received), the responder/server does not know whether the client has received the execution request. (The same problem appears during sending of the request on the client.) However, the function on the responder/server that has processed the request can decide by itself when success is reached by listening to the statusCB, where the status even indicates the current state. Apart of that there is the failureCB, called whenever the connection fails.  
  - statusCB wird bei jedem eintreffenden Ack ausgelöst. Die übergebene Funktion muss selber filtern, auf welche Ack's es reagieren soll. 
  - statusCB: (status, lastIncomingAckCount)=>{}
    - status:
	  11 = response sent, but execution on caller (client) was not yet started
	  12 = response sent and caller (client) might have started to process the response
	  13 = caller (client) has started to process the response (i.e. at least one ack after opt.executeAckCount has arrived on the responder)
  - failureCB only on connection error or on timeout
  - failureCB: (errMsg, errCode, status, lastIncomingAckCount) => {}

 */


/** log levels
 * default winston log levels (from here: https://sematext.com/blog/node-js-logging/): 
 * 0: error		errors that cannot be handled by the calling functions, e.g. errors about packages that cannot be processed. (They are not fatal in a way that it crashed. )
 * 1: warn		errors that are anyway reported to the calling functions (e.g. by calling cbFailure)
 * 2: info		not used
 * 3: verbose	e.g. all incoming messages
 * 4: debug		ping/pong messages
 * 5: silly		not used
 */

/**
 * The class extending the basic ws connection with four different types of data trasfer: notes with/without acknowledgements and request/response with/without acknowledgement
 */
//wsExtensionClass: class wsExtensionClass {
	class wsExtensionClass{

		/**
		 * 
		 * @param {function} sendingFunc The function to be called for sending a message with the only parameter beeing the message.
		 * @param {function} closingFunction A function to be called to close the websocket connection. Used when the heartbeats are not successful anymore.
		 * @param {function} incomingNoteFunc The function called when a note arrives. One parameter: the note. TODO: probably some info about the wsConnection / the webSocket-Partner is needed too and should be part of a second parameter.
		 * @param {function} incomingRequestFunc The function called when a request arrives. Two parameters: the request, the function to respond. The function to respond takes one argeument: the reponce. TODO: probably some info about the wsConnection / the webSocket-Partner is needed too and should be part of a second parameter.
		 * @param {logger} logger The logger instance
		 * @param {function} cbTest A function that is called on every incoming request and that is given the complete message. Intended only for testing and used here to simulate a busy server (i.e. a slow responding server). The only property given is the parsed message. The message is then used 
		 */
		constructor(sendingFunc, closingFunction, incomingNoteFunc, incomingRequestFunc, logger=()=>{}, openOnConstruct=true, cbTest=(message)=>{}){
			// the constructor initializes everything (e.g. stacks) after the connection has been established
			this.stackNote = {}; // stack for acknowledged notes
			this.stackRequest = {}; // stack for any kind of requests
			this.stackResponse = {}; // stack for acknowledged responses 

			this.sendingFunc = sendingFunc; // the function that has to be called for sending messages; the wsExtension class will call the sendingFunc with one argument: the message
			this.closingFunc = closingFunction;
			this.logger = logger;
			this.cbTest = cbTest;
	
			// a variable to be set to true as soon as the connection is getting or is closed. It serves the purpose that the instance of this wsExtension knows when it has no sense anymore to retry to send something. 
			// we assume that when this class is instantiated, the ws connection is not yet established (!)
			this.closing = true;

			// add functions to which the messages are passed to; they will be called with one or two arguments: (1): the message, (2): the function to be called to send the response (for request/response only; the argument is the message to be sent)
	
			this.incomingNoteFunc = incomingNoteFunc;
			this.incomingRequestFunc = incomingRequestFunc;

			// heartbeat 
			this.heartbeat = {};
			// the interval is given by max(minInterval, rrtIntervalMultiplicator*rtt)
			this.heartbeat.minInterval = 2; // s
			this.heartbeat.rttIntervalMultiplicator = 10;
			// the timeout in which the answer must arrive is given by max(minTimeout, rrtTimeoutMultiplicator*rtt)
			this.heartbeat.minTimeout = 10; // s
			this.heartbeat.rttTimeoutMultiplicator = 50;
			// the last and current rtt are just the last two rtt of the heartbeats, wher ethe pong came back, independent of their order 
			this.heartbeat.lastRTT = 1; // s
			this.heartbeat.currentRTT = 1; // s
			this.heartbeat.nSent = 0; // count the number of sent heartbeats (the counter is increased just before the next heartbeat is being sent)
			this.heartbeat.nLastArrived = 0; // remember the last arrived heartbeat --> write to logger, if the hertbeats do not arrive in the right order
			// Note: we actually do not create an interval (but a timeout), since the interval time is changing every time!
			this.heartbeat.sent = {}; // an object storing the sent heartbeats; the property is "H1" for the heartbeat with number 1 and so on
			this.heartbeat.timeoutNext = undefined; // the timeout to send the next heartbeat

			if (openOnConstruct){
				this.open();
			}

		}

		// connection established
		open(){
			this.closing = false;

			this.sendHeartbeat();
		}

		/**
		 * Function to be called when the ws-connection is closing/closed
		 */
		close(){
			this.closing = true;

			// stop the timout for the next heartbeat
			clearTimeout(this.heartbeat.timeoutNext);

			// stop the timeouts of the running heartbeats:
			for(let sHB in this.heartbeat.sent){
				//let nHB = Number(sHB.slice(1));
				clearTimeout(this.heartbeat.sent[sHB].timeout)
			}
			this.heartbeat.sent = {}; // probably faster than to delete every single item.

			// 'empty' (=call failure callbacks) all stacks 
			for (let stamp in this.stackNote){
				clearTimeout(this.stackNote[stamp].opt.timeoutHandle);
				this.stackNote[stamp].cbFailure(2, "Connection closed before noteAck arrived.");
			}
			this.stackNote = {}; // faster than deleting single items

			for (let stamp in this.stackRequest){
				clearTimeout(this.stackRequest[stamp].opt.timeoutHandle);
				this.stackRequest[stamp].cbFailure(3, "Connection closed before response arrived."); 
			}
			this.stackRequest = {}; // faster than deleting single items

			for (let stamp in this.stackResponse){
				clearTimeout(this.stackResponse[stamp].opt.timeoutHandle);
				this.stackResponse[stamp].cbFailure(2, "Connection closed before responseAck arrived.");
			}
			this.stackResponse = {}; // faster than deleting single items

		}

		sendHeartbeat(){

			// number of this heartbeat
			let nHB = ++this.heartbeat.nSent;

			// create the object for the heartbeat
			let HB = {};
			this.heartbeat.sent['H'+nHB] = HB;

			// prepare the heartbeat
			var mess = {};
			mess.type = "ping";
			//mess.stamp = this.uuidv4(); // actually not really needed here, but soemwhere defined as a requirement
			mess.data = nHB;
			let messStr = JSON.stringify(mess);

			// set the current time right before sending the message, for an accurate RTT calculation
			let d = new Date();
			HB.time = d.getTime(); //get current time (milliseconds since 1.1.1970);

			// send
			this.sendingFunc(messStr);

			this.logger(4, `Ping sent ${nHB}` );

			// timeout for the current heartbeat (until when the pong has to arrive)
			let meanRtt = (this.heartbeat.lastRTT + this.heartbeat.currentRTT)/2;
			let timeoutThis = Math.max(this.heartbeat.minTimeout, this.heartbeat.rttTimeoutMultiplicator * meanRtt)*1000;
			HB.timeout = setTimeout(()=>{
				// remove the heartbeat
				delete this.heartbeat.sent['H'+nHB]

				// close the connection (will also stop the other timeouts)
				//must not call close here, but close the ws-connection, which will then automatically close the wsExtension via the clsoe event. 
				this.closingFunc();
				//this.close();

			}, timeoutThis)

			// set the timeout for the next heartbeat:
			let timeNext = Math.max(this.heartbeat.minInterval, this.heartbeat.rttIntervalMultiplicator * meanRtt)*1000;
			this.heartbeat.timeoutNext = setTimeout(()=>{
				this.sendHeartbeat();
			}, timeNext)


		}
	
		/**
		 * sendError: send an error message back to the client
		 * @param {string} error The error message to be sent 
		 */
		sendError(error){
			var mess = {};
			mess.type = "error";
			mess.data = error;
			let messStr = JSON.stringify(mess);
			this.logger(3, `Error sent per ws: ${messStr}` )
			this.sendingFunc(messStr);
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
			let messStr = JSON.stringify(mess);
			this.logger(3, `Note sent per ws: ${messStr}` )
			this.sendingFunc(messStr);
		}
	
		/**
		 * sendNoteAck: send a note with acknwoledgement to B. On success (=message recieved by B and on ws-extended-level successfully parsed), the success callback is executed, failure otherwise. The difference to 'request' is that success for a request includes the processing on the partner and it returns 'success' only if the processing on the partner was succeeful, while with a note success is already sent when the note was handled over to the requective funciton on the server.
		 * Failure codes:  
		 * - fail 1: ack does not arrive on time (to be handled here)
 		 * - fail 2: before timeout, the connection is deemed broken (to be handled in close)
		 * @param {string / binary} message The message to be sent as string or binary. 
		 * @param {callback} success A callback with parameters TODO.
		 * @param {callback} failure A callback with two self explanatory parameters: code (int) and message (string)
		 * @param {object} opt Object storing parameters for the transmission.:
		 * @param {number} opt.timeout The duration in seconds to wait for an ack. If the ack did not yet arrive after this duration, the failure-callback is raised with code 1.
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
			opt.timeout = opt.timeout || 10; // The duration in seconds to wait for an ack
			stackObj.opt = opt;
			this.stackNote[uuid] = stackObj;

			
			// send again if needed; if the acknowledgement already arrived, the interval is stopped by the Ack-arrival and is not executed anymore.
			opt.timeoutHandle = setTimeout(()=>{

				let errMsg = `No ack arrived within the timeout (${opt.timeout}s) of message ${stackObj.message}. `;
				stackObj.cbFailure(1, errMsg)

				this.logger(1, errMsg) // write message to log. Only in debugging-mode, as in general the sending function should decide to log or not in the failure callback

				// delete the stackObject
				delete this.stackNote[uuid];

			},opt.timeout*1000)
			
			// send the message
			this.logger(3, `NoteAck sent per ws: ${messString}` )
			this.sendingFunc(messString);
		}
	
		/**
		 * sendRequest: send a request. wait for an answer for some seconds
		 * @param {string / object / binary} message The message to be sent as string or binary. 
		 * @param {callback} success A callback with the response as parameter.
		 * @param {callback} failure A callback with four parameters: errorCode (int), errorMessage (string)
		 * @param {object} opt Object storing parameters for the transmission.:
		 * @param {number} opt.timeout The duration in seconds to wait for an ack. If the ack did not yet arrive after this duration, the failure-callback is raised with code 1
		 */
		sendRequest (request, success=(response)=>{}, failure=(errCode, errMsg)=>{}, opt={}){

			// initialize the options of the request
			opt.timeout = opt.timeout || 10; // The duration in seconds to wait for an answer

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
			stackObj.stamp = uuid;
			
			stackObj.opt = opt;

			// add to stack
			this.stackRequest[uuid] = stackObj;

			// start the timeout until which the response must have arrived or otherwise the failureCB is raised
			opt.timeoutHandle = setTimeout(()=>{

				let errMsg = `No response arrived within the timeout (${opt.timeout}s) of message ${stackObj.message}. `;
				stackObj.cbFailure(1, errMsg)

				this.logger(1, errMsg) // write message to log. Only in debugging-mode, as in general the sending function should decide to log or not in the failure callback

				// delete the object from the stack
				delete this.stackRequest[stackObj.stamp];

			}, opt.timeout*1000)

			
			// finally, send the request
			this.logger(3, `Request sent per ws: ${messString}` )
			this.sendingFunc(messString);
		}

		/**
		 * sendRequest: send a request. wait for an answer for some seconds
		 * @param {string / object / binary} message The message to be sent as string or binary. 
		 * @param {callback} success A callback with the response as parameter.
		 * @param {callback} failure A callback with four parameters: errorCode (int), errorMessage (string)
		 * @param {callback} status A callback called when the requestAck arrives
		 * @param {object} opt Object storing parameters for the transmission.:
		 * @param {number} opt.timeout The duration in seconds to wait for an ack. If the ack did not yet arrive after this duration, the failure-callback is raised with code 1
		 */
		sendRequestAck (request, success=(response)=>{}, failure=(errCode, errMsg)=>{}, status=()=>{}, opt={}){

			// initialize the options of the request
			opt.timeout = opt.timeout || 10; // The duration in seconds to wait for an answer

			var uuid = this.uuidv4(); // get the unique ID for this transmission
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
			stackObj.cbStatus = status;
			stackObj.message = messString; 
			stackObj.stamp = uuid;
			
			stackObj.opt = opt;

			// add to stack
			this.stackRequest[uuid] = stackObj;

			// start the timeout until which the response must have arrived or otherwise the failureCB is raised
			opt.timeoutHandle = setTimeout(()=>{

				let errMsg = `No response arrived within the timeout (${opt.timeout}s) of message ${stackObj.message}. `;
				stackObj.cbFailure(1, errMsg)

				this.logger(1, errMsg) // write message to log. Only in debugging-mode, as in general the sending function should decide to log or not in the failure callback

				// delete the object from the stack
				delete this.stackRequest[stackObj.stamp];

			}, opt.timeout*1000)

			
			// finally, send the request
			this.logger(3, `Request sent per ws: ${messString}` )
			this.sendingFunc(messString);
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
			if needed also:
			- stamp: a unique hash
			- 
			- a response must have a unique identifier too to be able to count the different responses
			[[[- eventName: the name of the event that shall be called at the partner. It can be empty too. All functions listening to that event are called one after the other. ATTENTION: It must be possible to define some events that allow only one function listening. This can be very important for ]]]
			*/
	
	
			// TODO: move somewhere else, since this is delegated to the requestHandler and to the rooms, and not done in the wsExtension.
			// notes: 
			// - one Event is not one room, so it is not reasonable to use the events itself and simply create an event as a room
			// - can a room be an event? maybe yes. So a room would be a normal event. This room would listen to all possible events for that room and simply spread the event to the other clients --> could work, except that then also the sending client recieves the event again...
			// - we dont need events on the server, just rooms?!? The server could either be called explicitly based on the event raised or he also subscribes to that room. 
			// - how does the note/request system work together woth the rooms/events? Do we treat all messages and requests the same and simply hand them over to the events? Or do we need special types for the room stuff and for the other stuff? --> actually the rooms belong to the websocket-stuff, as it is kind of a broadcast.
	
			// the solution is: (normally in our use, where the server has to act:) no message from a client should automatically be sent to any other clients, but the server should do that. (If for example a faked result a client sends to the server, the server must process the result and realize that it is wrong and thus NOT send thie result to the other clients!) If there is need to broadcast from clients, a dummy function on the server can be defined that does exactly this. but for the liveResults/Athleteica functionality this should not be needed. In Socket.IO it is also not possible to emit to rooms from the clients. 
	
			// events could be cascaded: events can have parents that are cllaed too: e.g. a client adds a result in the event xy, so every client showing this event must get the information, but also the general event for new/changed results in any event must be called (e.g. for live Results)
	
			// messageRaw should be a json object:
			
			this.logger(3, "Message recieved per ws: " + messageRaw); // can a  class access a global object
	
			var message = {}
			try{
				message = JSON.parse(messageRaw); 
			}catch(error){
				// send Error to client
				// use the error function
				this.sendError(`Message could not be parsed: ${messageRaw}`);
	
			}
			if (!('type' in message)) {
				// the websocket request cannot be parsed without type and thus is simply dropped
				this.logger(0, 'The message "' + messageRaw + '" has no "type"-property and thus is deleted/dropped.')
				return;
			}

			// for testing: call the test-callback that will implement 'sleeping functions to test all the different failure possibilities and whether the respective callbacks are called
			// we must stop execution when a connection error shall be simulated, which is done by cbTest with returning true
			if (this.cbTest(message)){
				return;
			}
	
			// switch / case would be nice here and exists in JS; but it requires the unhandy use of "break;"" at the end of every case in order not to go though all the rest, so dont use it!
			var messagetypes = {
				note: ()=>{

					// process the message
					this.incomingNoteFunc(message.data);
				},
				noteSyn: ()=>{ 
					// process the message (make sure we did not already receive it!) and respond with noteAck
					let respond = {};
					respond.type = "noteAck";
					respond.stamp = message.stamp;
					// no respond.data here...
	
					// acknowledge receiving the message
					this.sendingFunc(JSON.stringify(respond));
					
					// process the message
					this.incomingNoteFunc(message.data);
				},
				noteAck: ()=>{
					// check validity
					if (!message.stamp){
						this.sendError("noteAck is not valid without stamp!");
					} else {

						if (message.stamp in this.stackNote){

							// call the success-callback
							this.stackNote[message.stamp].cbSuccess();

							// stop the timeout and delete the open MessSyn-element in the queue
							clearTimeout(this.stackNote[message.stamp].opt.timeoutHandle);
							delete this.stackNote[message.stamp];

						} else {
							this.logger(0, 'Stamp was not on stack. This happens when 1) (unlikely) somebody tries to hack you or 2) (likely) the server was very busy and could not send you an answer within you default waiting time so you sent the requst again and the server finally also processed every request (n-1 times for nothing...) or 3) (little likely) two responses were sent for the same request and thus the request was already removed from the stack. It is not allowed to have more than one response (currently) and thus the now received (second or later) response is unhandled/deleted.')
						}
					}
				},

				// request sent to system B, to be acknowledged
				requestSyn: ()=> {

					// check that the request has a data and a stamp property.
					if ((message.data!=undefined) && (message.stamp!=undefined) ){

						//first check that the connection is available to send Ack; otherwise do not process the request
						if (this.closing){
							// in the very, very rare case where the conenctio is closed just after the request has arrived: just top it here. 
							return;
						}

						// send the ack:
						let ack = {
							type: 'requestAck',
							stamp: message.stamp,
						};
						let messageString = JSON.stringify(ack);
						this.sendingFunc(messageString);

						// ---------------------------------
						// start processing:

						/**
						 * The response function to be called with the response or error to respond. The function handling the request can decide whether the response shall be acknowledged or not. The function is identical for incoming requests and requestSyn.
						 * @param {*} response The response to send
						 * @param {*} failureCode The error code (0=no error=default)
						 * @param {boolean} acknowledged Whether the response shall be acknowledged
						 * @param {function} failure a function called on error sending the response (errCode, errMsg)
						 * @param {function} success a function called after successful transmission of the response, i.e. when the responseAck arrives. 
						 */
						let responseFunc = (response, failureCode=0, acknowledged=false, failure=(errCode, errMsg)=>{}, success=()=>{})=>{

							// prepare message to be sent
							let mess = {};
							mess.type = acknowledged ? "responseSyn" : "response"; // will be answered with responseAck, if everything goes as expected
							mess.stamp = message.stamp;
							mess.data = response;
							mess.failureCode = failureCode;

							// DEBUGGUNG for missing properties in the object and everything is fine until here?:
							// ATTENTION: sequelize adds toJSON functions to its objects, which overrides the default stringify process. Therefore, manually added properties are lost!
							// there are several ways to overcome the problem: 
							// - add a virtual property in the model:     newProp: {type: DataTypes.VIRTUAL, allowNull: false, defaultValue: false } OR
							// - add an instanceMethod in the model: sequelize.define('tablename', {properties}, {instanceMethods:{toJSON: function(){...}}})
							let messString = JSON.stringify(mess);


							// the stackObj is actually only used when the response shall be acknowledged
							let stackObj = {};

							if (acknowledged){
								stackObj.opt = {};
								stackObj.opt.timeout = message.timeout || 10;
								stackObj.stamp = message.stamp;
								stackObj.response = response; // only for debugging reasons
								stackObj.cbFailure = failure;
								stackObj.cbSuccess = success;
								stackObj.message = messString; 
								this.stackResponse[message.stamp] = stackObj;
							}


							// check if there is a connection
							if (this.closing){
								failure(1, `The connection was closed before the response (${messString}) was sent.`)
								// clean up the stack
								delete this.stackResponse[stackObj.stamp];
								return;
							}

							// start a timeout after which, without responseAck, failure is called
							if (acknowledged){
								stackObj.opt.timeoutHandle = setTimeout(()=>{

									let errMsg = `The following response timed out and is now considered failed: ${stackObj.message}`;
									this.logger(1, errMsg);
	
									stackObj.cbFailure(2, errMsg) // failure callback
	
									// delete the object from the stack
									delete this.stackResponse[stackObj.stamp];
	
								}, stackObj.opt.timeout*1000);
							}

							// finally, send the request
							this.sendingFunc(messString);

						}

						// process the request
						this.incomingRequestFunc(message.data, responseFunc);

					} else {
						this.sendError("request is not valid without stamp and data properties!");
					}

				}, // end of requestSyn

				// request sent to system B (and also the following acks, if applicable)
				request: ()=> {

					// check that the request has a data and a stamp property.
					if ((message.data!=undefined) && (message.stamp!=undefined) ){

						//first check that the connection is available to send Ack; otherwise do not process the request
						if (this.closing){
							// in the very, very rare case where the conenctio is closed just after the request has arrived: just top it here. 
							return;
						}


						// ---------------------------------
						// start processing (if applicable):

						/**
						 * The response function to be called with the response or error to respond. The function handling the request can decide whether the response shall be acknowledged or not. The function is identical for incoming requests and requestSyn.
						 * @param {*} response The response to send
						 * @param {*} failureCode The error code (0=no error=default)
						 * @param {boolean} acknowledged Whether the response shall be acknowledged
						 * @param {function} failure a function called on error sending the response (errCode, errMsg)
						 * @param {function} success a function called after successful transmission of the response, i.e. when the responseAck arrives. 
						 */
						let responseFunc = (response, failureCode=0, acknowledged=false, failure=(errCode, errMsg)=>{}, success=()=>{})=>{

							// prepare message to be sent
							let mess = {};
							mess.type = acknowledged ? "responseSyn" : "response"; // will be answered with responseAck, if everything goes as expected
							mess.stamp = message.stamp;
							mess.data = response;
							mess.failureCode = failureCode;

							// DEBUGGUNG for missing properties in the object and everything is fine until here?:
							// ATTENTION: sequelize adds toJSON functions to its objects, which overrides the default stringify process. Therefore, manually added properties are lost!
							// there are several ways to overcome the problem: 
							// - add a virtual property in the model:     newProp: {type: DataTypes.VIRTUAL, allowNull: false, defaultValue: false } OR
							// - add an instanceMethod in the model: sequelize.define('tablename', {properties}, {instanceMethods:{toJSON: function(){...}}})
							let messString = JSON.stringify(mess);


							// the stackObj is actually only used when the response shall be acknowledged
							let stackObj = {};

							if (acknowledged){
								stackObj.opt = {};
								stackObj.opt.timeout = message.timeout || 10;
								stackObj.stamp = message.stamp;
								stackObj.response = response; // only for debugging reasons
								stackObj.cbFailure = failure;
								stackObj.cbSuccess = success;
								stackObj.message = messString; 
								this.stackResponse[message.stamp] = stackObj;
							}


							// check if there is a connection
							if (this.closing){
								failure(1, `The connection was closed before the response (${messString}) was sent.`)
								// clean up the stack
								delete this.stackResponse[stackObj.stamp];
								return;
							}

							// start a timeout after which, without responseAck, failure is called
							if (acknowledged){
								stackObj.opt.timeoutHandle = setTimeout(()=>{

									let errMsg = `The following response timed out and is now considered failed: ${stackObj.message}`;
									this.logger(1, errMsg);
	
									stackObj.cbFailure(2, errMsg) // failure callback
	
									// delete the object from the stack
									delete this.stackResponse[stackObj.stamp];
	
								}, stackObj.opt.timeout*1000);
							}

							// finally, send the request
							this.sendingFunc(messString);

						}

						// process the request
						this.incomingRequestFunc(message.data, responseFunc);

					} else {
						this.sendError("request is not valid without stamp and data properties!");
					}

				}, // end of request

				// acks sent to system A (the one that emmitted the request) during the request
				requestAck: ()=>{
					// acknowledgement, that the request has arrived on the server

					// the ack received should look like this
					/*let ack = {
						type: 'requestAck',
						stamp: message.stamp,
					};*/

					if (!('stamp' in message)){
						// the ack cannot be processed
						this.logger(0, `wsExtension: Could not process requestAck because not all necessary properties were set: ${message}`);
						return;
					}

					// find the request on the stack here
					let stackObj;
					if (stackObj = this.stackRequest[message.stamp]){

						// call the status callback to let the requsting function know about the arrival of the request
						stackObj.cbStatus();

						// we do not stop the timeout here, since the timeout also considers the request processing and the arrival of the response.

					} else {
						// the ack cannot be processed
						this.logger(0, `wsExtension: Could not process requestAck because it is not on the stack: ${message}`);
						return;
					}
					
				},

				// response sent to system A, to be acknowledged
				responseSyn: ()=> {
					// a response to a request is received, process it and finally delete the request from the stack

					// check that the request has a data and a stamp property.
					if ((message.data!=undefined) && (message.stamp!=undefined)){

						// the stackObj should obviously already exist
						let stackObj;
						if (stackObj = this.stackRequest[message.stamp]){

							// stop the timeout
							clearTimeout(stackObj.opt.timeoutHandle);

							// send the ack
							let ack = {
								type: 'responseAck',
								stamp: message.stamp,
							};
							let messageString = JSON.stringify(ack);
							this.sendingFunc(messageString);

							// start processing the data
							
							// if the failurecode=0, everything is normal
							// if there was an error, the failurecode is the respective code and the response is the error-message as string.
							if (message.failureCode){ // failurecode is the statusCode; 0=no failure and the success-callback is called
								// call the failure callback
								stackObj.cbFailure(message.failureCode, message.data);
							}else{
								// call success callback
								stackObj.cbSuccess(message.data);
							}

							// remove from stack
							delete this.stackRequest[message.stamp];


						} else {
							// the ack cannot be processed
							this.logger(0, `wsExtension: Stamp of message ${message} was not on stack. This happens when 1) (unlikely) somebody tries to hack you or 2) (likely) the server was very busy and could not send you an answer within your default waiting time so you sent the requst again and the server finally also processed every request (n-1 or even n times (when none of the replys came within the time between the first and the last request) for nothing...) or 3) (little likely) two responses were sent for the same request and thus the request was already removed from the stack. It is not allowed to have more than one response (currently) and thus the now received (second or later) response is unhandled/deleted.`);
							return;
						}

					} else {
						this.sendError("Response is not valid without stamp and data properties!");
					}

				},

				// response sent to system A (the one that emmitted the request), (and also the following acks, if applicable) 
				response: ()=> {
					// a response to a request is received, process it and finally delete the request from the stack

					// check that the request has a data and a stamp property.
					if ((message.data!=undefined) && (message.stamp!=undefined)){

						// the stackObj should obviously already exist
						let stackObj;
						if (stackObj = this.stackRequest[message.stamp]){

							// stop the timeout
							clearTimeout(stackObj.opt.timeoutHandle);

							// start processing the data
							
							// if the failurecode=0, everything is normal
							// if there was an error, the failurecode is the respective code and the response is the error-message as string.
							if (message.failureCode){ // failurecode is the statusCode; 0=no failure and the success-callback is called
								// call the failure callback
								stackObj.cbFailure(message.failureCode, message.data);
							}else{
								// call success callback
								stackObj.cbSuccess(message.data);
							}

							// remove from stack
							delete this.stackRequest[message.stamp];


						} else {
							// the ack cannot be processed
							this.logger(0, `wsExtension: Stamp of message ${message} was not on stack. This happens when 1) (unlikely) somebody tries to hack you or 2) (likely) the server was very busy and could not send you an answer within your default waiting time so you sent the requst again and the server finally also processed every request (n-1 or even n times (when none of the replys came within the time between the first and the last request) for nothing...) or 3) (little likely) two responses were sent for the same request and thus the request was already removed from the stack. It is not allowed to have more than one response (currently) and thus the now received (second or later) response is unhandled/deleted.`);
							return;
						}

					} else {
						this.sendError("Response is not valid without stamp and data properties!");
					}

				},

				// response ack sent to system B (that processed the request and sent the response)
				responseAck: ()=>{

					
					// the ack received should look like this
					/*let ack = {
						type: 'responseAck',
						stamp: message.stamp,
					};*/

					if (!('stamp' in message )){
						// the ack cannot be processed
						this.logger(0, `wsExtension: Could not process responseAck because not all necessary properties were set: ${message}`);
						return;
					}

					// find the request on the stack here
					let stackObj;
					if (stackObj = this.stackResponse[message.stamp]){

						// stop the timeout
						clearTimeout(stackObj.opt.timeoutHandle);

						// call success
						stackObj.cbSuccess();

						// delete from the stack
						delete this.stackResponse[stackObj.stamp];

					} else {
						// the ack cannot be processed
						this.logger(0, `wsExtension: Could not process responseAck because it is not on the stack: ${message}`);
						return;
					}

				},

				error: ()=> {
					this.logger(1, 'A client returned an error for a ws-package: ' + message.data.toString());
				},

				ping: ()=>{
					// directly send back the pong
					let respond = {};
					respond.type = "pong";
					//respond.stamp = this.uuidv4(); // actually not really needed here, but soemwhere defined as a requirement
					respond.data = message.data;
					this.sendingFunc(JSON.stringify(respond));

					this.logger(4, `Ping ${message.data} arrived. Pong sent.`); 
				},

				pong: ()=>{

					// get the correct heartbeat object
					let HB = this.heartbeat.sent['H'+message.data];
					if (HB===undefined){
						// prevent an application failure on incorrect messages arriving
						this.logger(1, 'Pong message did not match a sent ping. Pong is ignored.')  
						return;
					}

					// calculate the RTT
					let d = new Date();
					let rtt = d.getTime() - HB.time; // in ms

					// delete the heartbeat-timeout
					clearTimeout(HB.timeout)

					// modifiy lastRTT and currentRTT
					this.heartbeat.lastRTT = this.heartbeat.currentRTT;
					this.heartbeat.currentRTT = rtt/1000; // must be in s!

					// set new nLastArrived and write to log if a/multiple heartbeat was skipped 
					if (this.heartbeat.nLastArrived+1 != message.data){
						this.logger(1, `Pong ${message.data} arrived out of order. Last pong was ${this.heartbeat.nLastArrived}`);
					}
					this.heartbeat.nLastArrived= message.data;

					// delete the heartbeat from heartbeat.sent
					delete this.heartbeat.sent['H'+message.data]

					this.logger(4, `Pong ${message.data} arrived within ${rtt} ms.`); // TODO: comment out

				}
			}
	
			if (typeof(messagetypes[message.type]) == 'function'){
				messagetypes[message.type]()
			} else {
				this.logger(1, message.type + ' is not a supported type of WebSocket data.');
			}
	
		}
	
	}