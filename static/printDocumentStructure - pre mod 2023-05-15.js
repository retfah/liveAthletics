
/**
 * CHANGES:
 * - move the height check into the children-loop of the parent
 * - async
 */

/**
 * This document presents classes to store the content of a document to be printed in a structured way. The idea is that the actual printer (e.g. to pdf) has an equivalent to each of those classes and knows how to print them and where and how page breaks are allowed, optimizing to look of the page. 
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
 * How translations work:
 *   - on the server there is a special path that returns the translated printing configuration file confPrint.js (only the needed language, which will be "calculated" on the fly from the print configuration file on the server which stores all languages. ) Like this we can also have a default print-configuration-file for languages or even just parts of the configuration file where a specific language does not have its own definition.
 *   - on the client the import is like <script type="text/javascript (or module)" src="/printConf<%- _lang %>.js" /> 
 *   - The server can simply work on the full configuration file
 *   - we cannot simply make this file ejs, because we cannot parse it for execution on the server; So, we must implement some translation function on our own. eventually we resign here from using i18n and create our own code; probably requiring that we man
 **/

// TODO: do we handle cases where it is not possible to fit the container on one page, but we do "not allow" page breaks?
// i..e even when we prefer to have a container start on the next page than beeing split, we still must be able to handle cases where the full container does not fit the page!

/**
 * Procedure for printing:
 * prior:
 * 0) Create the data structure
 * During printing TODO revise with latest version!!!:
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

/**
 * printingGeneral:
 * - provides a base class, from which every actual printing container implementation shall inherit and overwrite the print functions for the various parts of the container
 * 
 * every container may consist of the following printed parts, printed in the following order:
 * - a container "header" (actually this is probably the main content), which is printed before the children
 * - <child containers>
 * - a separator between childs
 * - <if a page break is needed between two childs>:
 *   - a special separator between childs, when there will be a page break in between two childs
 *   - pre-page-page content (e.g "continued on next page")
 *   - post-page-break content (e.g. in tables a repetition of the header row)
 * - a container "footer" 
 * Note: the special child separator between two childs (childSeparatorPrePageBreak) can NOT be implemented in the pre-page-break content! The difference is that the prePageBreak stuff also gets printed when the new page is added by one of our childs, i.e. within one of our childs and not between two of our childs, while the childSeparatorPrePageBreak obviously is only printed when the new page is created by this container.
 * 
 * TODO: what happens if a container does not allow child break, but also does not fit on one page?
 */

// Try to create a base class for printing (no optimization done):
export class printingGeneral {
    

    // heightAvailAll is given by the space of the previous container minus its mandatory stuff before AND after this container
    // heightAvailSplit is given by the space of the previous container minus its mandatory stuff before AND after this container AND minus the stuff that comes after when the child is split

    /**
     * 
     */
    constructor(conf, data){

        // the print configuration
        this.conf = conf,
        this.data = data,

        this.children = []; // analog to the children property of the data structure
        this._minChildHeight = []; // the minimum height of each child; will be filled on first use (or we fill it here already)
        this._totalChildHeight = []; // the total height of each child; will be filled on first use (or we fill it here already)

        this.minimumChildrenPrint = 0; // how many children (their total height!) shall be considered for the minimum height calculation; null if all must be printed (if all children must be printed, also the footer of this container is included, i.e. minimumHeight=totalHeight)

        this.pageBreakStart = false;
        this.pageBreakEnd = false;
        this.pageBreakAfterNChildren = 0; // 0 = never
        // not implemented yet:
        this.allowPageBreakBeforeFooter = false; // allow to have a page break between the last child element and the container footer. 

        // every print page may have the following parts: 
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
        this._fakeDoc = null;
        this._fakeDocFonts = {}; 


    }

    // attention: this returns a promise!
    // required e.g. to calculate the total height of a container by "printing" on a fake document with infinitely high paper (so that there is not page break) 
    get fakeDoc(){
        let ret = async ()=>{
            if (this._fakeDoc){
                return this._fakeDoc;
            } else {
                let f = await PDFLib.PDFDocument.create();

                // create the default font:
                this._fakeDocFonts.Helvetica = await f.embedFont(PDFLib.StandardFonts.Helvetica);

                // add the function to get a font
                // provide a function to the pdfdocument to get a font
                // if the font is not available, it will return Helvetica regular
                f.getFont = async (fontName)=>{
                    // get or embed a font and return it
                    if (fontName in this._fakeDocFonts){
                        return this._fakeDocFonts[fontName];
                    }else {
                        // currently we assume it is a standard font:
                        if (fontName in PDFLib.StandardFonts){
                            let font = await f.embedFont(PDFLib.StandardFonts[fontName]);
                            this._fakeDocFonts[fontName] = font;
                            return font;
                        } else {
                            console.log(`Font ${fontName} is not available. Using Helvetica instead.`)
                            return this._fakeDocFonts['Helvetica'];
                        }
                        
                    }
                }

                this._fakeDoc = f;
                return f;
            }
        }
        return ret();
    }

