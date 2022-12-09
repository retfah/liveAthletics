//import ajv = require("ajv");

// -------------------------------------
// main js file, loaded on the root page
// -------------------------------------

// tries to use notation of YUIDoc - JavaScript Documentation Tool

// -------------------------
// Globals
// -------------------------

var eH = undefined;     // eventHandler
var pH = undefined;     // pageHandler
var wsHandler = undefined;    // a layer on top of the wsProcessor (wsProcessor handles syn/ack like stuff (e.g. requests) via websockets). It is useful to automatically reconnect to the server on lost connection and handles incoming requests from the server (noteHandling, requestHandling)
var logger = undefined; // (error) logger
//var wsProcessor = undefined; // the webSocketProcessor instance (allowing syn-ack transmitts via websockets)
var rM;


var goto = undefined;   // link function, is set in 

/**
 * main function, called when the site was loaded
 * - set the title
 * - child-page-manipulation stuff
 * - start the Socket.IO connection to the server
 * - etc
 * 
 * @method onStartup
 * @param {String} noExist This parameter actually does not exist...
 */
function loadMe(){
    logger.log(99,'here');

    // -------
    // keep the order of the following object-startups!
    // -------

    // start the websocket connection
    wsHandler = new socketProcessor2();

 
    // start the event handler --> not needed anymore
    eH = new eventHandling2();

    eH.eventRegister('wsConnected');

    // the logger is 'instantiated' globally, as it is used by every other class/function etc

    // start the pageHandler that handles changes to the current page structure, preLoading, etc
    // returns the function for new 
    pH = new pageHandling(2); // the uppermost 2 levels shall be untouched by the pageHandling!

    // set the global goto function
    // note: ECMAScript has no goto (which is good); Nevertheless, some code editors show it as it was a keyword
    goto = (caller)=>{
        // test if the function really was called from a link or button element
        if ('tagName' in caller && (caller.tagName.toLowerCase()=="a" ||  caller.tagName.toLowerCase()=="button")){

            // caller.pathname does not only contain the path as specified, but (might?) be relative to the page, i.e. if we have href="test" and the current folder is /subfolder/, the pathname is /subfolder/test !  
            // caller.href would also include the http://localhost:3000...
            // only the very last part (e.g. test.ejs) does not exist, the smallest and last part is the pathname as specified before.
            let href = caller.pathname.replace(/^\//,""); // remove any preceding /
            if (href.indexOf('/')>=0){
                // if there is still a / in the path, then we know that we have to take only the rightmost part
                href = href.match(/[^\/]+$/)[0];
            } 
            // test if everything is already preloaded and if also this page is preloaded
            // this is actually done again in pH.goto, but I want this function to get a link as the argument, while this function handles the calling html.element
            if (!(href in pH._pages) || pH._toPreloadFiles.length>0 || pH._toPreloadPages.length>0){
                return true;
            } else {
                // call "the real goto" with the link instead of the calling object
                pH.goto(href); // pathname actually contains also the / before the path; but goto can handle it
                return false; // do not call the href
            }
        }
        return true;

    }

    // start roomManager 
    // provide the id of the div that shall be filled with the room information (currently mostly in the top right corner). This info is defined on the page
    function getRoomManagerDrawing (pageName){
        if ('roomManagerDrawing' in initPages[pageName]){
            return initPages[pageName].roomManagerDrawing;
        } else {
            if ('parent' in initPages[pageName]){
                return getRoomManagerDrawing(initPages[pageName].parent);
            } else {
                return '';
            }
        }
    }
    rM = new roomManager(getRoomManagerDrawing(initPageName));

    // call onload of the current page
    pH.onLoad();
}

/**
 * Call all unloading methods of all the (sub)pages. 
 */
function unloadMe(){
    pH.onUnload();
}


/**
 * eventHandling: Event handling on the client: the central event manager
 * - store a list of all currently possible events
 * - store a list of all listeners on each of these events
 * - process an event by calling all listeners
 * 
 * @class eventHandling Description
 */
class eventHandling{ // ES 2015 style syntax
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
            this._events[name] = []; // every listener will be an entry in the array 
            return true;
        }

    }

    /**
     * subscribe for an event / add a listener:
     * the subscribtion is transferred to the 
     * @method eventSubscribe
     * @param {String} name The name of the event
     * @param {Function} listener The function/listener to be called when the event is raised; one argument:data
     * @param {Boolean} autoCreate If the event chall be created automatically if it does not exist yet
     */
    eventSubscribe(name, listener, autoCreate=true){
        // check if the event exists

        function isFunction(){
            // TODO
            return true;
        }

        if (isFunction(listener)){
            if(this._events[name]){
                this._events[name].push(listener);
                return true;
            }else{
                if (autoCreate){
                    this._events[name]=[];
                    this._events[name].push(listener);
                    return true;
                }
            }   
        }
        return false; // should never arrive here
    }

    /**
     * 
     * @param {String} name 
     * @param {Function} listener 
     */
    eventUnsubscribe(name, listener){
        if(!this._events[name]){
            // this event does not exist, nothing to remove
            logger.log(10, 'Event ' + name + 'does not exist (anymore). nothing to remove the listener from.');
            return false;
        } else{
            let i=0;
            this._events[name].forEach(element => {
                if (element==listener){
                    // remove it
                    this._events[name].splice(i,1);
                    return true;
                }
                i++;
            })
            // listener was not/normore assigned to the event
            logger.log(10, 'listener ' + listener.toString() + ' was not/normore assigned to the event ' + name);
            return false;
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
            this._events[name].forEach((element)=>{element(data)});
        } else {
            return 0;
        }
    }

}
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

/**
 * pageHandling: Handles everything concerning the site/page, its structure, calls of links partial updating, preloading, goeing back and forth in the browser history, etc
 * 
 */
