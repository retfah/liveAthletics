
/**
 * CHANGES:
 * - move the height check into the children-loop of the parent
 * - async
 * - 2023-05: in general: simplification+documentation; comments, removed unused showSeparatorHere in pageBreak, 
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
// i.e. even when we prefer to have a container start on the next page than beeing split, we still must be able to handle cases where the full container does not fit the page!

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
 * OLD:
 * - <if a page break is needed between two childs>:
 *   - a special separator between childs, when there will be a page break in between two childs
 *   - pre-page-break content (e.g "continued on next page") 
 *   - post-page-break content (e.g. in tables a repetition of the header row) 
 *   - TODO: eventually it should be two separate pre/postPageBreaks: one, when the break is initiated by the container itself and one, when it is initiated within a child container.
 * NEW: 
 * - <if a page break is needed between two childs>:
 *   - a special separator between childs, when there will be a page break in between two childs (printChildSeparatorPrePageBreak)
 *   - a post-page-break separator (printChildSeparatorPostPageBreak)
 * - <if a page break is needed within a child>:
 *   - pre-page-break content (e.g "continued on next page")  (printPrePageBreak)
 *   - post-page-break content (e.g. in tables a repetition of the header row) (printPostPageBreak)
 * - a container "footer" 
 * Note: the special child separator between two childs (childSeparatorPrePageBreak) can NOT be implemented in the pre-page-break content! The difference is that the prePageBreak stuff gets printed when the new page is added within one of our childs and not between two of our childs, while the childSeparatorPrePageBreak obviously is only printed when the new page is created by this container BETWEEN two childs.
 * Note: if a container does not allow child break/must be printed as a whole, but also does not fit on one page, it will (1) begin on a new page and (2) will automatically split as soon as no further childs can be placed (TODO: check)
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
            hPrePageBreak: 0,
        }
    }

    /**
     * @param {object} page The page to draw on. Also contains a reference to the doc (page.doc), which is needed e.g. to embed pictures.
     * @param {object} pG consists of page-geometry several properties, defining the setup for the currently printed page: 
     * @param {number} pG.positionY The current y-position where to draw
     * @param {number} pG.hPrePageBreak The height needed to print all outer pre page break stuff, given this container will do a page break. (Since the number is not needed in cases where there is no page break within this container, the number might be too small otherwise)
     * @param {function} pageBreak Function (page, pG) to be called when a new page shall be created. Will print all "footers" (pre-page-break content), do the page break, print the post-page-break content (e.g. some repeated headers)
     * @return {number} the new positionY
     */
    async print(page, pG, pageBreak){

        // for debugging only: 
        let posYBefore = pG.positionY;

        // when this function gets called, then it is already clear that its minimum height (i.e. at least the header and the minimum number of childs with seaprators in between and a separatorPageBreak at the end) can be printed on the current page, since this is checked in the parent!

        // print the header
        [page, pG] = await this.printContainerHeader(page, pG);

        // get the prepagebreak heights, since this is used several times later
        let pph = await this.prePageBreakHeight();
        let csh = await this.childSeparatorHeight();
        let cshpb = await this.childSeparatorPrePageBreakHeight();
        let fh = await this.containerFooterHeight();

        // let for debugging only
        if (isNaN(pph) || isNaN(csh) || isNaN(cshpb) || isNaN(fh)){
            return;
        }
        
        // print all children and eventually create page breaks in between
        let childsOnThisPage = 0;
        for (let i=0; i<this.children.length; i++){

            // the prePageBreakHeight for the child to be printed depends on whether there will be a split within the next child or not; if there is none, we actually do not need to specify the correct hPrePageBreak, since there is anyway no pageBreak. We simply keep the hPrePageBreak of the current container.
            // if we would want to define it correctly, we would need to consider also whether the footer of this container will have to be printed afterwards or not and whether a regular separator or pageBreak separato will be printed
            let childHPrePageBreak = pG.hPrePageBreak;

            // check if we can print the next child, including the childSeparator before and after, otherwise print the childSeparatorPrePageBreak (if i>0) and do a pageBreak

            // first check if we can fully fit childSeaprator (if this is not the first child) + full next child + the childSeparatorPrePageBreak + footer (if this is the last child AND allowPageBreakBeforeFooter=false) with the remaining space (position-hPrePageBreak)
            if (pG.positionY - pG.hPrePageBreak - csh*(i>0) - (await this.totalChildHeight)[i] - cshpb*(i<this.children.length-1) - fh*((!this.allowPageBreakBeforeFooter) && i==this.children.length-1) < 0){
                // the child will NOT fully fit
                // thus, check if the page break may be done within the child; i.e. consider the pageBreakHeight of this container, but do not consider the separator
                if (pG.positionY - pG.hPrePageBreak - csh*(i>0) - (await this.minChildHeight)[i] - pph > 0){
                    // the min child height will fit, but not the total; thus, simply plot a separator and let the child do the page break
                    [page, pG] = await this.printChildSeparator(page, pG);

                    // define the hPrePageBreak to include the prepgaeBReak height of this container
                    childHPrePageBreak += pph;

                } else {
                    // neither the min child nor the total child fits; create a page break now and continue
                    if (i>0){
                        [page, pG] = await this.printChildSeparatorPrePageBreak(page, pG);
                    }
                    [page, pG] = await this._pageBreak(page, pG, pageBreak);

                    [page, pG] = await this.printChildSeparatorPostPageBreak(page, pG);
                    
                    childsOnThisPage = 0;
                }
            } else {
                // the child fully fits; so just print the regular separator, if i>0
                if (i>0){
                    [page, pG] = await this.printChildSeparator(page, pG);
                }
            }

            // the pageGeometry must be copied; otherwise we would not keep the actual pG for this function 
            let pGChild = copyObject(pG);
            pGChild.hPrePageBreak = childHPrePageBreak;
            
            let child = this.children[i];

            // prepare the pageBreak function for the child
            let pB = async (page, pG)=>{
                childsOnThisPage = 0;
                return this._pageBreak(page, pG, pageBreak);
            };

            // print the child
            [page, pG.positionY] = await child.print(page, pGChild, pB);
            childsOnThisPage++;

            // create a new page after n-children, but not at the end:
            if (childsOnThisPage % this.pageBreakAfterNChildren==0 && i+1<this.children.length){
                [page, pG] = await this.printChildSeparatorPrePageBreak(page, pG);
                [page, pG] = await this._pageBreak(page, pG, pageBreak);
            }
            
        }

        // is there enough space for the footer? 
        if (pG.positionY - pG.hPrePageBreak - (await this.containerFooterHeight())<0){
            // need a new page (no separators here)
            [page, pG] = await this._pageBreak(page, pG, pageBreak);
        }
        
        [page, pG] = await this.printContainerFooter(page, pG);

        if (this.pageBreakEnd){
            [page, pG] = await this._pageBreak(page, pG, pageBreak);
        }

        // return the current position; 
        return [page, pG.positionY];
    }

    // the total height only relates to the theoretical total height, assuming an infinitely long sheet of paper and thus not considering any page breaks
    async getTotalHeight(){

        // get the heights, since this is used several times later
        let csh = await this.childSeparatorHeight();
        let fh = await this.containerFooterHeight();
        
        let sepHeight = 0;
        if (this.children.length>1){
            sepHeight = csh*(this.children.length-1);
        }

        return (await this.containerHeaderHeight()) + (await this.totalChildHeight).reduce((tempSum, val)=>val+tempSum, 0) + sepHeight + fh;
    }

    // might be overriden in a different way by the inheriting class
    // returns the minimum required height to print this container. If breaks are allowed between children, this is the height of the container header, the minimum number of childs to print (including the separators) and the prePageBreakHeight. If all children must be printed it is the total height of the container.
    async getMinimumHeight(){

        // get the heights, since this is used several times later
        let csh = await this.childSeparatorHeight();
        let fh = await this.containerFooterHeight();
        let hh = await this.containerHeaderHeight();

        if (this.minimumChildrenPrint == null){
            // print all children
            let sepHeight = 0;
            if (this.children.length>1){
                sepHeight = csh*(this.children.length-1);
            }
            // if no page break before the footer is allowed, then it is teh same as the total height
            return hh + (await this.totalChildHeight).reduce((tempSum, val)=>val+tempSum, 0) + sepHeight + (!this.allowPageBreakBeforeFooter)*fh;
            

        } else if (this.children.length==0 || this.minimumChildrenPrint == 0){
            // only the header of this container is mandatory, plus eventually the footer
            return hh + (!this.allowPageBreakBeforeFooter)*fh;

        } else {
            // we have at least one children which must be printed
            
            let n = Math.min(this.children.length, this.minimumChildrenPrint);

            // differentiate whether the footer needs to be printed as well or not
            if (this.children.length<=this.minimumChildrenPrint && !this.allowPageBreakBeforeFooter){
                // footer must be printed
                return hh + (await this.totalChildHeight).slice(0, n).reduce((tempSum, val)=>val+tempSum, 0) + csh*(n-1) + fh;
            } else {
                // footer does not need to be printed
                return hh + (await this.totalChildHeight).slice(0, n).reduce((tempSum, val)=>val+tempSum, 0) + csh*(n-1);
            }

        }

    }

    // returns an array with the minimum child heights
    // note that the minChildHeight considers the breakability of the childs! I.e. if a child-conteiner must be printed as a whole, the minChildHeight is the total height of this container! The word "min" should not be misunderstos as "breaked-height".
    // attention: returns a Promise!
    get minChildHeight(){
        let ret = async()=>{
            // if not calculated yet, calculate it for every child.
            if (this.children.length>0 && this.children.length != this._minChildHeight.length){
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

    // implement what must be printed prior to pageBreak (e.g. "continued on next page"), if the break is done BETWEEN TWO CHILDS
    async printChildSeparatorPrePageBreak(page, pG){
        return [page, pG];
    }

    async childSeparatorPrePageBreakHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = (await this.fakeDoc).addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - (await this.printChildSeparatorPrePageBreak(page, pG))[1].positionY;
    }

    // implement what must be printes after pageBreak (e.g. "continued from ..."), if the break was done BETWEEN TWO CHILDS
    async printChildSeparatorPostPageBreak(page, pG){
        return [page, pG];
    }

    async childSeparatorPostPageBreakHeight(){
        // If it is not implemented by the client, return the height returned from actually drawing the footer
        // provide a fakeDocument to the real printing function to find out how much vertical space it will use when there is no page break needed; the page size is actually lower, i.e. it would print below the paper after one page; that does not matter.
        let page = (await this.fakeDoc).addPage(PDFLib.PageSizes.A4)
        let pG = this.getFakePG();
        let posY0 = pG.positionY;
        return posY0 - (await this.printChildSeparatorPostPageBreak(page, pG))[1].positionY;
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
        // NOTE: do NOT implement here the spacing to the next container! this must be done in the childSeparator of the parent! (The difference is that the separator will not be printed after the last child, but the footer would be.)
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

    // implement what must be printed prior to pageBreak (e.g. "continued on next page"), IF THE BREAK IS DONE WITHIN A CHILD
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
    async _pageBreak(page, pG, pB){

        // add whatever is needed from this container before the pageBreak
        [page, pG] = await this.printPrePageBreak(page, pG);

        // call the pageBreak function of the next outer container; it will return the new pageGeometry (containing positionY and the heights of the footers)
        [page, pG] = await pB(page, pG);

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
    * @param {number / array} conf.margin // analog css: either one value (all sides), two values (vertical, horizontal), three values (top, horizontal, bottom) or four values: (top, right, bottom, left)
    * @param {object} data to be used if the text is given by p
    * @param {object} page the page to print on
    * @param {number} posX2 Left position of the cell
    * @param {number} posY2 Top position of the cell
    * @param {number} sizeX width of the cell
    * @param {number} rowHeight the intended height of the row; if given, the text will be vertically aligned accordingly and the used height is equal to this number. Otherwise, word wrapping will automatically find out the required height and return the actually used height.
    * @param {object} conf a general configuration e.g. used by an outer function such as "tabular row". Those values (e.g. for font, size, horizontal scaling, alignment etc) defined in conf will be used if there is nothing specified in cellConf. 
    * @param {function} translate function that will be called to translate a text; by default returns the previous value
    * @returns {number} height of the cell
    */
    async printCell(cellConf, data, page, posX2, posY2, sizeX, rowHeight, conf, translate=(untranslated)=>untranslated){
        let ms = cellConf.maxMarginScale ?? (cellConf.ms ?? (conf.maxMarginScale ?? (conf.ms ?? 1)));
        let hs = cellConf.maxHorizontalScale ?? (cellConf.hs ?? (conf.maxHorizontalScale ?? (conf.hs ?? 1)));
        let nf = cellConf.noFitStrategy ?? (cellConf.nf ?? (conf.noFitStrategy ?? (conf.nf ?? 'cut')));
        let alignmentV = cellConf.alignmentV ?? (conf.alignmentV ?? 'C');
        let alignmentH = cellConf.alignmentH ?? (conf.alignmentH ?? 'L');
        let size = cellConf.size ?? (conf.size ?? 12);
        let lineHeight = cellConf.lineHeight ?? (conf.lineHeight ?? 1.2);
        let opacity = cellConf.opacity ?? (conf.opacity ?? 1);
        let margin = cellConf.margin ?? (conf.margin ?? 0);
        // evaluate margin
        let [marginTop, marginRight, marginBottom, marginLeft] = this.processMargin(margin);
        
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
                opts.size = opts.size*(sizeX - marginScaleApplied*(marginLeft+marginRight))/(widthUnscaled*textScaleApplied);
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

    /**
     * Draw a row of a general table based on the setting given in conf. Note that all options (except the content-properties) that can be specified for each cell can also be specified here as a general definition. A setting on cell level has priority. 
     * @param {object} conf The configuration for the table:
     * @param {number / array} conf.margin // analog css: either one value (all sides), two values (vertical, horizontal), three values (top, horizontal, bottom) or four values: (top, right, bottom, left)
     * @param {array} conf.columns // define the column width in points --> if totalWidth is given, the columns will be scaled to match the totalWidth
     * @param {number} conf.totalWidth (default: null) if totalWidth is given, the columns will be scaled to match the totalWidth
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
        let fitWidth = conf.totalWidth ?? null;
        
        let originalColWidth = conf.columns.reduce((val, valOld)=>val+valOld, 0);
        let totalWidth = fitWidth ?? originalColWidth;
        let colScaleFactor = totalWidth / originalColWidth;

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
        /*let printCell = async (cellConf, posX2, posY2, sizeX, rowHeight)=>{
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
            

        }*/ // end printCell
        
        // print content=cells
        let totalHeight = 0;
        for (let i=0; i< conf.columns.length ; i++){
                
            let cell = conf.cells[i];
            if (cell){
                // print single cell
                let posX2 = posX + conf.columns.slice(0,i).reduce((val, oldVal)=>val+oldVal, 0)*colScaleFactor; 
                totalHeight = Math.max(totalHeight, (await this.printCell(cell, data, page, posX2, posY, conf.columns[i]*colScaleFactor, rowHeight, conf, translate)));
            }
        }

        // draw horizontal lines
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
                let posX2 = posX + conf.columns.slice(0,i).reduce((val, valOld)=>val+valOld, 0)*colScaleFactor;
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
                let pc = new dataToPrint[dc.constructor.name](conf, dc);

                // copy the printConf overrides to the objects
                for (let prop in dc.printConf){
                    pc[prop] = dc.printConf[prop];
                }

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

    addPage(hPrePageBreak=0){
        // TODO: get page size from the (translated) configuration file
        let p = this.doc.addPage(PDFLib.PageSizes.A4)
        this.pages.push(p);
        let pG = {
            positionY: PDFLib.PageSizes.A4[1], // TODO: get from pageSize[1]
            hPrePageBreak: hPrePageBreak, // for the very first page it will be 0, but it must keep the value of the container initiating the page break afterwards
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
        return this.addPage(pG.hPrePageBreak);
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

        let conf = this.conf.contestSheetTech;
        //let fontHeader = await page.doc.getFont(conf.fontContestHeader);
        //let font = await page.doc.getFont(conf.font);
        let font = this.conf.font ?? 'Helvetica';

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

        pG.positionY -= 30;

        let groupLines = 0;
        if (this.data.showRelatedGroups){
            for (let rg of this.data.relatedGroups){
                groupLines++;
                // create the string: round name, event group name, ev. hurdle height, categories (from events), group name
                // additionally we could include the event info field

                // get all categories
                let xCats = rg.round.eventgroup.events.map(e=>e.xCategory);
                let cats = this.data.categories.filter(c=>xCats.includes(c.xCategory));
                cats.sort((a,b)=>a.sortorder - b.sortorder);

                let s = `${rg.round.name} ${rg.round.eventgroup.name} ${cats.map(c=>c.shortname).join('/')}`;
                // include group name only when there is more than one group
                if (rg.round.numGroups>1){
                    s += ` ${rg.name}`;
                }

                // print!
                page.drawText(s, {font:fontInstance, size: conf.sizeContestInfo, x:this.conf.marginLeft, y:pG.positionY-conf.sizeContestInfo*1.2*groupLines})
            }
        }

        pG.positionY -= conf.sizeContestInfo*1.2*groupLines;

        // print information about using the paper
        // TODO: change to printCell, as soon as this is not within the table anymore
        this.printTabularRow({font:font, size: conf.sizeContestInfo, cells:[{t:conf.strHelp, nf:'wordWrap'}], columns:[this.conf.pageSize[0]-this.conf.marginLeft-this.conf.marginRight]}, {}, page, this.conf.marginLeft, pG.positionY);

        pG.positionY -= 30;

        return [page, pG];
    }

    containerHeaderHeight(){
        return 60 + this.conf.contestSheetTrack.sizeContestInfo*1.2*this.data.relatedGroups.length;
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

    async printPostPageBreak(page, pG){
        // repeat the contest header
        return this.printContainerHeader(page, pG);
    }

    async printContainerHeader(page, pG){

        let conf = this.conf.contestSheetTrack;
        let font = conf.font ?? 'Helvetica';
        let fontInstance = await page.doc.getFont(font);

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
            font:font, 
            size: conf.size, 
            cells:[
                {t: conf.strCall+': ', p: 'datetimeCallTime', alignmentH:'R'},
            ], 
            columns:[usableWidth],
        };
        this.printTabularRow(tabConf, this.data, page, this.conf.marginLeft, pG.positionY-conf.sizeContestHeader*1.2);
        
        // make sure that more space is reserved if there are multiple lines for the hurdle height info!
        let hurdleLines = 0;

        // if it is a hurdle event, add a line for each height+distance
        if (this.data.hurdles){
            for (let discConf of this.data.disciplineConfigurations){
                hurdleLines ++;
                let s = `${discConf.height}: ${discConf.d1} m / ${discConf.d2} m / ${discConf.d3} m`
                page.drawText(s, {font:fontInstance, size: conf.size, x:this.conf.marginLeft, y:pG.positionY-conf.sizeContestHeader*1.2-hurdleLines*conf.size*1.2})
            }
        }

        // change the position
        pG.positionY -= Math.max(30, 30 + (hurdleLines-1)*conf.size*1.2);

        let groupLines = 0;
        if (this.data.showRelatedGroups){
            for (let rg of this.data.relatedGroups){
                groupLines++;
                // create the string: round name, event group name, ev. hurdle height, categories (from events), group name
                // additionally we could include the event info field

                // get all categories
                let xCats = rg.round.eventgroup.events.map(e=>e.xCategory);
                let cats = this.data.categories.filter(c=>xCats.includes(c.xCategory));
                cats.sort((a,b)=>a.sortorder - b.sortorder);


                // for hurdles, include the hurdle height with the eventgroup name
                let hurdleText='';
                if (this.data.hurdles){
                    let disc = this.data.disciplineConfigurations.find(d=>d.xDiscipline==rg.round.eventgroup.xDiscipline);
                    hurdleText = ` (${disc.height})`;
                }
                let s = `${rg.round.name} ${rg.round.eventgroup.name}${hurdleText} ${cats.map(c=>c.shortname).join('/')}`;
                // include group name only when there is more than one group
                if (rg.round.numGroups>1){
                    s += ` ${rg.name}`;
                }

                // print!
                page.drawText(s, {font:fontInstance, size: conf.sizeContestInfo, x:this.conf.marginLeft, y:pG.positionY-conf.sizeContestInfo*1.2*groupLines})
            }
        }

        pG.positionY -= 10 + conf.sizeContestInfo*1.2*groupLines;

        return [page, pG];
    }

    containerHeaderHeight(){
        return Math.max(40, 40 + (this.data.disciplineConfigurations.length-1)*this.conf.contestSheetTrack.size*1.2) + this.conf.contestSheetTrack.sizeContestInfo*1.2*this.data.relatedGroups.length;
    }

    postPageBreakHeight(){
        return this.containerHeaderHeight();
    }

    async printChildSeparator(page, pG){
        // add some space between
        pG.positionY -= this.conf.contestSheetTrack.spaceBetweenHeats;
        return [page, pG];
    }

    childSeparatorHeight(){
        return this.conf.contestSheetTrack.spaceBetweenHeats;
    }

    async printChildSeparatorPrePageBreak(page, pG){

        let conf = this.conf.contestSheetTrack;
        let font = await page.doc.getFont(conf.fontSeries);
        page.drawText(conf.strFurtherSeries, {x:this.conf.marginLeft, y: pG.positionY - conf.size, size:conf.size, font: font});
        pG.positionY -= conf.size ;

        return [page, pG];
    }

    async childSeparatorPrePageBreakHeight(){
        let conf = this.conf.contestSheetTrack;
        return conf.size;
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
            text = conf.strSeries+ ' '+this.data.name;
        } else {
            text = conf.strSeries+ ' '+ this.data.number;
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
    
    printContainerFooter(page, pG){
        // just add some space
        pG.positionY -= 15;
        return [page, pG]
    }

    containerFooterHeight(){
        return 15;
    }

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
        return this.conf.contestSheetHigh.spaceBetweenAthletes;
    }

    printChildSeparatorPrePageBreak(page, pG){
        // if the series would be breakable, we would implement here a text like "series continues on next page"
        return [page, pG];
    }
}
export class pSeriesContestSheetTrack extends printingGeneral{

    constructor (conf, data){
        super(conf, data)

        // always fully print the heat!
        this.minimumChildrenPrint = null;

    }

    async printContainerHeader(page, pG){
        // draw the name+number of the series, eventually how many athletes on this page

        let globalConf = this.conf;
        let conf = globalConf.contestSheetTrack;

        let fontSeries = await page.doc.getFont(conf.fontSeries);

        // draw the series name
        let text = '';
        if (this.data.name){
            text = conf.strHeat + ' ' + this.data.name;
        } else {
            text = conf.strHeat + ' ' + this.data.number + ' ' + conf.strOf + ' ' + this.data.parent.children.length;
        }
        // draw info as a table; series on the left, wind in center (if required; as a cell with solid border) time on the right 
        // since we cannot have the border only around a cell, we need to draw two tables; one for the elements without the border, and one for the wind
        let confTable = {
            margin:0,
            columns:[220, 75, 220], // total 515
            //rowHeight: 20,
            cells: [{t:text}, {opacity:conf.opacityWindBackground, alignmentH:"C"}, {p:'datetimeFormatted', alignmentH:"R"}],
            data: this.data,
        }
        this.printTabularRow(confTable, this.data, page, globalConf.marginLeft, pG.positionY);

        confTable = {
            margin:0,
            columns:[75], // total 515
            rowHeight: 22,
            linesVertical:[1,1],
            linesHorizontal:[1,1],
            cells: [{t:conf.strWind, opacity:conf.opacityWindBackground, alignmentH:"C"}],
            data: this.data,
        }
        this.printTabularRow(confTable, this.data, page, globalConf.marginLeft + 220, pG.positionY);

        pG.positionY -= 22;

        // show ID if requested
        if (this.data.showId){
            // show in small below the series
            let s = `ID: ${this.data.id}`;
            page.drawText(s, {x:globalConf.marginLeft, y:pG.positionY+2, size:conf.sizeContestInfo})
            //pG.positionY -= conf.sizeContestInfo*1.2;
        }

        // create the header of the table
        // the actual column widths will be calculated by printTabularRow
        let colConf = JSON.parse(JSON.stringify(conf.athleteColumns)); // copy is needed to not delete the data in the original configuration
        
        // replace the cell defintion and font header
        colConf.font = colConf.fontHeader;

        // delete the columns that are not selected
        if (!this.data.showLane){
            let i = colConf.cells.findIndex(x=>x.p=="startConf");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i+1,1); // remove right line
        }
        if (!this.data.showPosition){
            let i = colConf.cells.findIndex(x=>x.p=="position");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i+1,1); // remove right line
        }
        if (!this.data.showReactiontime){
            let i = colConf.cells.findIndex(x=>x.identifier=="reaction");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i,1);
        }
        if (!this.data.showRank){
            let i = colConf.cells.findIndex(x=>x.identifier=="rank");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i,1);
        }
        if (!this.data.showResult){
            let i = colConf.cells.findIndex(x=>x.identifier=="result");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i,1);
        }
        if (!this.data.showHurdleHeightCol){
            let i = colConf.cells.findIndex(x=>x.identifier=="hurdles");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i,1);
        }
        
        colConf.cells = colConf.cellsHeader;
        colConf.rowHeight = colConf.rowHeightHeader;

        // add top line as wide as the lower
        colConf.linesHorizontal[0] = colConf.linesHorizontal[1];

        let height = await this.printTabularRow(colConf, this.data, page, globalConf.marginLeft, pG.positionY);

        pG.positionY -= height;

        return [page, pG]
    }

     // we have a fixed height, so we avoid calculating the height by defining this function
    /*containerHeaderHeight(){
        return 30; 
    }*/

    printContainerFooter(page, pG){
        return [page, pG];
    }

    containerFooterHeight(){
        return 0;
    }

    printPostPageBreak(page, pG){
        // show "Serie X" continued and the header of the table, but without the rest of information
        // TODO
        // OLD: just repeat the regular header stuff
        return this.printContainerHeader(page, pG);
    }

    postPageBreakHeight(){
        // just repeat the regular header stuff
        return this.containerHeaderHeight();
    }

    async printChildSeparator(page, pG){
        return [page, pG];
    }

    async childSeparatorHeight(){
        return 0;
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

        let globalConf = this.conf;

        let conf = globalConf.contestSheetTrack;
        let colConf = JSON.parse(JSON.stringify(conf.athleteColumns)); // copy is needed to not delete the data in the original configuration

        // delete the columns that are not selected
        if (!this.data.parent.showLane){
            let i = colConf.cells.findIndex(x=>x.p=="startConf");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i+1,1); // remove right line
        }
        if (!this.data.parent.showPosition){
            let i = colConf.cells.findIndex(x=>x.p=="position");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i+1,1); // remove right line
        }
        if (!this.data.parent.showReactiontime){
            let i = colConf.cells.findIndex(x=>x.identifier=="reaction");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i,1);
        }
        if (!this.data.parent.showRank){
            let i = colConf.cells.findIndex(x=>x.identifier=="rank");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i,1);
        }
        if (!this.data.parent.showResult){
            let i = colConf.cells.findIndex(x=>x.identifier=="result");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i,1);
        }
        if (!this.data.parent.showHurdleHeightCol){
            let i = colConf.cells.findIndex(x=>x.identifier=="hurdles");
            colConf.cells.splice(i,1);
            colConf.cellsHeader.splice(i,1);
            colConf.columns.splice(i,1);
            colConf.linesVertical.splice(i,1);
        }

        if (typeof(pG.positionY) != 'number'){
            let x=true
        }

        // draw the athletes header
        pG.positionY -= await this.printTabularRow(colConf, this.data, page, globalConf.marginLeft, pG.positionY) 

        return [page, pG];
    }

}