    // get a fake page geometry, with "infinity" space left and no space needed for prePageBreaks
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
    async print(page, pG, pageBreak, isNewPage=false){

        // // remaining usable height if this container does NOT span multiple pages 
        // let hAvailAll = pG.positionY - pG.hPrePageBreakAll;
        // // remaining usable height if this container reaches multiple pages (containing the prePageBreakHeight of the parent and its parents etc)
        // let hAvailSplit = pG.positionY - pG.hPrePageBreakSplit;

        // print the header
        [page, pG] = await this.printContainerHeader(page, pG);
        
        // print all children
        for (let i=0; i<this.children.length; i++){
            
            let child = this.children[i];

            // check whether the child fits; otherwise add a page break before;
            // the fit can either be: 
            // - all remaining childs will fit on the current remaining page (no need to consider the prePageBreak stuff to check the residual height)
            // - the minimum height of the current child fits the current remaining page (considering that there will be a page break after (which required the prePageBreakSpace (plus the child separator for prepagebreak)))

            // calculate the space we still have for the remaining children
            // NOTE: if all children fit, no further prePageBreakHeight must be considered; if they do not fit, we have to make sure that this is already considered
            //let remainingHeightAssumingNoPageBreak = pG.positionY - pG.hPrePageBreakAll;
            //let remainingHeightWithPageBreakNeededWithinContainer = pG.positionY - pG.hPrePageBreakSplit - this.prePageBreakHeight;
            
            // calculate the height that would be needed to fit all remaining (including the current one) children here
            // 2023-05: TODO: shouldnt this use the total height of the children?
            let hAll = 0;
            for (let i2=i; i2<this.children.length; i2++){
                hAll += (await this.minChildHeight)[i];
                // no separator at the end
                if(i2+1<this.children.length){
                    hAll += await this.childSeparatorHeight();
                }
            }

            let fitsAll = pG.positionY - pG.hPrePageBreakAll - (await this.containerFooterHeight()) >= hAll;
            
            // do pageBreaks and separators
            if (!fitsAll){
                // check if a page break is needed right now (i.e. when the current child's min height does not fit)
                if (pG.positionY - pG.hPrePageBreakSplit - (await this.minChildHeight)[i] < 0){
                    // create a page break
                    if (i>0){
                        [page, pG] = await this.printChildSeparatorPrePageBreak(page, pG);
                    }

                    [page, pG] = await this._pageBreak(page, pG, pageBreak)
                } else {
                    if (i>0){
                        [page, pG] = await this.printChildSeparator(page, pG);
                    }
                }
            } else {
                if (i>0){
                    [page, pG] = await this.printChildSeparator(page, pG);
                }
            }

            // prepare the pageBreak function for the child
            // TODO: I think the separator is actually not needed anymore
            let pB = async (page, pG, showSeparatorHere=false)=>{
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
            pGChild.hPrePageBreakAll = (fitsAll ? pG.hPrePageBreakAll : pG.hPrePageBreakSplit) + (await this.containerFooterHeight());
            pGChild.hPrePageBreakSplit = (fitsAll ? pG.hPrePageBreakAll : pG.hPrePageBreakSplit) + (await this.containerFooterHeight()) + (await this.prePageBreakHeight());

            // print the child
            [page, pG] = await child.print(page, pGChild, pB)

            // create a new page after n-children, but not at the beginning or at the end:
            if (i>0 && (i+1) % this.pageBreakAfterNChildren==0 && i+1<this.children.length){
                [page, pG] = await this.printChildSeparatorPrePageBreak(page, pG);
                [page, pG] = await this._pageBreak(page, pG, pageBreak);
            }
            
        }

        // is there enough space for the footer? 
        if (pG.positionY - pG.hPrePageBreakAll - (await this.containerFooterHeight())<0){
            // need a new page (no separators here)
            [page, pG] = await this._pageBreak(page, pG, pageBreak);
        }
        
        
        [page, pG] = await this.printContainerFooter(page, pG);

        if (this.pageBreakEnd){
            [page, pG] = await this._pageBreak(page, pG, pageBreak);
        }

        // return the current position; actually the parent must also know whether a pageBreak was just done, but that info is given by child.pageBreakEnd
        return [page, pG];
    }

    // the total height only relates to the theoretical total height, not including any possibly needed page breaks (i.e. the height that it would take on an infinitely long paper)
    // this is what is needed in the checks during print.
    async getTotalHeight(){
        // if not calculated yet, calculate it for every child.
        /*if (this.children.length>0 && this.totalChildHeight.length==0){
            this.totalChildHeight = this.children.map((c)=>c.getTotalHeight())
        }*/
        let sepHeight = 0
        if (this.minimumChildrenPrint>1){
            sepHeight += (this.minimumChildrenPrint-1)*(await this.childSeparatorHeight()) + sepHeight;
        }

        // TODO: do we need to include here the prePageBreakHeight, if we have a mandatory pageBreak at the end?
        // I assume yes
        return (await this.containerHeaderHeight()) + (await this.containerFooterHeight()) + (await this.totalChildHeight).reduce((tempSum, val)=>val+tempSum, 0) + sepHeight + this.pageBreakEnd*(await this.prePageBreakHeight());
    }

    // might be overriden in a different way by the inheriting class
    // returns the minimum required height to print this container. If breaks are allowed between children, this is the height of the container header, the minimum number of childs to print (including the separators) and the prePageBreakHeight. If all children must be printed it is the total height of the container.
    async getMinimumHeight(){

        if (this.minimumChildrenPrint == null){
            // all children must be fully printed, also the footer of this container is printed then, i.e. the minimum height is the total height
            return this.getTotalHeight();

        } else if (this.children.length==0){
            // only the header of this container is mandatory
            return this.containerHeaderHeight();

        } else if (this.minimumChildrenPrint == 0){
            // if miniumChildrenPrint == 0 then make sure that at least the minimum height of the first child (if present) can be printed!
            let hMin = (await this.minChildHeight)[0];
            
            // in addition to the minimum height of the first child there are two possibilities:
            // A) the totalHeight of the child would take less space than the the height of the prePageBreakHeight here, then let the child be fully printed
            // B) otherwise add the prePageBreakHeight to the minimum height of the child-container
            let hTotal = (await this.totalChildHeight)[0];
            return (await this.containerHeaderHeight()) + Math.min(hMin+(await this.prePageBreakHeight()), hTotal);

        }
        // as of here, there is at least one child that must be printed:

        // print at least the following children totally:
        let nChildrenToPrint = Math.min(this.minimumChildrenPrint, this.children.length);
        let hChildren = 0;
        for (let i=0; i < nChildrenToPrint; i++){
            hChildren += (await this.totalChildHeight)[i];
        }
        if (this.minimumChildrenPrint>1){
            // separator only between the children
            hChildren += (nChildrenToPrint-1)*(await this.childSeparatorHeight());
        }

        // until now we have calculated the height of the number of children that need to be fully printed. Additionally we now check if it is beneficial to break here are to fully print all further children. 

        // after the minimum number of children there are several possibilities: 
        // A) the remaining children + footer take less space than the prePageBreak would take
        // B) the prePageBreak+separatorPageBreak take less space than the remaining children (likely always the case) 
        let hChildrenRemaining = 0; 
        for (let i=nChildrenToPrint; i<this.children.length; i++){
            // always also add a separator
            hChildrenRemaining += await this.childSeparatorHeight();
            hChildrenRemaining += (await this.totalChildHeight)[i];
        }

        let hRest = Math.min(hChildrenRemaining + (await this.containerFooterHeight()), (await this.prePageBreakHeight()) + (await this.childSeparatorPrePageBreakHeight())); 
        // adding the footer height to the hChildrenRemaining makes sure that there is no page break between the last child and the footer. 

        return (await this.containerHeaderHeight()) + hChildren + hRest;
    }

    // attention: returns a Promise!
    get minChildHeight(){
        let ret = async()=>{
            // if not calculated yet, calculate it for every child.
            if (this.children.length>0 && this._minChildHeight.length==0){
                this._minChildHeight = await Promise.all(this.children.map(async (c)=> c.getMinimumHeight()))
            }
            return this._minChildHeight;
        }

        return ret();
    }

    // attention: returns a Promise!
    get totalChildHeight(){
        let ret = async ()=>{
            // if not calculated yet, calculate it for every child.
            if (this.children.length>0 && this._totalChildHeight.length==0){
                this._totalChildHeight = await Promise.all(this.children.map((c)=>c.getTotalHeight()))
            }
            return this._totalChildHeight;
        }
        return ret();
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

    // this will probably often be just some space
    async printChildSeparator(page, pG){
        return [page, pG];
    }

    async childSeparatorHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = (await this.fakeDoc).addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - (await this.printChildSeparator(page, pG))[1].positionY;
    }

    // the childSeparator before a page break
    async printChildSeparatorPrePageBreak(page, pG){
        return [page, pG];
    }

    async childSeparatorPrePageBreakHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = (await this.fakeDoc).addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - (await this.printChildSeparator(page, pG))[1].positionY;
    }

    // returns the used height
    async printContainerHeader(page, pG){
        return [page, pG]
    }

