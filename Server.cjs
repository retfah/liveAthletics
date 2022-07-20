// Server for liveAthletics
// as template the SpiSpo-main-file was used at the very, very beginning
// use Express for the main part
// later integrate a login system
// finally add socket.io and route all traffic for changes over this connections, also the first load of the shown data in the main application (formerly express.io was needed if both express and socket should run on the same server. This is not the case anymore and express.io is not developed anymore since July 2014)

/*
MAIN IDEA:
Normal pages shall be build up of a nested smaller parts of the page. E.g. there is a base page showing just the general header (Meeting, Wettkampf, Speaker, Admin) and subheaders (e.g. Disziplinen, Anmeldungen, Staffeln, Teams), and subsubheaders ... which are nested into each other on the server (GET request) or on the client (Websocket request). Each page defines how it is built up (its structure, which header, subheader, etc and where). It additionally can define other pages to be preloaded (as rawdata/unprocessed) in order to be rendered as soon a link requests it. Links thus shall not be like normal links (or get replaced on the client..!?) but instead call a function on the client that handles the changes. Ideally the client changes only parts of the rendered page. The client then also has to take care to change the URI and control that back/forward buttons in the browser still work as intended. 
see envelope from 23.4.2018

----------------
---   TODO   ---
----------------
- pages: the child property must be stored to the file and not to the page
- ws.getFile: translation + empty strings for all stuff to replace
- errorLogger including wirting errors to clients


----------------
--- CHANGES  ---
----------------
2021-01: use the main server also for the websocket connection, so that they share the same cookies and we can use this to known which user is logged in with a certain websocket connection. Before, the session id (sid) was reported as sson as the ws connection was established. But this needed that the cookie was accessible through javascript, which is not very safe. Also, this avoids the additional sid transfer in ws, since it is already done during establishing a connection. (Remember, ws is started as a http get with upgrade-request.)


----------------

*/

// this needs the following packages/modules:
// - express (includes parseurl and http)
// - express-session
// - body-parser
// - ejs
// - ...

// in general, one would use (=include) a template engine like ejs or others. They parse the 'html' file before it is sent and may add variable content to it. Some of them like pug (formerly jade) and Nunjucks let you write a html template without any html, but instead even with 'if'-'else' statements etc, so they are flexible to show within one page several different things (e.g. show Password was wrong only from the second try on). Others like Mustache and Dust allow little less changes, but partials are still possible. EJS was a very basic template and only allowed setting in some values, but can do much more today.
// With the module consolidate.js, many template engines are included and can be loaded as needed

// ----------------
// Includes
// ----------------

/** CommonJS (node) vs ECMAScript includes:
  * Node was invented before ECMAScript provided a method to export/import modules. Therefore it used the CommonJS notation, which was deliberately made to extend ECMAScript for that prupose. Meanwhile, ECMAScript provides import/export methods out-of-the-box. In my opinion it does not make sense to stick for overly long to a community standard, while a more important standard is available. Since newer releases, Nodejs provides the ECMAScript syntax out of the box. However, 
  * - the two notations can not be mixed in one document!
  * - the style of the document is defined by its file ending and the type-property in the nearest package.json:
  *   - if (the filending is .mjs) OR (the file ending is .js AND "type":"method" in package.JSON), then the file is considered as ECMAScript style (module-style --> mjs). "Require" cannot be used, but "import" does the job for both ECMAScript modules AND also CommonJS modules!
  *   - if (the fileening is .cjs) OR (the fileening is .js AND "type":"method" is NOT in package.JSON), then the file is considered as CommonJS style. "Import" cannot be used to load modules (but probably for dynamic imports), only "require" is available. However, require can only import CommonJS modules, no ECMAScript modules!
  * -> if a doucment shall be able to import both kinds of modules, it must be of type ECMAScript and use "import"!
  */

// include all the necessary packages

// without 'var' or 'const' the variable is global, i.e. it is also available in the other included scripts. 
// (Actually I should have used this for the logger...)
const express    	=   require('express');
const parseurl   	=   require('parseurl')
const http	   	=   require('http');
const https		=		require('https');
const path 		= 	require('path');
var session    	=   require('express-session');
var cookieParser =  require('cookie-parser');
const MongoStore =  require('connect-mongo')(session); // the storage system for the session-data
const MongoClientCon = require('mongodb').MongoClient;
var bodyParser 	=   require('body-parser');
var ejs        	=   require('ejs');
//var io_req     	=   require('socket.io');
const fs		= 	require('fs'); // filesystem-access, used e.g. for alabus interaction
var i18n 				= 	require('i18n-2'); // used in express with setLanguageByCookie
Sequelize = 	require('sequelize');
var DataTypes 	= 	require('sequelize/lib/data-types'); // included in sequelize package
mysql 			= 	require('mysql2/promise'); // access the DB directly. (sequelize also uses mysql2, but imports it itself)
mariadb			=   require('mariadb'); // access the DB directly. (sequelize also uses mariadb, but imports it itself)
var wsServer		= 	require('ws').Server;		// websocket server
var signature   =   require('cookie-signature'); // used to manually (in websocket instead of automatically in express-session) decode the sid cookie
var localLogger =   require('./logger.js');
var eventHandling2 = require('./eventHandling2.js');
var wsExt       =   require('./wsExtension'); // the syn/ack-stuff for WS
const rMeetings =   require('./rMeetings'); // room doeing meeting manipulation
const Ajv 		=   require('ajv').default;
ajv 			= 	new Ajv(); // check JSON input with schema
crypto 			= 	require('crypto'); // for hashing (NOT for passwords) and other crypto stuff, used e.g. in roomServer
bcrypt			= 	require('bcryptjs'); // for PASSWORD hashing; is slow, replace by bcrypt (instead of bcryptjs) when installable. Requires dependencies outside node on windows; on UNIX it should work easier. (Note: bcrypt runs in C++, while bcryptjs is all in javascript; both have the same methods)
// the following is valid ECMA Script 6, but does not work yet in Node.js 8.11.1 and also in 11.x it is only supported with the experimental feature --madules-experimental
//import wsExtClass from "./wsExtension.js";

