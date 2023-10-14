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
  *   - if (the fileending is .cjs) OR (the fileening is .js AND "type":"method" is NOT in package.JSON), then the file is considered as CommonJS style. "Import" cannot be used to load modules (but probably for dynamic imports), only "require" is available. However, require can only import CommonJS modules, no ECMAScript modules!
  * -> if a doucment shall be able to import both kinds of modules, it must be of type ECMAScript and use "import"!
  */

// include all the necessary packages

// without 'var' or 'const' the variable is global, i.e. it is also available in the other included scripts. 
// (Actually I should have used this for the logger...)
import express from 'express';
import parseurl from 'parseurl';
import http from 'http';
import https from 'https';
import path from 'path';
import session from 'express-session';
import cookieParser  from 'cookie-parser';
import MongoStore  from 'connect-mongo'; // the storage system for the session-data
//const MongoStore = MongoS(session);
import {MongoClient} from 'mongodb';
/*import MongoPack from 'mongodb';
const MongoClientCon = MongoPack.MongoClient;*/
import bodyParser from 'body-parser';
import ejs from 'ejs';
//var io_req     	=   require('socket.io');
import fs from 'fs'; // filesystem-access, used e.g. for alabus interaction
import i18n from 'i18n-2'; // used in express with setLanguageByCookie
import Sequelize  from 'sequelize';
const Op = Sequelize.Op;
//import DataTypes from 'sequelize/lib/data-types'; // included in sequelize package
//import mysql from 'mysql2/promise'; // access the DB directly. (sequelize also uses mysql2, but imports it itself)
import mariadb from 'mariadb'; // access the DB directly. (sequelize also uses mariadb, but imports it itself)
import WebSocket from 'ws';	   // websocket server
const wsServer = WebSocket.Server;
import signature   from 'cookie-signature'; // used to manually (in websocket instead of automatically in express-session) decode the sid cookie
/*import {promisify}  from 'util';
const readFileAsync = promisify( fs.readFile);*/
import {readFile} from 'node:fs/promises';
import localLogger from './logger.js';
import  eventHandling2 from './eventHandling2.js';
//import wsExt from './wsExtension.cjs'; // the syn/ack-stuff for WS
import wsExt from 'wsprocessor'; // acknowledged websocket messages
import rMeetings from './rMeetings.js'; // room doeing meeting manipulation
import AjvPack from 'ajv';
const Ajv = AjvPack.default;
const ajv = new Ajv({allowUnionTypes:true}); // check JSON input with schema

import {propertyTransfer} from './common.js';

// include external files
import conf from  './conf.js'; 
import pages from './pages.js';
import files from './files.js';
import wsManagerClass from './wsServer2Server.js';
import { dataProvider } from "./dataProvider.js";
//const router	= 	require('./Router'); not used anymore, since it lead to problems (matching the path is different than when using app.METHOD)

// imports with ECMAscript syntax
//import {correctAssociations} from "./sequelize-mod.mjs";
//import correctAssociations from "./sequelize-mod.js";

// use the debugger
//debugger;

// with the ECMAScript syntax there is no __dirname; so we need this workaround
import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __dirname = dirname(fileURLToPath(import.meta.url));


import moduleLinkSUI from './moduleLinkSUI.js';

// ----------------
// DEVELOP-MODE
// 
// --> no login required, partially more logged
// ----------------

global.developMode = true;

// unhandled rejection do not show a reasonable error in the console. Thus, catch it here and show it.
process.on('unhandledRejection', function(reason, promise) {
	console.log("Unhandled Rejection:", reason, promise);
	process.exit(1);
  });

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


// ---------------
// Middleware (must be set already here because we use cP and sess in the ws-stuff)
// ---------------

// Middleware are functions (Callbacks) that are always called, independent of the requested file/path. They receive the same data as would a path-specific function. Since all data are handled as objects and therefore byReference (not byVal), these middlware-functions can for example parse data that is already available in the given objects or inject new data into the given Objects. This injected data can be used in all following middle-ware and in all router-functions. 
// The order of the middleware-inclusion (app.use(...)) and routes gives the order in which the middleware and router-functions are called. So it is very important that the order is correct. For example when the session-login stuff came after the router-part, the login would never get checked. Other example: while most static files (which are directly sent to the client) should be protected through a login (call express-static after the login-part), for example a css-file should always be served. Thererfore one could for example include a second express-static before the login-part which matches a folder with non-login-restricted files. As soon as a middleware or route-callback does not invoke next(), the request is not further processed! --> So dont forget to do that! (This is primarily important in middleware and not routes, since routes generally are at the end of the call-history and thus do not require to call next().
// REMINDER: Middleware (and routes) needs to either call next(), which calls the next middleware or router-function or end the request by sending something. Otherwise the request is left hanging!


// --------------------
// session handling
// --------------------

// set the session-storage to use mongoDB
let mongodbSessionUrl = `mongodb://${conf.databaseMongo.host}:${conf.databaseMongo.port}/testapp`;
let mongoStoreOptions = {mongoUrl:mongodbSessionUrl};
const sessionStore = MongoStore.create(mongoStoreOptions); 

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
	store: sessionStore,
	})

// register the middleware 'session', that handles everything with the different users, does all the cookie-work, and so on. 
// the object given to session() defines some (important) settings/parameters
app.use(sess);

// --------------------
// cookie handling 
// --------------------

// adds req.cookies.(cookiename) and res.cookies(name, value)  
app.use(cookieParser(conf.sessionSecret))

// provide a manual cookieParser for the websockets
const cP=cookieParser(conf.sessionSecret)


// ------------------
// Start server
// ------------------