class pageHandling{
    constructor(level=0){
        this._currentPages = {}; // the pages of the current site
        this._currentPage        // the current page
        this._currentPageName    // name of the current page (URI after /)
        this._toPreloadPages = [];    // the pages that should be preloaded, as long as this is not yet done
        this._toPreloadFiles = [];   // the files to be preloaded, as long as they are not yet
        this._pages = {}         // the current pages object, where the setup of all pages of the current site and the preloaded / toPreload pages are stored
        this._files = {};       // files (pre)loaded
        // as we do not know yet, which are pages and files are going to be preloaded (we only know those directly preloaded in the current page, but not those parents), we still keep the old ones for the case, that they would be used again, until the preloading is finished. Then they are cleaned for memory savings. 
        this._filesOld = {}     // all files of the past page (and its preloaded ones)
        this._pagesOld = {}     // all pages of the past page (and its preloaded ones)
        this._level = level;    // the level the pathes should be managed at. 0 means that a specified path is at "example.com/thePath", level=2 would mean "example.com/some/level/thePath". 
        this.stateObj = {}      // the state object that is saved to the browser history when going to next page and loaded when going back/forth in the browser history

        // the callback that shall be called when the response to a File-request arrives
        this.preloadFileCB = (data)=>{
            data = JSON.parse(data);
            
            // set the file
            this._files[data.filename] = data.file;
            logger.log(95, "File " + data.filename + " sucessfully preloaded.");
            
            // remove it from the list
            let index = this._toPreloadFiles.indexOf(data.filename);
            if (index>=0){
                this._toPreloadFiles.splice(index,1); // delete one element starting from element 'index'
            }
        }


        // event called when the server sends file to preload
        /*eH.eventSubscribe('RpreloadFile', (data)=>{
            data = JSON.parse(data);
            
            // set the file
            this._files[data.filename] = data.file;
            logger.log(95, "File " + data.filename + " sucessfully preloaded.");
            
            // remove it from the list
            let index = this._toPreloadFiles.indexOf(data.filename);
            if (index>=0){
                this._toPreloadFiles.splice(index,1); // delete one element starting from element 'index'
            }
        })*/

        // the callback that shall be called when the response to a page-request arrives
        this.preloadPageCB = (data)=>{
            var page = JSON.parse(data);
            
            // add the data
            this._pages[page.name] = page;
            logger.log(95, "Page " + page.name + " successfully preloaded.");

            // remove from the 'TODO'list
            let index = this._toPreloadPages.indexOf(page.name);
            if (index>=0){
                this._toPreloadPages.splice(index,1); // delete one element starting from element 'index'
            }

            // get the files of those preloaded pages, if they are not already preloaded
            this.preloadFileForPage(page.name);//.bind(this);

            // preload child pages if necessary
            // is it a root page (has no parent?
            if (page.parent){
                this.preloadPage(page.parent)
            }
        }

        // event called when the answer for a page is here; 
        /*eH.eventSubscribe('RpreloadPage', (data)=>{

            var page = JSON.parse(data);
            
            // add the data
            this._pages[page.name] = page;
            logger.log(95, "Page " + page.name + " successfully preloaded.");

            // remove from the 'TODO'list
            let index = this._toPreloadPages.indexOf(page.name);
            if (index>=0){
                this._toPreloadPages.splice(index,1); // delete one element starting from element 'index'
            }

            // get the files of those preloaded pages, if they are not already preloaded
            this.preloadFileForPage(page.name);//.bind(this);

            // preload child pages if necessary
            // is it a root page (has no parent?
            if (page.parent){
                this.preloadPage(page.parent)
            }

            

        })*/

        // register the event for goeing back and forth in the browser history
        window.onpopstate = (event)=>{
            // TODO: is this event also called, when the state was not manually written?
            logger.log(95, 'Page TODO is preloaded from the browser history.'+document.location.pathname.substr(1))
            // delete the first 'level'-aprts of the pathname, since goto will add it again as needed
            var splitPath = document.location.pathname.match(/[^\/]+/g);
            var gotoPath = "";
            if (splitPath.length>=this._level){
                splitPath.splice(0,this._level);
                gotoPath = splitPath.join('/'); // should do nothing as long as we have no sublevels within the page-structure
            }else{
                logger.log(10, 'Cannot use the implemented history-back function to go to '+document.location.pathname.substr(1))
            }
            //pH.goto(document.location.pathname.substr(1), false) //false: do not set new state object
            pH.goto(gotoPath, false) //false: do not set new state object

            // this way we could get the state objects:
            //event.state

            // I think we cannot store the whole page in the state object for filesize reasons. Thus we have to rely on the normal preloading process/goto function. So we simply call here the goto function with the respective page let it do the rest. This however means that goeing back will be a preloading-thing only if the current page has the past page as a preloaded page. Otherwise 'goto' will automatically get the new page normally via http. However, this could lead to the strange case that then the newly http-called page is added to the history-stack such that it 
        }


        // set the current pagename
        /*let path = window.location.pathname.slice(1); // remove beginning /
        if (path.endsWith('/')){
            path = path.substr(0,path.length-1); // remove ending /
        }*/
        this._currentPageName = initPageName;

        // load the current page structure (is currently already stored in thre root html file...)
        this._currentPages = initPages
        this._currentPage = this._currentPages[this._currentPageName];
        this._pages = copyObject(initPages) // all loaded pages

        var self = this;

        // style the links of the active pages
        this.styleCurrentPages();

        logger.log(95,"Page handling initialized. Starting preloading soon.");

        // preload all files of the current pages after the timeout for settign up the websocket connection
        setTimeout(this.preloadFilesForCurrentPage.bind(this), 800);

        // preload all pages stated in currentPage.preload
        setTimeout(this.preloadPagesForCurrentPage.bind(this), 1200);
    }

    /**
     * adds the css class to all current pages and remove it from the others
     */
    styleCurrentPages(){
        // iterate over all links in the page and and check if they reference to a normal page (given if onclick="return goto(this)" and then check if active or not and style accordingly)
        var els = document.getElementsByTagName("a");
        for (let i=0, el; el=els[i] ;i++){
            // is it a normal link to a new page?
            // TODO: maybe the following distinction is not reasonable --> change to something better, maybe by a spcific tag or by a class that every nav element has 
            if (el.onclick && el.onclick.toString().indexOf("return goto(this)")!==-1){
                // style it
                // get the important part of the path:
                let splittedPath = el.pathname.match(/[^\/]+/g);
                let path = splittedPath.slice(this._level).join('/');
                //if (el.pathname.substr(1) in this._currentPages){ // pathname is something like "/configuration" --> remove /
                if (path in this._currentPages){ // pathname is something like "/configuration" --> remove /
                    el.classList.add('active');
                } else {
                    el.classList.remove('active'); // does not do anything if the class is not set yet
                }
            }
        }
    }

