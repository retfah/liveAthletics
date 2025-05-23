// stores the list of the childs in each file
// TODO: this file could be created automatically by scanning the views folder and getting all the injected names

// index:      [string], name of the file including the filetype
// childs:     [string], mandatory all names of the childs in this page; used e.g. to be able to 'render' the page with empty childs, as it is necessary to deliver the language-pre-rendered pages for preloading on the client

module.exports = {
    "root.ejs": {
        childs: ["child1", "title", "pages", "pageName"]
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
        description: 'Contains the Vue-javascript-stuff for a technical verical discipline (pole vault and high jump). The actual content (html-vue) shall be inserted in "content'
    }
}