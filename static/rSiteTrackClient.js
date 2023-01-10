


export class rSiteTrackClient extends roomClient{

    /**
     * 
     * @param {roomClientVue} v The vue that should be linked first (can be undefined)
     * @param {wsProcessor} wsHandler websocket handler
     * @param {eventHandler} eventHandler The event handler
     * @param {roomManager} rM The roomManager instance
     * @param {boolean} writing Whether writing rights shall be requested or not
     * @param {string} datasetName The name of the dataset to get from the server (surrently either ''=room data or 'meetingSelection')
     * @param {string} roomName The name of the room; within a meeting, the room name is not automatically given by the class, but contains the meeting-shortname and therefore must be given
     */
    constructor(v, wsHandler, eventHandler, rM, writing=false, storeInfos='', datasetName='', roomName){

        let failCB = (msg, code)=>{}
        let successCB = ()=>{}

        // call the parent constructor
        //(v, name, wsHandler, eventHandler, onlineOnly, writing, success, failure, storeInfos=false, rM, datasetName='', writingChangedCB)
        
        // the room name must include the meeting name (site@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('addSeries', this.addSeriesExe);
        this._addFunction('deleteSeries', this.deleteSeriesExe);
        this._addFunction('changeSeries', this.changeSeriesExe);
        this._addFunction('changeContest', this.changeContestExe);
    }

    changeContestExe(contest){
        // search the contest first
        const ic = this.data.contests.findIndex(c=>c.xContest==contest.xContest);
        // copy over the present series to the new contest object and save it
        contest.series = this.data.contests[ic].series;
        this.data.contests[ic] = contest;
    }

    changeSeriesExe(series){
        // search the contest first
        const c = this.data.contests.find(c=>c.xContest==series.xContest);
        if (c){
            // search the series
            const si = c.series.findIndex(s=>s.xSeries == series.xSeries);

            // update it
            c.series[si] = series;

        } else {
            this.logger.log(20, `Could not update xSeries=${series.xSeries} from xContest=${series.xContest} because this contest has no series on xSite=${this.site.xSite}.`)
        }
    }

    deleteSeriesExe(series){
        // search the contest first
        const c = this.data.contests.find(c=>c.xContest==series.xContest);
        if (c){
            // search the series
            const si = c.series.findIndex(s=>s.xSeries == series.xSeries);

            // delete it
            c.series.splice(si,1);

            // delete the contest if it has no series anymore
            if (c.series.length == 0){
                let i = this.data.contests.findIndex(c=>c.xContest==series.xContest);
                if (i>=0){
                    // should always be the case
                    this.data.contests.splice(i,1);
                }
            }
        } else {
            this.logger.log(20, `Could not delete xSeries=${series.xSeries} from xContest=${series.xContest} because this contest has no series on xSite=${this.site.xSite}.`)
        }
    }

    addSeriesExe(data){
        // it should be possible to use here the same code as on the server
        const contest = data.contest;
        const series = data.series;

        // get (or create) the contest in the data of this room 
        const c = this.getOrCreateContest(contest.xContest, contest);

        // add the series to the main data object
        c.series.push(series)
    }

    /**
     * Try to get the object of the specified contest
     * @param {integer} xContest 
     * @param {object} contest the contest data object for 
     */
    getOrCreateContest(xContest, contest){
        let c = this.data.contests.find(contest=>contest.xContest == xContest);
        if (!c){
            // add the contest
            const c2 = contest;
            c = {
                conf: c2.conf,
                datetimeAppeal: c2.datetimeAppeal,
                datetimeCall: c2.datetimeCall,
                datetimeStart: c2.datetimeStart,
                name: c2.name,
                status: c2.status,
                xBaseDiscipline: c2.xBaseDiscipline,
                xContest: c2.xContest,
                series:[],
            }
            this.data.contests.push(c);
        }
        return c;
    }

}


// this class is actually mainly made for the timing (i.e. on a server, and not in the browser.). However, eventually we might merge those function with the regular rSiteTrackClient.
export class rSiteTrackClientForTiming extends rSiteTrackClient{
    /**
     * 
     * @param {wsProcessor} wsHandler websocket handler
     * @param {eventHandler} eventHandler The event handler
     * @param {string} roomName The name of the room; within a meeting, the room name is not automatically given by the class, but contains the meeting-shortname and therefore must be given
     */
    constructor(wsHandler, eventHandler, roomName){

        // call the parent constructor
        super(undefined, wsHandler, eventHandler, undefined, true, storeInfos='', datasetName='', roomName)

    }

    /**
     * may be called when the heat is started
     * @param {DateTime} time the time in UTC when the race was started; if nto given, the time now is considered.
     */
    start(time){
        if (!time){
            time = new Date();
        }

        // send note to rSite
        // TODO
    }

    /**
     * may be called when the heat is started
     * @param {DateTime} time the time in UTC when the race was started; if nto given, the time now is considered.
     */
    falseStart(time){
        if (!time){
            time = new Date();
        }

        // send note to rSite
        // TODO
    }

    /**
     * may be called when the fotocell or any other inofficial timemaking is triggered
     * @param {integer} inofficialTime the inofficial time in 1/100'000 s
     */
    finish(inofficialTime){
        // send note to rSite
        // TODO
    }

    // TODO: override all exe-functions in rSiteTrackClient in order to be able to react to those events
    changeContestExe(contest){
        // first, process the change regularly
        super.changeContestExe(contest);

        // then, notify the timing about the change
        // TODO
    }

    changeSeriesExe(contest){
        // first, process the change regularly
        super.changeSeriesExe(contest);

        // then, notify the timing about the change
        // TODO
    }

    addSeriesExe(contest){
        // first, process the change regularly
        super.addSeriesExe(contest);

        // then, notify the timing about the change
        // TODO
    }

    deleteSeriesExe(contest){
        // first, process the change regularly
        super.deleteSeriesExe(contest);

        // then, notify the timing about the change
        // TODO
    }

    // We do nto have any roomClientVues connected here, so we override those "event-functions"
    onWritingTicketChange(){

    }

    afterFullreload(){

    }

    onChange(){

    }

}