// stores the list of the childs in each file
// TODO: this file could be created automatically by scanning the views folder and getting all the injected names

// index:      [string], name of the file including the filetype
// childs:     [string], mandatory all names of the childs in this page; used e.g. to be able to 'render' the page with empty childs, as it is necessary to deliver the language-pre-rendered pages for preloading on the client

export default {
    "root.ejs": {
        childs: ["body", "title", "pages", "pageName"]
    },
    "admin.ejs":{
        childs: ["child2"]
    },
    "clubs.ejs":{
        childs: [],
    },
    "configuration.ejs": {
        childs: ["child2"]
    },
    "meetingAdmin.ejs":{
        childs: [],
    },
    "configurationSelf.ejs": {
        childs: ["inj"]
    },
    "athletes.ejs": {
        childs: []
    },
    "adminServer.ejs": {
        childs: []
    },
    'eventMgr.ejs':{
        childs: []
    },
    "inscription.ejs":{
        childs:["child2"]
    },
    "contestsOverview.ejs":{
        childs:[]
    },
    "competitionOverview.ejs":{
        childs:[]
    },
    "groupsQualifications.ejs":{
        childs:[]
    },
    "seriesAdminTech.ejs":{
        childs:[]
    },
    "backup.ejs":{
        // side channel and backup
        childs:[],
    },
    "sites.ejs":{
        childs:[],
    },
    "techHighBase.ejs":{
        childs:['content'],
        description: 'Contains the Vue-javascript-stuff for a technical verical discipline (pole vault and high jump). The actual content (html-vue) shall be inserted in "content".'
    },
    "techHighBoard.ejs":{
        childs:['content'],
        description: "Must be inserted in techHighBase.ejs, since it contains Vue-code only working with techHighBase."
    },
    "headline.ejs":{
        childs: ['child1'],
        description: 'the top line of the page, including the child1, storing the content of the page.',
    },
    "techHighAdmin.ejs":{
        childs: [],
        description: "The vue-drawings of the administration (series assignment and competition) page for tech high disciplines. "
    },
    "trackBase.ejs":{
        childs:['content'],
        description: 'Contains the Vue-javascript-stuff for a track discipline. The actual content (html-vue) shall be inserted in "content".'
    },
    "trackAdmin.ejs":{
        childs: [],
        description: "The vue-drawings of the administration (series assignment and competition) page for track disciplines. "
    },
    "liveResults.ejs":{
        childs:[],
        description: "Show a selector for the different competitions and show the selected competitions",
    }
}