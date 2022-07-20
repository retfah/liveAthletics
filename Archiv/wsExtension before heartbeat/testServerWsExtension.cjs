// Server for testing the wsExtension

// ----------------
// Includes
// ----------------


// include all the necessary packages

// without 'var' or 'const' the vairable is global, i.e. it is also available in the other included scripts. 
// (Actually I should have used this for the logger...)
var express    	=   require('express');
var parseurl   	=   require('parseurl')
var http	   	=   require('http');
var https		=		require('https');
var session    	=   require('express-session');
var cookieParser =  require('cookie-parser');
const MongoStore =  require('connect-mongo')(session); // the storage system for the session-data
const MongoClientCon = require('mongodb').MongoClient;
var bodyParser 	=   require('body-parser');
var ejs        	=   require('ejs');
var io_req     	=   require('socket.io');
var fs					=	 	require('fs'); // filesystem-access, used e.g. for alabus interaction
var i18n 				= 	require('i18n-2'); // used in express with setLanguageByCookie
const Sequelize = 	require('sequelize');
var DataTypes 	= 	require('sequelize/lib/data-types'); // included in sequelize package
var wsServer		= 	require('ws').Server;		// websocket server
var signature   =   require('cookie-signature'); // used to manually (in websocket instead of automatically in express-session) decode the sid cookie
var localLogger =   require('./logger.js');
var wsExt       =   require('./wsExtension'); // the syn/ack-stuff for WS
const rMeetings =   require('./rMeetings'); // room doeing meeting manipulation
ajv 			= 	new require('ajv')(); // check JSON input with schema
crypto 			= 	require('crypto'); // for hashing and other crypto stuff, used e.g. in roomServer
// the following is valid ECMA Script 6, but does not work yet in Node.js 8.11.1 and also in 11.x it is only supported with the experimental feature --madules-experimental
//import wsExtClass from "./wsExtension.js";

// include external files
var conf 		=	require ('./conf'); 
const pages		= 	require('./pages.js');
const files 	=   require('./files.js');


// use the debugger
debugger;


// ----------------
// DEVELOP-MODE
// 
// --> no login required, partially more logged
// ----------------

developMode = true;

// ----------------
// Classes
// ----------------


/**
 * eventHandling: Event handling on the client: the central event manager, in version 2 with an object as listener-list instead of an array. This is beneficial on unsubscribing, where not the whole arra must be searched. 
 * - store a list of all currently possible events
 * - store a list of all listeners on each of these events
 * - process an event by calling all listeners
 * 
 * @class eventHandling Description
 */
class eventHandling2{ // ES 2015 style syntax
	/**
	 * - each event (name) can only appear once and is the identifier in the events object
	 * - more 'security' could be introduced when not everybody could raise all events, but only the object/function that registred for it. 
	 *   This could be done for example by returning a random string on registering an event and using this to process the events later   
	 * - eventually add the possibility to inform the listener, if the event is unregistered/closed
	 */

	constructor(){
		this._events = {}; // virually protected (not protected, but anybody should know not to touch it!)
	}

	/**
	 * register a new event, to allow listeners to be bound to it
	 * @method eventRegister
	 * @param {String} name The name of the event 
	 */
	eventRegister(name){
		// check if the event already exists
		if (this._events[name]){
			// the event already exists
			logger.log(10, "The event "+name+" already exists and cannot be registered!")
			return false;
		} else {
			this._events[name] = {}; // every listener will be an named entry in the object
			return true;
		}

	}

	/**
	 * subscribe for an event / add a listener:
	 * 
	 * @method eventSubscribe
	 * @param {String} name The name of the event
	 * @param {Function} listener The function/listener to be called when the event is raised; one argument:data
	 * @param {string} listenerName A name of the listener, which is also used to delete the listener again. If not specified, a listenerName will be generated automatically.
	 * @param {Boolean} autoCreate If the event chall be created automatically if it does not exist yet
	 * @returns {mixed} false when subscription not possible because the listenerName is already used; otherwise the listenerName
	 */
	eventSubscribe(name, listener, listenerName=false, autoCreate=true){

		function isFunction(){
			// TODO
			return true;
		}

		if (!listenerName){
			listenerName = uuidv4();
		}

		if (isFunction(listener)){
			if(this._events[name]){
				// check that listener does not yet exist
				if (listenerName in this._events[name]){
					return false;
				}
				this._events[name][listenerName] = listener;
				return listenerName;
			}else{
				if (autoCreate){
					this._events[name]={};
					this._events[name][listenerName] = listener;
					return listenerName;
				}
			}   
		}
		return false; // should never arrive here
	}

