
/**
 * CHANGES:
 * - move the height check into the children-loop of the parent
 */

/**
 * This document presents classes to store the content of a document to be printed in a structured way. The idea is that the actual printer (e.g. to pdf) has a pendant to each of those classes and knows how to print them and where and how page breaks are allowed, optimizing to look of the page. 
 * PageBreaks can (by default) only occur between containers. (However, a class could implement a different print method allowing other page breaks as well.) 
 *  
 * Example ContestSheet (contestContainer<seriesContainer<athleteContainer):
 * - Info about contest (start times, configuration, baseDiscipline, connected events/rounds/groups)
 * - list of series:
 *   - list of participants with name, firstname, year of birth, country, bib, position/lane, category, club, discipline (to be able to show additional information within the same baseDiscipline)
 *   - series number and name, exact time of the series, site, 
 *  
 * Example of ResultSheet based on the contest (contestContainer < ev. seriesContainer (try to hide if only one series) < athleteContainer):
 * - info about contest (ev. start time)
 * 
 * Example of ResultSheet based on the event (eventContainer* <):
 * NOTE: probably mainly needed when there is no merging or when the resultSheet still looks nice when "splitted".
 * *eventGroup is not needed!
 * 
 * Example of ResultSheet based on the eventGroup ():
 * NOTE: probably mainly needed for merged events of track disciplines
 * 
 * Example of RankingList (rankingListContainer < ...*)
 * ...*everything below the rankinglistContainer depends on whether tha ranking list shall be event, eventGroup or contest centered. Also provide the option make this dependent on the baseDiscipline, e.g. track is eventGroup-based and tech is event-based
 * - some data about the competition (datefrom/dateTo, place, organizer, indoor/outdoor, etc)
 * 
 * TODO: 
 * - How to do translations?
 *   - ideally we also have a different setup based on the language... --> we must be able to provide the setup not just 
 *   - on the server prepare a special path that returns the translated printing configuration file (only the needed language, which will be "calculated" on the fly from the print configuration file on the server which stores all languages. ) Like this we can also have a default print-configuration-file for languages or even just parts of the configuration file where a spcidific language does not have its own definition.
 *   - on the client the import would be like <script type="text/javascript (or module)" src="/printConf<%- _lang %>.js" /> 
 *   - The server can simply work on the full configuration file
 *   - we cannot simply make this file ejs, because we cannot parse it for execution on the server; So, we must implement some translation function on our own. eventually we resign here from using i18n and create our own code; probably requiring that we man
 * 
 * - how to define some general print settings? (paper size, font size, font, page margins, header/footer content, table-layouts) --> regular (additional) static configuration file DOES NOT WORK, because it shall be language dependent (except when we always provide all configurations to the browser; but that might end up in an overly large file.), that will be included in the borwser's html (<script type="module" src="testfile1.js" />) and on the server 
 * - is it eventually helpful to have a general table-style syntax containing column sizes, column content types (allow line break yes/no or horizontalScaling yes/no/how, ...), font (includes bold and oblique=italic), border definitions, 
 */

// why to keep track of the current positionY manually and not using the "tracking" by pdf-lib: for the case when pdf-lib once would have to be replaced

/**
 * Procedure for printing:
 * prior:
 * 0) Create the data structure
 * During printing:
 * 1) the printed document will have the same logical structure as the data structure. Every printContainer shall be able to calculate its minimum required height (unbreakable height, i.e. prefer to start on the next page rather than showing only a small part) and eventually also height to fit the whole container (would allow for print optimization). 
 * 2) Settings for printing: 
 *    - It shall be defined for each kind of container, whether its children have to be plotted together or if and how they can be plotted separately (e.g. will a header be repeated?). For example it does not matter when series are plotted on different pages, but e.g. the series itself (i.e. the lanes) shall not be split (probably except if there are track races like marathon, where all participants would not fit one page; eventually calculate the minimum ).
 *    - Start container only on new pages
 *    - End container with a page break
 *    - Page breaks between children (e.g. after every second child)
 * 3) a container shall specify the space needed between its childs
 * 4) the height of a container is given by:
 *    - leading space (could be implemented manually)
 *    - container content (could be implemented manually)
 *    - children's height and space between children
 *    . trailing space (could be implemented manually)
 * 5) Each container must be able to print content based on a given max-height it can fill. TODO: How should we handle then the page breaks? Should the container that reaches over the page simply initiate the page break (by calling a defined "pageBreak function") or shall it hand back to the root printing function, e.g. to print again header/footer of the page or other information of higher leven containers that must be repeated? The first is probably easier to implement, while the latter is more flexible.
 *    A mix of both approaches could be done as follows: the "page-break-function" is created on the top level and every container on a lower level may then add additional stuff to be repeated on page break. This is quite flexible. Probably the only thing it does not allow is that a container places stuff before the actual page break, e.g. a text stating "table continued on next page" could only be created by the lower most element, before it calles the "page break function", but higher level containers could not do that.  
 * 
 * 6) The printer finally can know whether it can fit one more child- container on the same page or whether a page break is needed
 * 
 * A general optimization is actually not really possible (as long as we do not optimize e.g. column layouts, but only the positioning of containers). In contrast, the drawing is simply top down, where it can/shall be checked step by step if and how much content still fits the page before adding a page break.
 * 
 * if a container has to start on a new page, then optimizations on a higher level are unnecessary
 */

// Try to create a base class for printing (no optimization done):
class printingGeneral {
    
    // WRONG thought: with this schema the header and footer can be the top most container. By having hAvailAll=hAvailSplit this container might know that it does not have to call any parent anymore to draw a new page when needed 
    // TODO: does not work, because the footer is simply mandatory stuff before page break, i.e. the first container within Header/Footer will also see hAvailAll=hAvailSplit.
    // heightAvailAll is given by the space of the previous container minus its mandatory stuff before AND after this container
    // heightAvailSplit is given by the space of the previous container minus its mandatory stuff before AND after this container AND minus the stuff that comes after when the child is split

    /**
     * 
     * @param {object} data Reference to the data object
     */
    constructor(data){

        this.children = []; // analog to the children property of the data structure
        this._minChildHeight = []; // the minimum height of each child; will be filled on first use (or we fill it here already)
        this._totalChildHeight = []; // the total height of each child; will be filled on first use (or we fill it here already)

        this.minimumChildrenPrint = 0; // how many children (their total height!) shall be considered for the minimum height calculation; null if all must be printed (if all children must be printed, also the footer of this container is included, i.e. minimumHeight=totalHeight)

        this.pageBreakStart = false;
        this.pageBreakEnd = false;
        this.pageBreakAfterNChildren = 0; // 0 = never
        // not implemented yet:
        this.allowPageBreakBeforeFooter = false; // allow to have a page break between the last child element and the container footer. 

        // every print page will probably have the following parts: 
        // - container header
        // - post-page-break container header (applied on every new page)
        // - pre-page-break container footer (applied before a new page is required to fit all childs)
        // - container footer
        // - (child --> given in child)
        // - child separator (always printed between children; certainly needed, e.g. to create some space between series) 
        // - child separator page break (always printed when page breaks occur between children)

        if (this.pageBreakAfterNChildren > 0 && this.minimumChildrenPrint>this.pageBreakAfterNChildren){
            console.log(`minimumChildrenPrint ${this.minimumChildrenPrint} must be smaller or equal to pageBreakAfterNChildren ${this.pageBreakAfterNChildren}. Printing might result in unexpected results.`);
        }


        // create a fakeDocument to check the total needed heights
        this.fakeDoc = null;
        PDFLib.PDFDocument.create().then(d => {
            this.fakeDoc=d;
        }); // hopefully the Promise is resolved when the fakeDoc is used for the first time
    }