    /**
     * Preloads all the necessary pages for the current page.
     * NOTE: make sure, that the websocket connection is already established before calling this function to avoid unnessessary attempts to get the pages/files from the server. (It should work anyway, but it is not so efficient.)
     */
    preloadPagesForCurrentPage(){

        // get all pages that must be preloaded
        // only for the current page
        if ('preloadSelf' in this._currentPage){
            // something to preload:
            logger.log(95, "the following pages should be preloadedSelf, if needed: " + this._currentPage.preloadSelf.toString())
            this._currentPage.preloadSelf.forEach((el)=>{
                // start this with 1s delay; without, the socket is normally not connected yet
                //setTimeout(this.preloadPage.bind(this), 1000, el)
                this.preloadPage(el);
            })
        }

        // for all pages from this to root
        var pageI = this._currentPage;
        while (true){
            
            if ('preload' in pageI){
                // something to preload:
                logger.log(95, "the following pages should be preloaded, if needed: " + pageI.preload.toString())
                pageI.preload.forEach((el)=>{
                    this.preloadPage(el);
                })
            }

            // preload from the parent
            if (pageI.parent && !pageI.file){
                pageI = pH._pages[pageI.parent];
            } else {
                // is the root page
                break;
            }
        }

    }

    /**
     * Preloads all files for the currentPage (injections+injectionsself). This is separately necessary, as with the normal preload process we care only about the explicitly preloaded pages (not beeing part of the currentPage) and as the files are not passed in the initial-http-call of the page (only initPages is passed there).It is used as well during the goto process, to copy the files of the currentPages from _fileOld to _files. 
     * There are no arguments since we know  
     */
    preloadFilesForCurrentPage(){
        // iterate over all currentPages and load all their injections- and injectionSelf-files:
        var inj = (injections)=>{
            for (let i in injections){
                if(injections[i].file){
                    this.preloadFile(injections[i].file)
                }
            }
        }
        for (let page in this._currentPages){
            // load the injections and injectionsSelf, if available
            if (this._currentPages[page].injections){
                inj(this._currentPages[page].injections);
            }
            if (this._currentPages[page].injectionsSelf){
                inj(this._currentPages[page].injectionsSelf);
            }
            // also load the root's files, if available:
            if (this._currentPages[page].file){
                this.preloadFile(this._currentPages[page].file);
            }  
        }
        
    }

    /**
     * makes sure that the page with the defined name gets preloaded 
     * @param {String} pageName the name of the page to be preloaded 
     */
    preloadPage(pageName){
        if (!(pageName in this._pages) && this._toPreloadPages.indexOf(pageName)==-1){
            // is not yet stored and preloading was not yet started for that page
            if (pageName in this._pagesOld){
                logger.log(95, "Page " + pageName + " was already stored in _pagesOld.");
                this._pages[pageName] = this._pagesOld[pageName];
                // we have to make sure that also the corresponding files stay preloaded:
                this.preloadFileForPage(pageName);
            } else {
                logger.log(95, "Page " + pageName + " gets preloaded.");
                this._toPreloadPages.push(pageName);

                //wsProcessor.sendRequest({name:'preloadPage', data:pageName}, preloadPageCB, (errCode, errMsg)=>{console.log(errMsg)}); 

                wsHandler.emitRequest('preloadPage', pageName, this.preloadPageCB, (errMsg,errCode)=>{console.log(errMsg)}); // TODO: error handling  
            }
        } 
    }

    /**
     * Preload all files for the specified page
     * @param {String} pageName 
     */
    preloadFileForPage(pageName){
        var page = this._pages[pageName];
        // get the files of those preloaded pages, if they are not already preloaded
        var inj = (injections)=>{
            for (let inj in injections){
                let file = injections[inj].file;
                if (file){
                    this.preloadFile(file)
                }
            }
        }
        if (page.injections){
            inj(page.injections);
        }
        if (page.injectionsSelf){
            inj(page.injectionsSelf);
        }
    }

    /**
     * makes sure that the file is properly preloaded
     * @param {String} fileName the name of the page to be preloaded 
     */
    preloadFile(fileName){
        if (!(fileName in this._files) && this._toPreloadFiles.indexOf(fileName)==-1){
            // is not yet stored and preloading was not yet started for that file
            if (fileName in this._filesOld){
                logger.log(95, "File " + fileName + " was already stored in _filesOld.");
                this._files[fileName] = this._filesOld[fileName];
            } else {
                logger.log(95, "File " + fileName + " gets preloaded.");
                this._toPreloadFiles.push(fileName);

                //wsProcessor.sendRequest({name:'preloadFile', data:fileName}, preloadFileCB, (errCode, errMsg)=>{console.log(errMsg)}); 

                wsHandler.emitRequest('preloadFile', fileName, this.preloadFileCB, (errMsg, errCode)=>{console.log(errMsg)}); // TODO: error handling 
            }
        } 
    }