	/**
	 * 
	 * @param {String} name 
	 * @param {Function} listenerName
	 */
	eventUnsubscribe(name, listenerName){
		if(!this._events[name]){
			// this event does not exist, nothing to remove
			logger.log(10, 'Event ' + name + 'does not exist (anymore). nothing to remove the listener from.');
			return false;
		} else{
			delete this._events[name][listenerName];
			return true; // the deleting will always work and return true, so we do not need to check whether the listenerName was evcven registered
		}
	}

	/**
	 * raise: rasies an event, if there are listeners
	 * @param {String} name 
	 * @param {Object} data The data given to the listeners registered for that event 
	 * @returns {Number} The number of listeners called
	 */
	raise(name, data){
		if (name in this._events){
			for (let listenerName in this._events[name]){
				this._events[name][listenerName](data);
			}
		} else {
				return 0;
		}
	}

}


// mostly imported...


// ----------------
// Setup the app
// ----------------

// generiere das Hauptobjekt
var app        =    express();

// set engine and path for views
app.set('views',__dirname + '/views'); // TODO: make this the same as in conf!

// set the default view engine ( it is said that this is enough?!? )
app.set('view engine', 'ejs');

//make html-files beeing interpreted (rendered) with ejs (standard is: use the ending of the file (e.g. .pug) to determine the engine)
app.engine('html', ejs.renderFile);



// ------------------
// Start server
// ------------------

// listen on port 3300, automatically http
var server     =    app.listen(3300);

// the same could be done the follwing way
//var server = http.createServer(app).listen(3000);


// start the bare websocket Server
// we (currently) want a separate server/port for the ws-stuff, as on port 3000 is the normal webserver and the current/old WebSocket implementation with Socket.io
//var wss = new wsServerExtended({port:3001}); // stating a port automatically opens a new http webserver on that port
//var wss = new wsServer({server:server, path:'/ws', port:3001}); // uses the path ws
const wss = new wsServer({server:server, port:3301}); // uses the path ws

// start the logger --> define the log level
const logger = new localLogger(undefined, 99); // 99=everything

// start the eventhandler-stuff
//const eH = new eventHandling();
const eH = new eventHandling2();


// // ------------------
// // Start the connection to the DB with sequelize
// // ------------------

// // try to connect to DB, load some data and write some others
// const sequelizeAdmin = new Sequelize(conf.database.dbBaseName+"_"+conf.database.dbAdminSuffix, conf.database.username, conf.database.password, {
//     dialect: 'mysql',
//     host: conf.database.host,
//     port: conf.database.port,
//     operatorsAliases: false,
//     // application wide model options: 
//     define: {
//       timestamps: false // we generally do not want timestamps in the database in every record, or do we?
//     }
// 	})

// // test the connection:
// sequelizeAdmin
//   .authenticate()
//   .then(() => {
//     logger.log(85,'DB-Admin connection has been established successfully.');
//   })
//   .catch(err => {
// 	logger.log(1,'Unable to connect to the admin database:', err);
// 	logger.log(1, '--> cannot start the server');
// 	throw new Error('Unable to connect to DB and thus unable to start the server.');
//   });


// // import all models
// //var models = require('sequelize-auto-import')(sequelizeAdmin, __dirname+'/models'); // TODO: this line should not be here in the future; it should be loaded for a specific meeting, with this specific sequelize instance.
// var modelsAdmin = require('sequelize-auto-import')(sequelizeAdmin, __dirname+'/modelsAthletica2Admin');


// // create references ("Associations") between the tables

// // creates the Asscociatios, that are currently (04.2018) not set correctly
// // when sequelize-auto is used to generate the models, as the 'reference' property 
// // in the models is no longer supported for setting the references from one to another
// // model (DB-table)
// function correctAssociations(models){
//   // @param: models: the models array returned from sequelized-auto-import
//   // iterate over all models and add their relations and add them where applicable
//   for (var model of Object.getOwnPropertyNames(models)){
//     for (var prop of Object.getOwnPropertyNames(models[model].rawAttributes)){
//       var ref = models[model].rawAttributes[prop].references;
//       if (ref){ // would be undesfined if it does not exist
//         models[model].belongsTo(models[ref.model], {foreignKey: ref.key});
//         models[ref.model].hasMany(models[model], {foreignKey: ref.key});
//       }
//     }
//   }
// }
// //correctAssociations(models);
// correctAssociations(modelsAdmin);


