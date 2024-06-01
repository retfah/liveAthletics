// here we define the setup of all pages
// the injection is done via javascript on the client and with ejs on the server
// - injectionsIDs should be unique over all pages to avoid problems, as every subsequent inject will simply override the previous ones
// the injectID 'title' and 'pages' must not be used, as they are used to set the browser title and pages and thus must be passed form the last child to the root without beeing changed/overwritten!

// TODO: could be extended with:
// - every page should store a list of its injectionsIDs --> would allow to delete renderData after it was injected and thus injectionIDs would not need to be unique over all pages, but only on this page

export default {

    /*
    reference (up to date: 7.2023):
    name:       string, mandatory   it's own name; "self-reference" in order that in the page-object itself the name is still known
    file:       string, optional    the file to be loaded; must contain a proper html site starting with <html>; either file or parent must be given!
    parent:     string, optinoal    the name of the parent, where the data defined in 'injections' is injected in the respective injectdionIDs; either file or parent must be given!
    injections: object, mandatory except for root; Object with keys=injectionIDs of parent (or grand-parent etc) and value=Object with either file and optional data (injectID1), script (like file, but for javascript, stored on the server as ejs!) or text (injectID2); example: {injectID1: {file: Filename.ejs , data: {injectID3: 'hello', injectID4: 'world'}}, injectID2: {text: "this text is directly inserted without any processing"}} NOTE: "script" shall be a JS module, without the <script> tags around. This is TODO.
    injectionsSelf: object, optional only when not root; injections to be done in its own file(s) defined in injection, if this page is requested (not a subpage). 
    title:      string, mandatory   the title of the page; always the lowest (in the hierarchy) available title is shown; is going to be translated, so set in the default language
    preload:    [string], optional  array of pages that shall be preloaded for faster page change if this page is any of root up to childest page
    preloadSelf: [string], optional  array of pages that shall be preloaded for faster page change only if this page is the 'childest' page
    onLoad:     string, optional    function name of the function to be called on loading the page
    onUnload:   string, optional    function name of the function to be called on UNloading the page --> important for termining room-subscriptions; MUST return true on success or false on failure (then the next page will be loaded via http and the unloading is not done, respectively will be done automatically, as the Websocket-connction is lost.)
    roomManagerDrawing: string, optional    The id of the div that contains the indicator for the roomManager. If not set on the page itself, the parent (and its parent and so on) will be checked recursively, whether they provide this parameter. An empty string will stop this recursive call and means that no indicator shall be shown.

    ATTENTION: pages is not allowed to have functions! Only objects that can be stringified!
    */
    admin: {
        // the parent admin page; eventually include here the plugin management and probably the plugins (e.g. swiss-athletics-Stammdaten) themselves
        name:"admin",
        injections: {child1: {file:'admin.ejs'}},
        injectionsSelf: {child2: {text:''}},
        parent: 'main',
        title: "Admin",
    },
    athletes: {
        name: 'athletes',
        // provides the athletes overview and links to the related options, like add new, alter, printRecipt, ...
        injections: {child2: {file: 'athletes.ejs', data: {}}},
        //file: 'athletes.ejs',
        parent: 'inscriptions',
        //injectID: 'child1',
        preload: ['inscriptions','configuration', 'competition', 'relays', 'teams', 'listcreation'],
        title: "Athletes",
        onLoad: 'startupAthletes'
        //, // addAthlete and alterAthlete might be represented in one single file with different data in/out
        // should expose at least 'athleteChanged' event --> find a way to do that
    } ,
    clubs:{
        name:'clubs',
        injections:{child2: {file: 'clubs.ejs', data: {}}},
        parent: 'admin',
        preload: ['admin', 'disciplines'],
        title: 'Clubs',
        onLoad: 'startupClubs',
    },
    disciplines:{
        name:'disciplines',
        injections:{child2: {file: 'disciplines.ejs', data: {}}},
        parent: 'admin',
        preload: ['admin', 'clubs'],
        title: 'Disciplines',
        onLoad: 'startupDisciplines',
    },
    competition: {
        name: 'competition',
        // before 2022-08:
        //injections: {child1: {file:'contestsOverview.ejs'}},
        // now: 
        injections: {child1: {file:'competitionOverview.ejs'}},
        //injections: {child1: {text:'eventually: on the right, provide lists with all contests and eventgroups which guide you to the correct appeal/series definition/competition or results page'}},
        preload: ['configuration'],
        parent: 'main',
        title: 'Competition',
        onLoad: 'startupContestsOverview',
        onUnload: 'shutdownContestsOverview'
    },
    configuration: {
        name: 'configuration',
        //file: "configuration.ejs", // each page can either have a parent or a file; if there is a parent, the files to be injected are
        injections: {child1: {file:'configuration.ejs'}}, // injections in the parent; data should not be defined (as can be in injectionsSelf, except if the injects of the parent shall be overwritten!)
        injectionsSelf: {child2: {text:''}}, // only injected when itself is the last child; must fill all the ids of the page, simplest would be childX:{text:''}; in the inner object file and text is available; with file, additional data-injections can be defined here: currently only data is supported and no further files with their data and so on --> could be done with recursion  
        preload : ['meetingAdmin', 'definition', 'combined', 'teamcompetition', 'sites', 'dataexchange', 'backup', 'competition', 'inscriptions'], 
        parent: 'main',
        title: 'Configuration' 
    },
    // This is called from competition/eventGroup:
    groupsQualifications:{
        name:"groupsQualifications",
        injections: {child1: {file: "groupsQualifications.ejs"}},
        injectionsSelf: {},
        parent: 'main',
        title: 'Groups and qualifications',
        onLoad: 'startupGQ'
    },
    meetingAdmin:{
        name: 'meetingAdmin',
        injections: {child2: {file: "meetingAdmin.ejs"}},
        injectionsSelf: {},
        parent: 'configuration',
        title: 'Meeting Settings',
        onLoad: 'startupMeetingAdmin',
        preload : ['definition', 'combined', 'teamcompetition', 'sites', 'dataexchange', 'backup', 'configuration', 'competition'], 
    },
    relays:{
        name: 'relays',
        injections: {child2: {file: "underConstruction.ejs"}},
        injectionsSelf: {},
        parent: 'inscriptions',
        title: 'Relays',
        onLoad: 'startupConstruction',
        preload : ['inscriptions','configuration', 'competition', 'athletes', 'teams', 'listcreation'], 
    },
    teams:{
        name: 'teams',
        injections: {child2: {file: "underConstruction.ejs"}},
        injectionsSelf: {},
        parent: 'inscriptions',
        title: 'Teams',
        //onLoad: 'startupConstruction',
        preload : ['inscriptions','configuration', 'competition', 'athletes', 'relays', 'listcreation'], 
    },
    listcreation:{
        name: 'listcreation',
        injections: {child2: {file: "underConstruction.ejs"}},
        injectionsSelf: {},
        parent: 'inscriptions',
        title: 'List creation',
        //onLoad: 'TODO',
        preload : ['inscriptions','configuration', 'competition', 'athletes', 'relays', 'teams', ], 
    },
    combined:{
        name: 'combined',
        injections: {child2: {file: "underConstruction.ejs"}},
        injectionsSelf: {},
        parent: 'configuration',
        title: 'Combined events',
        //onLoad: 'TODO',
        preload : ['meetingAdmin', 'definition', 'teamcompetition', 'sites', 'dataexchange', 'backup', 'configuration', 'competition'], 
    },
    teamcompetition:{
        name: 'teamcompetition',
        injections: {child2: {file: "underConstruction.ejs"}},
        injectionsSelf: {},
        parent: 'configuration',
        title: 'Team competitions',
        //onLoad: 'TODO',
        preload : ['meetingAdmin', 'definition', 'combined', 'sites', 'dataexchange', 'backup', 'configuration', 'competition'], 
    },
    dataexchange:{
        name: 'dataexchange',
        injections: {child2: {file: "underConstruction.ejs"}},
        injectionsSelf: {},
        parent: 'configuration',
        title: 'Data exchange',
        //onLoad: 'TODO',
        preload : ['meetingAdmin', 'definition', 'combined', 'teamcompetition', 'sites', 'backup', 'configuration', 'competition'], 
    },
    backup:{
        name: 'backup',
        injections: {child2: {file: "backup.ejs"}},
        injectionsSelf:{},
        parent: 'configuration',
        title: 'Backup and Replication',
        onLoad: 'startupBackup',
        preload : ['meetingAdmin', 'definition', 'combined', 'teamcompetition', 'sites', 'dataexchange', 'configuration', 'competition'], 
    },
    sites:{
        name: 'sites',
        injections: {child2: {file: "sites.ejs"}},
        injectionsSelf: {},
        parent: 'configuration',
        title: 'Sites',
        onLoad: 'startupSites',
        preload : ['meetingAdmin', 'definition', 'combined', 'teamcompetition', 'dataexchange', 'backup', 'configuration', 'competition'], 
    },
    definition:{
        name: 'definition',
        //injections: {child2: {text: "This is the definitions page."}},
        injections: {child2: {file: "eventMgr.ejs"}},
        injectionsSelf: {},
        parent: 'configuration',
        title: 'Definition',
        onLoad: 'startupEventMgr',
        preload : ['meetingAdmin', 'combined', 'teamcompetition', 'sites', 'dataexchange', 'backup', 'configuration', 'competition'], 
    },

    inscriptions: {
        name: 'inscriptions',
        injections: {child1: {file: 'inscription.ejs'}},
        injectionsSelf: {child2:{text:''}},
        preload: ['configuration', 'competition', 'athletes', 'relays'],
        parent: 'main',
        title: 'Inscription'
    },
    root: {
        name: 'root',
        /* is the root;
        especially brings along some javascript logic:
        - for the partial site updating.
        - changes the link classes to active when the respective child-site is currently shown
        */
        file: "root.ejs", // each page can have file or parent!
        //injectionsSelf: {child1:{text:"WELCOME"}}, // TODO: replace this with a real welcome page
        //parent: "NONE",
        title: "liveAthletics", // default title, when all other elements have no title
        preload : [] ,
        preloadSelf: [],
        roomManagerDrawing: '',
    },
    main:{
        name:'main',
        injections: {body:{file: 'headline.ejs'}},
        injectionsSelf: {child1:{text:"WELCOME"}}, // TODO: replace this with a real welcome page
        preload: ['configuration', 'competition'],
        parent:'root',
        title: "liveAthletics",
        roomManagerDrawing: 'aConnection',
    },
    liveResultsLocal:{
        name:'liveResults',
        injections: {child1:{file: 'liveResults.ejs'}},
        injectionsSelf:{},
        preload:[],
        parent:'main',
        title: 'liveResults',
        onLoad: 'startupLiveResults',
        onUnload: 'shutdownLiveResults'
    },
    liveResults:{
        name:'liveResults',
        injections: {body:{file: 'liveResults.ejs'}},
        injectionsSelf:{},
        preload:[],
        parent:'root',
        title: 'liveResults',
        onLoad: 'startupLiveResults',
        onUnload: 'shutdownLiveResults'
    },

    // probably there is separate ejs for differend disciplines. At least for the actual competition processing, there will be techHigh, techDist and techTrack
    // TODO: use the techHighBase in th future and insert the actual drawings!
    seriesAdminTech: {
        name: 'seriesAdminTech',
        title: "Series processing",
        parent: "main", // eventuallly also competition
        preload: [],
        injections: {child1: {file: 'seriesAdminTech.ejs'}},
        onLoad: "startSeriesAdminTech",

    },

    // contains all javascript-vue logic for techHigh disciplines. Does not contain the actual drawings
    techHighBase: {
        name: 'techHighBase',
        title: 'techHighBase',
        parent: 'main',
        preload: [],
        injections: {child1: {file:"techHighBase.ejs"}},
        onLoad: "", // call startSeriesAdminTech in the child pages to make it work
    },

    techHighAdmin: {
        name: "techHighAdmin",
        title: "Tech High Admin",
        parent: "techHighBase",
        preload: ['competition'],
        injections: {content:{file:"techHighAdmin.ejs"}},
        onLoad: "startSeriesAdminTech",
    },

    // TODO: do not use techHighBase as a parent page, but use techHighBase.ejs as an include in this page and set the parent of this page to root, so that it fills the screen
    techHighBoard: {
        name: "techHighBoard",
        title: "Tech High Board",
        parent: "root", //"techHighBase",
        preload: [],
        injections: {body:{file:"techHighBoard.ejs"}},
        injectionsSelf: {content:{text:"The content"}},
        //injections: {content:{file:"techHighBoard.ejs"}},
        onLoad: "startSeriesAdminTechRead",
    },

    // contains all javascript-vue logic for techHigh disciplines. Does not contain the actual drawings
    trackBase: {
        name: 'trackBase',
        title: 'trackBase',
        parent: 'main',
        preload: [],
        injections: {child1: {file:"trackBase.ejs"}},
        onLoad: "", // call startSeriesAdminTech in the child pages to make it work
    },

    trackAdmin: {
        name: "trackAdmin",
        title: "Track Admin",
        parent: "trackBase",
        preload: ['competition'],
        injections: {content:{file:"trackAdmin.ejs"}},
        onLoad: "startTrackAdmin",
    },

    /* does not exist anymore, since it is its own page without the pageHandling stuff
    adminServer: {
        name: 'adminServer',
        // TODO: this is only temporary here, as it will go into a page outside the actual athletica!
        injections: {child1: {file: 'adminServer.ejs', data:{}}},
        parent: 'main',
        title: 'Server admin',
        onLoad: 'load', 
        onUnload: 'adminServerUnload' 
    }
    */

    /*,

    athleteAdd: {
        name: 'athleteAdd',
        injections: [{'child3': 'addAthletes.ejs'}],
        //file: 'addAthlete.ejs',
        parent: 'athletes',
        //injectID: 'child1',
        onLoad: 'functionOnload', // the function that has to be called after loading.
        onUnload: 'functionOnUnload' 
    }*/

    // all pages shall have a subscription for events (e.g. when an athlete is clicked, an action in the child page 'alterAthlete' must be done (load the newly selected athlete))
};