    getFakePG(){
        return {
            positionY: 99999999999999, // not more than 15 digits! afterwards, the accuracy of number is less than 1; reduced to 14 digits, so that at least one number after the comma is accurate as well
            hPrePageBreakAll: 0,
            hPrePageBreakSplit: 0,
        }
    }

    /**
     * @param {object} page The page to draw on. Also contains a reference to the doc (page.doc), which is needed e.g. to embed pictures.
     * @param {object} pG consists of page-geometry several properties, defining the setup for the currently printed page: 
     * @param {number} pG.positionY The current y-position where to draw
     * @param {number} pG.hPrePageBreakAll The height needed to print all outer pre page break stuff, given this container needs no page break within it
     * @param {number} pG.hPrePageBreakSplit The height needed to print all outer pre page break stuff, given this container will do a page break in it. (In that case, the outer containers might want to add stuff like "continued later", however, )
     * @param {function} pageBreak Function to be called when a new page shall be created. Will print all "footers" (pre-page-break content), do the page break, print the post-page-break content (e.g. some repeated headers)
     * @param {*} isNewPage isNewPage is set to true when either the container or the previous child added a new page at the end: TODO: is currently probably not implemented!
     * @return {number} the new positionY
     */
    print(page, pG, pageBreak, isNewPage=false){

        // first precalculate the child total- and minheights:
        /*this.minChildHeight = this.children.map((c)=>c.getMinimumHeight());
        this.totalChildHeight = this.children.map((c)=>c.getTotalHeight());*/

        // if we arrive here we can assume that we can print at least our minimum; therefore, the following checks are not needed!
        const oldStuff1 = ()=> {
            // check if we have enough space for this container: either fit the hole container within hAvailAll or at least the minimum height within
            // otherwise add a page; 
            let checkMinFit = ()=>{
                return pG.positionY-pG.hPrePageBreakAll < this.getTotalHeight() && pG.positionY-pG.hPrePageBreakSplit< this.getMinimumHeight();
            }

            // if this container shall continue on a new page and it is not a new page yet, create a new page; also create a new page when the minimum content cannot be shown
            if ((this.pageBreakStart && !isNewPage) || checkMinFit===false){

                // the pageBreaks done here at the begionning MUST invoke the separator, since the pageBreak occurs before actual content is shown! (The separator will automatically not be shown if it would occur before the first child element.)
                [page, pG] = this._pageBreak(pG, pageBreak, showParentSeparator=true)

                isNewPage = true;

                if (!checkMinFit){
                    throw {message:`Cannot print the document, since there is not enough space to fit the minimum size of the container ${this.constructor.name} on a full page.`, code:5};
                }
            }
        }


        // // remaining usable height if this container does NOT span multiple pages 
        // let hAvailAll = pG.positionY - pG.hPrePageBreakAll;
        // // remaining usable height if this container reaches multiple pages (containing the prePageBreakHeight of the parent and its parents etc)
        // let hAvailSplit = pG.positionY - pG.hPrePageBreakSplit;

        // print the header
        [page, pG] = this.printContainerHeader(page, pG);
        
        // print all children
        for (let i=0; i<this.children.length; i++){
            
            let child = this.children[i];

            // check whether the child fits; otherwise add a page break before;
            // the fit can either be: 
            // - all remaining childs will fit on the current remaining page (no need to consider the prePageBreak stuff to check the residual height)
            // - the minimum height of the current child fits the current remaining page (considering that there will be a page break after (--> requires space))

            // calculate the space we still have for the remaining children
            // NOTE: if all children fit, no further prePageBreakHeight must be considered; if they do not fit, we have to make sure that this is already considered
            //let remainingHeightAssumingNoPageBreak = pG.positionY - pG.hPrePageBreakAll;
            //let remainingHeightWithPageBreakNeededWithinContainer = pG.positionY - pG.hPrePageBreakSplit - this.prePageBreakHeight;
            
            // calculate the height that would be needed to fit all remaining (including the current one) children here
            let hAll = 0;
            for (let i2=i; i2<this.children.length; i2++){
                hAll += this.minChildHeight[i];
                // no separator at the end
                if(i2+1<this.children.length){
                    hAll += this.childSeparatorHeight();
                }
            }

            let fitsAll = pG.positionY - pG.hPrePageBreakAll - this.containerFooterHeight() >= hAll;
            
            // do pageBreaks and separators
            if (!fitsAll){
                // check if a page break is needed right now (i.e. when the current child's min height does not fit)
                if (pG.positionY - pG.hPrePageBreakSplit - this.minChildHeight[i] < 0){
                    // create a page break
                    if (i>0){
                        [page, pG] = this.printChildSeparatorPrePageBreak(page, pG);
                    }

                    [page, pG] = this._pageBreak(page, pG, pageBreak)
                } else {
                    if (i>0){
                        [page, pG] = this.printChildSeparator(page, pG);
                    }
                }
            } else {
                if (i>0){
                    [page, pG] = this.printChildSeparator(page, pG);
                }
            }

            // prepare the pageBreak function for the child
            // TODO: I think the separator is actually not needed anymore
            let pB = (page, pG, showSeparatorHere=false)=>{
                if (i==0){
                    // never show the separator before the first child
                    showSeparatorHere = false; 
                }
                return this._pageBreak(page, pG, pageBreak, showSeparatorHere=showSeparatorHere);
            };

            // teh pageGeometry shall be able to hold any other optional properties; so the client shall basically get a copy of the stuff this 
            let pGChild = copyObject(pG);

            // calculate the prePageBreakHeight height that is available for the next child either when the full child is printed and if only a part of the child can be printed 
            pGChild.positionY = pG.positionY;
            pGChild.hPrePageBreakAll = (fitsAll ? pG.hPrePageBreakAll : pG.hPrePageBreakSplit) + this.containerFooterHeight();
            pGChild.hPrePageBreakSplit = (fitsAll ? pG.hPrePageBreakAll : pG.hPrePageBreakSplit) + this.containerFooterHeight() + this.prePageBreakHeight();

            // print the child
            [page, pG] = child.print(page, pGChild, pB)

            // create a new page after n-children, but not at the beginning or at the end:
            if (i>0 && (i+1) % this.pageBreakAfterNChildren==0 && i+1<this.children.length){
                [page, pG] = this.printChildSeparatorPrePageBreak(page, pG);
                [page, pG] = this._pageBreak(page, pG, pageBreak);
            }
            
        }

        // is there enough space for the footer? 
        if (pG.positionY - pG.hPrePageBreakAll - this.containerFooterHeight()<0){
            // need a new page (no separators here)
            [page, pG] = this._pageBreak(page, pG, pageBreak);
        }
        
        
        [page, pG] = this.printContainerFooter(page, pG);

        if (this.pageBreakEnd){
            [page, pG] = this._pageBreak(page, pG, pageBreak);
        }

        // return the current position; actually the parent must also know whether a pageBreak was just done, but that info is given by child.pageBreakEnd
        return [page, pG];
    }