// // Mongo-Admin-DB
// // connect to the mongo-db
// // every meeting and the Administration has its own mongo-databases.
// // each room in a DB is its own collection ("=table")
// // a collection has multiple documents ("=table-rows")
// // the identifiers in the documents represent "the columns"
// // each entry can be/is a JSON-string
// //   for the admin-rooms (every meeting will then have its own MongoDB as it also has its own MySQL-DB)
// // every room shall have its own collection

// // is there an Promise implementation of this or even a sync version (this would be useful here...)
// var mongoclient = {};
// var mongoClientPromise = MongoClientCon.connect('mongodb://' + conf.databaseMongo.host + ':' + conf.databaseMongo.port, {}).then((client)=>{
// 	mongoclient = client;
// }).catch((err)=>{
// 	logger.log(1,"Could not connect to the MongoDB: "+ err);
// 	throw err;
// })


// ---------------
// Middleware
// ---------------

// Middleware are functions (Callbacks) that are always called, independent of the requested file/path. They receive the same data as would a path-specific function. Since all data are handled as objects and therefore byReference (not byVal), these middlware-functions can for example parse data that is already available in the given objects or inject new data into the given Objects. This injected data can be used in all following middle-ware and in all router-functions. 
// The order of the middleware-inclusion (app.use(...)) and routes gives the order in which the middleware and router-functions are called. So it is very important that the order is correct. For example when the session-login stuff came after the router-part, the login would never get checked. Other example: while most static files (which are directly sent to the client) should be protected through a login (call express-static after the login-part), for example a css-file should always be served. Thererfore one could for example include a second express-static before the login-part which matches a folder with non-login-restricted files. As soon as a middleware or route-callback does not invoke next(), the request is not further processed! --> So dont forget to do that! (This is primarily important in middleware and not routes, since routes generally are at the end of the call-history and thus do not require to call next().
// REMINDER: Middleware (and routes) needs to either call next(), which calls the next middleware or router-function or end the request by sending something. Otherwise the request is left hanging!


// --------------------
// cookie handling
// --------------------

// adds req.cookies.(cookiename) and res.cookies(name, value)  
app.use(cookieParser())

// --------------------
// i18n internationalization part 1
// --------------------

// let the internationalization (=translation) module load bind itself
// does nothing else than call app.use() and then add the express class to req.i18n

var languages = ['en', 'de', 'fr', 'it'];
var x = i18n.expressBind(app, {
	// all supported languages
	locales: languages,

	// the name of the cookie storing the language
	cookieName: 'localization'
})

// for the websocket file translation, we need another instance of i18n, where the language is set by connection/sessionID
var i18nManual = new (require('i18n-2'))({
    // setup some locales - other locales default to the first locale
    locales: languages
});


// ---------------
// body-parser
// ---------------

// body-parser: is needed for POST-Arguments in forms and other stuff, that  must be extracted from the http-body part (the actual data of the sent http-packages) 
// it could also parse json, etc.
// TODO: this data is added to req.body?

// parse application/x-www-form-urlencoded
// data is added to req.body.[key] (e.g. req.body.username returns the value of the field username)
app.use(bodyParser.urlencoded({ extended: false }))



// ------------------
// cookie handling / session part 1
// ------------------

// set the session-storage to use mongoDB
const sessionStore = new MongoStore({url:"mongodb://localhost/testapp"}) //standard port/adress=localhost/dbName=testapp; no UN and PW

// set an expiry date for the cookie: 7 days
var expiryDate = new Date(Date.now() + (07*86400 + 0*3600 + 0*60 + 0)* 1000) // days+hours+min+seconds (must be in milliseconds)

// register the middleware 'session', that handles everything with the different users, does all the cookie-work, and so on. 
// the object given to session() defines some (important) settings/parameters
var sessionSecret = "TheSecretForHashing/SigningTheSID";
app.use(session({
	secret: sessionSecret,
	resave: false, 
	saveUninitialized: true,   
	cookie: {
		httpOnly: false, //otherwise we cannot access it through javascript document.cookie; what we need for the websocket part
		expires: expiryDate
	},
	name: 'connect.sid', // set the same name in socket-onConnect on the client; connect.sid is the default
	store: sessionStore
	}));



// --------------------
// i18n internationalization part 2
// --------------------

