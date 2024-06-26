// configuration file

// include all series assignments and reference them further down below
//import techDefault from "./seriesAssignment/techDefault.js";


module.exports = {
    // DB settings
    database: {
        username: "athletica",
        password: "athletica", 
        host: "localhost",
        port: "3305", // mysql on 3306, mariadb currently on 3305
        dbBaseName: "athletica2",
        dbMeetingPrefix: 'a2', 
        dbAdminSuffix: "admin",
        /*dbEmptySuffix: "emptyMeeting",*/
        emptyDbPath: "./emptyDB.sql",
        defaultDataDbPath: "./defaultData.sql",
        version: "1", // i.a. stored along with data-backups
        timezone: 'Europe/Zurich', //https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
    },

    databaseMongo: {
        host: "localhost",
        port: "27017",
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

    // TODO: somehow we need to define what baseDisciplines a series assignment can be used.
    //seriesAssignments:[techDefault], 

    // define the users that are allowed to administrate the meetings (create new ones, link to master servers, getMaster, ...)
    adminUsers: {"Admin":"athletica"} // multiple users: [{"user1": "password1"}, {"user2": "password2"}, {...}]

}