// include external files
conf 			=	require ('./conf'); 
const pages		= 	require('./pages.js');
const files 	=   require('./files.js');
//const router	= 	require('./Router'); not used anymore, since it lead to problems (matching the path is different than when using app.METHOD)


// imports with ECMAscript syntax
//import {correctAssociations} from "./sequelize-mod.mjs";
const correctAssociations =  require("./sequelize-mod.js");

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

// listen on port 3000, automatically http
var server     =    app.listen(3000);

// the same could be done the follwing way
//var server = http.createServer(app).listen(3000);


// start the bare websocket Server
// we (currently) want a separate server/port for the ws-stuff, as on port 3000 is the normal webserver and the current/old WebSocket implementation with Socket.io
//var wss = new wsServerExtended({port:3001}); // stating a port automatically opens a new http webserver on that port
//const wss = new wsServer({server:server, port:3001}); // uses the the same server (but different port) as the http/html
const wss = new wsServer({noServer: true}); // NEW 2021-01-22: use the same server and port as the express app; route ws-upgrade requests to the ws then

server.on('upgrade', function upgrade(req, socket, head) {
	// we assume that any 'upgrade' request is meant for ws (eventually this is checked in wss.handleUpgrade)
	// the request should be for path "/ws", but actually we do not check it here.

	// parse the cookies; they will be added to req. (this function is synchronous; the req will be modified when cP-funciton has finished; callback is not required)
	cP(req, {},()=>{})
	// Now has all the cookies processed in it, e.g. req.cookies and req.signedCookies

	// the session middleware can parse its cookies itself; it also adds more session infos that we need. The session-function is NOT synchronous. The next() middleware will be called as soon as some asynchronous tasks have finished. Thus we must use the callback here.
	sess(req, {}, ()=>{
		// Now we should have req.session. (e.g. id)

		// check if the session-id set
		if ('connect.sid' in req.signedCookies && req.signedCookies['connect.sid']===req.session.id){ // I dont know whether req.session will be available if there was no cookie; therefore this double check
			// everything with session worked and is given now in req --> to be stored later to the ws-connection. 
			wss.handleUpgrade(req, socket, head, function done(ws) {
				wss.emit('connection', ws, req);
			});
		} else {
			// actually, if the client does not try to hack us, then he should never get here.
			logger.log(10, 'Error: the client that requested to connect to ws had no session cookie! Rejecting the ws-request.')
			//socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); // actually, 401 is not perfect code probably since we did not authenticate the client yet (every client can open a connection; the checks will be done in the rooms.)
			socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
			socket.destroy();
			return;
	}
	})

	
  });


// start the logger --> define the log level
const logger = new localLogger(undefined, 99); // 99=everything

// start the eventhandler-stuff
//const eH = new eventHandling();
const eH = new eventHandling2();


// create a pool of connections (suggested to do so by mariadb)
const mysqlPool = mariadb.createPool({host: conf.database.host, user: conf.database.username, password:conf.database.password, port:conf.database.port, connectionLimit: 5});

// The non-DB-specific connection to mysql (e.g. to create DBs) is opened in roomStartup, as it is async
global.mysqlConn=undefined // the connection shall be a global variable: TODO: change this, as it is unsafe, since all modules also could use this and do a lot of bad things.



// ------------------
// Start the connection to the DB with sequelize
// ------------------

// try to connect to DB, load some data and write some others
const sequelizeAdmin = new Sequelize(conf.database.dbBaseName+"_"+conf.database.dbAdminSuffix, conf.database.username, conf.database.password, {
	dialect: 'mariadb', // mariadb, mysql
	dialectOptions: {
		timezone: 'local',
	},
    host: conf.database.host,
    port: conf.database.port,
    //operatorsAliases: false, // does not exist anymore
    // application wide model options: 
    define: {
      timestamps: false // we generally do not want timestamps in the database in every record, or do we?
    }
	})

// test the connection:
sequelizeAdmin
  .authenticate()
  .then(() => {
    logger.log(85,'DB-Admin connection has been established successfully.');
  })
  .catch(err => {
	logger.log(1,'Unable to connect to the admin database:', err);
	logger.log(1, '--> cannot start the server');
	throw new Error('Unable to connect to DB and thus unable to start the server.');
  });


// TODO: the sequelize-auto-import function seemed to be a little outdated. It does not work with Sequelize >=6. I modded one line to make it work, but I dont know whether this leads to side problems. The modded file is backuped as "sequelize-auto-import-mod index.js", based on version 1.1.1 of sequelize-auto-importer. 