// read the defined cookie to set the current language
// could be also done other ways
/*app.use(function(req, res, next){

	// the language can be chosen on any page; it simply has to add two GET parameters: setLanguage=true&l=en where 'en' designated the two-letter language code

	// the language was chosen right now --> store it, if it is valid:
	//if (req.originalUrl=="lang"){
	if ("setLanguage" in req.query && req.query.setLanguage && "l" in req.query){
		if (languages.indexOf(req.query.l)>=0){
			req.cookies.localization = req.query.l; // set the langage as if the cookie was already stored before
			res.cookie("localization", req.query.l, {expires: expiryDate}); // set the new langage cookie
			req.session.lang = req.query.l;

			// we should remove the settings for the language (arguments l and setLanguage) change from the URI; we can delete all params, since there should not be other parameters --> TODO: append all arguments other than 'l' and 'setLanguage'
			// create the new query string
			queryNew = '';
			for (q in req.query){
				if (['l','setLanguage'].indexOf(q)==-1){
					queryNew += '?' + q + '=' + req.query[q];
				}
			}
			res.redirect(req.baseUrl+req.path+queryNew); // redirect the client, without the change-language arguments
		}
	}

	// if the language is not set, set it to en (or show a langage choose page?)
	if (!("lang" in req.session)){
		// do not continue, but render the language choose page and let it direct to the chosen page; the 
		res.render("setLang.ejs", {path: req.originalUrl});
	} else {
		// set the language and continue
		req.i18n.setLocaleFromCookie();
		next();
	}

})*/



// ------------------
// session-login stuff (part 2)
// ------------------

// the session stuff must be done before the delivery of other data, otherwise it would not have any effect...

// SESSION has the possibility to interact with different databases to be able to store the connections/sessions --> some of them are more safe than the standard one used here --> TODO: change before going online. The secret is used for signing the cookie, which prevents that a user can change its session-ccokie and then take over an other session with probably more rights. 
// Invoking app.use(session()) starts the session-logic (generating ID for new users, sending/reading cookies, ...) and injects the 'session'-object to req (--> req.session is available in all subsequent middleware and routes). This session-object is session specific and is always stored in the background as long as the session exists. One could use this to store the access-right of each logged-in person for example. 



// the adminUsers are defined in the config-file. So far no other users exist. 
// TODO future: allow logins for single DBs, without the admin rights
users = conf.adminUsers;


// check if user is logged in (--> then call next()) or show the login page
/*app.use(function(req, res, next){
  // is a login needed?

	// TODO add here all cases were a login is required 
	// - when we must go into /admin, e.g. no meetings yet
	// - when the request is NOT for /live and we HAVE passwords for /work

	// trys to correctly login?
	if (req.path == '/login.sess' && req.method =='POST') {
		// user wants to login
		//logger.log(99, req.body)
			redirect = '';
			if (req.body.redirect) {
				redirect = req.body.redirect;
			}
    	if (req.body.username && req.body.password) {
    		if (users[req.body.username]===req.body.password) {
					// login successful
					logger.log(85,'login success')
					req.session.logged_in = true
					req.session.isAdmin = true; // TODO: currently only admins have ot login; add other functionality here as soon as also normal users have to login
					res.redirect(redirect);
					
    			// not calling next
			} else {
				// password was wrong
				// TODO: add here an info that the password was wrong.
				res.render('Login.ejs', {redirect: redirect, message: i18nManual.__('Wrong password and/or username.')});
			}
		} 
	} 
	else {
		// user simply wants data: is he allowed --> next(), otherwise show the login page
		// do not require login in developMode
		if (req.session.logged_in || developMode) {
			next()
		} else {
			res.render('Login.ejs', {redirect: req.path, message: i18nManual.__('You must be logged in for this action.')}) // redirect to a router or serving static would (probably) not work, since this is included after this login-check
			//not next!!
		}
	}
});*/



// ------------------
// Websocket stuff
// ------------------



// class for testing:
class wsExtensionTest {
	constructor(){
		this.data; // stores the incoming data (i.e. the actual request), as it is done in the stackObj
		this.opt = {};
		this.stamp = {}; // unused
		this.ackCount;
		this.wsProcessor; // to be defined in public
	}