    /**
     * goto: goto another page with the name defined in 'link'
     * if preloading of all requested pages and files is finished and also this page is preloaded, we manually update the necessary parts of the page, otherwise we get the page normally via http-get
     * when we get here via the normal "onclick=goto(this)" in the html code, the check that the page is already fully preloaded is actually done already, but is done here a second time, such that this funciton would also work when it is called from semwhere else.
     * updating the page means: (1) change the URI shown in the browser (so that refreshing the page works), (2: TODO) make sure going back and forth in browser-history works (also with all the global javascript objects and the changes done since then (if needed?) etc) and (3) updates the parts of the pages that must change.
     * This function must update as well the properties 'currentPageName', 'currentPage' and all the others in this object...
     * @param {string} link The link that shall be called
     * @param {bool} createState True if a Pushstate shall be used to create a State in the browser history. This has to be false when this function was called from a browser history state change (popState). In any case, the old stateObj is updated with the latest this.stateObj.
     * @param {object} stateObj The state object of the page that is called. Default is {}, as if we go forward for the first time, we normally do not have a stateObjof the next page. But we have it when we go back/forth in the browser history.
     */
    goto(link, createState=true, stateObj={}){

        logger.log(95, "goto: " + link);

        // TODO: goto must take into account this.level and should not touch that many levels of the path; e.g. 2 would mean that "example.com/not/touched/workHere"

        // TODO: newFiles is not yet done yet!!! Dont forget the injectionSelf files, even if they are currently not used! (or put this functionality in preloadPage meaning to proof there that all )

        // create the fullNewPath
        var newPathname = "";
        // add the first n-levels of the current path, do not count empty strings (8)typically the first is empty if we use split)  
        var splittedCurrentPath = window.location.pathname.match(/[^\/]+/g);
        if (splittedCurrentPath.length>= this._level){
            for (let i=0; i<this._level; i++){
                newPathname += '/' + splittedCurrentPath[i];
            }
        }else {
            newPathname = '/' + splittedCurrentPath.join('/');
            this.logger.log(15, 'pageHandling/goto could not join the path up to the selected level.')
        }
        newPathname += '/' + link;


        // create temporary variables for the new locally stored page configurations
        var newCurrentPages = {}; // the names of all pages of the current site
        var newCurrentPage        // the name of the current (child) page
        //var newCurrentPageName=link    // name of the current page (URI after /)
        //var newPages = {}         // the current pages object, where the setup of all pages of the current site and the preloaded / toPreload pages are stored --> NOT needed, as in this funciton only the currentPages are processed (preloading happens afterwards!), so newPages = newCurrentPages
        //var newFiles = {};       // files (pre)loaded
        var oldStateObj = pH.stateObj; // store the current stateObj, so it can be written to the browser history

        // unLoad the current page, by calling the respective function
        if (this._currentPage.onUnload){
            if (!(window[this._currentPage.onUnload]())){ // function must be synchronous (it must be waited until unload ends!)
                // if unloading fails, we simply load the new Page via http
                window.location = window.location.origin + newPathname;
                //window.location = window.location.origin + "/" + link;
                return;
            } 
        }
        

        // only use preloaded stuff when everything was completely preloaded and the current page indeed was preloaded
        if (!(link in this._pages) || this._toPreloadFiles.length>0 || this._toPreloadPages.length>0){
            // if the page is not preloaded, we leave the complicated loading on the client and simply http-get the next page.
            window.location = window.location.origin + newPathname;
            //window.location = window.location.origin + "/" + link;
            return;
        }

        newCurrentPage = this._pages[link];
        newCurrentPages[link] = newCurrentPage;

        // start parsing the first page
        // if a page is inserted in a page that is already available from the last page, insert it there and we're done with changing the DOM

        // several possible cases:
        // - replace all from root/body --> check if the first to insert page is a root page
        // - normal injection, every element is injected in his parent

        var pageI = newCurrentPage;
        var pageOrder = []; // not including pages, where only self injections is needed
        
        while (true){
            //pageOrder.push(pageI);
            // check if the current page is already shown
            if (pageI.name in this._currentPages){
                // we have found the currentPage where we have to insert the new stuff
                /* if (pageOrder.length>0){
                    //
                    pageOrder.push(pageI);
                } else {
                    pageSelfInj = pageI;
                } */
                break;
            } 
            // 
            else if (pageI.file && !pageI.parent){
                // is the root page, so we actually have to replace the whole page; nothing can be reused
                pageOrder.push(pageI);
                break;
            } else {
                pageOrder.push(pageI);
                pageI = this._pages[pageI.parent];
            }
        }

        // create the newCurrentPages array:
        for (let i=0;i<pageOrder.length;i++){
            newCurrentPages[pageOrder[i].name] = pageOrder[i];
        }

        // get the pages until root:
        pageI = pageOrder.length==0 ? newCurrentPage : pageOrder[pageOrder.length-1];
        while (true){
            if (pageI.parent && !pageI.file){
                // has a parent; add it to newCurrentPages and continue with that
                newCurrentPages[pageI.parent] = this._pages[pageI.parent]
                pageI = this._pages[pageI.parent];
            } else {
                // is the root page
                break;
            }
        }

        /**
         * Do the injections. This is a separate funciton, as the same is used for the normal injections, but also for the selfInjections
         * @param {Object} injections The object with all the injections
         */
        var inject = (injections)=>{ // it is important that the function is defined this way; otherwise, 'this' will not be the surrounding class but its own, which would make it necessary, that each call to this funciton was done via inject.call(this, injections); Attention: a variable declaration is hoisted, but not the assignement of the function to it. So inject, would be undefined until this line --> put it at before beeing used!
            for (let child in injections){
                // get the html element
                var el = document.getElementById(child); 
                // load per http if element is not found:
                if (!el){
                    logger.log(7,'Could not find element with id "'+child+'" to insert html. Load via http.');
                    window.location = window.location.origin + newPathname;
                    //window.location = window.location.origin + "/" + link;
                    return;
                }
                var x;
                if (x=injections[child].text) {
                    // just insert a text
                    el.innerHTML=x;
                } else if (x=injections[child].file){
                    // insert a file
                    el.innerHTML = this._files[x];

                    // if there is data to be inserted in that file, process it
                    if (x=injections[child].data){
                        for (let child2 in x){
                            var el2 = document.getElementById(child2); 
                            // load per http if element is not found:
                            if (!el2){
                                logger.log(7,'Could not find element with id "'+child2+'" to insert html. Load via http.');
                                window.location = window.location.origin + newPathname;
                                //window.location = window.location.origin + "/" + link;
                                return;
                            }
                            // here we could currently also use innerText (which causes no actualization of te dom), but when in the future also html elements were inserted this way, it would cause problems not to have innerHTML
                            el2.innerHTML = x[child2]
                        }
                    }
                }
            }
        }


        logger.log(95, 'start injecting stuff page per page');

        // now go backwards through the pageOrder-array and insert one page after the other; 
        while (pageI = pageOrder.pop()){
            // if pageI is the root page: insert it in the body
            if (pageI.file && !pageI.parent){
                var body = document.getElementsByTagName("BODY")[0];
                // load per http if body is not found:
                if (!body){
                    logger.log(7,'Could not find "body" to insert html. Load via http.');
                    window.location = window.location.origin + newPathname;
                    //window.location = window.location.origin + "/" + link;
                    return;
                }
                body.innerHTML = this._files[pageI.file];
            } else {
                // inject everything:
                //inject.call(this,pageI.injections) 
                inject(pageI.injections) 
                // when is it correctly "binded": 
                // - inject(args) does not work
                // - inject(args).bind(this) does not work 8obviously, as it is "binded" after the fucntion call
                // - inject.bind(this)(args) --> should work
                // - this.inject(args) --> should work

            }
        }

        logger.log(95, "end normal injections, starting selfInjections");

        // injectionSelf on the top page=newCurrentPage
        if (newCurrentPage.injectionsSelf){
            //inject.call(this,newCurrentPage.injectionsSelf)
            inject(newCurrentPage.injectionsSelf)
        }

        // call onLoad of the page
        if (newCurrentPage.onLoad){
            window[newCurrentPage.onLoad]();
        }

        // write the new current page structure
        this._currentPages = newCurrentPages;
        this._currentPage = newCurrentPage;
        this._currentPageName = link;
        // we store the old pages and files, so that the preloading algorithm does not need 
        this._filesOld = this._files;
        this._pagesOld = this._pages;
        this._pages = copyObject(newCurrentPages);
        this._files = {};

        // style the links of the active pages
        this.styleCurrentPages()

        // manipulate the browser history, such that the back and forward buttons work
        // TODO: define stateObj! and check if newCurrentPages is used correctly and apply the patch to athletica tat it automatically shows the next runs

        // set the new JS-stateObj
        this.stateObj = stateObj;

        // always update the 'old' stateObject with the latest stored state:
        window.history.replaceState(oldStateObj, "", document.location.pathname)

        // create a state in the browser history
        if (createState){
            // TODO: to make the browser-history stuff work, we have to do the change of the page manually, slo when goeing back!!! Hook the event for 'goeing back and forth' and make sure that each time the respective changes on the dom are done 

            var stateObj = {}; // here we could store some variable to the page: we should store the important variables of the page, maybe also the html?  
            //window.history.pushState(stateObj, "", "/" + link) 
            window.history.pushState(stateObj, "", newPathname) // arguments: an object storing data, that will be passed in the "popstate" event, when the browser wants to get back/forth to this page; a title (unused by most browsers so far); the URL (not beeing called, just changed)
            // note: the 'popstate' event is not fired when the full page is reloaded (not from cache), as it might be done after went to a completely different page (without using a link?); However, window.history.state will hold the data and the onload event can be used to start handling this object

            // the stateObj could be used to store some static or local javascript stuff, but no data from the server, that could have changed meanwhile!
        }

        // start preloading the files/pages of the current page after 10 ms delay (is mainly intended to make this call asynchronous)
        //setTimeout(this)
        setTimeout(this.preloadFilesForCurrentPage.bind(this), 10)
        setTimeout(this.preloadPagesForCurrentPage.bind(this), 10)
        
        // TODO: How is it possible to use the history to undo changes we did on the data (already sent to server-DB)? --> E.g. by writing closures and calling them via the stateObj. BUT: do we want that behavior? It might be 'dangerous' e.g. when the user comes back after a long time and clickes back and does not realize what he has changed right now... --> Probably, if undo/redo is something we want, it should be implemented simply as an historically ordered list of closures with the changes, each having a name stating what it does and the time of the change and the user then manually could select to what state he'd like to go back in history. One problem remains: If meanwhile another user ahs changed data, it will simply be overwritten and the probably very old values of this user will become current again. 
        // Preventing this might be very difficult, so for now, I think such a feature is not needed! 
        // BUT, a similar feature is wanted for the recording of results on the field: when the connection to the server is lost (for short or longer time), I'd like to be able to continue using the client and it writes the changes as soon as it can. However, this only goes forward and is probably also not managed via back/forth buttons of the browser, reducing the risk of gettinh in trouble.

    }