// import all models
// OLD: with sequelize-auto-import (could not reasonably be used with ECMAScript import syntax)
//const modelsAdmin = require('sequelize-auto-import')(sequelizeAdmin, __dirname+'/modelsAthletica2Admin');
//var models = require('sequelize-auto-import')(sequelizeAdmin, __dirname+'/models'); // TODO: this line should not be here in the future; it should be loaded for a specific meeting, with this specific sequelize instance.
// create references ("Associations") between the tables
//correctAssociations(modelsAdmin);
// NEW: use the init-script generated by sequelize-auto
const initModels = require(conf.folders.modelsAdmin + "init-models.js");
const modelsAdmin = initModels(sequelizeAdmin);


// versuche für sequelize mit users
			modelsAdmin.users.findAll({include: [modelsAdmin.usersgroups, modelsAdmin.usersmeetings]}).then((users)=>{
				console.log(users);
				// store the data to the parant's class property 'data'
				/*this.data = meetings;
				// create an object with properties = shortname and value=meeting
				this.meetingsAssoc = fetchAssoc(meetings, 'shortname'); 
	
				this.ready = true;
				this.logger.log(99, 'Meetings initially loaded!');*/
			}).catch((err)=>{console.log(err)})


// Mongo-Admin-DB
// connect to the mongo-db
// every meeting and the Administration has its own mongo-databases.
// each room in a DB is its own collection ("=table")
// a collection has multiple documents ("=table-rows")
// the identifiers in the documents represent "the columns"
// each entry can be/is a JSON-string
//   for the admin-rooms (every meeting will then have its own MongoDB as it also has its own MySQL-DB)
// every room shall have its own collection

// is there an Promise implementation of this or even a sync version (this would be useful here...)
var mongoclient = {};
var mongoClientPromise = MongoClientCon.connect('mongodb://' + conf.databaseMongo.host + ':' + conf.databaseMongo.port, {useUnifiedTopology: true}).then((client)=>{
	mongoclient = client;
}).catch((err)=>{
	logger.log(1,"Could not connect to the MongoDB: "+ err);
	throw err;
})


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
app.use(cookieParser(conf.sessionSecret))

// provide a manual cookieParser for the websockets
const cP=cookieParser(conf.sessionSecret)

// --------------------
// session handling
// --------------------

// set the session-storage to use mongoDB
const sessionStore = new MongoStore({url:"mongodb://localhost/testapp"}) //standard port/adress=localhost/dbName=testapp; no UN and PW

// set an expiry date for the cookie: 7 days
var expiryDate = new Date(Date.now() + (7*86400 + 0*3600 + 0*60 + 0)* 1000) // days+hours+min+seconds (must be in milliseconds)

// create the session middleware (not only used with app.use, but also in the ws-part!)
const sess = session({
	secret: conf.sessionSecret,
	resave: false, 
	saveUninitialized: true,   
	cookie: {
		httpOnly: true, 
		expires: expiryDate,
		secure: false, // TODO: set to true if we use https only. (Will make the cookie accessible only through https)
	},
	name: 'connect.sid', // set the same name in socket-onConnect on the client; connect.sid is the default
	store: sessionStore
	})

// register the middleware 'session', that handles everything with the different users, does all the cookie-work, and so on. 
// the object given to session() defines some (important) settings/parameters
app.use(sess);

// --------------------
// i18n internationalization part 1
// --------------------

// let the internationalization (=translation) module load bind itself
// does nothing else than call app.use() and then add the express class to req.

// TODO: change the languages to the official international 4-letter names, e.g. "de-ch" or "de-de"
// - for the static translations (=UI and similar), we will use the i18n-2 framework here together with express and ejs
// - for dynamic content the translation will be made on the client and we simply provide all available (or all applicable*) translations. * e.g. for disciplines we might have 50 different languages, but we would only provide those that are used at that competition. 
// TODO: change i18n to not use the cookie, but set it by the URL
// req.i18n.setLocale('de') 

var languages = ['en', 'de', 'fr', 'it'];
var x = i18n.expressBind(app, {
	// all supported languages
	locales: languages,

	// the name of the cookie storing the language
	//OLD: cookieName: 'localization'
})
// add the list of languages to the object (it is only accessible through Object.keys(req.i18n.locales), which is not efficient to be done in every request)
app.use((req,res,next)=>{
	req.i18n.languages = languages;
	next();
})