	/**
	 * Does everything necessary on every incoming message, independent if this is a note or a request or an ack
	 * @param {any} message The incoming message
	 */
	cbTest(message){

		// it must be differentiated between "request" and "responseAck"

		if (message.type == "request"){
			if (message.ackCount==0){
				// get values that are not resent in the following acks and that are needed anyway
				this.opt = {};
				this.opt.retryNumber = message.retryNumber || 0;
				this.opt.retryInterval = message.retryInterval || 1000; // ms
				this.opt.executeAckCount = message.executeAckCount;
				this.stamp = message.stamp;
				this.opt.ackTotal = message.ackTotal; 

				
				// store the data, i.e. what to at which stage of the request
				this.data = message.data;
	
				this.ackCount = 0;
			}
	
			if (message.ackCount < this.data.failures.length){
				// returning true stops the execution
				if (this.data.failures[message.ackCount]){
					return true;
				}
			} else {
				console.log('Error: ackCount must be larger than the available items in "failures".')
			}
	
			if (message.ackCount < this.data.pausingTimes.length){
				if (this.data.pausingTimes[message.ackCount] > 0){
					wait(this.data.pausingTimes[message.ackCount])
				}
			} else {
				console.log('Error: ackCount must be larger than the available items in "pausingTimes".')
			}
	
			// false = continue the program
			return false;

		} else if (message.type == "responseAck"){
			
			// the options to use now are stored in this.data.response (this.data is the request)
			if (message.ackCount < this.data.response.failures.length){
				// returning true stops the execution
				if (this.data.response.failures[message.ackCount]){
					return true;
				}
			} else {
				console.log('Error: ackCount must be larger than the available items in "failures".')
			}
	
			if (message.ackCount < this.data.response.pausingTimes.length){
				if (this.data.response.pausingTimes[message.ackCount] > 0){
					wait(this.data.response.pausingTimes[message.ackCount])
				}
			} else {
				console.log('Error: ackCount must be larger than the available items in "pausingTimes".')
			}
	
			// false = continue the program
			return false;

		} else {
			console.log('unknown message.type: ' + message.type)
		}


	}

	log(code, message){
		// send with note to client
		this.wsProcessor.sendNote({
			type: 'log',
			code: code,
			message: message
		})

	}

}


// create the validator for all kinds of messages:
// Note: compile (i.e. translate the schema to a validation function) the message valoidator only once instaed of using ajv.validate(schema, message), where the schema must be compiled at every check!
let messageSchema = {
	type: "object",
	properties: {
		name:{type:'string', description:'name of the function to call'}/*,
		data: {type:"object"}*/ // i dont know yet how we can have type: any or denpent on the name...
	},
	"required":['name']
};
var validateMessage = ajv.compile(messageSchema);

// Websockets server:
// with rooms, different broadcast interfaces can be defined, where clients can register to

// new WebSocket Server:
// the server was established already above

wss.on('connection', (ws)=>{ // ws is the websocket object

	// store the necessary data/configuration of this websocket (the one socket for a specific client)
	// analog to the old SocketIO implementation
	ws.lang = "en"; // TODO
	ws.meetingID = undefined;
	ws.userID = undefined;
	ws.sid = undefined;

	logger.log(85, 'link established!');

	// create the test-stuff (must be done in here in order to have access to wsProcessor)
	var wsTest = new wsExtensionTest();


	/**
	 * noteHandling: handling the incoming notes. Must have one argument, so it can be used in the wsProcessor directly. Currently this is unused yet, as so far everything is a request...
	 * IMPORTANT TODO: make sure that notes of the wrong data type do not crash the server!
	 * @param {any} note The data that was sent. could be any datatype, as defined on client and server as soon it is used. 
	 */
	function noteHandling(note){


	}

	/**
	 * requestHandling: handles the incoming requests. Must have two arguments, so it can be used in the wsProcessor directly. 
	 * IMPORTANT TODO: make sure that requests of the wrong data type do not crash the server!
	 * @param {json} request The request as a json: first the name of the function to call with the given data 
	 * @param {string} request.name The name of the request
	 * @param {any} request.data The data that needs to be given to the function handling the request of this name
	 * @param {function(response, failureCode=0, failure=(errMsg, errCode, status, lastIncomingAckCount)=>{}, opt={}, status=(status, lastIncomingAckCount)=>{})} responseFunc The function that has to be called with the response as the first argument. If an error shall be reported, the second argument must be true and the first parameter is the error-message.
	 */
	var requestHandling = (request, responseFunc)=>{ // must be arrow function in order that we can use wsProcessor

		// currently we only have one function that is processed, thus no differentiation

		// the request most store the failure id; like this we can also test whether reserved failureCodes (1-20) are intercepted

		// we send the failures and status as notes to the client
		var cbFail = (errMsg, errCode, status, lastIncomingAckCount)=>{
			var note = {
				type: 'failure',
				errMsg: errMsg,
				errCode: errCode,
				status: status,
				lastIncomingAckCount: lastIncomingAckCount
			}

			wsProcessor.sendNote(note)
		}

		var cbStatus = (status, lastIncomingAckCount)=>{
			var note = {
				type: 'status',
				status: status,
				lastIncomingAckCount: lastIncomingAckCount
			}

			wsProcessor.sendNote(note)
		}


		responseFunc("I'll be back.", request.failureCode, cbFail, request.response.optResponse, cbStatus)

	}

	
	// NOTE: very, very important: the following cannot work:
	// var wsProcessor = new wsExtensionClass(ws, ws.send, (mess)=>{console.log(mess);});
	// --> 'ws.send' would only pass the function 'send' to the extensionClass, without its link to the Websocket and thus the 'this' inside 'send' would refer to the calling function instead of the ws-class. The statement below works.
	//var wsProcessor = new wsExtensionClass(ws, (mess)=>{ws.send(mess);}, (mess)=>{console.log(mess);});
	//var wsProcessor = new wsExt.wsExtensionClass(ws, (mess)=>{ws.send(mess);}, (mess)=>{console.log(mess);});
	// parameters: sending-function, incoming-note function, incoming-request function
	const wsProcessor = new wsExt((mess)=>{ws.send(mess);}, noteHandling, requestHandling, wsTest, wsTest.cbTest);

	// set the wsProcessor
	wsTest.wsProcessor = wsProcessor;
	
	// the server usually does not need to call a sending funciton from outside this class except if it wants to push something to everybody (broadcast) or to rooms. Then this connection respectively the ws processor should be registererd to a server-wide object.

	// manually set what shall happen onMessage:
	// NOTE: very, very important: see note above at wsProcessor
  ws.on('message', (mess)=>{wsProcessor._onMessage(mess);});
	ws.on('close', ()=>{
		// old: wsProcessor.closing() = true;
		wsProcessor.close();
		logger.log(99, 'A ws-client got disconnected.');
		// TODO: maybe some more funcitons must be called on closing...
		
		// report to the eventHandler that the client disconnected, such that every room having this client can handle this appropriately
		eH.raise('wsClientDisconnect/'+ws.sid);
	})
	// that should be it!

})