    /**
     * This function returns the height needed for the header. If in the given printContainerClass this has a fixed height, implement this function to avoid the execution of this base function, which calculates the height by drawing a fake document. 
     */
    async containerHeaderHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = (await this.fakeDoc).addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - (await this.printContainerHeader(page, pG))[1].positionY;
    }

    // returns the used height
    async printContainerFooter(page, pG){
        return [page, pG]
    }

    /**
     * This function returns the height needed for the footer. If in the given printContainerClass this has a fixed height, implement this function to avoid the execution of this base function, which calculates the height by drawing a fake document. 
     */
    async containerFooterHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = (await this.fakeDoc).addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - (await this.printContainerFooter(page, pG))[1].positionY;
    }

    // implement what must be printed prior to pageBreak (e.g. "continued on next page")
    async printPrePageBreak(page, pG){
        return [page, pG]; 
    }

    /**
     * This function returns the height needed for the prePageBreak stuff. If in the given printContainerClass this has a fixed height, implement this function to avoid the execution of this base function, which calculates the height by drawing a fake document. 
     */
    async prePageBreakHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = (await this.fakeDoc).addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - (await this.printPrePageBreak(page, pG))[1].positionY;
    }

    // implement what must be printed after the pageBreak (e.g. repetition of a table header)
    async printPostPageBreak(page, pG){
        return [page, pG];
    }

    /**
     * This function returns the height needed for the footer. If in the given printContainerClass this has a fixed height, implement this function to avoid the execution of this base function, which calculates the height by drawing a fake document. 
     */
    async postPageBreakHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = (await this.fakeDoc).addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - (await this.printPostPageBreak(page, pG))[1].positionY;
    }


    // The root printing class shall simply override this function
    // showParentSeparator is true, when we do a page break at the beginning of this container, since then we might be/are between two children; TODO: how can we realize that we are not between two, but at the beginning? --> Handle that eventually in the pB function the child receives, where showParentSeparator can be fixed to false for the first item
    // showSeparatorHere will be true when the function on the parent is called, where the separator actually shall be shown.
    async _pageBreak(page, pG, pB, showParentSeparator=false, showSeparatorHere=false){

        if (showSeparatorHere && this.childSeparatorBeforePageBreak){
            [page, pG] = await this.printChildSeparator(page, pG);
        }

        // add whatever is needed from this container before the pageBreak
        [page, pG] = await this.printPrePageBreak(page, pG);

        // call the pageBreak function of the next outer container; it will return the new pageGeometry (containing positionY and the heights of the footers)
        [page, pG] = await pB(page, pG, showSeparatorHere=showParentSeparator);

        //let h = this.postPageBreakHeight(page, pG);
        //pG.positionY -= h;
        [page, pG] = await this.printPostPageBreak(page, pG);

        return [page, pG];
    }

    /**
     * Get each margin from the css like margin definition: 
     * @param {array or number} margin The margin, defined analog to css either as a number or as an array with up to four numbers: either one value (all sides), two values (vertical, horizontal), three values (top, horizontal, bottom) or four values: (top, right, bottom, left)
     * @returns [marginTop, marginRight, marginBottom, marginLeft]
     */
    processMargin(margin){
        // evaluate margin
        let marginTop, marginRight, marginBottom, marginLeft;
        if (Array.isArray(margin)){
            if (margin.length==2){
                marginTop = margin[0];
                marginRight = margin[1];
                marginBottom = margin[0];
                marginLeft = margin[1];
            } else if (margin.length==3){
                marginTop = margin[0];
                marginRight = margin[1];
                marginBottom = margin[2];
                marginLeft = margin[1];
            } else {
                marginTop = margin[0];
                marginRight = margin[1];
                marginBottom = margin[2];
                marginLeft = margin[3];
            }
        } else {
            marginTop = margin;
            marginRight = margin;
            marginBottom = margin;
            marginLeft = margin;
        }
        return [marginTop, marginRight, marginBottom, marginLeft];
    }

    /**
     * Draw a row of a general table based on the setting given in conf. Note that all options (except the content-properties) that can be specified for each cell can also be specified here as a general definition. A setting on cell level has priority. 
     * TODO: take "printCell" out of this function; this requries that the values used in there have to be merged oiutside the function. For this purpose create a function that combine two object with each other, where te properties of one would always have priority over the other's properties, if they existed. 
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
     * @return {number} height of the row
     */
    async printTabularRow(conf, data, page, posX, posY){

        let margin = conf.margin ?? 0;

        // evaluate margin
        let [marginTop, marginRight, marginBottom, marginLeft] = this.processMargin(margin);

        let rowHeight = conf.rowHeight ?? null;
        let linesHorizontal = conf.linesHorizontal ?? [0,0];
        let linesVertical = conf.linesVertical ?? new Array(conf.columns.length+1).fill(0);

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
            * @param {number} cellConf.opacity The opacity for the text. Default=1
            * @param {number} posX2 Left position of the cell
            * @param {number} posY2 Top position of the cell
            * @param {number} sizeX width of the cell
            * @returns {number} height of the cell
            */
        let printCell = async (cellConf, posX2, posY2, sizeX, rowHeight)=>{
            let ms = cellConf.maxMarginScale ?? (cellConf.ms ?? (conf.maxMarginScale ?? (conf.ms ?? 1)));
            let hs = cellConf.maxHorizontalScale ?? (cellConf.hs ?? (conf.maxHorizontalScale ?? (conf.hs ?? 1)));
            let nf = cellConf.noFitStrategy ?? (cellConf.nf ?? (conf.noFitStrategy ?? (conf.nf ?? 'cut')));
            let alignmentV = cellConf.alignmentV ?? (conf.alignmentV ?? 'C');
            let alignmentH = cellConf.alignmentH ?? (conf.alignmentH ?? 'L');
            let size = cellConf.size ?? (conf.size ?? 12);
            let lineHeight = cellConf.lineHeight ?? (conf.lineHeight ?? 1.2);
            let opacity = cellConf.opacity ?? (conf.opacity ?? 1);
            
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
                if (tt){
                    var staticTranslatedText = translate(tt)
                } else {
                    var staticTranslatedText = '';
                }
            }
            if (pArr){
                totalLength = Math.max(p.length, totalLength);
            }

            // create the text as a combination of untranslated text, translated text and data values (in this order)
            let text = '';
            for (let i=0; i<totalLength; i++){
                // combine the text:
                // untranslated text 
                if (tArr){
                    if (t.length>i){
                        text += t[i] ?? '';
                    }
                } else {
                    // just some text, repeated in every loop
                    text += t ?? '';
                }
                // translated text 
                if (ttArr){
                    if (tt.length>i){
                        text += translate(tt[i] ?? '');
                    }
                } else {
                    // just some text, repeated in every loop
                    text += staticTranslatedText;
                }
                // property values
                if (pArr){
                    if (p.length>i){
                        text += data[p[i]] ?? '';
                    }
                } else {
                    // just some text, repeated in every loop
                    text += data[p] ?? '';
                }
            }

            // prepare the options object for drawText
            let opts = {
                size: size,
                lineHeight: lineHeight,
                opacity: opacity,
                // ...
            };
            let f;
            if (cellConf.font){
                f = await page.doc.getFont(cellConf.font);
            } else if (conf.font){
                f = await page.doc.getFont(conf.font);
            } else {
                f = await page.doc.getFont('Helvetica');
            }
            opts.font = f;

            // vertical position (will be adapted for each line on word wrap):
            if (rowHeight){
                // apply the alignment
                if (alignmentV.toUpperCase() == 'C'){
                    opts.y = posY2 - (rowHeight-size)/2 - size;
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
            let widthUnscaled = f.widthOfTextAtSize(text, size);
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

            if (widthUnscaled*textScaleApplied > sizeX - marginScaleApplied*(marginLeft+marginRight)){
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
                        if (f.widthOfTextAtSize(textMerged, size)*textScaleApplied > sizeX2) {
                            // current part does not fit...
                            lines += 1;
                            opts.y = posY2 - marginTop - size*(1 + (lines-1)*lineHeight);
                            if (start+1==end){
                                // if we only have one element, then we have to plot it anyway, and simply do some (eventually additional) horzontal scaling to make that single word fit
                                let origScale = opts.horizontalScale; // since we change the original opts object, we have to reset the value later!
                                opts.horizontalScale *= sizeX2/(f.widthOfTextAtSize(textMerged, size)*textScaleApplied); // scale
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
                        lines += 1;
                        opts.y = posY2 - marginTop - size*(1 + (lines-1)*lineHeight);
                        page.drawText(textParts.slice(start, end).join('').trim(), opts);
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
                        let t2 = text.slice(0,l)+".";
                        if (f.widthOfTextAtSize(t2, size)*textScaleApplied < sizeX - marginScaleApplied*(marginLeft+marginRight)){
                            page.drawText(t2, opts);
                            break;
                        }
                    }

                }

            } else {
                // it fits with the given margin and horizontal scalings
                page.drawText(text, opts);
            }

            // return the required height for this cell
            if (rowHeight){
                return rowHeight;
            } else {
                return opts.size*(1 + (lines-1)*opts.lineHeight) + marginTop + marginBottom; 
            }
            

        } // end printCell
        
        // print content=cells
        let totalHeight = 0;
        for (let i=0; i< conf.columns.length ; i++){
                
            let cell = conf.cells[i];
            if (cell){
                // print single cell
                let posX2 = posX + conf.columns.slice(0,i).reduce((val, oldVal)=>val+oldVal, 0); 
                totalHeight = Math.max(totalHeight, (await printCell(cell, posX2, posY, conf.columns[i], rowHeight)));
            }
        }

        // draw horizontal lines
        let totalWidth = conf.columns.reduce((val, valOld)=>val+valOld, 0);
        if (linesHorizontal[0]>0){
            // top line
            let opt = {
                start: {x:posX, y:posY},
                end: {x:posX + totalWidth, y:posY},
                thickness: linesHorizontal[0]
            }
            page.drawLine(opt);
        }
        if (linesHorizontal[1]>0){
            // bottom line
            let opt = {
                start: {x:posX, y:posY-totalHeight},
                end: {x:posX + totalWidth, y:posY-totalHeight},
                thickness: linesHorizontal[0]
            }
            page.drawLine(opt);
        }

        // print vertical lines
        for (let i=0; i<linesVertical.length; i++){
            let thickness = linesVertical[i];
            if (thickness>0){
                let posX2 = posX + conf.columns.slice(0,i).reduce((val, valOld)=>val+valOld, 0);
                let opt = {
                    start: {x:posX2, y:posY},
                    end: {x:posX2, y:posY-totalHeight},
                    thickness: thickness
                }
                page.drawLine(opt);
            }
        }

        return totalHeight;
    }

}