    // the total height only relates to the theoretical total height, not including any possibly needed page breaks (i.e. the height that it would take on an infinitely long paper)
    // this is what is needed in the checks during print.
    getTotalHeight(){
        // if not calculated yet, calculate it for every child.
        /*if (this.children.length>0 && this.totalChildHeight.length==0){
            this.totalChildHeight = this.children.map((c)=>c.getTotalHeight())
        }*/
        let sepHeight = 0
        if (this.minimumChildrenPrint>1){
            sepHeight += (this.minimumChildrenPrint-1)*this.childSeparatorHeight() + sepHeight;
        }

        // TODO: do we need to include here the prePageBreakHeight, if we have a mandatory pageBreak at the end?
        // I assume yes
        return this.containerHeaderHeight() + this.containerFooterHeight() + this.totalChildHeight.reduce((tempSum, val)=>val+tempSum, 0) + sepHeight + this.pageBreakEnd*this.prePageBreakHeight();
    }

    // might be overriden in a different way by the inheriting class
    getMinimumHeightBackup(){

        // print it all
        if (this.minimumChildrenPrint == null || this.minimumChildrenPrint >= this.children.length){
            // all children must be fully printed, also the footer of this container, i.e. the minimum height is the total height
            return this.getTotalHeight();
        }

        

        // there are certainly more children than need to be printed at least

        let hChildren = 0;
        for (let i=0; i < this.minimumChildrenPrint; i++){
            hChildren += this.totalChildHeight[i];
        }
        if (this.minimumChildrenPrint>1){
            // separator only between the children
            hChildren += (this.minimumChildrenPrint-1)*this.childSeparatorHeight();
        }

        // after the minimum number of children there are several possibilities: 
        // - no more children anyway (handled above by returning getTotalHeight)
        // A) the remaining children take less space than the prePageBreak would take
        // B) the prePageBreak+separatorPageBreak takes less space than the remaining children (likely always the case) 
        let hChildrenRemaining = 0;
        for (let i=this.minimumChildrenPrint; i<this.children.length; i++){
            // always also add a separator
            hChildrenRemaining += this.childSeparatorHeight();
            hChildrenRemaining += hChildren += this.totalChildHeight[i];
        }

        let hRest = Math.min(hChildrenRemaining, this.prePageBreakHeight() + this.childSeparatorPrePageBreakHeight()); 

        return this.containerHeaderHeight() + hChildren + hRest;
    }

    // might be overriden in a different way by the inheriting class
    getMinimumHeight(){

        if (this.minimumChildrenPrint == null){
            // all children must be fully printed, also the footer of this container is printed then, i.e. the minimum height is the total height
            return this.getTotalHeight();

        } else if (this.children.length==0){
            // only the header of this container is mandatory
            return this.containerHeaderHeight();

        } else if (this.minimumChildrenPrint == 0){
            // if miniumChildrenPrint == 0 then make sure that at least the minimum height of the first child (if present) can be printed!
            let hMin = this.minChildHeight[0];
            
            // in addition to the minimum height of the first child there are two possibilities:
            // A) the totalHeight of the child would take less space than the the height of the prePageBreakHeight here, then let the child be fully printed
            // B) otherwise add the prePageBreakHeight to the minimum height of the child-container
            let hTotal = this.totalChildHeight[0];
            return this.containerHeaderHeight() + Math.min(hMin+this.prePageBreakHeight(), hTotal);

        }
        // as of here, there is at least one child that must be printed:

        // print at least the following children totally:
        let nChildrenToPrint = Math.min(this.minimumChildrenPrint, this.children.length);
        let hChildren = 0;
        for (let i=0; i < nChildrenToPrint; i++){
            hChildren += this.totalChildHeight[i];
        }
        if (this.minimumChildrenPrint>1){
            // separator only between the children
            hChildren += (nChildrenToPrint-1)*this.childSeparatorHeight();
        }
    

        // after the minimum number of children there are several possibilities: 
        // A) the remaining children take less space than the prePageBreak would take
        // B) the prePageBreak+separatorPageBreak takes less space than the remaining children (likely always the case) 
        let hChildrenRemaining = 0;
        for (let i=nChildrenToPrint; i<this.children.length; i++){
            // always also add a separator
            hChildrenRemaining += this.childSeparatorHeight();
            hChildrenRemaining += hChildren += this.totalChildHeight[i];
        }

        let hRest = Math.min(hChildrenRemaining, this.prePageBreakHeight() + this.childSeparatorPrePageBreakHeight()); 

        return this.containerHeaderHeight() + hChildren + hRest;
    }

    get minChildHeight(){
        // if not calculated yet, calculate it for every child.
        if (this.children.length>0 && this._minChildHeight.length==0){
            this._minChildHeight = this.children.map((c)=>c.getMinimumHeight())
        }
        return this._minChildHeight;
    }

    get totalChildHeight(){
        // if not calculated yet, calculate it for every child.
        if (this.children.length>0 && this._totalChildHeight.length==0){
            this._totalChildHeight = this.children.map((c)=>c.getTotalHeight())
        }
        return this._totalChildHeight;
    }

    /*getMinChildHeight(index){

        // if not calculated yet, calculate it for every child.
        if (this.children.length>0 && this.minChildHeight.length==0){
            this.minChildHeight = this.children.map((c)=>c.getMinimumHeight())
        }
        return this.minChildHeight[index];
    }

    getTotalChildHeight(index){
        // if not calculated yet, calculate it for every child.
        if (this.children.length>0 && this.totalChildHeight.length==0){
            this.totalChildHeight = this.children.map((c)=>c.getTotalHeight())
        }
        return this.totalChildHeight[index];
    }*/

    /**
     * All printing functions:
     */
    // - DONE container header
    // - DONE post-page-break container header (applied on every new page)
    // - DONE pre-page-break container footer (applied before a new page is required to fit all childs)
    // - pre-page-break
    // - DONE container footer
    // - REMOVED child header (always printed before a child; probably often not needed, since implemented in the child itself)
    // - (child --> given in child)
    // - DONE child separator (always printed between children; certainly needed, e.g. to create some space between series) 
    // - REMOVED child footer (always printed after a child; probably often not needed, since implemented in the child itself)

    // 

    // this will probably often be just some space
    printChildSeparator(page, pG){
        return [page, pG];
    }

    childSeparatorHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = this.fakeDoc.addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - this.printChildSeparator(page, pG)[1].positionY;
    }

    // the childSeparator before a page break
    printChildSeparatorPrePageBreak(page, pG){
        return [page, pG];
    }

    childSeparatorPrePageBreakHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = this.fakeDoc.addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - this.printChildSeparator(page, pG)[1].positionY;
    }

    // returns the used height
    printContainerHeader(page, pG){
        return [page, pG]
    }

    /**
     * This function returns the height needed for the header. If in the given printContainerClass this has a fixed height, implement this function to avoid the execution of this base function, which calculates the height by drawing a fake document. 
     */
    containerHeaderHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = this.fakeDoc.addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - this.printContainerHeader(page, pG)[1].positionY;
    }

    // returns the used height
    printContainerFooter(page, pG){
        return [page, pG]
    }

    /**
     * This function returns the height needed for the footer. If in the given printContainerClass this has a fixed height, implement this function to avoid the execution of this base function, which calculates the height by drawing a fake document. 
     */
    containerFooterHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = this.fakeDoc.addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - this.printContainerFooter(page, pG)[1].positionY;
    }

    // implement what must be printed prior to pageBreak (e.g. "continued on next page")
    printPrePageBreak(page, pG){
        return [page, pG]; 
    }

    /**
     * This function returns the height needed for the prePageBreak stuff. If in the given printContainerClass this has a fixed height, implement this function to avoid the execution of this base function, which calculates the height by drawing a fake document. 
     */
    prePageBreakHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = this.fakeDoc.addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - this.printPrePageBreak(page, pG)[1].positionY;
    }

    // implement what must be printed after the pageBreak (e.g. repetition of a table header)
    printPostPageBreak(page, pG){
        return [page, pG];
    }

    /**
     * This function returns the height needed for the footer. If in the given printContainerClass this has a fixed height, implement this function to avoid the execution of this base function, which calculates the height by drawing a fake document. 
     */
    postPageBreakHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = this.fakeDoc.addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - this.printPostPageBreak(page, pG)[1].positionY;
    }


    // The root printing class shall simply override this function
    // showParentSeparator is true, when we do a page break at the beginning of this container, since then we might be/are between two children; TODO: how can we realize that we are not between two, but at the beginning? --> Handle that eventually in the pB function the child receives, where showParentSeparator can be fixed to false for the first item
    // showSeparatorHere will be true when the function on the parent is called, where the separator actually shall be shown.
    _pageBreak(page, pG, pB, showParentSeparator=false, showSeparatorHere=false){

        if (showSeparatorHere && this.childSeparatorBeforePageBreak){
            [page, pG] = this.printChildSeparator(page, pG);
        }

        // add whatever is needed from this container before the pageBreak
        [page, pG] = this.printPrePageBreak(page, pG)

        // call the pageBreak function of the next outer container; it will return the new pageGeometry (containing positionY and the heights of the footers)
        [page, pG] = pB(page, pG, showSeparatorHere=showParentSeparator);

        //let h = this.postPageBreakHeight(page, pG);
        //pG.positionY -= h;
        [page, pG] = this.printPostPageBreak(page, pG);

        return [page, pG];
    }


    // calculate and return the minimum height
    minimumHeight(){
        throw(`Function minimumHeight not implemented in class ${this.constructor.name}`);
    }

}

/**
 * This class serves as root container. It has no content itself, just some children. It handles the root pageBreak stuff. Typically, the only child will be the header/footer item.
 */
class printer extends printingGeneral {

    constructor(dataContainers, printInstantly=false){

        super();

        // dataContainers must be an array later on --> check this or make it an array with one element
        if (!Array.isArray(dataContainers)){
            dataContainers = [dataContainers];
        }

        // match data classes to print classes
        // TODO: move this into a configuration file eventually
        const dataToPrint = {
            dHeaderFooter: pHeaderFooter,
            dContest: pContest,
            dContestSheet: pContest,
            dSeries: pSeries,
            dPersonContestSheet: pPerson,
            dPerson: pPerson
        }

        // translate the data containers into printContainers; this can/must eventually be done recursively
        function loadPrintContainers(childrenDataContainers){

            let childrenPrint = [];

            for (let dc of childrenDataContainers){

                // try to find the matching printing class
                if (!(dc.constructor.name in dataToPrint)){
                    throw {code:5, message: `Cannot print since there is no print class specified for the data class ${dc.constructor.name}.`}
                }
                let pc = new dataToPrint[dc.constructor.name](dc)
                // recursively translate the children's data into print instances
                pc.children = loadPrintContainers(dc.children);
    
                childrenPrint.push(pc)
            }

            return childrenPrint
        }

        this.children = loadPrintContainers(dataContainers);
        
        // keep a list of all pages
        this.pages = [];

        // embed standard fonts (the actual adding is done at the end in the async function):
        this.fonts = {};

        // late drawings: keep a list of functions that are going to be called with 'this' as the parameter just before the document is saved/printed. This e.g. used to draw the total page number, which is not known before the end.
        this.lateDrawings = []; 

        // some stuff done int he constructor is async. Synce the constructor itself cannot be async, we put this in an async function and call it at the end of the constructor
        let asyncConstructor = async ()=>{

            // create a new document
            let doc = await PDFLib.PDFDocument.create();
            this.doc = doc;

            // reference the printer in the doc. Like this, every function gets access to e.g. lateDrawings.
            this.doc.printer = this;

            doc.setTitle('🥚 The Life of an Egg 🍳');
            doc.setAuthor('Humpty Dumpty');
            doc.setSubject('📘 An Epic Tale of Woe 📖');
            doc.setKeywords(['athletics', 'track and field', 'liveAthletics']);
            doc.setProducer('PDF App 9000 🤖');
            doc.setCreator('PDF App 9000 🤖');
            doc.setCreationDate(new Date());
            doc.setModificationDate(new Date());

            // provide a function to the pdfdocument to get a font
            // if the font is not available, it will return Helvetica regular
            this.doc.getFont = async (fontName)=>{
                // get or embed a font and return it
                if (fontName in this.fonts){
                    return this.fonts[fontName];
                }else {
                    // currently we assume it is a standard font:
                    /*Courier
                    CourierBold
                    CourierBoldOblique
                    CourierOblique
                    Helvetica
                    HelveticaBold
                    HelveticaBoldOblique
                    HelveticaOblique
                    Symbol
                    TimesRoman
                    TimesRomanBold
                    TimesRomanBoldItalic
                    TimesRomanItalic
                    ZapfDingbats
                    */
                    if (fontName in PDFLib.StandardFonts){
                        let font = await doc.embedFont(PDFLib.StandardFonts[fontName]);
                        this.fonts[fontName] = font;
                        return font;
                    } else {
                        console.log(`Font ${fontName} is not available. Using Helvetica instead.`)
                        return this.fonts['Helvetica'];
                    }
                    
                }
            }

            this.fonts.Helvetica = await doc.embedFont(PDFLib.StandardFonts.Helvetica);

            // prepare the height stuff
            this.getTotalHeight();
            this.getMinimumHeight();

            // instantly start printing:
            if (printInstantly){
                this.startPrint();
            }
        }

        asyncConstructor();

    } 

    processLateDrawings(){
        // run all late drawing functions. (These are e.g. to draw the total number of pages.)
        for (let f of this.lateDrawings){
            f(this); // this is the argument for the function, which actually is basically run in the context it was created in
        }
    }

    // open the pdf in a new tab
    async showNewTab(){
        this.processLateDrawings();
        const pdfBytes = await this.doc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        // show in new tab
        window.open(blobUrl, '_blank')
    }

    // show the pdf in an iframe
    async showIFrame(id){
        this.processLateDrawings();
        const pdfBytes = await this.doc.save();
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const blobUrl = URL.createObjectURL(blob);

        // show in iFrame
        document.getElementById(id).src = blobUrl;

    }

    startPrint() {
        // add a first page
        let [page, pG] = this.addPage();

        // print!
        this.print(page, pG, this._pageBreak);
    }
    
    // TODO: create this function for online usage as well, where the image would be e.g. the result from a XMLHttpRequest 
    async addLocalImage(path){
        return doc.attach(
            await PDFLib.fetchBinaryAsset(path),
            'bird.png',
            {
              mimeType: 'image/png',
              description: 'A bird in greyscale 🐦',
              creationDate: new Date('2006/06/06'),
              modificationDate: new Date('2007/07/07'),
              afRelationship: PDFLib.AFRelationship.Data,
            },
          );
    }

