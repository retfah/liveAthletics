// configuration file

import { rTimingAlge } from './rTiming.js';

export default {
    // the name of this server (only used for information in some places)
    name: 'RFahrni',
    // infos for backup/restore (note that there is a separate version for the sql-db):
    // it is never possible to restore on an older server, since this server cannot know about compatibility!
    version: 1, // i.a. stored along with data-backups
    versionMinForRestore: 1, // minimum required version for restore.
    
    // the port to listen on (node/express default is 3000, http is 80)
    port: 80,

    // logging: set various kinds of loggers; one logger per object
    // properties for each logger
    // type: required, supported types: "console", "file"
    // maxLevel: optional, highest logged level (if not given, the setting given in the logger constructor is used)
    // minLevel: optional, lowest logged level (default=0=no min)
    // path: required if type='file'; must not contain any strings that cannot be part of filenames, e.g. ':'; NOTE: it might happen that a few logs during the start of the server are not logged, since the file is opened asynchronously!

    loggers: [{type:'console', maxLevel:92}, {type:'file', path:`./log/log ${(new Date).toISOString().slice(0,19).replaceAll(':','')}.txt`}], // no : in file names! (at least on windows)

    // DB settings
    database: {
        username: "athletica",
        password: "athletica", 
        host: "localhost",
        port: "3305", // mysql on 3306, mariadb currently on 3305
        dbBaseName: "athletica2",
        dbMeetingPrefix: 'a2', // prefix to make sure no other database exists with the name "prefix_shortname"
        dbAdminSuffix: "admin",
        /*dbEmptySuffix: "emptyMeeting",*/
        emptyDbPath: "./emptyDB.sql",
        defaultDataDbPath: "./defaultData.sql",
        emptyAdminDbPath: "./emptyAdminDB.sql",
        // infos for backup/restore
        version: 1, // i.a. stored along with data-backups
        versionMinForRestore: 1, // minimum required version for restore.
        timezone: 'Europe/Zurich', //https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
    },

    databaseMongo: {
        host: "127.0.0.1", // do NOT use localhost, because it might be translated to ::1 (IPv6) where MongoDB by default does not listen
        port: "27017",
        dbMeetingPrefix: 'a2', // prefix to make sure no other database exists with the name "prefix_shortname"
        dbAdmin: 'admin'/*,
        username: "",
        password: ""*/
    },

    // the secret which is used to signing the session id (sid) in the cookie
    sessionSecret: "TheSecretForHashing/SigningTheSID",

    // liveServerMode: if set to true, the routing of "/" will redirect to /live. If only on meeting is available, this automatically gets chosen and shown. Otherwise a list of meetings is shown to choose
    // if false, it will redirect to /work as soon as the meeting is clear
    liveServerMode:false,

    folders: {
        views: "./views/",
        //modelsAdmin:'./modelsAthletica2Admin/', // this path will be used in importing in Server.mjs; however, imports are not allowed to be dynamic (i.e. dependent ona  variable); thus it is hardcoded now and this variable is not used!
        //modelsMeetings:'./modelsMeeting/', // this path will be used in importing in rMeetings.mjs; however, imports are not allowed to be dynamic (i.e. dependent ona  variable); thus it is hardcoded now and this variable is not used!
    },

    seriesAssignments:['techDefault.ejs', 'trackPerf.ejs', 'trackRandom.ejs'], 

    // define the users that are allowed to administrate the meetings (create new ones, link to master servers, getMaster, ...)
    adminUsers: {"Admin":"athletica"}, // multiple users: [{"user1": "password1"}, {"user2": "password2"}, {...}]

    // sexes (must match the sexes defined in the DB!
    sexes:["m","f"],

    // interval for recreating the printing configuration
    confPrintRecreationInterval: 3600, // s

    // define the available timings. In the future we might implement this setting in a GUI and store the configurations in MongoDB. However, we would then need to define some "types" and which class they refer to, e.g. "ALGE" --> rTimingAlge, since we cannot store the class itself to Mongo. 
    timings: [{name: 'ALGE1', class: rTimingAlge}, {name: 'ALGE2', class: rTimingAlge}],
}