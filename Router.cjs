var express    	=   require('express');

// TODO: 
/**
 * - Login must be first (after language)
 * - include auto-login with to define default rights
 * - eventually get language by browser automatically
 * - implement the meeting-choose dialog (depends on the login/user with user-specific views)
 * - migrate the current meeting stuff to here and start implementing all the rest...
 */

var router = express.Router({strict:true});


	
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
    //router.get('/',(req, res, next)=>{
    router.get(/^\/$/,(req, res, next)=>{
        // req.headers['accept-languages'] would allow to access the complete raw-header string

        // try to automatically set the language
        let lang = req.acceptsCharsets(req.i18n.languages);
        if (lang){
            res.redirect('/'+lang+'/ert.r');
        } else {    
            // show the language page 
            res.render("setLang.ejs"); 
        }

    })


    // return the page, where the meeting can be chosen or show the page to create a new one, if there is none; of course, the links to admin must already be shown, as 
    router.get('/:lang/', (req, res, next)=>{

        // we could show the language choose page when a language is given that does not exist. Currently it will automatically use the default language.

        // set the language:
        req.i18n.setLocale(req.lang); 

        // check if there are active meetings
        let numMeetingsActive = 0; // TODO
        if (numMeetingsActive>1) {
            // show the list of meetings to select
            res.render("meetingSelection.ejs")
        } else if(numMeetingsActive==1){
            // redirect to the only meeting
            res.redirect(req.path + '/' + meetingID); // TODO: meetingID
        } else {
            // redirect to the admin page; eventually required login first...
            // TODO.
        }
        
    })


    // do everything with the login/logout stuff

    router.get('/:lang/login', (req, res, next)=>{

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
    router.get('/:lang/:meeting/*', (req, res, next)=>{
        console.log(req.params)

        // set the language.
        req.i18n.setLocale(req.params.lang); 
        
        var pages = require('pages');
        /* test if the requested page is 'valid':
            - no "/"" (except the first and probably last)
            - exists in pages */
        var path = req.path.slice(1); // remove beginning /
        if (path.endsWith('/')){
            path = path.substr(0,path.length-1); // remove ending /
        }
        if (path.indexOf('/')==-1 && pages[path]){
            
            var page = pages[path];
            
            // the page is defined so we can start loading it:

        } else {
            // is nothing matched, redirect to the front page
            console.log("The requested page could not be found. Redirecting to the front page of the meeting.")
            res.redirect(`/${req.params.lang}/${req.params.meeting}/`);
            //next()
        }
    })
    
    
    // the very last routes: when no prior route was applicable, this is the fallback
    
    // wrong on first path-part
    router.get('/*', (req, res, next)=>{
        // redirect to the startpage; in the future we could also have its own page for that case
        res.redirect('/');
    })
    
module.exports = router;