// for the websocket file translation, we need another instance of i18n, where the language is set by connection/sessionID
var i18nManual = new i18n({
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

// We need two/three different kinds of user-lists:
// 1a) file-based list per server:
//    - Server-admins: they have access to everything that is on this server; 
//    - Server-Superuser: can create server-users, etc.
// 1b) DB-based Server-users: users stored in a server-wide, easily changeable list, these users can have access to some specific meetings on that server and that can create/delete/alter/start/stop the meetings and set e.g. slave-servers. Server users are obviously NOT synchronized betwen different servers!
//    -
// Note: 1a might also be handled in 1b
// 2) meeting-users: user with special rights for this meeting specfically. This list is stored within the meeting (either SQL or MongoDB) and is thus synchronized between servers. Different rights for different groups on that server.

// I'd like to implement a mostly role-based access control system. The roles are defined in a config-file, which is NOT accessible through the program itself.

// on login, the logged in user and his assigned groups are translated into roles; checking whether he has access is based on roles. One file/room/piece-of-data requires a certain role/certain roles to be present.  

priviledges = {
	// the following rigths are given in global:
	globalAdmin: false, // can do everything, also manage meetings and other 
	globalReader: false, // what live-clients are
	globalFrontdesk: false, // add or delete athletes/inscription/starts
	meetingID: 123456, // meetingID
	meetingAdmin: false,
	meetingReader: false,
	meetingFrontdesk: false,
	meetingBackoffice: false, // Rechnungsbüro, kein Zugriff auf die Disziplinendefinitionen und Download/upload, sonst wie meetingAdmin
	// FUTURE (currently you need to be meetingAdmin): 
	meetingContests: [] // the list of allowed contestIDs; if set to false, all contests are allowed
}

// the adminUsers are defined in the config-file. So far no other users exist. 
// TODO future: allow logins for single DBs, without the admin rights
users = conf.adminUsers;

// NEW routing is below

// OLD routing:
// check if user is logged in (--> then call next()) or show the login page
/*app.use(function(req, res, next){
  // is a login needed?

	// TODO add here all cases were a login is required 
	// - when we must go into /admin, e.g. no meetings yet
	// - when the request is NOT for /live and we HAVE passwords for /work

	// trys to correctly login?
	if (req.path == '/login.sess' && req.method =='POST') {
		// user wants to login
		// logger.log(99, req.body)
			redirect = '';
			if (req.body.redirect) {
				redirect = req.body.redirect;
			}
    	if (req.body.username && req.body.password) {
    		if (users[req.body.username]===req.body.password) {
					// login successful
					logger.log(85,'login success')
					req.session.logged_in = true;
					req.session.isAdmin = true; // TODO: currently only admins have ot login; add other functionality here as soon as also normal users have to login
					// add a list of meetings that this user can accesss to the session storage
					
					if (redirect) {
						res.redirect(redirect);
					} else {
						// usually the redirect is given
						res.redirect('/');
					}
					
					
    			// not calling next
			} else {
				// password was wrong
				// TODO: add here an info that the password was wrong.
				res.render('Login.ejs', {redirect: redirect, message: i18nManual.__('Wrong password and/or username.')});
			}
		} 
	} else if(req.path == '/logout.sess' && req.method == 'POST'){
		req.session.logged_in = false;
		req.session.isAdmin = false;
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

wss.on('connection', (ws, req)=>{ // ws is the websocket object, req= the request-object from the http-server, after being sent through the express-session and cookieParser middleWares.

	// store the necessary data/configuration of this websocket (the one socket for a specific client)
	// analog to the old SocketIO implementation
	//ws.lang = "en"; // TODO: needed?
	ws.meetingID = undefined; // TODO: probably not needed anymore
	ws.userID = undefined; // TODO. probably not needed since we have ws.session
	ws.tabID = undefined; // a unique ID per tab open on the client; one client, i.e. one borwser = one sid = one session may have multiple tabs open; each tab will have its own ws connection; to not mess up the different ws-connections, especially when they refer to the same room, we need to identify the client with a tabID instead of the sid.
	ws.sid = req.session.sid; // before I had the session stuff stored to the connection-object I only stored the sid; 
	ws.session = req.session;

	logger.log(85, 'link established!');

	
	// NOTE: very, very important: the following cannot work:
	// var wsProcessor = new wsExtensionClass(ws, ws.send, (mess)=>{console.log(mess);});
	// --> 'ws.send' would only pass the function 'send' to the extensionClass, without its link to the Websocket and thus the 'this' inside 'send' would refer to the calling function instead of the ws-class. The statement below works.
	//var wsProcessor = new wsExtensionClass(ws, (mess)=>{ws.send(mess);}, (mess)=>{console.log(mess);});
	//var wsProcessor = new wsExt.wsExtensionClass(ws, (mess)=>{ws.send(mess);}, (mess)=>{console.log(mess);});
	// parameters: sending-function, incoming-note function, incoming-request function
	const wsProcessor = new wsExt((mess)=>{
		// actually I would have assumed that the close event is raised before the connection is actualyl closed or closing. But it is asctually raised when the connection is closed already. In some seldom cases, it mgight happen that a connection is clsoing when a message should be sent to it. This would generally lead to a failure. Thus we need to avoid this
		if (ws.readyState==1){
			ws.send(mess);
		} else {
			logger.log(15, `ws-client (tabId=${ws.tabID}) is not connected (readyState=${ws.readyState}). No message will be sent.`);
		}
	}, noteHandling, requestHandling, logger);
	
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
		//eH.raise('wsClientDisconnect/'+ws.sid); // pre 2021-01; no longer used, I think
		eH.raise('wsClientDisconnect/'+ws.tabID); // new (2021-01)
	})
	// that should be it!


	/**
	 * noteHandling: handling the incoming notes. Must have one argument, so it can be used in the wsProcessor directly. Currently this is unused yet, as so far everything is a request...
	 * IMPORTANT TODO: make sure that notes of the wrong data type do not crash the server!
	 * @param {any} note The data that was sent. could be any datatype, as defined on client and server as soon it is used. 
	 */
	function noteHandling(note){

		if (!validateMessage(note)){
			logger.log(75, 'The note "'+note.toString()+'" is not valid: ' + ajv.errorsText(validateMessage.errors));
			return;
		} else {
			//logger.log(99, note);
		}

		let name = note.name;
		let data = note.data;

		if(name=='room'){
			if (!roomsReady){
				return;
			}
			//if ('arg' in data && 'roomName' in data && ws.sid){
			if ('arg' in data && 'roomName' in data && ws.tabID){ // as of 2021-01

				// TODO: if the room is of a specific meeting (contains '@'), check if the user has the rights for this meeting and try to get the room of this meeting
				/*let splitRoom = data.roomName.split('@');
				if (splitRoom.length==2){
					let meetingShortname = splitRoom[0];
					
					// try to get the meeting
					if (meetingShortname in rooms.meetings.activeMeetings){

						rooms.meetings.activeMeetings[meetingShortname].rooms
					} else {
						logger.log(75, 'The room "' + data.roomName + '" does not exist in the respective meeting.');
					}

				}else {*/
					// check if room exists in global space
					if (data.roomName in rooms){


						// delegate the rest to the room:
						//rooms[data.roomName].wsNoteIncoming(ws.sid, wsProcessor, data.arg, data.opt)
						rooms[data.roomName].wsNoteIncoming(ws.tabID, wsProcessor, data.arg, data.opt, ws.session) // 2021-01: also give the session object, which also stores the sid and other login/permission related stuff 

					}else{
						// room does not exist
						logger.log(75, 'The room "' + data.roomName + '" does not exist');
					}
				//}

			} else {
				logger.log(75, 'Missing arguments (a request to "room" must contain the properties "arg" and "roomName")');
			}

		}else{
			let errMsg = '"'+ name +'" does not exist as keyword for Websocket notes.';
			logger.log(5, errMsg);
		}
	}

	/**
	 * requestHandling: handles the incoming requests. Must have two arguments, so it can be used in the wsProcessor directly. 
	 * IMPORTANT TODO: make sure that requests of the wrong data type do not crash the server!
	 * @param {json} request The request as a json: first the name of the function to call with the given data 
	 * @param {string} request.name The name of the request
	 * @param {any} request.data The data that needs to be given to the function handling the request of this name
	 * @param {function(message, failure=false)} responseFunc The function that has to be called with the response as the first argument. If an error shall be reported, the second argument must be true and the first parameter is the error-message.
	 */
	function requestHandling(request, responseFunc){

		if (!validateMessage(request)){
			logger.log(75, 'The request "'+request.toString()+'" is not valid: ' + ajv.errorsText(validateMessage.errors));
			return;
		} else {
			//logger.log(99, note);
		}

		// we assume for now that the input has the right format..:
		// e.g. request={name='preloadpage', data='the workload, which could be a json again with arbitrary depth'}
		
		let name = request.name;
		let data = request.data;

		// TODO: eventually put all the following single parts in separate function. An general event system can hardly be used here as we do not simply call an event, but we also need to send back something, which would (1) not be guaranteed through the event system and (2) it would not be clear how to work with it when there are multiple listeners.

		
		if (name=='preloadPage'){
			/**
			 * get the description of the requested page to be preloaded on the client and return it
			 */

			logger.log(85, 'socketEvent: preloadPage: ' + data);
			if (data in pages){
				// we have to make a deep conpy of the page, as we do not want to modify the basic data (that unfortunately cannot be protected from modifying (const does not exist)) --> according to the internet it is very fast to do via json (if no funcitons need to be transferred):
				var page = JSON.parse(JSON.stringify(pages[data]));
				
				// translate text and title of page to the set language
				sessionStore.get(ws.sid, (error, session)=>{
					if (session && session.lang){
						// set the language for translation
						i18nManual.setLocale(session.lang);

						// go through injections and injectionsSelf and chek if there are 'text' to translate
						function transInj(inj){
							if (inj) { // could be undefined
								// go through all injections
								for (injName in inj){
									// if text is present, translate it
									if (inj[injName].text){
										var tb = inj[injName].text;
										inj[injName].text = i18nManual.__(inj[injName].text);
									}
								}
							}
						}
						transInj(page.injections)
						transInj(page.injectionsSelf)

						// translate the title
						if (page.title){
							page.title = i18nManual.__(page.title);
						}

					} else {
						logger.log(7, "The sid was not stored to the socket, which should not happen! Cannot send translated text and title back to client!");
					}
					
					// send the data
					responseFunc(JSON.stringify(page));
				})
			}
		} else if (name=='setSid') // 2021-01: not needed anymore
		{

		/**
		 * set the session id (sid) of this connection. 
		 * When the client loads the first page via http, it will get a sid through express-session, which locally (Server) stores informations connected to this session-id in the sessionStore. This information can be e.g. a language selection or login-infos (status, user-group, ...). On the client the sid is stored in a cookie. As soon as the websocket connection is established, the client sends this cookie in this "setSid" event, so that the server then can 'connect' the sid to the websocket connection. Thus we have the websocket-connection (which is also kind of a session) connected to the standard http-session. So, ws-connection then knows the needed language and login-status etc (everything known to the session). 
		 */
			var sidRaw = data;

			// copied from express-session/index.js; unfortunately this cannot be accessed from external functions and thus had to be copied here
			/**
			 * Verify and decode the given `val` with `secrets`.
			 *
			 * @param {String} val
			 * @param {Array} secrets
			 * @returns {String|Boolean}
			 * @private
			 */
			function unsigncookie(val, secrets) {
				for (var i = 0; i < secrets.length; i++) {
				var result = signature.unsign(val, secrets[i]);
			
				if (result !== false) {
					return result;
				}
				}
				return false;
			}

			// from the raw session id (sid) we get the true session id
			// at the beginning there is "s:"" (respectively escaped : s%3A) to be removed
			sidRaw = decodeURIComponent(sidRaw); //'unescape' from URI-encoding to normal, unescape also the following characters: , / ? : @ & = + $ #
			sidRaw = sidRaw.replace(/^s:/,""); // regex: remove "s:" from the beginning of the text
			let sid = unsigncookie(sidRaw, [conf.sessionSecret])
			if (!sid){
				logger.log(7, "Error decoding the given sid: " + sidRaw)
				return false;
			}

			// save the sid to the socket; 
			ws.sid = sid; 

			// based on the sid, we also know what language the user has chosen (as this definition is always done by reloading via http and not via websocket and afterwards it is again updated in the session storage) and the possible login (TBD)

			logger.log(85, "successfully reported sid: "+ sid);
			responseFunc(true);

		} else if (name=='setTabId'){ // 2021-01: new, "instead" of sid (sid is now taken directly from the http-cookie during the handshake/upgrade; the tabId is new and replaces the sid as an identifier for the rooms to allow for multiple tabs to be connected to teh same room. (Before there were unwanted interactions, because the room-server could handle only one ws-connection per sid-client; now it is one connection per tabId-client, which is correct.)
			ws.tabID = data;

			logger.log(85, "successfully reported tabId: "+ data);
			responseFunc(true);

		} else if (name=='preloadFile')
		{
			/**
			 * get a file to be preloaded
			 */
			logger.log(85, 'socketEvent: preloadFile: '+data)
			var renderData = {} // + lang/translation!

			// get the language, based on the sid
			sessionStore.get(ws.sid, (error, session)=>{
				if (session && session.lang){
					// set the language for translation
					i18nManual.setLocale(session.lang);

					// make the translation available in the rendering part
					renderData.__ = i18nManual.__.bind(i18nManual);
					renderData._lang = session.lang;
					// TODO: also put the meeting-shortname to renderData
					//renderData._meeting = 


					// add empty strings for all defined includes
					files[data].childs.forEach((el)=>{
						if (!(el in renderData)){
							if (developMode){
								renderData[el] = "TODO";
							}else{
								renderData[el] = "";
							}
						}
					})
					
					ejs.renderFile(conf.folders.views + data, renderData).then((ret)=>{
						// create the reply, consisting of the name of the file and the file itself
						var repl = {filename: data, file: ret}
						//logger.log(99, JSON.stringify(repl));
						responseFunc(JSON.stringify(repl));
					}).catch((err)=>{logger.log(7, 'ERROR: could not render the file ' + data + '. The reason might be that ejs could not fill all placeholders, as not all of them are listed in "files".')})

				} else {
					logger.log(7, "The sid was not stored to the socket, which should not happen! Cannot send files back to client without rendering!");
				}
			})
		} else if (name=='room'){

			if (!roomsReady){
				responseFunc('The rooms are not ready yet. Please be patient', 4);
				return;
			}

			// requests to 'room' must look as defined in the following jsonSchema:
			/*
			data = {
				"type": "object",
				"properties": {
					"arg": {
						"type": "string",
						"enum": ["enter", "leave", "function", "fullData", "changeClientName"]
					},
					"roomName": {
						"type": "string"
					},
					"opt": {
						"type": {} // can be anything; for arg=enter it can be ID=123uuid and writing=true
					}
				},
				"required": ["arg", "roomName"]			
			}*/

			// check if the necessary arguments (arg, roomName) are given
//			if ('arg' in data && 'roomName' in data && ws.sid){
			if ('arg' in data && 'roomName' in data && ws.tabID){

				// TODO: room-handling for meeting specific rooms!

				// check if room exists
				if (data.roomName in rooms){

					// delegate the rest to the room:
					//rooms[data.roomName].wsRequestIncoming(ws.sid, wsProcessor, responseFunc, data.arg, data.opt)
					rooms[data.roomName].wsRequestIncoming(ws.tabID, wsProcessor, responseFunc, data.arg, data.opt, ws.session) // 2021-01: instead of the sid we now use the tabId; the sid is newly given via the "session" object, which additionally provides perimssion/login related infos for the respective client

					
				}else{
					// room does not exist
					responseFunc('The room "' + data.roomName + '" does not exist', 2);
				}

			} else {
				responseFunc('Missing arguments (a request to "room" must contain the properties "arg" and "roomName") OR tabId not reported yet.', 1);
			}

		} 

		// extend here for other message types
		
		else { 
			let errMsg = '"'+ name +'" does not exist as keyword for Websocket requests.';
			logger.log(5, errMsg);
			// send something back, that there was an error on the server.
			responseFunc(errMsg, true);
		}

	}

})