    addPage(){
        // TODO: get page size from the (translated) configuration file
        let p = this.doc.addPage(PDFLib.PageSizes.A4)
        this.pages.push(p);
        let pG = {
            positionY: PDFLib.PageSizes.A4[1], // TODO: get from pageSize[1]
            hPrePageBreakAll: 0,
            hPrePageBreakSplit: 0,
        }
        return [p, pG];
    }

    /**
     * Draw a row of a general table based on the setting given in conf.  
     * @param {object} conf The configuration for the table:
     * @param {number / array} conf.margin // analog css: either one value (all sides), two values (vertical, horizontal), three values (top, horizontal, bottom) or four values: (top, right, bottom, left)
     * @param {array} conf.columns // define the column sizes in points
     * @param {array} conf.linesVertical // define the vertical line widths; The lines are drawn at the exact positions between the columns, i.e. half of the line-width will be plotted on the left and half on the right. Make sure that the margin is large enough so that the content does not touch the line. must have one element more than columns
     * @param {array} conf.linesHorizontal // two entries: [topWidth, bottomWidth]. See also comment at linesVertical.
     * @param {number} conf.rowHeight the height of the row; null (default) if it shall be calculated automatically
     * @param {array} conf.cells storing the configuratrions for each cell; reference see inside function for printCell
     * @param {object} data Object with the data (typically of type dContainer)
     * @param {PDFPage} page The page to print on
     * @param {number} posY The y-position where to start drawing (i.e. the upper (!) end of the drawing)
     * @param {number} posX The x-position where to start drawing (i.e. the left end of the drawing)
     * @return {number} posY The y-position below the table
     */
    printTabularRow(conf, data, page, posX, posY){

        // evaluate margin
        let marginTop, marginRight, marginBottom, marginLeft;
        if (Array.isArray(conf.margin)){
            if (conf.margin.length==2){
                marginTop = conf.margin[0];
                marginRight = conf.margin[1];
                marginBottom = conf.margin[0];
                marginLeft = conf.margin[1];
            } else if (conf.margin.length==3){
                marginTop = conf.margin[0];
                marginRight = conf.margin[1];
                marginBottom = conf.margin[2];
                marginLeft = conf.margin[1];
            } else {
                marginTop = conf.margin[0];
                marginRight = conf.margin[1];
                marginBottom = conf.margin[2];
                marginLeft = conf.margin[3];
            }
        } else {
            marginTop = conf.margin;
            marginRight = conf.margin;
            marginBottom = conf.margin;
            marginLeft = conf.margin;
        }
        let rowHeight = conf.rowHeight ?? null;

        // TODO: translating function
        let translate = (untranslated)=>{
            return untranslated;
        }

        /**
         * print a single cell, following the extensive configuration in cellConf
         * @param {object} cellConf The configuration for the cell centent. The actual text content is given by the concatenation of bare text ("t" or "text"), translated text ("tt" or "translatedText") and data property values ("p" or "prop"). All of them can be an array (also with empty items). The concatenation will be made like this: t[0]+tt[0]+p[0] + t[1]+tt[1]+p[1] + ...; if a property is not an array, it will be repeated in every loop (while the loop length is defined by the longest array). If one array is shorter than an other, the "missing" elements at the end are simply treated as empty. 
         * Content is fitted as follows: 
         * If a text is too long for the present space, fitting text works as follows:
         * 1. reduce the margin down to maxHorizontalScale*margin (at max)
         * 2. horizontally scale the text down to maxHorizontalScale (at max)
         * 3. if both options did not lead to a fitting text, apply one of four strategies defined by noFitStrategy:
         *    - cut (default): cut the text that does not fit and add a period at the end
         *    - overrun: simply do not care and overrun the available space
         *    - wordWrap: (attention: do not use when the height of the cell is predefined!) does word wrapping between words and at "-". If a single word does not fit the line, then it is automaticaly horizontally scaled to fit. (Margin and font size are not reduced since it would look overly ugly together with the other regular lines.)
         *    - scale: scale the font-size to make it fit.
         * @param {string / array} cellConf.t Untranslated text(s)
         * @param {string / array} cellConf.text alias for cellConf.t
         * @param {string / array} cellConf.tt Text(s) that will be translated before showing
         * @param {string / array} cellConf.translatedText alias for cellConf.tt
         * @param {string / array} cellConf.p The name(s) of proeprty/ies in the data object that shall be shown.
         * @param {string / array} cellConf.prop alias for p
         * @param {number} cellConf.ms maximum margin scale (<=1), default=1 (i.e. no scaling)
         * @param {number} cellConf.maxMarginScale alias for ms
         * @param {number} cellConf.hs maximum horizontal scaling (<=1), default=1 (i.e. no scaling)
         * @param {number} cellConf.maxHorizontalScale alias for hs
         * @param {number} cellConf.nf strategy when applying the margin and horiztontal scaling was not enough to fit the text. One of: "cut" (default), "overrun", "wordWrap", "scale" (see above for details)
         * @param {string} cellConf.noFitStrategy alias for nf
         * @param {string} cellConf.alignmentV vertical alignment. Only evaluated if rowHeight is not null. One of: "T" (top), "C" (center, default), "B" (bottom)
         * @param {string} cellConf.alignmentH horizontal alignment. One of: "L" (left, default), "C" (center), "R" (right)
         * @param {string} cellConf.font The name of the font. Default is Helvetica regular. See TODO for available fonts.
         * @param {number} cellConf.size The font size. Default=12
         * @param {number} cellConf.lineHeight the line height, as a multiplicator with size. Default=1.2. Only evaluated with wordWrap.
         * @param {number} posX2 Left position of the cell
         * @param {number} posY2 Top position of the cell
         * @param {number} sizeX width of the cell
         * @returns {number} height of the cell
         */
        let printCell = (cellConf, posX2, posY2, sizeX)=>{
            let ms = cellConf.maxMarginScale ?? (cellConf.ms ?? 1);
            let hs = cellConf.maxHorizontalScale ?? (cellConf.hs ?? 1);
            let nf = cellConf.noFitStrategy ?? (cellConf.nf ?? 'cut');
            let alignmentV = cellConf.alignmentV ?? 'C';
            let alignmentH = cellConf.alignmentH ?? 'L';
            let size = cellConf.size ?? 12;
            let lineHeight = cellConf.lineHeight ?? 1.2;
            
            // create the text to show, which is a concatenation of eventually multiple parts of untranslated text, translated text and properties in data

            // get the relevanet of the two possible names of the property
            let t = cellConf.t ?? (cellConf.text ?? '');
            let tt = cellConf.tt ?? (cellConf.translatedText ?? '');
            let p = cellConf.p ?? (cellConf.prop ?? '');

            let tArr = Array.isArray(t);
            let ttArr = Array.isArray(tt);
            let pArr = Array.isArray(p)

            let totalLength = 1;
            if (tArr){
                totalLength = Math.max(t.length, totalLength);
            }
            if (ttArr){
                totalLength = Math.max(tt.length, totalLength);
            } else {
                var staticTranslatedText = translate(tt);
            }
            if (pArr){
                totalLength = Math.min(p.length, totalLength);
            }

            // create the text as a combination of untranslated text, translated text and data values (in this order)
            let text;
            for (let i=0; i<totalLength; i++){
                // combine the text:
                // untranslated text 
                if (tArr){
                    if (t.length>i){
                        text += t[i];
                    }
                } else {
                    // just some text, repeated in every loop
                    text += t;
                }
                // translated text 
                if (ttArr){
                    if (tt.length>i){
                        text += translate(tt[i]);
                    }
                } else {
                    // just some text, repeated in every loop
                    text += staticTranslatedText;
                }
                // property values
                if (pArr){
                    if (p.length>i){
                        text += data[p[i]];
                    }
                } else {
                    // just some text, repeated in every loop
                    text += data[p];
                }
            }

            // prepare the options object for drawText
            let opts = {
                size: size,
                lineHeight: lineHeight,
                // ...
            };
            let f;
            if (cellConf.font){
                f = this.doc.getFont(cellConf.font);
            } else {
                f = this.doc.getFont('Helvetica');
            }
            opts.font = f;

            // vertical position (will be adapted for each line on word wrap):
            if (rowHeight){
                // apply the alignment
                if (alignmentV.toUpperCase() == 'C'){
                    opts.y = posY2 - marginTop - (rowHeight - marginTop - marginBottom - size)/2;
                } else if (alignmentV.toUpperCase() == 'T'){
                    opts.y = posY2 - marginTop - size;
                } else {
                    opts.y = posY2-rowHeight+marginBottom;
                }
            } else {
                opts.y = posY2 - marginTop - size; // negative since the origin is on the bottom
            }

            // the text is printed now
            // check if the text fits the space without any change
            let widthUnscaled = f.widthOfTextAtSize(text);
            let marginScaleApplied = 1;

            // actually available space for the text, i.e. the total size minus the margins (will be updated if the margins are reduced)
            let sizeX2 = sizeX - marginLeft - marginRight;

            if (ms<1 && widthUnscaled > sizeX2 ){
                // apply the margin scaling to the extent that is allowed
                // calculate how much the margin would have to be scaled to make it fit (can get negative) and then limit
                // sizeX - scale*(marginLeft+marginRight) = widthUnscaled
                let scale = (sizeX-widthUnscaled)/(marginLeft+marginRight);
                marginScaleApplied = Math.max(ms, scale);

                // alignment does not matter, since it is filled anyway: 
                opts.x = posX2 + marginLeft*marginScaleApplied;

                // calculate the new actually available space for the text
                sizeX2 = sizeX - (marginLeft + marginRight)*marginScaleApplied;
            } else {
                // apply the alignment
                if (alignmentH.toUpperCase() == 'C'){
                    opts.x = posX2 + marginLeft + (sizeX2 - widthUnscaled)/2;
                } else if (alignmentH.toUpperCase() == 'R'){
                    opts.x = posX2 + sizeX - marginRight - widthUnscaled;
                } else {
                    opts.x = posX2 + marginLeft;
                }
            }

            let textScaleApplied = 1;
            if (hs<1 && widthUnscaled > sizeX2){
                // apply the horizontal scaling
                // scale*widthUnscaled = sizeX - marginScaleApplied*(marginLeft+marginRight) = sizeX2
                let scale = sizeX2/widthUnscaled;
                textScaleApplied = Math.max(scale, hs);
                opts.horizontalScale = textScaleApplied *100; // in %
            }

            // in general it will take only one line, but we might need word wrap
            let lines = 1;

            if (widthUnscaled*textScaleApplied > sizeX + marginScaleApplied*(marginLeft+marginRight)){
                // still no fit... apply one of the four strategies
                if (nf == 'overrun'){
                    // simply plot the text and do not care about the overrun
                    page.drawText(text, opts);

                } else if (nf == "wordWrap") {
                    // do some word wrapping!

                    // since we count the lines as we write them, we have to start counting at zero
                    lines = 0;

                    // split after every " " and "-" 
                    let re = /([ -])/; // split at any of the elements within [] (e.g. " " and "-") and keep the elements in the results as well (parantheses)
                    let textParts = text.split(re);

                    // now try to combine as many parts as possible and print them
                    let start = 0;
                    let end = 1;
                    let textMergedBefore = '';
                    for (end; end<=textParts.length; end++){
                        let textMerged = textParts.slice(start, end).join('').trim(); // trim makes sure that a space at the end/beginning is not considered
                        if (f.widthOfTextAtSize(textMerged)*textScaleApplied > sizeX2) {
                            // current part does not fit...
                            lines += 1;
                            opts.y = posY2 - marginTop - size*(1 + (lines-1)*lineHeight);
                            if (start+1==end){
                                // if we only have one element, then we have to plot it anyway, and simply do some (eventually additional) horzontal scaling to make that single word fit
                                let origScale = opts.horizontalScale; // since we change the original opts object, we have to reset the value later!
                                opts.horizontalScale *= sizeX2/(f.widthOfTextAtSize(textMerged)*textScaleApplied); // scale
                                page.drawText(textMerged, opts);
                                opts.horizontalScale = origScale; // reset to actual scaling
                                start = end;
                            } else {
                                // print without the current, but the previous parts
                                page.drawText(textMergedBefore, opts);
                                start = end-1;
                            }
                        }
                        textMergedBefore = textMerged;
                    }
                    // at the end, print the rest, if it is not yet printed (it is already printed if the last textPart does not fit and then start==end)
                    if (start<end){
                        page.drawText(textMergedBefore, opts);
                        lines += 1;
                    }

                } else if ( nf == "scale"){
                    // scale the font size
                    opts.size = opts.size*(sizeX + marginScaleApplied*(marginLeft+marginRight))/(widthUnscaled*textScaleApplied);
                    page.drawText(text, opts);

                } else {
                    // "cut" and any invalid noFit names lead here
                    // cut the text and add a period at the end
                    for (let l=text.length; l>0; l--){
                        // check whether it fits already
                        if (f.widthOfTextAtSize(text.slice(0,l)+".")*textScaleApplied < sizeX + marginScaleApplied*(marginLeft+marginRight)){
                            page.drawText(text.slice(0,l), opts);
                            break;
                        }
                    }

                }

            }

            // return the required height for this cell
            return opts.size*(1 + (lines-1)*opts.lineHeight) + marginTop + marginBottom; 

        }
        
        // print content=cells
        let totalHeight = 0;
        for (let i=0; i< conf.columns.length ; i++){
             
            let cell = conf.cells[i];
            if (cell){
                // print single cell
                let posX2 = posX + conf.columns.slice(0,i).reduce((val, oldVal)=>val+oldVal, 0); 
                totalHeight = Math.max(totalHeight, printCell(cell, posX2, posY, conf.columns[i], rowHeight));
            }
        }

        // draw horizontal lines
        let totalWidth = conf.columns.reduce((val, valOld)=>val+valOld, 0);
        if (conf.linesHorizontal[0]>0){
            // top line
            let opt = {
                start: {x:posX, y:posY},
                end: {x:posX + totalWidth, y:posY},
                thickness: conf.linesHorizontal[0]
            }
            page.drawLine(opt);
        }
        if (conf.linesHorizontal[1]>0){
            // bottom line
            let opt = {
                start: {x:posX, y:posY-totalHeight},
                end: {x:posX + totalWidth, y:posY-totalHeight},
                thickness: conf.linesHorizontal[0]
            }
            page.drawLine(opt);
        }

        // print vertical lines
        for (let i=0; i<conf.linesVertical.length; i++){
            let thickness = conf.linesVertical[i];
            if (thickness>0){
                let posX2 = posX + conf.columns.slice(0,i).reduce((val, valOld)=>val+valOld, 0);
                let opt = {
                    start: {x:posX2, y:posY},
                    end: {x:posX2 + totalWidth, y:posY-totalHeight},
                    thickness: thickness
                }
                page.drawLine(opt);
            }
        }
    }