    /**
     * call onLoad on the current page, if it exists.
     */
    onLoad(){
        if ('onLoad' in this._currentPage){
            window[this._currentPage.onLoad]();
        }
    }

    /**
     * call onUnload on the current page.
     * Note that having mutliple functions of the same name in window will lead to problems. 
     */
    onUnload(){
        if ('onUnload' in this._currentPage){
            window[this._currentPage.onUnload]();
        }
    }
}

// what happens if the ws-connection is lost during or even before a request (when we just have the current wsExtension implementation)? Is it checked somewhere if the connection is available and it send requests only then or ...?

/**
 * Handles everything with the socket connection
 * - create and stop the connection
 * - register for broadcasts (can be understood as events)
 * - continuouly test the connection and react when it is lost
 * - process the events to their recipients
 * 
 * @class socketProcessor
 */
class socketProcessor2{
    // as the first one, but for bare Websockets, without io.js 

    /**
     * constructor
     * TODO: probably noteHandling and requestHandling should be given as arguments and not programmed in this function here
     */
    constructor(){

        // currently not yet connected
        this.connected = false;
        this.tabIdReported = false;

        // create a new tabId (used on the server to identify the ws-connection)
        this.tabId = uuidv4();

        this.autoReconnect = true;

        // as of 22.04.2019, the wsconnection is set in its own function, allowing the wsconnection-object to change, which is needed when the connection fails and a new one has to be opened. 

        // create the empty object for the connection and then start a new one
        this.wsconn = undefined;
        this._startConnection();

    }