// the new incoming messages handling:


// --------------
// data-handlers/Rooms startup
// --------------

// create the list of rooms
const rooms = {};
var roomsReady = false;

// this function is async because it has to wait for the MongoDB-Promise (connection to mongoDb to resolve)
/*async function roomStartup(){

	// wait for mongoDB-connection to startup
	await mongoClientPromise;

	// get/create DB for Admin-stuff (every room for Admin is its own collection)
	var mongoDbAdmin = mongoclient.db("administration"); // the name admin is a special one and occupied

	// startup everything that is needed for data-handling


	// --- Admin-DB-stuff / = Meeting-room ---
	// Meeting-room (maybe room is here not the right word, as long as we do not push updates to clients...)
	
	var meetingHandling = new rMeetings(sequelizeAdmin, modelsAdmin, mongoDbAdmin, eH, logger, {}, {}); // if it was a room, also the websocket connection would have to be passed
	// attention: rMeetings has async components that might take longer to initialize...

	// add to the rooms-list, named 'meetings'
	rooms.meetings = meetingHandling;

	roomsReady = true;

}
roomStartup().catch((err)=>{throw err;});

*/

// --------------
// Router
// --------------

// wichtig: darf nicht vor dem login-zeugs eingebunden werden, da alle middleware und auch die router-registrierungen der Reihe nach abgehandelt werden!


// Routes are defined with app.METHOD(Path, Callback), where Method is one of get/post/put/... (http methods), the path is the requested path (everything behind .com or .ch or ...) and the Callback is the function to execute, which receives three arguments: request, response, next. (As next is not aways needed, it can be ommitted.)
// The path supports regular expressions and even parameters in the path, that are then given in req.params!
// If further middleware or callbacks (in this same route) or other routes shall be executed after a route-callback, 'next' must be called. If the remaining callback in this route shall be skipped, next('Route') must be called. Like this, following middlewar and routes are still called. 

// check if there are meetings (and how many)
// therefore use sequelize to get all meetings:
// --> open a meetings-Room? Or something like this


// for all routes, we must have defined first the meeting ID
// either) save the meetingID with the cookie and/or session
// or) get the meeting ID as the first part of the path --> for the live results, this solution must be used, as we want to be able to have a link leading directly to one meeting.


// if no meeting, redirect to /admin

// if one meeting, redirect to either /live or /work AND set the cookie to the respective meeting

