// configuration file

export default {
    // the name of this server (only used for information in some places)
    name: 'RFahrni',
    // infos for backup/restore (note that there is a separate version for the sql-db):
    // it is never possible to restore on an older server, since this server cannot know about compatibility!
    version: 1, // i.a. stored along with data-backups
    versionMinForRestore: 1, // minimum required version for restore.

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

    seriesAssignments:['techDefault.ejs'], 

    // define the users that are allowed to administrate the meetings (create new ones, link to master servers, getMaster, ...)
    adminUsers: {"Admin":"athletica"}, // multiple users: [{"user1": "password1"}, {"user2": "password2"}, {...}]

    // sexes (must match the sexes defined in the DB!
    sexes:["m","f"],

    // interval for recreating the printing configuration
    confPrintRecreationInterval: 3600, // s

    
}