    // "downloads" the document
    /*save(){
        // TODO: provide options so that we can also just show it 
        return this.doc.save()
    }*/

    // overwrite the pageBreak-stuff to actually create the pageBreak
    _pageBreak(page, pG){
        return this.addPage();
    }
}

class pHeaderFooter extends printingGeneral{
    
    // implement the header and footer
    // eventually we will implement here also the creation of the pdf document

    constructor(){
        super();
        
        // keep track of the current page
        this.currentPage = 0;

    }

    printContainerHeader(page, pG){

        this.currentPage += 1;

        // create a string with the current date and time
        let d = new Date();
        let dString = `${d.getDate().toString().padStart(2,'0')}.${d.getMonth().toString().padStart(2,'0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;

        // three virtual columns for the header
        let conf = {
            margin:11,
            columns:[198.3, 198.3, 198.3],
            //linesVertical
            //linesHorizontal
            rowHeight: null,
            cells: [
                {
                    alignmentH:'L', 
                    t: "The meeting name TODO",
                    size: 10,
                    font: 'HelveticaBold',
                },
                {
                    alignmentH:'C',
                    size: 10,
                    font: 'HelveticaBold',
                },
                {
                    alignmentH:'R',
                    t: dString,
                    size: 10,
                    font: 'HelveticaBold',
                }
            ]
        }
        let height = page.doc.printer.printTabularRow(conf, {}, page, 0, pG.positionY);
        console.log(`Should be 32: ${height}`)
        pG.positionY -= height;  // should be 32

        return [page, pG];
    }

    printContainerFooter(page, pG){
        page.drawText(`This is the footer`, {
            y: 25,
            x: 11,
            size: 10,
            lineHeight: 20, // what does lineHeight do actually when we set the y coordinate anyway manually? 
            //  renderingMode: TextRenderingMode.Outline,
        })

        let currentPage = this.currentPage; // at the time of printing, this.currentPage will be the total number of pages.
        page.doc.printer.lateDrawings.push((printer)=>{
            let numPages = printer.pages.length;
            page.drawText(`Page ${currentPage} of ${numPages}`, {
                y: 25,
                x:500,
                size: 10,
                lineHeight: 20, // what does lineHeight do actually when we set the y coordinate anyway manually? 
                //  renderingMode: TextRenderingMode.Outline,
            })
        })

        pG.positionY -= 25;

        return [page, pG];
    }

    printPrePageBreak(page, pG){
        return this.printContainerFooter(page, pG);
    }

    printPostPageBreak(page, pG){
        return this.printContainerHeader(page, pG);
    }

    containerFooterHeight(){
        return 32;
    }
    containerHeaderHeight(){
        return 32;
    }
    prePageBreakHeight(){
        return this.containerFooterHeight();
    }
    postPageBreakHeight(){
        return this.containerHeaderHeight();
    }
}

class pContest extends printingGeneral {
    
    constructor (data){
        super()

        this.data = data;

    }

    printContainerHeader(page, pG){
        // print contest name, time, catagory etc
        page.drawText(`${this.data.datetimeStart}`, {x: 30, y:pG.positionY-20})

        // print information about using the paper
        page.drawText(`-1: nicht angetreten, -2: aufgegeben, ...`, {x:30, y:pG.positionY-40})

        pG.positionY -= 50;

        return [page, pG];
    }

    containerHeaderHeight(){
        return 50;
    }


    printChildSeparatorPrePageBreak(page, pG){
        page.drawText('Further series on next page...', {x:30, y: pG.positionY-18})
        pG.positionY -= 20;

        return [page, pG];
    }

    childSeparatorPrePageBreakHeight(){
        return 20;
    }
}

class pSeries extends printingGeneral {
    constructor(data){
        super()

        this.data = data;

        // all children must be on one page
        this.minimumChildrenPrint = null;
    }

    printContainerHeader(page, pG){
        // draw the name+number of the series, run-ID etc

        let size = 11;
        let margin = 3;

        let text = '';
        if (this.data.name){
            text = 'Serie '+this.data.name;
        } else {
            text = `Serie ${this.data.number}`;
        }
        page.drawText(text, {x:30, y: pG.positionY-margin-size})

        // draw the the header for the table
        pG.positionY -= 30;
        page.drawText('Name', {x:30, y: pG.positionY+margin, size})
        page.drawRectangle({x:30, y: pG.positionY, width:300, height:15, opacity:0, borderWidth:1})

        // temporary
        pG.positionY -= 150;
        return [page, pG]
    }

     // we have a fixed height, so we avoid calculating the height by defining this function
    /*containerHeaderHeight(){
        return 30; 
    }*/

    printPostPageBreak(page, pG){
        // just repeat the regular header stuff
        return this.printContainerHeader(page, pG);
    }

    postPageBreakHeight(){
        // just repeat the regular header stuff
        return this.containerHeaderHeight();
    }

    printChildSeparatorPrePageBreak(page, pG){
        // if the series would be breakable, we would implement here a text like "series continues on next page"
        return [page, pG];
    }
}

class pPerson extends printingGeneral {
    constructor(data){

        super();

        this.data = data;

        // this shall have no children!
    }

    printContainerHeader(page, pG){
        // the total height will finally be dependent on the number of lines required

        let margin = 3;
        let lineHeight = 1.2;
        let size = 11;

        let lines = 1;

        let y = pG.positionY - margin - size;

        // print it
        page.drawText(`${this.data.lastname} ${this.data.firstname}`, {x:30, y:y, size})
        page.drawText(`${this.data.year2}`, {x:80, y:y, size})
        page.drawText(`${this.data.country}`, {x:100, y:y, size})
        // ...

        let totalHeight = size*(1 + (lines-1)*lineHeight) + 2*margin;

        // draw the lines around it (we cannot draw this before wince we do not know the number of lines used) 
        // for testing just draw a trectangular around everything

        page.drawRectangle({x:30-margin, y:pG.positionY-totalHeight, width: 300, height: totalHeight, opacity:0, borderWidth:1})

        pG.positionY -= totalHeight;

        return [page, pG];
    }
}


/**
 * dContainer: general container keeping data-content and childs structured
 */
class dContainer {
    
    constructor(){
        
        // keep a list of all child elements
        this.children = [];

        // the content of this container shall be implemented as properties directly

    }

    /**
     * method to sort the children of the container by a certain property
     * @param {string} property The property in the content of each child to be sorted by.
     * @param {boolean} inverse set to true for DSC sorting, false is the standard ASC sorting
     */
    sortChildren(property, inverse=false){
        this.children.sort((a,b)=>{
            let i = inverse ? -1 : 1;
            if (a[property] > b[property]){
                return 1*i;
            }
            if (a[property] < b[property]){
                return -1*i;
            }
            return 0;
        })
    }
}

class dHeaderFooter extends dContainer {
    // keep content of the header and footer and ev. keep the settings for the header/footer

    constructor(children){

        super();
        this.children = children;
    }
}

/**
 * Provide information about the competition to be printed
 */
class dContestSheet extends dContainer {

}

class dPerson extends dContainer {

    /**
     * Create a person object just from the information given in the startgroup
     * @param {object} startGroup The startgroup object containing all information (name, firstname, club, etc) for each seriesStartResult in one object
     */
    static of (startGroup){
        return new dPerson(startGroup.athleteName, startGroup.athleteForename, startGroup.bib, startGroup.birthdate, startGroup.country, startGroup.regionShortname, startGroup.clubName, startGroup.eventGroupName, startGroup.xDiscipline)
    }
    
    constructor (lastname, firstname, bib, birthdate, country, regionShortname, clubName, eventGroupName, xDiscipline){
        super()
        
        this.lastname = lastname;
        this.firstname = firstname;
        this.bib = bib;
        this.birthdate = birthdate;
        this.country = country;
        this.regionShortname = regionShortname;
        this.clubName = clubName;
        this.eventGroupName = eventGroupName;
        this.xDiscipline = xDiscipline; // of interest e.g. when different shot put weights are competing in one contest (i..e different discipline, but same baseDiscipline)
        

        // this container probably will have no childs.
    }

    /**
     * Return the age this person has today. (Attention: this is not related to the day of the competition, but to the date of using this function  )
     */
    get ageToday(){
        let d1 = new Date(this.birthdate);
        let d2 = new Date();

        let correction = 0;
        if (d2.getUTCMonth()<=d1.getUTCMonth() && d2.getUTCDate()<d1.getUTCDate()){
            // no birthday this year yet
            correction = 1;
        }

        return d2.getUTCFullYear() - d1.getUTCFullYear() - correction;
        
    }

    get year2(){
        return this.birthdate.slice(2,2);
    }

    get year4(){
        return this.birthdate.slice(0,4);
    }
}

/**
 * Extends the pPerson class by the properties needed to print a contestSheet (should work for track, techLong and techHigh)
 */
class dPersonContestSheet extends dPerson {

    /**
     * Create a personContestSheer object just from the information given in the startgroup and in the seriesstartresult
     * @param {object} startGroup The startgroup object containing all information (name, firstname, club, etc) for each seriesStartResult in one object
     * @param {object} ssr The seriesStartResult object, containing position and lane (=startConf)
     */
    static of (startGroup, ssr){
        return new dPersonContestSheet(startGroup.athleteName, startGroup.athleteForename, startGroup.bib, startGroup.birthdate, startGroup.country, startGroup.regionShortname, startGroup.clubName, startGroup.eventGroupName, startGroup.xDiscipline, ssr.position, ssr.startConf)
    }

    constructor (lastname, firstname, bib, birthdate, country, regionShortname, clubName, eventGroupName, xDiscipline, position, startConf=null){
        super(lastname, firstname, bib, birthdate, country, regionShortname, clubName, eventGroupName, xDiscipline)
        this.position = position;
        this.startConf = startConf;
    }
}


class dSeries extends dContainer {

    static of(series, startgroups){
        let cSeries = new dSeries(series.xSeries, series.status, series.number, series.name, series.heights, series.xSite, series.seriesstartsresults);

        // add each person in this series. Get the necessary information from the startgroup
        for (let ssr of series.seriesstartsresults){
            // try to find the startgroup corresponding to SSR
            let SG = startgroups.find(sg=>sg.xStartgroup==ssr.xStartgroup)
            if (SG){
                let p = dPersonContestSheet.of(SG, ssr)
                cSeries.children.push(p);
            } else {
                // TODO: replace by correct logging!
                console.log(`Could not find the person for the seriesStart ${ssr.xSeriesStart}. Printing not possible.`)
                throw {code:5, message:`Could not find the person for the seriesStart ${ssr.xSeriesStart}. Printing not possible.`}
            }
        }

        // sort the persons by their position
        cSeries.sortChildren('position');

        return cSeries;
    }

    constructor(xSeries, status, number, name, heights, xSite, SSR){

        super()

        this.xSeries = xSeries; 
        this.status = status;
        this.number = number;
        this.name = name;
        this.heights = heights;
        this.xSite = xSite;
        this.SSR = SSR;
        // the children are the single persons
    }
}

/**
 * class to store the information about a contest; childs can be e,g. the series
 */
class dContest extends dContainer{

    /**
     * Create a contest object from the data present in any contest
     * @param {object} contest The contest object including all series etc.
     * @param {array} series Array storing all series 
     * @param {array} startgroups Array with all additional information (name, firstname, event, etc) for each startgroup=seriesStartResult
     * @param {integer} xSeries The series to show. Null means that all series are printed. default=null 
     */
    static of(contest, series, startgroups, xSeries=null){
        let cContest =  new dContest(contest.datetimeAppeal, contest.datetimeCall, contest.datetimeStart, contest.status, contest.conf);

        // create each series-container and add it to the contest
        for (let s of series){
            if (xSeries==null || s.xSeries == xSeries){
                let s2 = dSeries.of(s, startgroups);
                cContest.addSeries(s2);
            }
        }
        cContest.sortSeries('number')
        return cContest
    }

    constructor(datetimeAppeal=new Date(), datetimeCall=new Date(), datetimeStart=new Date(), status=10, conf=null, baseDiscipline=''){

        super()
        // content obviously similar to the contest table in the DB

        this.datetimeAppeal= datetimeAppeal;
        this.datetimeCall= datetimeCall;
        this.datetimeStart= datetimeStart;
        this.status= status;
        this.conf= conf;
        this.baseDiscipline= baseDiscipline;
        // TODO: list of groups with the groupnumber, round, eventGroup, events, info-fields, ...
        

        // the children are the series
    };

    addSeries(series){
        this.children.push(series);
    }

    sortSeries(property, inverse=false){
        this.sortChildren(property, inverse)
    }

    // TODO: provide some time-nice-printing functions here
}

function printContest(){
    let cContest = dContest.of(vueSeriesAdminTech.contest, vueSeriesAdminTech.series, vueSeriesAdminTech.startgroups, null)
    let hf = new dHeaderFooter([cContest]);
    let p = new printer([hf], true)
    setTimeout(()=>{

        // add the page number in a rather strange way, by directly replacing a placeholder in the content stream as a hex word. Please note that with that approach the text will not be aligned correctly when the alignment is not left, since the original alignment done in some function was based on the placeholder and not the replaced string.
        // To increase speed, we could not try to replace a part of a string (which requires searching all strings for the given needle), but instead simply replace a shole string, which only requires the comparison of full strings and a replacement whenever needed. 

        // encode the string to be replaced 
        let placeholder = p.fonts.Helvetica.encodeText('{The number of pages}')

        // encode replacement string 
        let replacer = p.fonts.Helvetica.encodeText('Page X of Y')

        for (let iO of p.doc.context.indirectObjects.values()){ // indirectObjects is a MAP
            // only further consider PDF content streams and Tj operators
            if (iO.constructor.name == 'PDFContentStream'){
                for (let oP of iO.operators){
                    if (oP.name==='Tj'){
                        // this is a text operator
                        // now search for the encoded text and replace it
                        // args of Tj have always only one element
                        oP.args[0].value = oP.args[0].value.replace(placeholder.value, replacer.value);
                    }
                }
            }
        } 
        // Tested. Works. (But this is certainly not the best approach.)

        p.showNewTab()

    }, 100)

    return p
}

// printing a contest
// create the data-container for the contest
//const cContest = dContest.of(contest, series, startgroups, null)

// now print it
//p = new printer(cContest)