// if more than one meeting, show the meeting-choose page





/**
 * first: check if the requested route is a special route, but wants to use the same base 'directory' as the main part uses --> then add the special routing here
 */

// special route for the first call of the page with nothing after the baseURL: 
// return the page, where the meeting can be chosen or show the page to create a new one, if there is none; of course, the links to admin must already be shown, as 
app.get('/ToRemove', (req, res, next)=>{
	
	// check if there are meetings
	models.meetings.count().then((c)=>{
		if (c>0) {
			req.redirect('/configuration')
		} else {
			req.redirect('/addMeeting')
		}
	})
	
})

app.get('/login', (req, res, next)=>{
	res.render('Login.ejs', {redirect: '', message: ''});
})

// TODO: activate this.
/*app.get('/admin', (req, res, next)=>{
	res.render('admin.ejs');
})*/

// this is a route that mapps '/' 
// this route has two callbacks (can have arbitrary many)
/*app.get('/',function(req,res, next){
	res.render('root.ejs', {title: "EJS works", pages: "var pages = {page1:1, page2:2}"})
	//next() // allows further callbacks in this and the following routes and middleware to be executed
})*/

/**
 *  second: do the stuff needed when a normal site is parsed, where the path defines the structure of the document
 */

// we handle all GET routes in one function; if the route is unknown to this, we call next in order to get to other routes or static files, otherwise not
// only full requests are handled here, where the whole page has to be built up (but without data) and sent to the client
// incremental changes on the page are handled via WebSockets or POST (to be decided)
app.get('/*', (req, res, next)=>{

	// for testing only
	//logger.log(99, req.sessionID)
	//logger.log(99, session)

	logger.log(89, "'" + req.path + "' is requested through http.");

	
	/* test if the requested page is 'valid':
		- no "/"" (except the first and probably last)
		- exists in pages */
	var path = req.path.slice(1); // remove beginning /
	if (path.endsWith('/')){
		path = path.substr(0,path.length-1); // remove ending /
	}

	// if path is empty, go to root 
	if (path==""){path="root"};

	if (path.indexOf('/')==-1 && pages[path]){

		var page = pages[path];

		// storing all pages loaded in that page
		var initPages = {};
		initPages[path] = pages[path];

		/**
		 * recursiveLoading : load the page recursively
		 * @param {*} page 
		 * @param {*} renderData 
		 */
		function recursiveLoad(page, renderData){

			// if the page has a file set, then this is a base page and has no parent; otherwise it MUST have a parent	
			
			// make sure that all childs are available in renderData --> empty strings
			//createEmptyChilds(page.childs, renderData)

			if (page.file && !page.parent){
				// is the root page

				// add empty strings for all childs, if they are not defined yet:
				createEmptyChilds(files[page.file].childs, renderData)

				// add the initPages object storing the current page structure (with its parents)
				renderData.pages = JSON.stringify(initPages);
				
				// finally render the page and send it to the client
				res.render(page.file, renderData)

			} else if (page.parent && !page.file){
				// render the child(s) in the current file, and add it to renderData; do not delete the old renderData-Stuff, as there might be
				
				renderData = prepareInjections(page.injections, renderData)
				.then(renderData => {
					initPages[page.parent] = pages[page.parent];  // storing the configuration of all loaded pages
					recursiveLoad(pages[page.parent], renderData)
					}).catch((err) =>{
						logger.log(7,'Error occured: Something went wrong on "prepareInjections" of page "' + page + '". '+err);
				});
			} else {
				res.render('error', {error: "Page " + page.name + " has none of {parent, file} attributes!. Needs exactly one of those."})
			}
		}

		// object storing all vairables inserted by ejs
		var renderData = {}
		// provide the __ function with the correct context ("this") to the data that can be rendered 
		renderData.__ = req.i18n.__.bind(req.i18n);

		// define the title of the page, which shall be injected in the root-file in the <head><title> (the root file must define this; otherwise it is simply not used)
		renderData.title = req.i18n.__(page.title);
		renderData.pageName = path;

		// inject self, if present
		if (page.injectionsSelf){
			prepareInjections(page.injectionsSelf, renderData)
			.then(renderData =>{
				recursiveLoad(page, renderData);
			}).catch(err =>{
				
			});
		} else{
			// start recursive creation of the page
			recursiveLoad(page, renderData);
		}

		
		/**
		 * perpareInjections: async function; prepare the injections for the parent by either (1) applying the injections to the current file and rendering it or (2) simply setting the text accoring to the definition in injections.
		 * @param {Object} injections What to inject and where (Definition of what shall be done), can inject either simply a predefined text (injectId2) or a file, rendered by ejs with data from 'data' and renderData (injectID2); example: {injectID1: {file: Filename.ejs , data: {injectID3: 'hello', injectID4: 'world'}}, injectID2: {text: "this text is directly inserted without any processing"}}
		 * @param {Object} renderData Object storing 'key-value-pairs' of injectIDs and the string-data to be inserted (according to the definition for data in ejs.render[File]), like {title:'this is the title'}; after adding 'injections', renderData is then passed to ejs.renderFile; the renderedFile then gets the 'value' of the injectdID
		 * @returns {Object} the new renderdData, where all injectionIDs from 'injections' have their respective data to inject stored plus the 'old' data that was already in renderData in the input. --> rederData that was actually injected, is never deleted from the renderData object and is returned (because we dont know what we have inserted)
		 */
		async function prepareInjections(injections, renderData={}){
			for (let child in injections){
				if (injections[child].text){
					renderData[child] = req.i18n.__(injections[child].text) // incl. translation
				} else if (injections[child].file){

					// check if the file is in the files list; throw Error otherwise
					if (!(injections[child].file in files)){
						throw new Error("File '" + injections[child].file +"' is not listend in the files-array.");
					}

					// add empty strings for all childs, if they are not defined yet:
					createEmptyChilds(files[injections[child].file].childs, renderData)

					let data = injections[child].data ? {...renderData, ...injections[child].data} : renderData;
					renderData[child] = await ejs.renderFile(conf.folders.views + injections[child].file, data) // if we allow here that also other pages are loaded 'top-down' (from parent to child) and not only files, then we would have to add them to initPages
				} else {
					res.render('error', {error: "injections must have exactly one of {text, file} as attribute, which is not the case in: " + toString(injections)})
				}
			}
			return renderData;
		}

		/**
		 * Creates properties of renderData with empty strings "" for all names in variables; used to make sure, that all childs in a page are mentioned in renderData and thus rendering the page with ejs does not lead to an error.
		 * @param {Array} variables the names of the properties that shall be initialized as empty, if not existing already
		 * @param {Object} renderData the current renderData object, where the childs shall be inserted 
		 */
		function createEmptyChilds(variables, renderData){

			variables.forEach((el)=>{
				if (!(el in renderData)){
					if (developMode){
						renderData[el] = "TODO";
					}else{
						renderData[el] = "";
					}
				}
			})
		}
		

	} else {
		// call next only when we could not match the right file here
		next()
	}
})