    // this funciton shall initialize a new connection. It will overwrite the old connection handle. The auto-restart is handled in the onclose- and onerror-events. 
    _startConnection(){

        // start the new connection
        // open the connection
        // OLD: this.wsconn = new WebSocket("ws://" +window.location.hostname+":3001");
        let port = '';
        if (window.location.port!=''){
            port = ':'+window.location.port;
        }
        this.wsconn = new WebSocket("ws://" +window.location.hostname+port+"/ws"); // New 2021-01: use the same connection as the main-hhtp/html part
        this.wsconn.onopen = (event)=>{
            logger.log(90, 'websocket successfully connected; start wsProcessor');

            this.connected = true;
            eH.raise('wsConnected', true);

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

            // new wsProcessor
            //this.wsProcessor = new wsExtensionClass((mess)=>{this.wsconn.send(mess);}, ()=>{this.wsconn.close()}, this.noteHandling, this.requestHandling, logTranslate);
            this.wsProcessor = new wsProcessor((mess)=>{this.wsconn.send(mess);}, ()=>{this.wsconn.close()}, this.noteHandling, this.requestHandling, logTranslate, {heartbeatMinInterval: 6});

            // new: the sid should already be known to the server directly via the cookie. But we need to report a tabID. The tabID should persist as long as no http-(re)load occurs. 
            logger.log(90, 'wsProcessor started; report tabID')

            // report the tabId 
            const setTabId = ()=>{

                this.emitRequest('setTabId', this.tabId, (data)=>{
                    if (data){
                        this.tabIdReported=true;
                        eH.raise('TabIdSet', this.tabId); // event is needed e.g. for connecting rooms
                        logger.log(99,'tabId reported');
                    }
                }, (errMsg, errCode)=>{}); //TODO: error-handling

                // make sure the tabId gets set --> test every two seconds if it worked already or start over 
                setTimeout(()=>{
                    if (!this.tabIdReported){
                        setTabId()
                    }
                }, 2000)
            }
            setTabId();

            // OLD: 
            /*var sid = getCookie('connect.sid'); // connect.sid is the default name used by express-session--> make sure this is the same as set on its initialization
            if (sid){
                setSid()
            }else{
                logger.log(1, 'Severe error: Client did not get a session ID. Preloading and most websocket-stuff is not possible!'); 
            }

            function setSid(){

                self.emitRequest('setSid', sid, (data)=>{
                    if (data){
                        self.tabIdReported=true;
                        eH.raise('SIDset', sid); // event is needed e.g. for connecting rooms
                        logger.log(99,'SID reported');
                    }
                }, (errMsg, errCode)=>{}); //TODO: error-handling

                // make sure the language gets set --> test every two seconds if it worked already or start over 
                setTimeout(()=>{
                    if (!self.tabIdReported){
                        setSid()
                    }
                }, 2000)
            }
            */

            // must set the wsProcessor to handle the incoming messages. 
            this.wsconn.onmessage = (mess)=>{this.wsProcessor.onMessage(mess.data);};

        };
        this.wsconn.onclose = (event)=>{
            // it's important that first the connection is declared closed and then the autoReconnect is started (if requested), as the 

            
            if (this.wsProcessor){
                this.wsProcessor.close();
            }
            this.connected = false;
            this.tabIdReported = false;
            
            eH.raise('wsClosed', true);
            
            logger.log(95,'(former) ws-connection closing. '); // this can either by by the server or by the client

            if (this.autoReconnect){
                this._startConnection();
            }
        }
        
        this.wsconn.onerror = (event)=>{
            // did not find exactly when this is raised...
            // simply always officially close the old connection and start a new one (if autoReconnect=true)

            // first already set the connection as closing in the wsProcessor. Then it wont try to send more data over this connection and calls failure on every connection. 
            if (this.wsProcessor){
                this.wsProcessor.closing = true;
            }
            this.wsconn.close();
            // TODO
            // eventually call all failure callbacks of the current stacks in wsProcessor..?

        }


        // both TODO!
    }

    // so far there are no notes sent from the server to the clients. Might be the case e.g. to report errors on the server to (all/Admin) clients.
    /**
     * noteHandling: handling the incoming notes. Must have one argument, so it can be used in the wsProcessor directly. Currently this is unused yet, as so far everything is a request...
     * IMPORTANT TODO: make sure that notes of the wrong data type do not crash the server!
     * @param {any} note The data that was sent. could be any datatype, as defined on client and server as soon it is used. 
     */
    noteHandling(note){
        logger.log(99, note);

        // TODO: check the input format first.
        if (!('name' in note && 'data' in note)){
            logger.log(5, 'Each note must have a name and a data argument! note: ' + JSON.stringify(note));
            return;
        }

        let name = note.name;
        let data = note.data;

        if (name=='room'){

            // further stuff handled in the roomManager
            rM.wsNoteIncoming(data);

        } else if (name='something else'){
            // TODO
        } else {
            let errMsg = '"'+ name +'" does not exist as keyword for Websocket notes.';
            logger.log(5, errMsg);
        }
    }
    

    // so far there are no requests from the server to the client. 
    /**
     * requestHandling: handles the incoming requests. Must ave two arguments, so it can be used in the wsProcessor directly. 
     * IMPORTANT TODO: make sure that requests of the wrong data type do not crash the server!
     * @param {json} request The request as a json: first the name of the function to call with the given data 
     * @param {string} request.name The name of the request
     * @param {any} request.data The data that needs to be given to the function handling the request of this name
     * @param {function(message, failure=false)} responseFunc The function that has to be called with the response as the first argument. If an error shall be reported, the second argument must be true and the first parameter is the error-message.
     */
    requestHandling(request, responseFunc){
        
        // TODO: add checks for the datatype, where needed
        // request must be a json with two properties name and data
        // idea: write a general data-type testing function or download such a function from the internet (tell it in some way, how the file must look like (what properties of what data type) and let it proof it; must work for any depth of json --> recursive programming)

        // we assume for now that the input has the right format..:
        // e.g. request={name='preloadpage', data='the workload, which could be a json again with arbitrary depth'}
        
        let name = request.name;
        let data = request.data;

        // TODO: eventually put all the following single parts in separate function. An general event system can hardly be used here as we do not simply call an event, but we also need to send back something, which would (1) not be guaranteed through the event system and (2) it would not be clear how to work with it when there are multiple listeners.

        
        if (name=='someNameOfARequest'){
            /**
             * do something with the received data.
             */

        }
        else { 
            let errMsg = '"'+ name +'" does not exist as keyword for Websocket requests.';
            logger.log(5, errMsg);
            // send something back, that there was an error on the server.
            responseFunc(errMsg, 1);
        }
    }