/**
 * dContainer: general container keeping data-content and childs structured
 * There is one special property: printConf (object), whose properties will be copied to the printing class, allowing to change its setting, e.g. limiting the number of children per page or adding pageBreaks  before/after. 
 */
export class dContainer {
    
    constructor(printConf={}){
        
        // keep a list of all child elements
        this.children = [];

        // keep a reference to the parent; this is useful e.g. to set some properties on the parent instead of in all children as well, e.g. set which columns to show on the table container including the header, but not on the single line-containers.
        this.parent = null;

        this.printConf = printConf;

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

    addChild(child){
        this.children.push(child);
        child.parent = this;
    }

    // provide some functions for date formatting
    _dateTime(dateString){
        let d = new Date(dateString);
        return `${d.getDate().toString().padStart(2,'0')}.${(d.getMonth()+1).toString().padStart(2,'0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
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
        if (!this.birthdate) return '';
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
        if (!this.birthdate) return '';
        return this.birthdate.slice(2,4);
    }

    get year4(){
        if (!this.birthdate) return '';
        return this.birthdate.slice(0,4);
    }
}

/**
 * Extends the pPerson class by the properties needed to print a contestSheet for TECH HIGH. 
 */
export class dPersonContestSheetHigh extends dPerson {

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

/**
 * Extends the pPerson class by the properties needed to print a contestSheet (should work for track, techLong and techHigh)
 */
export class dPersonContestSheetTrack extends dPerson {

    /**
     * Create a personContestSheer object just from the information given in the startgroup and in the seriesstartresult
     * @param {object} startGroup The startgroup object containing all information (name, firstname, club, etc) for each seriesStartResult in one object
     * @param {object} ssr The seriesStartResult object, containing position and lane (=startConf)
     */
    /*static of (startGroup, ssr){
        return new dPersonContestSheet(startGroup.athleteName, startGroup.athleteForename, startGroup.bib, startGroup.birthdate, startGroup.country, startGroup.regionShortname, startGroup.clubName, startGroup.eventGroupName, startGroup.xDiscipline, ssr.position, ssr.startConf)
    }*/

    constructor (lastname, firstname, bib, birthdate, country, regionShortname, clubName, eventGroupName, xDiscipline, position, categoryName, hurdle, startConf=null){
        super(lastname, firstname, bib, birthdate, country, regionShortname, clubName, eventGroupName, xDiscipline, categoryName)
        this.position = position;
        this.startConf = startConf;
        this.hurdle = hurdle; // needed to show the heights in the background of the cells
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

    get datetimeFormatted(){
        return this._time(this.datetime);
    }
}

export class dSeriesSheetHigh extends dSeries {
    
    constructor(xSeries, status, number, name, siteName, SSR, heights, datetime){
        
        super(xSeries, status, number, name, siteName, SSR, datetime);
        this.heights = heights;
    }
}

export class dSeriesSheetTrack extends dSeries {
    
    constructor(xSeries, status, number, name, siteName, SSR, datetime, id, requiresWind, showLane=true, showPosition=true, showReactiontime=false, showId=true, showHurdleHeightCol=false, hurdles=false, showRank=false, showResult=true){
        
        super(xSeries, status, number, name, siteName, SSR, datetime);
        this.id = id;
        this.requiresWind = requiresWind; // show a field for the wind
        this.showLane = showLane;
        this.showPosition = showPosition;
        this.showId = showId;
        // show empty lanes is not an option here, since empty lanes simply would have to be real entries with simply empty name etc.
        this.showReactiontime = showReactiontime;
        this.showHurdleHeightCol = showHurdleHeightCol; // actually only needed when there are different hurdle heights in the same series or contest
        this.hurdles = hurdles; // is a hurdles competition; then maybe add the information about the heights and distances to the related groups
        this.showRank = showRank; // show a column for the rank; in modern sitautions with automatic data transfer not needed
        this.showResult = showResult;
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

    constructor(datetimeAppeal=new Date(), datetimeCall=new Date(), datetimeStart=new Date(), status=10, conf=null, baseDiscipline='', relatedGroups=[], categories, printConf={}){

        super(printConf)
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
        series.parent = this;
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
    constructor(datetimeAppeal=new Date(), datetimeCall=new Date(), datetimeStart=new Date(), status=10, conf=null, baseDiscipline='', relatedGroups, categories, printConf={}, showRelatedGroups=false, ){

        super(datetimeAppeal, datetimeCall, datetimeStart, status, conf, baseDiscipline, relatedGroups, categories, printConf)
        // content obviously similar to the contest table in the DB

        this.showRelatedGroups = showRelatedGroups;

        // the children are the series
    };
}

export class dContestSheetTrack extends dContestSheet {
    constructor(datetimeAppeal=new Date(), datetimeCall=new Date(), datetimeStart=new Date(), status=10, conf=null, baseDiscipline='', relatedGroups, categories, discConf=[], showRelatedGroups, hurdles=false, printConf={}){

        super(datetimeAppeal, datetimeCall, datetimeStart, status, conf, baseDiscipline, relatedGroups, categories, printConf, showRelatedGroups)
        // content obviously similar to the contest table in the DB

        // store a list of the discipline configurations that are involved; this is mainly useful for hurdles, where the discipline-configuratio contains "height" and distances d1, d2, d3.
        this.disciplineConfigurations = discConf;
        this.hurdles = hurdles;
        
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