/**
 * This class serves as root container. It has no content itself, just some children. It handles the root pageBreak stuff. Typically, the only child will be the header/footer item.
 */
export class printer extends printingGeneral {

    /**
     * This is the virtual constructor. Since the constructor cannot be async, but we need some async functions, we handle everything in here.
     * @param {array / dContainer} dataContainers The data containers to be printed. Will get translated into a print-class, which must be defined for each of the container-classes.
     * @param {object} dataToPrint Asssociation of pritnClasses to dataClasses: {dClass: pClass}
     * @param {object} conf The printing configurations, loaded separately.
     * @param {boolean} printInstantly Start printing right away; default=false
     * @returns {printer} returns a new printer object
     */
    static async create(dataContainers, dataToPrint, conf, printInstantly=false){

        let doc = await this.createDocument(conf);

        // prepare some default fonts:
        let fonts= {
            Helvetica:  await doc.embedFont(PDFLib.StandardFonts.Helvetica),
        }

        // construct the printer
        let printe = new this(doc, fonts, dataContainers, dataToPrint, conf);

        // reference the printer in the doc. Like this, every function gets access to e.g. lateDrawings.
        doc.printer = printe;

        // provide a function to the pdfdocument to get a font
        // if the font is not available, it will return Helvetica regular
        doc.getFont = async (fontName)=>{
            // get or embed a font and return it
            if (fontName in printe.fonts){
                return printe.fonts[fontName];
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
                    printe.fonts[fontName] = font;
                    return font;
                } else {
                    console.log(`Font ${fontName} is not available. Using Helvetica instead.`)
                    return printe.fonts['Helvetica'];
                }
                
            }
        }
 
        // prepare the height stuff
        await printe.getTotalHeight();
        await printe.getMinimumHeight();

        if (printInstantly){
            await printe.startPrint();
        }