// start the bare websocket Server
// we (currently) want a separate server/port for the ws-stuff, as on port 3000 is the normal webserver and the current/old WebSocket implementation with Socket.io
//var wss = new wsServerExtended({port:3001}); // stating a port automatically opens a new http webserver on that port
//const wss = new wsServer({server:server, port:3001}); // uses the the same server (but different port) as the http/html
const wss = new wsServer({noServer: true}); // NEW 2021-01-22: use the same server and port as the express app; route ws-upgrade requests to the ws then

// listen to on certain port for http
var server = http.createServer(app).listen(conf.port);

function upgrade(req, socket, head) {
	// upgrades are only allowed when for /ws path
	if (req.url != "/ws"){
		// Decline the connection:
		logger.log(10, 'Error: the client that requested to connect to ws had no session cookie! Rejecting the ws-request.')
		//socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n'); // actually, 401 is not perfect code probably since we did not authenticate the client yet (every client can open a connection; the checks will be done in the rooms.)
		socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
		socket.destroy();
		return;
	}

	// parse the cookies; they will be added to req. (this function is synchronous; the req will be modified when cP-funciton has finished; callback is not required)
	cP(req, {},()=>{})
	// Now has all the cookies processed in it, e.g. req.cookies and req.signedCookies

	// the session middleware can parse its cookies itself; it also adds more session infos that we need. The session-function is NOT synchronous. The next() middleware will be called as soon as some asynchronous tasks have finished. Thus we must use the callback here.
	sess(req, {}, ()=>{
		// Now we should have req.session. (e.g. id)

		// if the client had no session cookie yet, it will automatically be created. This is typically the case for server2server communication. If the cookie is not set, we know that the information needed in several places should simply be set to a default value to make sure that everything else works (e.g. session.lang), but actually for server2server 

		// check if the session-id set
		if ('connect.sid' in req.signedCookies && req.signedCookies['connect.sid']===req.session.id){ 
			// everything with session worked and is given now in req --> to be stored later to the ws-connection. 
			wss.handleUpgrade(req, socket, head, function done(ws) {
				wss.emit('connection', ws, req);
			});
		} else {

			// manually add the some basic infos to the session
			req.session.noSessionCookie = true; // add this to notify that the client actually does not have a session-cookie
			req.session.lang = "en"; // add a default language 

			// everything with session worked and is given now in req --> to be stored later to the ws-connection. 
			wss.handleUpgrade(req, socket, head, function done(ws) {
				wss.emit('connection', ws, req);
			});

		}
	})
  }
server.on('upgrade', upgrade);

// if https shall be used, get the certificate files, set the port and start the server and handle ws-upgrades
var serverS;
if (conf.https){
	const options = {
		key: fs.readFileSync(conf.https.keyFilePath),
		cert: fs.readFileSync(conf.https.certificateFilePath),
	  };
	var serverS = https.createServer(options, app).listen(conf.https.port)
	serverS.on('upgrade', upgrade);
}


// start the logger --> define the log level
const logger = new localLogger(conf.loggers, 100); // 99=everything

// start the eventhandler-stuff
//const eH = new eventHandling();
// general schema to be followed: "roomName:whatIsChanged" e.g. "sideChannel@meetingShortname:changeReceived"
const eH = new eventHandling2(logger);


// create a pool of connections (suggested to do so by mariadb)
const mysqlPool = mariadb.createPool({
	host: conf.database.host, 
	user: conf.database.username, 
	password:conf.database.password, 
	port:conf.database.port, 
	connectionLimit: 5, 
	multipleStatements: true,
	connectTimeout: 10000, //ms
	acquireTimeout: 30000, //ms
	//charset: 'UTF8MB3_general_ci',
}); // multiple statements is needed for table creation; ATTENTION: this is a security problem (SQL injection) --> do not use this connection 

// The non-DB-specific connection to mysql (e.g. to create DBs) is opened in roomStartup, as it is async
global.mysqlConn = undefined // the connection shall be a global variable: TODO: change this, as it is unsafe, since all modules also could use this and do a lot of bad things.

// check if there is an adminDB; automatically create it if it is not available.
const mysqlbaseConn = await mysqlPool.getConnection().catch(error=>{console.log(error)});

let adminDbCreated = false; 
await mysqlbaseConn.query(`show databases where "${conf.database.dbBaseName}_${conf.database.dbAdminSuffix}"`).then(async (rows)=>{
	if (rows.length==0){
		// create the base admin db
		let res = await mysqlbaseConn.query(`create database if not exists ${conf.database.dbBaseName}_${conf.database.dbAdminSuffix}`).catch(async (error)=>{ throw `Admin-database could not be created: ${error}`});
		
		adminDbCreated = true;

		// the rest is done below
	}
})

// so far, the base connection was not for a specific DB. Now, select the DB:
await mysqlbaseConn.query(`USE ${conf.database.dbBaseName}_${conf.database.dbAdminSuffix}`)

// insert tables etc.
if (adminDbCreated){
	// load the DB-code through sequelize
	try {
		// copy the standard DB into the new DB 
		// the sql code to create the tables must be in a separate file. This code is then run on the DB. We cannot use mysqldump here, as e.g. there is no import option yet for it.
		
		let emptyDbCode = await readFile(conf.database.emptyAdminDbPath, 'utf8') // if the encoding is ommitted, a buffer is returned whcih CANNOT be read by sequelize

		await mysqlbaseConn.query(emptyDbCode);
	}catch(err){
		await mysqlbaseConn.query(`drop database if exists ${conf.database.dbBaseName}_${conf.database.dbAdminSuffix}`)
		throw(`Could not create the admin-database: ${err}`);
	}
}


// ------------------
// Start the connection to the DB with sequelize
// ------------------