// --------------
// data-handlers/Rooms startup
// --------------

// create the list of rooms
const rooms = {};
var roomsReady = false;

// this function is async because it has to wait for some Promises, e.g. the MongoDB-Promise (connection to mongoDb to resolve)
async function roomStartup(){

	// ------------------
	// Start the raw-DB connection
	// ------------------
	mysqlConn = await mysql.createConnection({
		host     : conf.database.host,
		user     : conf.database.username,
		password : conf.database.password,
		port	 : conf.database.port,
		//multipleStatements: true // attention: we need this option for creating meetings; however, it is dangerous as it allows SQL-injections!
	});
	//mysqlConn.connect();

	//mysqlConn.query('do something');

	// end the connection...
	//mysqlConn.end();

	// new with mariaDB
	mysqlConn = await mysqlPool.getConnection().catch(error=>{console.log(error)});


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



// --------------
// Router
// --------------

// wichtig: darf nicht vor dem login-zeugs eingebunden werden, da alle middleware und auch die router-registrierungen der Reihe nach abgehandelt werden!


// Routes are defined with app.METHOD(Path, Callback), where Method is one of get/post/put/... (http methods), the path is the requested path (everything behind .com or .ch or ...) and the Callback is the function to execute, which receives three arguments: request, response, next. (As next is not aways needed, it can be ommitted.)
// The path supports regular expressions and even parameters in the path, that are then given in req.params!
// If further middleware or callbacks (in this same route) or other routes shall be executed after a route-callback, 'next' must be called. If the remaining callback in this route shall be skipped, next('Route') must be called. Like this, following middlewar and routes are still called. 

// TODO: implement this way of routing!
// -------------------------------------
// basic routing when starting from root
// root:
// - show competition choose page with all running compeititons (except when there is only one competition running, then redirect to it; except when there is no competition running, redirect to the server-login page)
//   --> provide here a server login-button
// meeting/competition chosen:
// - open the competition with reading rights (except when already logged in with other/more rights); show meeting/competition-login-button if the live-server shall also serve as competition server. IMPORTANT: if in public/live mode, do NOT allow that the default user has writing rights
// - if competition mode (or private mode; i.e. in a LAN) (this mode is NOT save to be on live the internet!): 
//   - if default user shall have (some) writing rights --> show the competition with all those rights
//   - if the default user has no writing rights, show the login page.

// NOTE: there are two slightly different logins: 
// - a server login, which allows a user to create new meetings and add other server-users to it. Such a user can also start/stop his meetings and change their server-settings. He automatically has full rights also within all his competitions (including e.g. to create competition-specific users and define/alter their rights). Further, there are actually two kinds of server user accounts:
//   - DB accounts: accounts stored in a DB with rights to administrate (on backstage) certain meetings and create new ones. The creator of the meeting might invite other users to administrate this meeting, but he might not provide them with all rights, e.g. an invited user might not be allowed to add other users or he cannot delete the meeting or cannot withdraw the creator's rights.
//   - config file (=ADMIN) accounts: have all possible rights and are defined in a config file on the server. 
// - a competition/meeting login: gives the user (certain) rights within this competition (add and/or alter inscriptions, add results, change the competition-setting). People loggend in with the server account automatically have full rights within their competitions/meetings.

// --------------------------------------


// check if there are meetings (and how many)
// therefore use sequelize to get all meetings:
// --> open a meetings-Room? Or something like this


// for all routes, we must have defined first the meeting ID
// either) save the meetingID with the cookie and/or session
// or) get the meeting ID as the first part of the path --> for the live results, this solution must be used, as we want to be able to have a link leading directly to one meeting.


// --------------
// Routing
// --------------

// Routes are defined with router.METHOD(Path, Callback), where Method is one of get/post/put/... (http methods), the path is the requested path (everything behind .com or .ch or ...) and the Callback is the function to execute, which receives three arguments: request, response, next. (As next is not aways needed, it can be ommitted.)
// The path supports regular expressions and even parameters in the path, that are then given in req.params!
// Important: '/' is actually '/*' (analog for every other path), i.e. if '/' has a route that stands at the beginning, it is always executed, also for e.g. '/something' and thus the actual route ('/something') will no be executed! TODO: this is probably only valid in a router, but not in 
// If further middleware or callbacks (in this same route) or other routes shall be executed after a route-callback, 'next' must be called. If the remaining callback in this route shall be skipped, next('Route') must be called. Like this, following middlewar and routes are still called. 


/**
 * first: check if the requested route is a special route, but wants to use the same base 'directory' as the main part uses --> then add the special routing here
 */

// special route for the first call of the page with nothing after the baseURL: 
// return the page for language selection

// serve static files (URL must be "/static" and teh fiels lie in "/static")
app.use('/static', express.static('static'))

app.get('/techHigh', (req, res, next)=>{
	logger.log(99, 'GET: /techHigh')
	res.render('techHigh.ejs');
})

// the very first level, e.g. "example.com/"
app.get(/^\/$/,(req, res, next)=>{
	logger.log(99, 'GET: /^\/$/')
	// req.headers['accept-languages'] would allow to access the complete raw-header string

	// try to automatically set the language
	let lang = req.acceptsLanguages(req.i18n.languages);
	if (lang){
		req.session.lang = lang;
		res.redirect('/'+lang);
	} else {    
		// show the language page 
		res.render("setLang.ejs"); 
	}

})

// whenever lang is given, provess the language and continue
app.get('/:lang\*', (req, res, next)=>{
	logger.log(99, 'GET: /:lang*') 
	// set the language. If the language was not changed afterwards, then the language does not exist --> return to language choose page
	if (req.i18n.setLocale(req.params.lang)!=req.params.lang){
		res.render('setLang.ejs');
		return;
	} 

	// store the chosen language in the session (needed for websocket-things)
	req.session.lang = req.params.lang;

	next();
})


// return the page, where the meeting can be chosen or show the page to create a new one, if there is none; of course, the links to admin must already be shown, as 
app.get('/:lang/', (req, res, next)=>{
	logger.log(99, 'GET: /:lang/')

	// we could show the language choose page when a language is given that does not exist. Currently it will automatically use the default language.

	// check if there are active meetings
	let numMeetingsActive = 0;
	var keys = []; // the meeting keys = shortnames
	if (roomsReady){
		keys = Object.keys(rooms.meetings.activeMeetings);
		numMeetingsActive = keys.length; 
	}
	if (numMeetingsActive>1) {
		// show the list of meetings to select
		res.render("meetingSelection.ejs");
	} else if(numMeetingsActive==1){
		// redirect to the only meeting
		let shortname = keys[0];
		res.redirect(path.posix.join(req.path , shortname)); 
	} else {
		// redirect to the admin page; eventually required login first...
		res.redirect(path.posix.join(req.path, 'meetingAdministration')) // posix.join joins pathes together in unix-style (as is in url), and adds/removes '/' if needed
		// TODO.
	}
	
})

app.get('/:lang/meetingAdministration', (req, res)=>{
	logger.log(99, 'GET: /:lang/meetingAdministration')

	res.render('meetingAdministration.ejs');
})

app.get('/:lang/meetingSelection', (req, res)=>{
	logger.log(99, 'GET: /:lang/meetingSelection')

	res.render('meetingSelection.ejs');
})


// do everything with the login/logout stuff

app.get('/:lang/login', (req, res, next)=>{
	logger.log(99, 'GET: /:lang/login')

	req.i18n.setLocale(req.params.lang);

	res.render('login.ejs', {redirect: '/' + req.params.lang + 'meetingSelection'});

})

// the actual login process (checkin PW and setting the session stuff is done prior in a )
// the actual logout is also done in a middleware prior to the routes


/**
 *  second: do the stuff needed when a normal site is parsed, where the path defines the structure of the document
 */

// we handle all GET routes in one function; if the route is unknown to this, we call next in order to get to other routes or static files, otherwise not
// only full requests are handled here, where the whole page has to be built up (but without data) and sent to the client
// incremental changes on the page are handled via WebSockets or POST (to be decided)
app.get('/:lang/:meeting/*', (req, res, next)=>{
	console.log(req.params)
	logger.log(99, 'GET: /:lang/:meeting/*')

	// set the language. If the language was not changed afterwards, then the language does not exist!
	// should be already set!
	/*if (req.i18n.setLocale(req.params.lang)!=req.params.lang){
		res.render('setLang.ejs');
		return
	} */
	
	// TODO: if a meeting was requested that is not running, redirect to the meetingSelection page
	//res.redirect()
	
	/* test if the requested page is 'valid':
		- first, get the path without the language and the meeting
		- no "/"" (except the first and probably last)
		- exists in pages */
	
	var path = req.path.substring(req.params.lang.length + req.params.meeting.length+3); 
	console.log(req.path);
	console.log(path);
	if (path.endsWith('/')){
		path = path.substr(0,path.length-1); // remove ending /
	}
	// if path is empty, go to root 
	if (path==""){path="root"};

	// the paths should not contain any '/'. Otherwise, something is wrong. 
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

		// object storing all variables inserted by ejs
		var renderData = {}
		// provide the __ function with the correct context ("this") to the data that can be rendered 
		renderData.__ = req.i18n.__.bind(req.i18n);

		// provide the current language and meeting (used for links that do not work via the pagehandling)
		renderData._lang = req.params.lang;
		//renderData._meeting = req.params.meeting; // TODO: if this is added, also add it in the ws-preload part. And for this, we need to have it in the session!

		// define the title of the page, which shall be injected in the root-file in the <head><title> (the root file must define this; otherwise it is simply not used)
		renderData.title = req.i18n.__(page.title);
		renderData.pageName = path;

		// inject self, if present
		if (page.injectionsSelf){
			prepareInjections(page.injectionsSelf, renderData)
			.then(renderData =>{
				recursiveLoad(page, renderData);
			}).catch(err =>{
				logger.log(20, 'something went wrong on preparing injections')
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
		// is nothing matched, redirect to the front page
		console.log("The requested page could not be found. Redirecting to the front page of the meeting.")
		res.redirect(`/${req.params.lang}/${req.params.meeting}/`); 
		//next()
	}
})
// if no '/' was written after the meeting, we have to redirect to this page
app.get('/:lang/:meeting', (req, res, next)=>{
	logger.log(99, 'GET: /:lang/:meeting')
	res.redirect(req.path + '/')
	//next();
})


// the very last routes: when no prior route was applicable, this is the fallback

// wrong on first path-part
/*pp.get('/*', (req, res, next)=>{
	// redirect to the startpage; in the future we could also have its own page for that case
	//res.redirect('/');
	res.status(404).send('Sorry, something went terribly wrong.')
})*/





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