    /**
     * emit: while the sendRequest of the processor simply sends a message, we implement here the counterpart of 'requestHandling', that will be called with the data we constitute here. Our data simply consists of the name of the event to be called and the data itself
     * @param {String} eventName the name of the event, defines the funciton called on the server
     * @param {Object} data Optional (default={}), can be of any type; Server simply must expect the same under that eventName
     * @param {Function} success Optional, a function with max one parameter (data) that is called when the data is acknowledged by the server 
     * @param {Function} failure Optional, a function with two parameters: errMsg and errCode; called when the websocket request failed (either due to problems on the server or in the transmission)
     * @param {object} opt See wsProcessor for options
     * @param {Function} cbAck Optional, a function with two parameters which reports the acknowledgement status (only if requested in opt)
     */
    emitRequest(eventName, data={}, success=(response)=>{}, failure=(errCode, errMsg)=>{}, opt={}, cbAck=(statusCode, statusMsg)=>{}){
        // should actually been checked already
        if (this.connected){
            //request, cbSuccess=(response)=>{}, cbFailure=(errCode, errMsg)=>{}, opt={}, cbAck=(statusCode, statusMsg)=>{}
            this.wsProcessor.sendRequest({name:eventName, 'data':data}, success, failure, opt, cbAck)
        } else {
            // directly call the failure callback
            failure(3, 'Connection was closed before the reqeust could be sent.');
        }
    }

    /**
     * OLD: we do not provide anything with resending anymore, since wsProcessor clearly handles errors on sending requests (connection errors, timeouts, server errors)
     * emit: while the sendRequest of the processor simply sends a message, we implement here the counterpart of 'requestHandling', that will be called with the data we constitute here. Our data simply consists of the name of the event to be called and the data itself
     * @param {String} eventName the name of the event, defines the funciton called on the server
     * @param {Object} data Optional (default={}), can be of any type; Server simply must expect the same under that eventName
     * @param {Function} success Optional, a function with max one parameter (data) that is called when the data is acknowledged by the server 
     * @param {Function} failure Optional, a function with two parameters: errMsg and errCode; called when the websocket request failed (either due to problems on the server or in the transmission)
     * @param {Number} retryCount If there is no connection, how many times shall it be tried to send this message?
     * @param {Number} retryInterval If there is no connection, after what interval in ms it is retried to send the message
     */
    /*emitRequestOld(eventName, data={}, success=undefined, failure=undefined, retryCount=0, retryInterval=1000){
        if (this.connected){
            this.wsProcessor.sendRequest({name:eventName, 'data':data}, success, failure)
        } else {
            if (retryCount>0) {
                logger.log(98,retryCount);
                setTimeout(this.emitRequest.bind(this), retryInterval, eventName, data, success, failure, retryCount-1, retryInterval) // note: by using bind, we do not only 'give' setTimeout the funciton that it should call, but also the context it shall be called in
            } else {
                logger.log(3, 'emmitting websocket request not possible, no connection.')
            }
        }
    }*/

    /**
     * surround the actual note with the eventName and send it
     * @param {*} eventName 
     * @param {*} data 
     * @param {object} opt See wsProcessor for options (sendNote)
     * @param {Function} cbAck Optional, a function with two parameters which reports the acknowledgement status (only if requested in opt)
     */
     emitNote(eventName, data={}, opt={}, cbAck=(statusCode, statusMsg)=>{}){
        // should actually been checked already
        if (this.connected){
            // note, opt={}, cbAck=(errCode, errMsg)=>{}
            this.wsProcessor.sendNote({name:eventName, 'data':data}, opt, cbAck)
        } else {
            if (opt.sendAck){
                cbAck(3, 'Connection was closed before the note could be sent.')
            }
        }
    }


    /**
     * OLD: we do not provide anything with resending anymore, since wsProcessor clearly handles errors on sending requests (connection errors, timeouts, server errors) 
     * surround the actual note with the eventName and send it
     * @param {*} eventName 
     * @param {*} data 
     * @param {*} retryCount 
     * @param {*} retryInterval 
     */
    /*emitNoteOld(eventName, data={}, retryCount=0, retryInterval=1000){
        if (this.connected){
            this.wsProcessor.sendNote({name:eventName, 'data':data})
        } else {
            if (retryCount>0) {
                logger.log(98,retryCount);
                setTimeout(this.emitNote.bind(this), retryInterval, eventName, data, retryCount-1, retryInterval) // note: by using bind, we do not only 'give' setTimeout the funciton that it should call, but also the context it shall be called in
            } else {
                logger.log(3, 'emmitting websocket note not possible, no connection.')
            }
        }
    }*/


    /**
     * emitRequestPromise: send a request; the responce is passed via a promise. Rejection happens when either the request times out or if an error occurs either on the server or during transmission.
     * @param {string} eventName the name of the event used; the reply is assumed to be the same, but with 'R' in front
     * @param {object} data the data to be sent
     * @param {milliseconds} timeout the timeout (ms) after which the request is deemed failed, default=2000 ms, put to zero for no timeout
     * @returns {Promise} On resolve/success, the data is returned, noting if the the Promise is rejected
     */
    emitRequestPromise(eventName, data={}, timeout=2000){

        // create a promise
        const res = new Promise((resolve, reject)=>{

            this.wsProcessor.sendRequest({name:eventName, 'data':data}, (data)=>{resolve(data);}, ()=>{reject()});
        
            // what happens if we reject if the Promise was already successful? if nothing, tho following works
            // TODO: check this!!!!!
            if (timeout>0){
                setTimeout(() => {reject(); }, timeout);
            }
        });

        // return the promise
        return res; 
    }

    /*joinRoom(id){
        if(this.connected){
            // TODO...
        } else {
            logger.log(3, 'joining websocket room not possible, no connection.')
        }
    }*/


}



/**
 * localLogger: logs everything that happens locally, sends it if necessary to the server, receives logs from the server when necessary
 * 
 * writes to the console and in the future also to the screen (very bottom of athletica)
 * currently does nothing else than write to console.log(), but is here already so that the rest of the code does not need to be changed in the future
 * has 100 log levels (see below) from 0=nothing to 99=debug
 * @class localLogger
 */
class localLogger{

    /**
     * logging levels:
     * 0: nothing
     * 1: Error, application crash
     * 3: Error, application partially crashed, might not work as expected anymore
     * 7: Warning, something did not work as expected, but should worke anyway
     * 10: Warning, temporary, e.g. connection temporarily lost
     * 90-99: debugging level, show (nearly) every message
     */