// try to connect to DB, load some data and write some others
const sequelizeAdmin = new Sequelize(conf.database.dbBaseName+"_"+conf.database.dbAdminSuffix, conf.database.username, conf.database.password, {
	dialect: 'mariadb', // mariadb, mysql
	dialectOptions: {
		timezone: 'local',
		connectTimeout: 10000, //ms
		acquireTimeout: 30000, //ms
		// multipleStatements: true, //would be needed if the admin-table creation was done through sequelize; however, it is dangerous as it allows SQL-injections!
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
//import modelsAdminPack from 'sequelize-auto-import';
//const modelsAdmin = modelsAdminPack(sequelizeAdmin, __dirname+'/modelsAthletica2Admin');
//var models = require('sequelize-auto-import')(sequelizeAdmin, __dirname+'/models'); // TODO: this line should not be here in the future; it should be loaded for a specific meeting, with this specific sequelize instance.



// create references ("Associations") between the tables
//correctAssociations(modelsAdmin);
// NEW: use the init-script generated by sequelize-auto
import initModels from "./modelsAthletica2Admin/init-models.js";
import findRoom from './findRoom.js';
//import { registerRuntimeCompiler } from 'vue';
//import series from './modelsMeetingDefine/series';
const modelsAdmin = initModels(sequelizeAdmin);


// versuche für sequelize mit users
modelsAdmin.users.findAll({include: [modelsAdmin.usersgroups, modelsAdmin.usersmeetings]}).then((users)=>{
	//console.log(users);
	// store the data to the parant's class property 'data'
	/*this.data = meetings;
	// create an object with properties = shortname and value=meeting
	this.meetingsAssoc = fetchAssoc(meetings, 'shortname'); 

	this.ready = true;
	this.logger.log(99, 'Meetings initially loaded!');*/
}).catch((err)=>{console.log(`Error in eager-loading users: ${err}`)})


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
let mongoUrl = 'mongodb://' + conf.databaseMongo.host + ':' + conf.databaseMongo.port;
var mongoclient = new MongoClient(mongoUrl);
await mongoclient.connect().catch((err)=>{
	logger.log(1,"Could not connect to the MongoDB: "+ err);
	throw err;
})

// keep an object with all base-data modules
const baseModules = {};

// TODO: automate the generation of the object based on some config file proeprties. 
// TODO: provide a possibility to define the allowed base data usage per meeting. This migth be needed for data protection reasons.
// If World Athletics provides an API, I could also write a module that gets athletes data from there; this module would probably be open to all meetings, since the data could be "open" anyway, in contrast to base data from countries, where more strict rules might apply.

// ATTENTION: baseSui is NOT the instance you imight think of if we keep having the updateDateBase at the end
const baseSui = moduleLinkSUI.create(logger, mongoclient, mysqlPool).then((bs) => {
	//bs.updateBaseData({username:'121832', password:'struppi1'}).catch(err=>console.log(err));
	baseModules['SUI'] = bs;

	/*bs.importCompetition(123456,{},{}).catch(err=>{
		console.log(err)
	})*/
	//bs.getCompetitions({username:'121832', password:'struppi1'}).catch(err=>console.log(err));
});


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

// for the websocket file translation, we need another instance of i18n, where the language is set by connection/sessionID
var i18nManual = new i18n({
    // setup some locales - other locales default to the first locale
    locales: languages
});

// dynamical, static translations:

// how to translate modules:
// easiest way: put all (!) text in ejs file and render it; use the __("") translation style

// other, complicated and currently unused approach: 
// add the translated arrays of seriesStates and contestStates to the locales. (this is the most simple way; We do not want to transalte it in every call of client and we do know the language of the client within an ejs <% %> part, so we need to pretranslate the full arrays to i18n and misuse __() for language specific inserts, which typically would be done in ejs)
/*var translatedSeriesStates = {};
var translatedContestStates = {};

for (let lang of languages){
	// translated series states
	let tss = JSON.parse(JSON.stringify(seriesStates));
	// translated contest states
	let tcs = JSON.parse(JSON.stringify(contestStates));
	
	// temporary set the language
	i18nManual.setLocale(lang);
	
	tss = JSON.stringify(tss.map(serie => {
		// do the translations
		serie.text = i18nManual.__(serie.text);
		return serie;
	}));
	tcs = JSON.stringify(tcs.map(contest => {
		// do the translations
		contest.text = i18nManual.__(contest.text);
		return contest;
	}));

	// add to locale of the manual i18n; below also for the one within express
	i18nManual.locales[lang].INSERTcontestStates = tcs;
	i18nManual.locales[lang].INSERTseriesStates = tss;

	translatedSeriesStates[lang] = tss;
	translatedContestStates[lang] = tcs;
}*/

// add the list of languages to the object (it is only accessible through Object.keys(req.i18n.locales), which is not efficient to be done in every request)
app.use((req,res,next)=>{
	req.i18n.languages = languages;
	// manually add some "translations" (acually "translated inserts" done via i18n)
	/*for (let lang of languages){
		req.i18n.locales[lang].INSERTcontestStates = translatedContestStates[lang];
		req.i18n.locales[lang].INSERTseriesStates = translatedSeriesStates[lang];
	}*/
	next();
})

// manually add translation stuff for seriesAssignment
//let seriesAssignmentsTranslated = JSON.parse(JSON.stringify(conf.seriesAssignments));

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

var priviledges = {
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
var users = conf.adminUsers;

// TODO: all the login stuff is by far not finished. 
// check if user is logged in (--> then call next()) or show the login page
app.use(function(req, res, next){

	// currently, this only a very very simple login interface, which is not used yet
  
	// trys to correctly login?
	if (req.path == '/login.sess' && req.method =='POST') {
		// user wants to login
		//logger.log(99, req.body)
		redirect = '';
		// redirecrect should be given as an additional post parameter if redirection to the mentioned site is requested.
		if (req.body.redirect) {
			redirect = req.body.redirect;
		}
		if (req.body.username && req.body.password) {
			if (users[req.body.username]===req.body.password) {
					// login successful
					logger.log(98,'login success')
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

		// currently, we simply continue with the next app.use() when this was not a login attempt.
		next();


		// user simply wants data: is he allowed --> next(), otherwise show the login page
		// do not require login in developMode
		/*if (req.session.logged_in || developMode) {
			next()
		} else {
			res.render('Login.ejs', {redirect: req.path, message: i18nManual.__('You must be logged in for this action.')}) // redirect to a router or serving static would (probably) not work, since this is included after this login-check
			//not next!!
		}*/
	}
});


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
	ws.userID = undefined; // TODO. probably not needed since we have ws.session
	ws.tabID = undefined; // a unique ID per tab open on the client; one client, i.e. one borwser = one sid = one session may have multiple tabs open; each tab will have its own ws connection; to not mess up the different ws-connections, especially when they refer to the same room, we need to identify the client with a tabID instead of the sid.
	ws.sid = req.session.id; // before I had the session stuff stored to the connection-object I only stored the sid; 
	ws.session = req.session;
	
	logger.log(98, 'link established!');

	
	// NOTE: very, very important: the following cannot work:
	// var wsProcessor = new wsExtensionClass(ws, ws.send, (mess)=>{console.log(mess);});
	// --> 'ws.send' would only pass the function 'send' to the extensionClass, without its link to the Websocket and thus the 'this' inside 'send' would refer to the calling function instead of the ws-class. The statement below works.
	//var wsProcessor = new wsExtensionClass(ws, (mess)=>{ws.send(mess);}, (mess)=>{console.log(mess);});
	//var wsProcessor = new wsExt.wsExtensionClass(ws, (mess)=>{ws.send(mess);}, (mess)=>{console.log(mess);});
	// parameters: sending-function, incoming-note function, incoming-request function

	var logTranslate = (errCode, errMsg)=>{
		if (errCode==0){ // unrepoerted errors (e.g. unprocessable packages)
			logger.log(10, errMsg)
		} else if (errCode==1){ // errors reported already through callback
			logger.log(20, errMsg)
		} else if (errCode==2){ //unused
			logger.log(50, errMsg)
		} else if (errCode==3){ //every message sent/arriving, except ping
			logger.log(90, errMsg)
		} else if (errCode==4){ //even ping/pong
			logger.log(99, errMsg)
		} else {
			logger.log(99, errMsg)
		}
	}

	const wsProcessor = new wsExt((mess)=>{
		// actually I would have assumed that the close event is raised before the connection is actually closed or closing. But it is asctually raised when the connection is closed already. In some seldom cases, it mgight happen that a connection is clsoing when a message should be sent to it. This would generally lead to a failure. Thus we need to avoid this
		if (ws.readyState==1){
			ws.send(mess);
		} else {
			logger.log(15, `ws-client (tabId=${ws.tabID}) is not connected (readyState=${ws.readyState}). No message will be sent.`);
		}
	}, (code=undefined, reason=undefined)=>{
		// close function
		ws.close(code, reason);	
	},noteHandling, requestHandling, logTranslate, {heartbeatMinInterval: 6});
	//console.log(`ReadyState on connection: ${ws.readyState}`);
	
	// the server usually does not need to call a sending funciton from outside this class except if it wants to push something to everybody (broadcast) or to rooms. Then this connection respectively the ws processor should be registererd to a server-wide object.

	// manually set what shall happen onMessage:
	// NOTE: very, very important: see note above at wsProcessor
  	ws.on('message', (mess)=>{wsProcessor.onMessage(mess);});

	//wsProcessor.open();
	//ws.on('open', ()=>{wsProcessor.open(); console.log('opened')})
	
	ws.on('close', ()=>{
		// old: wsProcessor.closing() = true;
		wsProcessor.close();
		logger.log(99, 'A ws-client got disconnected.');
		// TODO: maybe some more funcitons must be called on closing...
		
		// report to the eventHandler that the client disconnected, such that every room having this client can handle this appropriately
		//eH.raise('wsClosed/'+ws.sid); // pre 2021-01; no longer used, I think
		eH.raise('wsClosed/'+ws.tabID); // new (2021-01)
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
			
			// tabId must have been reported before; the rooms expect to get this information
			if ('arg' in data && 'roomName' in data && ws.tabID){ // as of 2021-01

				// new 2022-02: finding the room is handled elsewhere
				findRoom(data.roomName, rooms.meetings, rooms, logger).then(room=>{
					room.wsNoteIncoming(ws.tabID, wsProcessor, data.arg, data.opt, ws.session);

				}).catch(err=>{
					// findRoom throws the right errors:
					// no need to do anything; it is already logged
				});

				// if the room is of a specific meeting (contains '@'), check if the user has the rights for this meeting and try to get the room of this meeting
				/*let splitRoom = data.roomName.split('@');
				if (splitRoom.length==2){
					let meetingShortname = splitRoom[1];
					let fullRoomName = splitRoom[0];

					// the room name may contain a subroom name (roomName/subroom1name/subroom2name/...) --> get the roomName and pass the rest to the subroom-function
					let roomName = fullRoomName.split('/',1)[0];
					let subrooms = fullRoomName.slice(roomName.length+1);
					
					// try to get the meeting
					if (meetingShortname in rooms.meetings.activeMeetings){
						let room;
						if (room = rooms.meetings.activeMeetings[meetingShortname].rooms[roomName]){

							// differentiate: we want a subroom OR the mainroom:
							if (subrooms==''){
								room.wsNoteIncoming(ws.tabID, wsProcessor, data.arg, data.opt, ws.session);
							} else {
								let subroom = room.getSubroom(subrooms); // return false on failure
								if (!subroom){
									logger.log(75, 'The subroom "' + subrooms + '" does not exist in the respective meeting.');
								} else {
									subroom.wsNoteIncoming(ws.tabID, wsProcessor, data.arg, data.opt, ws.session);
								}
							}
							
						} else {
							logger.log(75, 'The room "' + roomName + '" does not exist in the respective meeting.');
						}
					} else {
						logger.log(75, 'The meeting "' + meetingShortname + '" does not exist. The room "' + data.roomName + '" cannot be loaded.');
					}

				}else {
					// check if room exists in global space
					if (data.roomName in rooms){


						// delegate the rest to the room:
						//rooms[data.roomName].wsNoteIncoming(ws.sid, wsProcessor, data.arg, data.opt)
						rooms[data.roomName].wsNoteIncoming(ws.tabID, wsProcessor, data.arg, data.opt, ws.session) // 2021-01: also give the session object, which also stores the sid and other login/permission related stuff 

					}else{
						// room does not exist
						logger.log(75, 'The room "' + data.roomName + '" does not exist');
					}
				}*/

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

			logger.log(98, 'socketEvent: preloadPage: ' + data);
			if (data in pages){
				// we have to make a deep conpy of the page, as we do not want to modify the basic data (that unfortunately cannot be protected from modifying (const does not exist)) --> according to the internet it is very fast to do via json (if no funcitons need to be transferred):
				var page = JSON.parse(JSON.stringify(pages[data]));
				
				// translate text and title of page to the set language
				sessionStore.get(ws.sid, (error, session)=>{
					if (session && session.lang){
						// set the language for translation
						i18nManual.setLocale(session.lang);

						// go through injections and injectionsSelf and check if there are 'text' to translate
						function transInj(inj){
							if (inj) { // could be undefined
								// go through all injections
								for (let injName in inj){
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

			logger.log(98, "successfully reported sid: "+ sid);
			responseFunc(true);

		} else if (name=='setTabId'){ // 2021-01: new, "instead" of sid (sid is now taken directly from the http-cookie during the handshake/upgrade; the tabId is new and replaces the sid as an identifier for the rooms to allow for multiple tabs to be connected to the same room. (Before there were unwanted interactions, because the room-server could handle only one ws-connection per sid-client; now it is one connection per tabId-client, which is correct.)
			ws.tabID = data;

			logger.log(98, "successfully reported tabId: "+ data);
			responseFunc(true);

		} else if (name=='preloadFile')
		{
			/**
			 * get a file to be preloaded
			 */
			logger.log(98, 'socketEvent: preloadFile: '+data)
			var renderData = {} // + lang/translation, see below

			// series assignements
			renderData.seriesAssignments = conf.seriesAssignments;

			// available base modules 
			renderData.baseModules = Object.keys(baseModules);

			// get the language, based on the sid
			sessionStore.get(ws.sid, (error, session)=>{
				if (session && session.lang){
					// set the language for translation
					i18nManual.setLocale(session.lang);

					// make the translation available in the rendering part
					renderData.__ = i18nManual.__.bind(i18nManual);
					renderData._lang = session.lang;
					// TODO: also put the meeting-shortname to renderData

					// TODO: includesSelf should probably also be set here
					//prepareInjections(page.injectionsSelf, renderData)

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
			// tabId must have been reported before calling any room functions!
			if ('arg' in data && 'roomName' in data && ws.tabID){

				// new 2022-02: finding the room is handled elsewhere
				findRoom(data.roomName, rooms.meetings, rooms, logger).then(room=>{
					room.wsRequestIncoming(ws.tabID, wsProcessor, responseFunc, data.arg, data.opt, ws.session);

				}).catch(err=>{
					// findRoom throws the right errors:
					responseFunc(err.message, err.code);
				});


				// OLD: 
				// if the room is of a specific meeting (contains '@'), check if the user has the rights for this meeting and try to get the room of this meeting
				/*let splitRoom = data.roomName.split('@');
				if (splitRoom.length==2){
					let meetingShortname = splitRoom[1];
					let fullRoomName = splitRoom[0];

					// the room name may contain a subroom name (roomName/subroom1name/subroom2name/...) --> get the roomName and pass the rest to the subroom-function
					let roomName = fullRoomName.split('/',1)[0];
					let subrooms = fullRoomName.slice(roomName.length+1);
					
					// try to get the meeting
					if (meetingShortname in rooms.meetings.activeMeetings && rooms.meetings.activeMeetings[meetingShortname].meeting.running){
						let room;
						if (room = rooms.meetings.activeMeetings[meetingShortname].rooms[roomName]){

							// differentiate: we want a subroom OR the mainroom:
							if (subrooms==''){
								room.wsRequestIncoming(ws.tabID, wsProcessor, responseFunc, data.arg, data.opt, ws.session);
							} else {
								let subroom = room.getSubroom(subrooms); // return false on failure
								if (!subroom){
									logger.log(75, 'The subroom "' + subrooms + '" does not exist in the respective meeting.');
									responseFunc('The subroom "' + subrooms + '" does not exist in the respective meeting.', 11);
								} else {
									subroom.wsRequestIncoming(ws.tabID, wsProcessor, responseFunc, data.arg, data.opt, ws.session);
								}
							}
							
						} else {
							logger.log(75, 'The room "' + roomName + '" does not exist in the respective meeting.');
							responseFunc('The room "' + roomName + '" does not exist in the respective meeting.', 11);
						}
					} else {
						logger.log(75, 'The meeting "' + meetingShortname + '" does not exist. The room "' + data.roomName + '" cannot be loaded.');
						responseFunc('The meeting "' + meetingShortname + '" does not exist. The room "' + data.roomName + '" cannot be loaded.', 12);
					}

				}else {
					// check if room exists in global space
					if (data.roomName in rooms){


						// delegate the rest to the room:
						//rooms[data.roomName].wsNoteIncoming(ws.sid, wsProcessor, data.arg, data.opt)
						rooms[data.roomName].wsRequestIncoming(ws.tabID, wsProcessor, responseFunc, data.arg, data.opt, ws.session) // 2021-01: instead of the sid we now use the tabId; the sid is newly given via the "session" object, which additionally provides perimssion/login related infos for the respective client

					}else{
						// room does not exist
						logger.log(75, 'The room "' + data.roomName + '" does not exist');
						responseFunc('The room "' + data.roomName + '" does not exist', 13);
					}
				}*/


			} else {
				responseFunc('Missing arguments (a request to "room" must contain the properties "arg" and "roomName") OR tabId not reported yet.', 14);
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


// for the wsServer2Server connections, we need special request and noteHandlers. they also need access to rooms, therefore we implement them here
// These are not the actual requestHandlers, but a function to be called to generate the requestHandler 
/**
 * Create the requestHandler function for server2server communication; we have to create this function here in order to have access to rooms.
 * @param {wsProcessor} wsProcessor INstance of wsProcessor to hand over to the room (needed for multiple answers)
 * @param {websocket} ws Actually the websocket object, storing the tabId, session, lang etc; however, for the server to server communication we actually do nto have this
 * @returns the requestHandler-function
 */
function requestHandlerForS2S(wsProcessor, ws={}){
	return function(request, responseFunc){

		// This code is copied from Server.js; eventually implement this in a separate file and include it in both places

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

		// TODO: do we have all data needed in the code below? Waht we change or specify in the properties if we changed this into a separate function?
		
		if (name=='room'){

			// we assume that the rooms are ready.
			/*if (!roomsReady){
				responseFunc('The rooms are not ready yet. Please be patient', 4);
				return;
			}*/

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
			// not tabId needed here; and we finally only access access to one room: rSideChannel ! 
			if ('arg' in data && 'roomName' in data ){

				// if the room is of a specific meeting (contains '@'), check if the user has the rights for this meeting and try to get the room of this meeting
				let splitRoom = data.roomName.split('@');
				if (splitRoom.length==2){
					let meetingShortname = splitRoom[1];
					let fullRoomName = splitRoom[0];

					if (fullRoomName !="sideChannel"){
						let msg = `Access to this room is not allowed on server2server connections!`;
						logger.log(75, msg);
						responseFunc(msg, 13);
						return
					}

					// no need to check for subroom and stuff
					
					// try to get the meeting
					if (meetingShortname in rooms.meetings.activeMeetings && rooms.meetings.activeMeetings[meetingShortname].meeting.running){
						let room;
						if (room = rooms.meetings.activeMeetings[meetingShortname].rooms[fullRoomName]){

							room.wsRequestIncoming(ws.tabID, wsProcessor, responseFunc, data.arg, data.opt, ws.session).catch((err)=>{
								let msg = `Error (code: ${err.code}) during requestIncoming processing: ${err.message}`;
								logger.log(30, msg);
								responseFunc(err.message, err.code)
							});
							
						} else {
							logger.log(75, 'The room "' + roomName + '" does not exist in the respective meeting.');
							responseFunc('The room "' + roomName + '" does not exist in the respective meeting.', 11);
						}
					} else {
						logger.log(75, 'The meeting "' + meetingShortname + '" does not exist. The room "' + data.roomName + '" cannot be loaded.');
						responseFunc('The meeting "' + meetingShortname + '" does not exist. The room "' + data.roomName + '" cannot be loaded.', 12);
					}

				}else {
					// no access to global rooms!
					let msg = 'The room "' + data.roomName + '" is not accessible on this server2server connection!';
					logger.log(75, msg);
					responseFunc(msg, 13);
				}


			} else {
				responseFunc('Missing arguments (a request to "room" must contain the properties "arg" and "roomName") OR tabId not reported yet.', 14);
			}

		} 
	}
	
}
/**
 * noteHandling: handling the incoming notes. Must have one argument, so it can be used in the wsProcessor directly. Currently this is unused yet, as so far everything is a request...
 * IMPORTANT TODO: make sure that notes of the wrong data type do not crash the server!
 * @param {any} note The data that was sent. could be any datatype, as defined on client and server as soon it is used. 
 */
function noteHandlerForS2S(wsProcessor, ws={}){

	return function (note){

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
			
			// tabId must have been reported before; the rooms expect to get this information
			if ('arg' in data && 'roomName' in data && ws.tabID){ // as of 2021-01

				// new 2022-02: finding the room is handled elsewhere
				findRoom(data.roomName, rooms.meetings, rooms, logger).then(room=>{
					room.wsNoteIncoming(ws.tabID, wsProcessor, data.arg, data.opt, ws.session);

				}).catch(err=>{
					// findRoom throws the right errors:
					// no need to do anything; it is already logged
				});

			} else {
				logger.log(75, 'Missing arguments (a request to "room" must contain the properties "arg" and "roomName")');
			}

		}else{
			let errMsg = '"'+ name +'" does not exist as keyword for Websocket notes.';
			logger.log(5, errMsg);
		}
	}
}


// Websocket-manager for Server2Server communication, where this server initiates a connection to another server.
const wsManager = new wsManagerClass(logger, eH, requestHandlerForS2S, noteHandlerForS2S);

// --------------
// translated configurations (e.g. for printing)
// --------------

// for printing it is possible to have language dependent configurations. However, in the specific language only the parts that are not identical to the english part need to be specified. Therefore, on startup (or once every day), create the configurations for each available language.
const confPrintByLang = {};
const translateConfPrint = async ()=>{
	// TODO: if this function shall be rerun by a certain timer, but without a restart of the server, we must dynamically import the conf file. Otherwise, the changes in the conf file would anyway not be seen here.
	//import {confPrint} from './static/confPrint.js'
	const {confPrint} = await import('./confPrint.js');
	for (let lang1 in confPrint){
		if (lang1=='en'){
			// this is the defaul language. simply use this here as well
			confPrintByLang[lang1] = confPrint[lang1];
		} else {
			// transfer every property in the language specific configuration to a copy of the default=en configuration.
			let confCopy = JSON.parse(JSON.stringify(confPrint['en']));
			propertyTransfer(confPrint[lang1], confCopy, true);
			confPrintByLang[lang1] = confCopy;
		}
	}

}
// run the translation now.
translateConfPrint();

// run the translation after a certain period
setInterval(translateConfPrint, conf.confPrintRecreationInterval*1000);


// --------------
// data-handlers/Rooms startup
// --------------

// create the list of rooms
const rooms = {};
var roomsReady = false;
const timings = {};

// this function is async because it has to wait for some Promises, e.g. the MongoDB-Promise (connection to mongoDb to resolve)
async function roomStartup(){

	// ------------------
	// Start the raw-DB connection
	// ------------------

	// new with mariaDB
	mysqlConn = await mysqlPool.getConnection().catch(error=>{console.log(error)});


	// wait for mongoDB-connection to startup
	//await mongoClientPromise;

	// get/create DB for Admin-stuff (every room for Admin is its own collection)
	var mongoDbAdmin = mongoclient.db("administration"); // the name admin is a special one and occupied

	// startup everything that is needed for data-handling


	// --- Admin-DB-stuff / = Meeting-room ---
	// Meeting-room (maybe room is here not the right word, as long as we do not push updates to clients...)
	
	var meetingHandling = new rMeetings(sequelizeAdmin, modelsAdmin, mongoDbAdmin, mongoclient, eH, logger, wsManager, baseModules); // if it was a room, also the websocket connection would have to be passed
	// attention: rMeetings has async components that might take longer to initialize...

	// register rMeeting in the wsManager, since its requestHandler was hardcoded for simplicity and requires access to rMeetings

	// add to the rooms-list, named 'meetings'
	rooms.meetings = meetingHandling;

	// wait for the meetingsReady event to 
	eH.eventSubscribe('meetingsReady', ()=>{roomsReady = true})
	//roomsReady = true;

	// Timing rooms:
	// The mongoDB stuff uses the DB of the admin, which I think is fine.
	
	for (let t of conf.timings){
		let rt = new t.class(wsManager, t.name, eH, mongoDbAdmin, logger);
		timings[encodeURI(t.name)] = rt;
		rooms[`timing${encodeURI(t.name)}`] = rt; 
	}

}
roomStartup().catch((err)=>{throw err;});

// -------------------
// Plugins
// see plugins.js for a reasonable base class (wtith/out mongo)
// -------------------

// get the Plugins Mongo DB
const mongoDbPlugins = mongoclient.db("plugins");


// start the meeting data providers
const meetingDataProviders = [];

for (let dp of conf.meetingDataProviders){
	let x = new dp(logger, mongoDbPlugins);
	meetingDataProviders.push(x);
}


// TODO: how to consider out own meetings in a similar way? It should always be live.
// we need to handle our own meetings separately, since we need a reference to the meetings, and not just mongoDb and logger, as for all other meetings
// we do NOT inherit from dataProvider here, since we want to have a getter for the data, instead of the regular data object
class liveAthletics {
	constructor(){

		this.name = 'liveAthletics';

		// will always be live
		// provide the data.meetings/lastUpdated as a getter
		// showAlternate is never true and a direct hyperlink is not available.

		this._data = {
			name: this.name, 
			lastUpdated: null, 
			showAlternate: false, 
			directHyperlink: '', 
			meetings:[], // items: {name (string), dateFrom (date), dateTo (date), place (string),source (string), hyperlink (string) }
		};
	}

	get data(){
		// update the data (this is needed in the case when )
		this._data.meetings = rooms?.meetings?.rdMeetingSelection?.data ?? [];

		// data is always up to date
		this._data.lastUpdated = new Date();
		return this._data;
	}
}
const dpLA = new liveAthletics();
meetingDataProviders.push(dpLA);

function getMeetingDataProviderData(){
	return meetingDataProviders.map(m=>m.data);
}

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

// the wsProcessorBrowser.js file is part of the wsProcessor package; provide it from this location to be always up to date:
app.get('/static/wsProcessorBrowser.min.js', (req, res)=>{
	res.sendFile('/node_modules/wsprocessor/browser/wsProcessorBrowser.min.js', { root: __dirname });
});
app.get('/static/wsProcessorBrowser.js', (req, res)=>{
	res.sendFile('/node_modules/wsprocessor/browser/wsProcessorBrowser.js', { root: __dirname });
});

// for security reasons only when in develop mode!
if (global.developMode){
	app.get('/api/eventHandlers', (req, res)=>{
		res.send(JSON.stringify(eH));
	});
	app.get('/api/sideChannelClients', (req, res)=>{
		let meetingShortname = req.query.meetingShortname;
		let roomName = `sideChannel@${meetingShortname}`;
		findRoom(roomName, rooms.meetings, rooms, logger).catch(()=>{
			res.send('Could not find the rSideChannel of the requested meeting')
		}).then(room=>{
			res.send(JSON.stringify(room.clients))
		}).catch((err)=>{
			res.send(`Error during processing the request: ${err}`);
		})
	})
	app.get('/api/seltecData', (req, res)=>{
		res.send(JSON.stringify(meetingDataProviders['laportal'].data));
	})
	app.get('/api/dataProviders', (req, res)=>{
		res.send(JSON.stringify(getMeetingDataProviderData()));
	})
}

// for the ACME challenge of let's encrypt certificate, why need to have the .well-known folder on the root of the server; handle it similar to static redirect the call to the root-folder /.well-known/ to (static/.well-known/)
app.use('/.well-known', express.static('.well-known'));

// serve static files (URL must be "/static" and teh fiels lie in "/static")
app.use('/static', express.static('static'));

// the very first level, e.g. "example.com/"
app.get(/^\/$/,(req, res, next)=>{
	logger.log(99, 'GET: /^\/$/')
	// req.headers['accept-languages'] would allow to access the complete raw-header string

	// try to automatically set the language
	let lang = req.acceptsLanguages(req.i18n.languages);
	if (lang){
		req.session.lang = lang;
		res.redirect('/'+lang+'/');
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

	// make sure it ends on "/" to make relative pathes work correctly
	if (req.originalUrl.slice(-1) != '/'){
		res.redirect(req.originalUrl + '/');
		return;
	}

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
		res.render("meetingSelection2.ejs", {dataProviders:getMeetingDataProviderData()});
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

	res.render('meetingSelection2.ejs');
})

// timings: 
app.get('/:lang/timing/', (req, res, next)=>{
	logger.log(99, 'GET: /:timing/')
	req.i18n.setLocale(req.params.lang);

	if (conf.timings.length==1){
		// automatic redirect to this timing
		res.redirect(`/${req.params.lang}/timing/`+ encodeURI(conf.timings[0].name));
		
	} else {
		// get an overview over all timings for selection
		res.render('timings.ejs', {timings:conf.timings});
	}
	
})
app.get('/:lang/timing/:timingName', (req, res, next)=>{
	logger.log(99, 'GET: /:timing/:timingName')

	req.i18n.setLocale(req.params.lang);
	res.render('timing.ejs', {timingName: req.params.timingName});

})

// do everything with the login/logout stuff
app.get('/:lang/login', (req, res, next)=>{
	logger.log(99, 'GET: /:lang/login')

	req.i18n.setLocale(req.params.lang);
	res.render('login.ejs', {redirect: '/' + req.params.lang + 'meetingSelection', message:'TODO: message to be shown'});

})

// provide a translated print configuration
app.get('/:lang/confPrint', async (req, res, next)=>{
	logger.log(99, 'GET /:lang/confPrint');


	res.type('application/javascript').send(await ejs.renderFile(conf.folders.views + 'confPrintI18n.ejs', {conf:confPrintByLang[req.params.lang]}));
	// if we use the render function, the mime-tape is always text and not the required application/javascript (for javascript modules)
	//res.type('application/javascript').render('confPrintI18n.ejs', {conf:confPrintByLang[req.params.lang]})

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
	//console.log(req.params)
	logger.log(99, 'GET: /:lang/:meeting/*')

	if (!roomsReady){
		res.status(503); // server unavailable
		res.send('The rooms are not ready yet!')
		return
	}

	// set the language. If the language was not changed afterwards, then the language does not exist!
	// should be already set!
	/*if (req.i18n.setLocale(req.params.lang)!=req.params.lang){
		res.render('setLang.ejs');
		return
	} */
	
	// if a meeting was requested that is not running, redirect to the meetingSelection page
	// get the meeting:
	const meeting = rooms.meetings.activeMeetings[req.params.meeting];
	if (!meeting){
		res.redirect(`/${req.params.lang}/meetingSelection`)
		return
	}
	
	/* test if the requested page is 'valid':
		- first, get the path without the language and the meeting
		- no "/"" (except the first and probably last)
		- exists in pages */
	
	var path = req.path.substring(req.params.lang.length + req.params.meeting.length+3); 
	//console.log(req.path);
	//console.log(path);
	if (path.endsWith('/')){
		path = path.slice(0,path.length-1); // remove ending /
	}
	// if path is empty, proceed either to main (main server) or liveResults (secondary server)
	if (path==""){
		// differentiate mode
		if (meeting.rooms.backup.data.backup.isMain){
			path = "main";
		} else {
			// go to live results
			path = "liveResults";
		}
		
	};

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
						res.status(404).send(`Sorry, something went terribly wrong on "prepareInjections" of page ${page}: ${err}`)
				});
			} else {
				res.render('error', {error: "Page " + page.name + " has none of {parent, file} attributes!. Needs exactly one of those."})
			}
		}

		// object storing all variables inserted by ejs
		var renderData = {}

		// series assignements
		renderData.seriesAssignments = conf.seriesAssignments;

		// available base modules 
		renderData.baseModules = Object.keys(baseModules);

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
				logger.log(20, `something went wrong on preparing injections: ${err}`)
				res.status(404).send(`Sorry, something went terribly wrong preparing injections_ ${err}`)
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
				if ('text' in injections[child]){
					renderData[child] = req.i18n.__(injections[child].text) // incl. translation
				} else if ('file' in injections[child]){

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
						renderData[el] = "to be filled"; 
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

	// if path is empty, go to main
	if (path==""){path="main"};

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
						res.status(404).send(`Sorry, something went terribly wrong on prepareInjections of page ${page}: ${err}`)
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




logger.log(80,'startup done!')