        return printe;
    }

    static async createDocument(conf){
        // create a new document
        let doc = await PDFLib.PDFDocument.create();

        doc.setTitle(conf.title);
        doc.setAuthor(conf.author);
        doc.setSubject(conf.subject);
        doc.setKeywords(conf.keywords);
        doc.setProducer(conf.producer);
        doc.setCreator(conf.creator);
        doc.setCreationDate(new Date());
        doc.setModificationDate(new Date());

        return doc;

    }

    constructor(doc, fonts, dataContainers, dataToPrint, conf){

        // can we replace super with something else?
        // This does not work; is there any other way how we can create construct the parent including some async stuff to wait for?
        //super.create();
        super(conf, {}); // there is currently no data for this room

        // the pdf document
        this.doc = doc;

        // dataContainers must be an array later on --> check this or make it an array with one element
        if (!Array.isArray(dataContainers)){
            dataContainers = [dataContainers];
        }

        // translate the data containers into printContainers; this can/must eventually be done recursively
        function loadPrintContainers(childrenDataContainers){

            let childrenPrint = [];

            for (let dc of childrenDataContainers){

                // try to find the matching printing class
                if (!(dc.constructor.name in dataToPrint)){
                    throw {code:5, message: `Cannot print since there is no print class specified for the data class ${dc.constructor.name}.`}
                }

                // TODO: eventually change this to allow async calls in the "creator" (instead of constructor) functions. 
                let pc = new dataToPrint[dc.constructor.name](conf, dc)
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
        this.fonts = fonts;

        // late drawings: keep a list of functions that are going to be called with 'this' as the parameter just before the document is saved/printed. This e.g. used to draw the total page number, which is not known before the end.
        this.lateDrawings = []; 

    } 

    async processLateDrawings(){
        // run all late drawing functions. (These are e.g. to draw the total number of pages.)
        for (let f of this.lateDrawings){
            await f(this); // this is the argument for the function, which actually is basically run in the context it was created in
        }
    }

    // open the pdf in a new tab
    async showNewTab(){
        await this.processLateDrawings();
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

    async startPrint() {
        // add a first page
        let [page, pG] = this.addPage();

        // print! (attention, new: async)
        return this.print(page, pG, this._pageBreak);
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

    // "downloads" the document
    /*save(){
        // TODO: provide options so that we can also just show it 
        return this.doc.save()
    }*/

    // overwrite the pageBreak-stuff to actually create the pageBreak
    async _pageBreak(page, pG){
        return this.addPage();
    }
}

export class pHeaderFooter extends printingGeneral{
    
    // implement the header and footer
    // eventually we will implement here also the creation of the pdf document
    constructor (conf, data){
        super(conf, data)

        // keep track of the current page
        this.currentPage = 0;

    }

    async printContainerHeader(page, pG){

        this.currentPage += 1;

        let conf = this.conf.headerFooter;

        let currentPage = this.currentPage; // at the time of printing, this.currentPage will be the total number of pages.

        // create a coyp of the position; otherwise, it would be drawn too low.
        let posY = pG.positionY;

        // provide a copy of the meeting data (name, date, place, etc.)
        let data = JSON.parse(JSON.stringify(this.data.meeting));
        page.doc.printer.lateDrawings.push(async (printer)=>{
            let numPages = printer.pages.length;

            // provide the data for page numbers:
            data.numPages = numPages;
            data.currentPage = currentPage;
            // create a string with the current date and time
            let d = new Date();
            data.dString = `${d.getDate().toString().padStart(2,'0')}.${d.getMonth().toString().padStart(2,'0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;

            let height = await this.printTabularRow(conf.headerTable, data, page, 0, posY);

        })

        pG.positionY -= conf.headerHeight;

        return [page, pG];
    }

    async printContainerFooter(page, pG){

        // true multiline-layout would require that the footer is larger than currently!

        let conf = this.conf.headerFooter;

        let currentPage = this.currentPage; // at the time of printing, this.currentPage will be the total number of pages.

        // provide a copy of the meeting data (name, date, place, etc.)
        let data = JSON.parse(JSON.stringify(this.data.meeting));
        page.doc.printer.lateDrawings.push(async (printer)=>{
            let numPages = printer.pages.length;

            // provide the data for page numbers:
            data.numPages = numPages;
            data.currentPage = currentPage;
            // create a string with the current date and time
            let d = new Date();
            data.dString = `${d.getDate().toString().padStart(2,'0')}.${d.getMonth().toString().padStart(2,'0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;

            let height = await this.printTabularRow(conf.footerTable, data, page, 0, conf.footerHeight);

            // OLD: plot the page number separately; is now included in the table
            /*let textUntranslated = `Page ${currentPage} of ${numPages}`;
            // TODO: 
            let textTranslated = textUntranslated;
            // calculate the xPosition
            let f = await page.doc.getFont('HelveticaBold');
            let w = f.widthOfTextAtSize(textTranslated, 10);
            page.drawText(textTranslated, {
                y: 32-11-10,
                x: 595-11-w,
                size: 10,
                font: f,
            })*/
        })

        pG.positionY -= conf.footerHeight;

        return [page, pG];
    }

    async printPrePageBreak(page, pG){
        return this.printContainerFooter(page, pG);
    }

    async printPostPageBreak(page, pG){
        return this.printContainerHeader(page, pG);
    }

    containerFooterHeight(){
        // the height MUST be fixed and NOT dependent on the actual print function, since printing is not done live, but at the very end
        return this.conf.headerFooter.footerHeight;
    }
    containerHeaderHeight(){
        // the height MUST be fixed and NOT dependent on the actual print function, since printing is not done live, but at the very end
        return this.conf.headerFooter.headerHeight;
    }
    prePageBreakHeight(){
        // the height MUST be fixed and NOT dependent on the actual print function, since printing is not done live, but at the very end
        return this.containerFooterHeight();
    }
    postPageBreakHeight(){
        // the height MUST be fixed and NOT dependent on the actual print function, since printing is not done live, but at the very end
        return this.containerHeaderHeight();
    }
}

export class pContestSheetHigh extends printingGeneral {
    
    constructor (conf, data){
        super(conf, data)

    }

    async printContainerHeader(page, pG){

        // TODO: eventually include here begin/end times of the series

        let conf = this.conf.contestSheetHigh;
        //let fontHeader = await page.doc.getFont(conf.fontContestHeader);
        //let font = await page.doc.getFont(conf.font);
        let font = conf.font ?? 'Helvetica';

        // create a string with all involved categories. Make sure no category is appearing twice.
        let categories = [];
        this.data.relatedGroups.forEach(group=>{
            group.round.eventgroup.events.forEach(e=>{
                if (categories.indexOf(e.xCategory)==-1){
                    categories.push(e.xCategory);
                }
            })
        })

        // sort all categories, translate them to strings and combine them
        categories.sort((a,b)=>{
            return this.data.categories.find(el=>el.xCategory==a)?.sortorder - this.data.categories.find(el=>el.xCategory==b)?.sortorder;
        })

        let categoriesText = categories.map((el)=>{
            return this.data.categories.find(cat=>cat.xCategory==el)?.shortname;
        })

        let categoriesStr = categoriesText.join(', ');

        // print contest name, time, category etc
        // the name does not exist yet in the data!
        //page.drawText(this.data.baseDiscipline, {font:fontHeader, size: conf.sizeContestHeader, x:this.conf.marginLeft, y:pG.positionY-20})
        let usableWidth = this.conf.pageSize[0]-this.conf.marginLeft-this.conf.marginRight;
        let tabConf = {
            font:conf.fontContestHeader, 
            size: conf.sizeContestHeader, 
            cells:[
                {p: ['baseDiscipline',], t:[, " " + categoriesStr]},
                {p: 'datetimeStartDateTime', alignmentH:'R'},
            ], 
            columns:[usableWidth*0.7, usableWidth*.3],
        };
        this.printTabularRow(tabConf, this.data, page, this.conf.marginLeft, pG.positionY);
        tabConf = {
            font:conf.font, 
            size: conf.size, 
            cells:[
                {t: conf.strCall+': ', p: 'datetimeCallTime', alignmentH:'R'},
            ], 
            columns:[usableWidth],
        };
        this.printTabularRow(tabConf, this.data, page, this.conf.marginLeft, pG.positionY-conf.sizeContestHeader*1.2);
        //page.drawText(`${this.data.datetimeStart}`, {font:fontHeader, size: conf.sizeContestHeader, x:this.conf.marginLeft, y:pG.positionY-20})

        // TODO: categories, rounds, groups etc (eventually do this as as option)

        // print information about using the paper
        // TODO: change to printCell, as soon as this is not within the table anymore
        this.printTabularRow({font:font, size: conf.sizeContestInfo, cells:[{t:conf.strHelp, nf:'wordWrap'}], columns:[this.conf.pageSize[0]-this.conf.marginLeft-this.conf.marginRight]}, {}, page, this.conf.marginLeft, pG.positionY-30);

        pG.positionY -= 60;

        return [page, pG];
    }

    containerHeaderHeight(){
        return 60;
    }


    async printChildSeparatorPrePageBreak(page, pG){

        let conf = this.conf.contestSheetHigh;
        let font = await page.doc.getFont(conf.fontSeries);
        page.drawText(conf.strFurtherSeries, {x:this.conf.marginLeft, y: pG.positionY - conf.marginTopSeries - conf.size, size:conf.size, font: font})
        pG.positionY -= conf.marginTopSeries + conf.size + conf.marginBottomSeries;

        return [page, pG];
    }

    async childSeparatorPrePageBreakHeight(){
        let conf = this.conf.contestSheetHigh;
        return conf.marginTopSeries + conf.size + conf.marginBottomSeries;
    }
}
export class pContestSheetTrack extends printingGeneral {
    
    constructor (conf, data){
        super(conf, data)

    }

    async printContainerHeader(page, pG){

        let conf = this.conf.contestSheetTrack;
        let font = conf.font ?? 'Helvetica';

        // create a string with all involved categories. Make sure no category is appearing twice.
        let categories = [];
        this.data.relatedGroups.forEach(group=>{
            group.round.eventgroup.events.forEach(e=>{
                if (categories.indexOf(e.xCategory)==-1){
                    categories.push(e.xCategory);
                }
            })
        })
        // if it is a hurdle event, add a line for each distance
        let heights = [];
        if (this.data.hurdles){
            for (rg of relatedGroups){
                let disc = disciplines.find(d=>d.xDiscipline == rg.round.eventgroup.xDiscipline);
                let discConf = JSON.parse(disc.configuration);
                if (heights.indexOf(discConf.height)){
                    heights.push(discConf.height);
                }
            }
            heights.sort(); // smallest first
            cName += ' ' + heights.join (' / ');
        }

        // sort all categories, translate them to strings and combine them
        categories.sort((a,b)=>{
            return this.data.categories.find(el=>el.xCategory==a)?.sortorder - this.data.categories.find(el=>el.xCategory==b)?.sortorder;
        })

        let categoriesText = categories.map((el)=>{
            return this.data.categories.find(cat=>cat.xCategory==el)?.shortname;
        })

        let categoriesStr = categoriesText.join(', ');

        // print contest name, time, category etc
        // the name does not exist yet in the data!
        //page.drawText(this.data.baseDiscipline, {font:fontHeader, size: conf.sizeContestHeader, x:this.conf.marginLeft, y:pG.positionY-20})
        let usableWidth = this.conf.pageSize[0]-this.conf.marginLeft-this.conf.marginRight;
        let tabConf = {
            font:conf.fontContestHeader, 
            size: conf.sizeContestHeader, 
            cells:[
                {p: ['baseDiscipline',], t:[, " " + categoriesStr]},
                {p: 'datetimeStartDateTime', alignmentH:'R'},
            ], 
            columns:[usableWidth*0.7, usableWidth*.3],
        };
        this.printTabularRow(tabConf, this.data, page, this.conf.marginLeft, pG.positionY);
        tabConf = {
            font:conf.font, 
            size: conf.size, 
            cells:[
                {t: conf.strCall+': ', p: 'datetimeCallTime', alignmentH:'R'},
            ], 
            columns:[usableWidth],
        };
        this.printTabularRow(tabConf, this.data, page, this.conf.marginLeft, pG.positionY-conf.sizeContestHeader*1.2);
        //page.drawText(`${this.data.datetimeStart}`, {font:fontHeader, size: conf.sizeContestHeader, x:this.conf.marginLeft, y:pG.positionY-20})

        // TODO: categories, rounds, groups etc (eventually do this as as option)

        // print information about using the paper
        // TODO: change to printCell, as soon as this is not within the table anymore
        this.printTabularRow({font:font, size: conf.sizeContestInfo, cells:[{t:conf.strHelp, nf:'wordWrap'}], columns:[this.conf.pageSize[0]-this.conf.marginLeft-this.conf.marginRight]}, {}, page, this.conf.marginLeft, pG.positionY-30);

        pG.positionY -= 60;

        return [page, pG];
    }

    containerHeaderHeight(){
        return 60;
    }


    async printChildSeparatorPrePageBreak(page, pG){

        let conf = this.conf.contestSheetHigh;
        let font = await page.doc.getFont(conf.fontSeries);
        page.drawText(conf.strFurtherSeries, {x:this.conf.marginLeft, y: pG.positionY - conf.marginTopSeries - conf.size, size:conf.size, font: font})
        pG.positionY -= conf.marginTopSeries + conf.size + conf.marginBottomSeries;

        return [page, pG];
    }

    async childSeparatorPrePageBreakHeight(){
        let conf = this.conf.contestSheetHigh;
        return conf.marginTopSeries + conf.size + conf.marginBottomSeries;
    }
}

export class pSeries extends printingGeneral {
    constructor (conf, data){
        super(conf, data)

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

export class pSeriesContestSheetHigh extends printingGeneral{

    constructor (conf, data){
        super(conf, data)

        // at least 2 children shall be printed on one page; otherwise, add a page break before
        this.minimumChildrenPrint = 2;
    }

    async printContainerHeader(page, pG){
        // draw the name+number of the series, eventually how many athletes on this page

        let globalConf = this.conf;
        let conf = globalConf.contestSheetHigh;

        let fontSeries = await page.doc.getFont(conf.fontSeries);

        // draw the series name
        let text = '';
        if (this.data.name){
            text = 'Serie '+this.data.name;
        } else {
            text = `Serie ${this.data.number}`;
        }
        page.drawText(text, {x:globalConf.marginLeft, y: pG.positionY-conf.marginTopSeries-conf.sizeSeries, size:conf.sizeSeries, font:fontSeries});

        pG.positionY -= conf.sizeSeries + conf.marginBottomSeries + conf.marginTopSeries;

        // draw the stuff for the heights and results
        // make the exact width dependent on the width of the "results" and "heights" texts:
        let font = conf.font ?? 'Helvetica';
        let size = conf.size ?? 10;
        let f = await page.doc.getFont(font);
        let l2 = f.widthOfTextAtSize(conf.strResults + ':', size);
        let l1 = f.widthOfTextAtSize(conf.strHeights + ':', size);
        
        let leftOffset = 0;
        // do not show "heights" and "results"
        /*
        let leftOffset = Math.max(l1, l2) + conf.marginRight;
        let optsText = {
            x: globalConf.marginLeft,
            y: pG.positionY-conf.resRowHeight*conf.resRows/2-size/2,
            font:f,
            size,
        }
        page.drawText(conf.strHeights+':', optsText);*/

        // prepare the table for the results.
        const colWidth = (globalConf.pageSize[0]-leftOffset-globalConf.marginLeft - globalConf.marginRight)/conf.resColumns;
        const optsTable = {
            cells: new Array(conf.resColumns).fill({}),
            rowHeight: conf.resRowHeight,
            columns: new Array(conf.resColumns).fill(colWidth),
            linesVertical: new Array(conf.resColumns+1).fill(conf.resLineWidth),
            linesHorizontal: new Array(2).fill(conf.resLineWidth),
        }

        // calculate the last column and row with predefined heights
        let lastHeightCol, lastHeightRow;
        let heightsToFill = conf.resRows*conf.resColumns - conf.numEmptyHeights;
        if (heightsToFill <= 0){
            lastHeightCol = -1;
            lastHeightRow = -1;
        } else {
            lastHeightRow = Math.ceil(heightsToFill/conf.resRows)-1;
            lastHeightCol = heightsToFill-(lastHeightRow+1)*conf.resRows-1;
        }

        // draw the results table, row by row
        for (let i=0; i<conf.resRows; i++){

            // fill the heights
            optsTable.cells = Array.from(new Array(conf.resColumns), x=>{ return {alignmentH:'C', size:conf.sizeHeights}});
            for (let j=0;j<(i==lastHeightRow ? lastHeightCol : conf.resColumns); j++){
                optsTable.cells[j]['t'] = this.data.heights[j+i*conf.resColumns];
            }

            pG.positionY -= await this.printTabularRow(optsTable, {}, page, globalConf.marginLeft+leftOffset, pG.positionY);
        }

        pG.positionY -= conf.spaceBetweenAthletes;

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

    async printChildSeparator(page, pG){
        // just add some extra space
        pG.positionY -= this.conf.contestSheetHigh.spaceBetweenAthletes;
        return [page, pG];
    }

    async childSeparatorHeight(){
        return 10;
    }

    printChildSeparatorPrePageBreak(page, pG){
        // if the series would be breakable, we would implement here a text like "series continues on next page"
        return [page, pG];
    }
}
export class pSeriesContestSheetTrack extends printingGeneral{

    constructor (conf, data){
        super(conf, data)

        // at least 2 children shall be printed on one page; otherwise, add a page break before
        this.minimumChildrenPrint = 2;
    }

    async printContainerHeader(page, pG){
        // draw the name+number of the series, eventually how many athletes on this page

        let globalConf = this.conf;
        let conf = globalConf.contestSheetHigh;

        let fontSeries = await page.doc.getFont(conf.fontSeries);

        // draw the series name
        let text = '';
        if (this.data.name){
            text = 'Serie '+this.data.name;
        } else {
            text = `Serie ${this.data.number}`;
        }
        page.drawText(text, {x:globalConf.marginLeft, y: pG.positionY-conf.marginTopSeries-conf.sizeSeries, size:conf.sizeSeries, font:fontSeries});

        pG.positionY -= conf.sizeSeries + conf.marginBottomSeries + conf.marginTopSeries;

        // draw the stuff for the heights and results
        // make the exact width dependent on the width of the "results" and "heights" texts:
        let font = conf.font ?? 'Helvetica';
        let size = conf.size ?? 10;
        let f = await page.doc.getFont(font);
        let l2 = f.widthOfTextAtSize(conf.strResults + ':', size);
        let l1 = f.widthOfTextAtSize(conf.strHeights + ':', size);
        
        let leftOffset = 0;
        // do not show "heights" and "results"
        /*
        let leftOffset = Math.max(l1, l2) + conf.marginRight;
        let optsText = {
            x: globalConf.marginLeft,
            y: pG.positionY-conf.resRowHeight*conf.resRows/2-size/2,
            font:f,
            size,
        }
        page.drawText(conf.strHeights+':', optsText);*/

        // prepare the table for the results.
        const colWidth = (globalConf.pageSize[0]-leftOffset-globalConf.marginLeft - globalConf.marginRight)/conf.resColumns;
        const optsTable = {
            cells: new Array(conf.resColumns).fill({}),
            rowHeight: conf.resRowHeight,
            columns: new Array(conf.resColumns).fill(colWidth),
            linesVertical: new Array(conf.resColumns+1).fill(conf.resLineWidth),
            linesHorizontal: new Array(2).fill(conf.resLineWidth),
        }

        // calculate the last column and row with predefined heights
        let lastHeightCol, lastHeightRow;
        let heightsToFill = conf.resRows*conf.resColumns - conf.numEmptyHeights;
        if (heightsToFill <= 0){
            lastHeightCol = -1;
            lastHeightRow = -1;
        } else {
            lastHeightRow = Math.ceil(heightsToFill/conf.resRows)-1;
            lastHeightCol = heightsToFill-(lastHeightRow+1)*conf.resRows-1;
        }

        // draw the results table, row by row
        for (let i=0; i<conf.resRows; i++){

            // fill the heights
            optsTable.cells = Array.from(new Array(conf.resColumns), x=>{ return {alignmentH:'C', size:conf.sizeHeights}});
            for (let j=0;j<(i==lastHeightRow ? lastHeightCol : conf.resColumns); j++){
                optsTable.cells[j]['t'] = this.data.heights[j+i*conf.resColumns];
            }

            pG.positionY -= await this.printTabularRow(optsTable, {}, page, globalConf.marginLeft+leftOffset, pG.positionY);
        }

        pG.positionY -= conf.spaceBetweenAthletes;

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

    async printChildSeparator(page, pG){
        // just add some extra space
        pG.positionY -= this.conf.contestSheetHigh.spaceBetweenAthletes;
        return [page, pG];
    }

    async childSeparatorHeight(){
        return 10;
    }

    printChildSeparatorPrePageBreak(page, pG){
        // if the series would be breakable, we would implement here a text like "series continues on next page"
        return [page, pG];
    }
}

export class pPerson extends printingGeneral {
    constructor (conf, data){
        super(conf, data)

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

export class pPersonContestSheetHigh extends pPerson {
    
    constructor(conf, data){
        super(conf, data);
    }

    async printContainerHeader(page, pG){

        let translate = (text)=>{
            return text;
        }

        // moved to config file
        /*let globalConf = {
            pageSize: [595.28, 841.89],
            marginLeft: 40,
            marginRight: 40,
        };*/
        let globalConf = this.conf;

        /*let conf = {
            resColumns: 13, // number of result columns
            resRows: 2, // number of result rows
            resRowHeight: 20, // result row height
            resLineWidth: 1, // linewidth of the result grid
            font:'Helvetica',
            size: 10,
            marginRight: 3, // margin to the right of "Results" and "Heights"
            athleteColumns: {
                // the athletes "header"
                margin:3,
                columns:[50, 175, 50, 30, 30, 180], // bib, name, cat, birthyear, country, club
                font:'HelveticaBold',
                size: 10,
                alignmentH: 'C',
                cells:[
                    {p:'bib'},
                    {p:['lastname', 'firstname'], t:[,' '], alignmentH:'L'},
                    {t:'CAT'},
                    {p:'year2'},
                    {p:'country', font:"Helvetica"},
                    {p:'clumName', alignmentH:'L'}
                ],
            }
        }*/
        let conf = globalConf.contestSheetHigh;

        // draw the athletes header
        pG.positionY -= await this.printTabularRow(conf.athleteColumns, this.data, page, globalConf.marginLeft, pG.positionY) 
        
        // draw the stuff for the heights and results
        // make the exact width dependent on the width of the "results" and "heights" texts:
        let font = conf.font ?? 'Helvetica';
        let size = conf.size ?? 10;
        let f = await page.doc.getFont(font);
        let l2 = f.widthOfTextAtSize(conf.strResults+':', size);
        let l1 = f.widthOfTextAtSize(conf.strHeights+':', size);

        let leftOffset = 0;
        // do not show "results" and "heights" anymore
        /*
        let leftOffset = Math.max(l1, l2) + conf.marginRight;
        const optsText = {
            x: globalConf.marginLeft,
            y: pG.positionY-conf.resRowHeight*conf.resRows/2-size/2,
            font:f,
            size,
        }
        page.drawText(conf.strResults+':', optsText);*/



        // prepare the table for the results.
        const colWidth = (globalConf.pageSize[0]-leftOffset-globalConf.marginLeft - globalConf.marginRight)/conf.resColumns;
        const optsTable = {
            cells: new Array(conf.resColumns).fill({}),
            rowHeight: conf.resRowHeight,
            columns: new Array(conf.resColumns).fill(colWidth),
            linesVertical: new Array(conf.resColumns+1).fill(conf.resLineWidth),
            linesHorizontal: new Array(2).fill(conf.resLineWidth),
            size: conf.sizeHeightBackground,
            opacity: conf.opacityHeightBackground,
            font: font,
        }

        // calculate the last column and row with predefined heights
        let lastHeightCol, lastHeightRow;
        let heightsToFill = conf.resRows*conf.resColumns - conf.numEmptyHeights;
        if (heightsToFill <= 0){
            lastHeightCol = -1;
            lastHeightRow = -1;
        } else {
            lastHeightRow = Math.ceil(heightsToFill/conf.resRows)-1;
            lastHeightCol = heightsToFill-(lastHeightRow+1)*conf.resRows-1;
        }

        // draw the results table, row by row
        for (let i=0; i<conf.resRows; i++){

            if (conf.showHeightBackground){
                // fill the heights
                optsTable.cells = Array.from(new Array(conf.resColumns), x=>{ return {alignmentH:'C'}});
                for (let j=0;j<(i==lastHeightRow ? lastHeightCol : conf.resColumns); j++){
                    optsTable.cells[j]['t'] = this.data.heights[j+i*conf.resColumns];
                }
            }
            

            pG.positionY -= await this.printTabularRow(optsTable, {}, page, globalConf.marginLeft+leftOffset, pG.positionY);
        }

        return [page, pG];
    }

}
export class pPersonContestSheetTrack extends pPerson {
    
    constructor(conf, data){
        super(conf, data);
    }

    async printContainerHeader(page, pG){

        let translate = (text)=>{
            return text;
        }

        // moved to config file
        /*let globalConf = {
            pageSize: [595.28, 841.89],
            marginLeft: 40,
            marginRight: 40,
        };*/
        let globalConf = this.conf;

        /*let conf = {
            resColumns: 13, // number of result columns
            resRows: 2, // number of result rows
            resRowHeight: 20, // result row height
            resLineWidth: 1, // linewidth of the result grid
            font:'Helvetica',
            size: 10,
            marginRight: 3, // margin to the right of "Results" and "Heights"
            athleteColumns: {
                // the athletes "header"
                margin:3,
                columns:[50, 175, 50, 30, 30, 180], // bib, name, cat, birthyear, country, club
                font:'HelveticaBold',
                size: 10,
                alignmentH: 'C',
                cells:[
                    {p:'bib'},
                    {p:['lastname', 'firstname'], t:[,' '], alignmentH:'L'},
                    {t:'CAT'},
                    {p:'year2'},
                    {p:'country', font:"Helvetica"},
                    {p:'clumName', alignmentH:'L'}
                ],
            }
        }*/
        let conf = globalConf.contestSheetHigh;

        // draw the athletes header
        pG.positionY -= await this.printTabularRow(conf.athleteColumns, this.data, page, globalConf.marginLeft, pG.positionY) 
        
        // draw the stuff for the heights and results
        // make the exact width dependent on the width of the "results" and "heights" texts:
        let font = conf.font ?? 'Helvetica';
        let size = conf.size ?? 10;
        let f = await page.doc.getFont(font);
        let l2 = f.widthOfTextAtSize(conf.strResults+':', size);
        let l1 = f.widthOfTextAtSize(conf.strHeights+':', size);

        let leftOffset = 0;
        // do not show "results" and "heights" anymore
        /*
        let leftOffset = Math.max(l1, l2) + conf.marginRight;
        const optsText = {
            x: globalConf.marginLeft,
            y: pG.positionY-conf.resRowHeight*conf.resRows/2-size/2,
            font:f,
            size,
        }
        page.drawText(conf.strResults+':', optsText);*/



        // prepare the table for the results.
        const colWidth = (globalConf.pageSize[0]-leftOffset-globalConf.marginLeft - globalConf.marginRight)/conf.resColumns;
        const optsTable = {
            cells: new Array(conf.resColumns).fill({}),
            rowHeight: conf.resRowHeight,
            columns: new Array(conf.resColumns).fill(colWidth),
            linesVertical: new Array(conf.resColumns+1).fill(conf.resLineWidth),
            linesHorizontal: new Array(2).fill(conf.resLineWidth),
            size: conf.sizeHeightBackground,
            opacity: conf.opacityHeightBackground,
            font: font,
        }

        // calculate the last column and row with predefined heights
        let lastHeightCol, lastHeightRow;
        let heightsToFill = conf.resRows*conf.resColumns - conf.numEmptyHeights;
        if (heightsToFill <= 0){
            lastHeightCol = -1;
            lastHeightRow = -1;
        } else {
            lastHeightRow = Math.ceil(heightsToFill/conf.resRows)-1;
            lastHeightCol = heightsToFill-(lastHeightRow+1)*conf.resRows-1;
        }

        // draw the results table, row by row
        for (let i=0; i<conf.resRows; i++){

            if (conf.showHeightBackground){
                // fill the heights
                optsTable.cells = Array.from(new Array(conf.resColumns), x=>{ return {alignmentH:'C'}});
                for (let j=0;j<(i==lastHeightRow ? lastHeightCol : conf.resColumns); j++){
                    optsTable.cells[j]['t'] = this.data.heights[j+i*conf.resColumns];
                }
            }
            

            pG.positionY -= await this.printTabularRow(optsTable, {}, page, globalConf.marginLeft+leftOffset, pG.positionY);
        }

        return [page, pG];
    }

}


/**
 * dContainer: general container keeping data-content and childs structured
 */
export class dContainer {
    
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

    // provide some functions for date formatting
    _dateTime(dateString){
        let d = new Date(dateString);
        return `${d.getDate().toString().padStart(2,'0')}.${d.getMonth().toString().padStart(2,'0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    }
    _time(dateString){
        let d = new Date(dateString);
        return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
    }
}

export class dHeaderFooter extends dContainer {
    // keep content of the header and footer and ev. keep the settings for the header/footer

    constructor(children, data){

        super();
        this.children = children;

        // store a reference to the meetingAdmin data
        this.meeting = data;
    }
}

export class dPerson extends dContainer {

    /**
     * Create a person object just from the information given in the startgroup
     * @param {object} startGroup The startgroup object containing all information (name, firstname, club, etc) for each seriesStartResult in one object
     */
    static of (startGroup){
        return new dPerson(startGroup.athleteName, startGroup.athleteForename, startGroup.bib, startGroup.birthdate, startGroup.country, startGroup.regionShortname, startGroup.clubName, startGroup.eventGroupName, startGroup.xDiscipline)
    }
    
    constructor (lastname, firstname, bib, birthdate, country, regionShortname, clubName, eventGroupName, xDiscipline, catName){
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
        this.categoryName = catName;
        

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
        return this.birthdate.slice(2,4);
    }

    get year4(){
        return this.birthdate.slice(0,4);
    }
}

/**
 * Extends the pPerson class by the properties needed to print a contestSheet (should work for track, techLong and techHigh)
 */
export class dPersonContestSheet extends dPerson {

    /**
     * Create a personContestSheer object just from the information given in the startgroup and in the seriesstartresult
     * @param {object} startGroup The startgroup object containing all information (name, firstname, club, etc) for each seriesStartResult in one object
     * @param {object} ssr The seriesStartResult object, containing position and lane (=startConf)
     */
    /*static of (startGroup, ssr){
        return new dPersonContestSheet(startGroup.athleteName, startGroup.athleteForename, startGroup.bib, startGroup.birthdate, startGroup.country, startGroup.regionShortname, startGroup.clubName, startGroup.eventGroupName, startGroup.xDiscipline, ssr.position, ssr.startConf)
    }*/

    constructor (lastname, firstname, bib, birthdate, country, regionShortname, clubName, eventGroupName, xDiscipline, position, categoryName, heights, startConf=null){
        super(lastname, firstname, bib, birthdate, country, regionShortname, clubName, eventGroupName, xDiscipline, categoryName)
        this.position = position;
        this.startConf = startConf;
        this.heights = heights; // needed to show the heights in the background of the cells
    }
}


export class dSeries extends dContainer {

    /*static of(series, startgroups){
        let cSeries = new dSeries(series.xSeries, series.status, series.number, series.name, series.heights, "siteName", series.seriesstartsresults);

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
    }*/

    constructor(xSeries, status, number, name, siteName, SSR, datetime){

        super()

        this.xSeries = xSeries; 
        this.status = status;
        this.number = number;
        this.name = name;
        this.siteName = siteName;
        this.SSR = SSR;
        this.datetime = datetime;
        // the children are the single persons
    }
}

export class dSeriesSheetHigh extends dSeries {
    
    constructor(xSeries, status, number, name, siteName, SSR, heights, datetime){
        
        super(xSeries, status, number, name, siteName, SSR, datetime);
        this.heights = heights;
    }
}

export class dSeriesSheetTrack extends dSeries {
    
    constructor(xSeries, status, number, name, siteName, SSR, datetime, id, requiresWind, showLane=true, showPosition=true, showReactiontime=false, showHurdleHeightCol=false, hurdles=false){
        
        super(xSeries, status, number, name, siteName, SSR, datetime);
        this.id = id;
        this.requiresWind = requiresWind; // show a field for the wind
        this.showLane = showLane;
        this.showPosition = showPosition;
        // show empty lanes is not an option here, since empty lanes simply would have to be real entries with simply empty name etc.
        this.showReactiontime = showReactiontime;
        this.showHurdleHeightCol = showHurdleHeightCol; // actually only needed when there are different hurdle heights in the same seires or contest
        this.hurdles = hurdles; // is a hurdles competition; then maybe add the information about the heights and distances to the related groups

    }
}

/**
 * class to store the information about a contest; childs can be e,g. the series
 */
export class dContest extends dContainer{

    /**
     * Create a contest object from the data present in any contest
     * @param {object} contest The contest object including all series etc.
     * @param {array} series Array storing all series 
     * @param {array} startgroups Array with all additional information (name, firstname, event, etc) for each startgroup=seriesStartResult
     * @param {integer} xSeries The series to show. Null means that all series are printed. default=null 
     */
    /*static of(contest, series, startgroups, xSeries=null){
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
    }*/

    constructor(datetimeAppeal=new Date(), datetimeCall=new Date(), datetimeStart=new Date(), status=10, conf=null, baseDiscipline='', relatedGroups=[], categories){

        super()
        // content obviously similar to the contest table in the DB

        this.datetimeAppeal= datetimeAppeal;
        this.datetimeCall= datetimeCall;
        this.datetimeStart= datetimeStart;
        this.status= status;
        this.conf= conf;
        this.baseDiscipline= baseDiscipline;
        this.relatedGroups = relatedGroups;
        this.categories = categories; // used to translate xCategory to a string
        

        // the children are the series
    };

    addSeries(series){
        this.children.push(series);
    }

    sortSeries(property, inverse=false){
        this.sortChildren(property, inverse)
    }

    get datetimeAppealDateTime(){
        // get a formatted date+time
        return this._dateTime(this.datetimeAppeal);
    }
    get datetimeAppealTime(){
        return this._time(this.datetimeAppeal);
    }
    get datetimeCallDateTime(){
        // get a formatted date+time
        return this._dateTime(this.datetimeCall);
    }
    get datetimeCallTime(){
        return this._time(this.datetimeCall);
    }
    get datetimeStartDateTime(){
        // get a formatted date+time
        return this._dateTime(this.datetimeStart);
    }
    get datetimeStartTime(){
        return this._time(this.datetimeStart);
    }

    // TODO: provide some time-nice-printing functions here
}

/**
 * Provide information about the competition to be printed
 */
 export class dContestSheet extends dContest {
    constructor(datetimeAppeal=new Date(), datetimeCall=new Date(), datetimeStart=new Date(), status=10, conf=null, baseDiscipline='', relatedGroups, categories){

        super(datetimeAppeal, datetimeCall, datetimeStart, status, conf, baseDiscipline, relatedGroups, categories)
        // content obviously similar to the contest table in the DB

        // the children are the series
    };
}

// unused!
async function printContest(){

    let cContest = dContest.of(vueSeriesAdminTech.contest, vueSeriesAdminTech.series, vueSeriesAdminTech.startgroups, null)
    let hf = new dHeaderFooter([cContest]);
    let p = await printer.create([hf], true)
    //let p = new printer([hf], true)

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

    return p
}

// printing a contest
// create the data-container for the contest
//const cContest = dContest.of(contest, series, startgroups, null)

// now print it
//p = new printer(cContest)