/** 
 * third: all special routes apart of app and that are not handles static 
 */

    



// ------------------
// Static Files
// ------------------

// if no router is responsible (nothing sent yet), try to serve static files
// this trys to find the requested file in the folder that is given in the argument
// express.static behaves like a middle-ware
app.use(express.static('./static'));

// ------------------
// static functions
// ------------------



// copy Objects, copeid from 'Speaking Javascript'-book
// global:
copyObject = function(orig) {
    // 1. copy has same prototype as orig
    var copy = Object.create(Object.getPrototypeOf(orig));
    // 2. copy has all of orig’s properties
    copyOwnPropertiesFrom(copy, orig);
    return copy;
}
copyOwnPropertiesFrom = function(target, source) {
    Object.getOwnPropertyNames(source) // (1)
    .forEach(function(propKey) { // (2)
    var desc = Object.getOwnPropertyDescriptor(source, propKey); // (3)
    Object.defineProperty(target, propKey, desc); // (4)
    });
    return target;
};
/**
 * wait for the given number of ms; this is blocking and produces unnecessary CPU load, but is the only synchronoous way to implement waiting. ONLY USE FOR TESTING!
 */
wait = function(ms){
	var waitTill = new Date(new Date().getTime() + ms);
	while(waitTill > new Date()){}
}

// local:
/*function copyObject(orig) {
    // 1. copy has same prototype as orig
    var copy = Object.create(Object.getPrototypeOf(orig));
    // 2. copy has all of orig’s properties
    copyOwnPropertiesFrom(copy, orig);
    return copy;
}
function copyOwnPropertiesFrom(target, source) {
    Object.getOwnPropertyNames(source) // (1)
    .forEach(function(propKey) { // (2)
    var desc = Object.getOwnPropertyDescriptor(source, propKey); // (3)
    Object.defineProperty(target, propKey, desc); // (4)
    });
    return target;
};*/
function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
	});
}


logger.log(80,'startup done!')