    /**
     * Constructor of the logger
     * @constructor
     * @param {socketIO} ws The websocket class, to send and receive messages to log on the server or locally 
     * @param {Number} level Optional, define the level to be logged (default=10, 0=nothing, 99=debug)
     */
    constructor(ws, level=10){

        // get the element for the log on the screen
        //TODO: this.element = document.getElementById('logger');

        this.wsConnected = false;
        if (ws){
            this.ws = ws;
            this.wsConnected = true; 

            // TODO: add socket-listener and process it here...

        }
        this.logLevel = level;

        // TODO: hide the log-message-bar (Athletica1=at the bottom) when logLevel=1
    }

    /**
     * Log a message with the given level; TODO: currently only local logging
     * @method log 
     * @param {Number} level logLevel, between 1 and 99
     * @param {String} msg The message to be logged
     */
    log(level, msg){
        if (this.wsConnected){
            // send message also to server
            // TODO
        }
        if (level<=this.logLevel && level>0){ // make sure nobody fools the system by setting level=0, when logLevel=0
            console.log(msg);
        }
    }
}

// start the logger
logger = new localLogger(undefined, 95);


// some basic functions:

/**
 * gets the meeting shortname from the path
 */
function getMeetingShortname(){
    let p = window.location.pathname; // something like /en/Neu/blabla
    let arr = p.split('/');
    if (arr[0]==""){
        //generally, the first element should be empty, since the string starts with "/"
        return arr[2]; 
    } else {
        return arr[1];
    }

}

/**
 * gets the language code (ISO 639-1) from the path
 */
function getLanguage(){
    let p = window.location.pathname; // something like /en/Neu/blabla
    let arr = p.split('/');
    if (arr[0]==""){
        //generally, the first element should be empty, since the string starts with "/"
        return arr[1]; 
    } else {
        return arr[0];
    }
}

// cookie handling, copied from mdn
function setCookie(cname, cvalue, exdays) {
    var d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
    var expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}
function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return ""; // returns empty if the cookie is not found
}

// copy Objects, copeid from 'Speaking Javascript'-book
function copyObject(orig) {
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
};
/**
     * Transfer the values of the properties in objFrom to the properties in objTo. Recursive. 
     * If updateOnly=false (default), then properties that do exist only in objTo will be deleted. 
     * @param {object or array} objFrom 
     * @param {object or array} objTo 
     * @param {boolean} updateOnly If true, properties in objTo are not deleted when they do not exist in objFrom. Default: false 
     */
function propertyTransfer(objFrom, objTo, updateOnly=false){

    if (Array.isArray(objFrom)){

        if (!Array.isArray(objTo)){
            console.log('objTo was not of type array, but objFrom was. The property transfer would fail and thus is aborted.')
            return
        }

        // use pop and push to alter the length of the array. Note that we do not detect moved elements. We rather delete or add elements at the end and just transfer the values at each position. (Push is actually not needed, since assigning to elements outside the range is possible.)
        while (objTo.length>objFrom.length){
            objTo.pop();
        }
        /*
        let l = objTo.length; 
        for (let i=0;i<l-objFrom.length;i++){
            // delete the last elements
            objTo.pop();
        }*/

        // copy the elements
        for (let i=0;i<objFrom.length;i++){
            // pay attention to objects and arrays --> recursive calls needed
            if (typeof(objFrom[i])=='object'){
                if (typeof(objTo[i])!='object'){
                    // if this is not done here and if objTo[i] is just a property, the recursive call on propertyTransfer will not occur byReference, as it must be to work.
                    if (Array.isArray(objFrom[i])){
                        objTo[i] = [];
                    } else {
                        objTo[i] = {};
                    }
                } else {
                    // is it of the same type? otherwise reset the element in objTo
                    if (Array.isArray(objTo[i]) && !Array.isArray(objFrom[i])){
                        objTo[i] = {};
                    } else if (!Array.isArray(objTo[i]) && Array.isArray(objFrom[i])){
                        objTo[i] = [];
                    }
                }
                this.propertyTransfer(objFrom[i], objTo[i], updateOnly);
            } else {
                objTo[i] = objFrom[i];
            }
        }
        
    } else {

        if (Array.isArray(objTo)){
            console.log('objTo was of type array, but should be a normal object as objFrom. The property transfer would fail and thus is aborted.')
            return
        }

        // is a regular object
        // copy new to objTo
        for (let prop in objFrom){
            if (typeof(objFrom[prop])=='object' && objFrom[prop] != null){ // null interestingly is an object...

                if (!(prop in objTo)){
                    if (Array.isArray(objFrom[prop])){
                        objTo[prop] = [];
                    } else {
                        objTo[prop] = {};
                    }
                } else {
                    // is it of the same type? otherwise reset the property in objTo
                    if ((typeof(objTo[prop])!='object' || Array.isArray(objTo[prop])) && !Array.isArray(objFrom[prop])){
                        objTo[prop] = {};
                    } else if ((typeof(objTo[prop])!='object' || !Array.isArray(objTo[prop])) && Array.isArray(objFrom[prop])){
                        objTo[prop] = [];
                    }
                }
                // transfer the property
                this.propertyTransfer(objFrom[prop], objTo[prop], updateOnly);
            } else {
                // just copy from/to
                // the problem is that if properties are added in the property transfer, using the simple assignement does not raise any observer set by Vue. Thus vue will not be updated! 
                objTo[prop] = objFrom[prop];

                // TEST: if the property is not available in objTo, do not assign it to a property, but use a method that is observed
                //objTo = Object.assign(objTo, {[prop]:objFrom[prop]}) // does not work

            }
        }
        // delete all properties in objTo, which are not present in objFrom
        if (!updateOnly){
            for (let prop in objTo){
                if (!(prop in objFrom)){
                    delete objTo[prop];
                }
            }
        }
    }


}
function findGetParameter(parameterName) {
    var result = null,
        tmp = [];
    location.search
        .substr(1)
        .split("&")
        .forEach(function (item) {
          tmp = item.split("=");
          if (tmp[0] === parameterName) result = decodeURIComponent(tmp[1]);
        });
    return result;
};
function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
	});
}