
import mixin from "./rSiteTrackMixin.js";

export class rTimingClient extends roomClient{


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

        let failCB = (msg, code)=>{};
        let successCB = ()=>{};
        
        // the room name must include the meeting name (club@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('updateInfo', this.updateInfoExe);
        this._addFunction('updateSiteConf', this.updateSiteConfExe);
        this._addFunction('updateTimingOptions', this.updateTimingOptionsExe);
        this._addFunction('updateSiteData', this.updateSiteDataExe);
        this._addFunction('updateTimers', this.updateTimersExe);
        this._addFunction('updateAuto', this.updateAutoExe);
        
        // functions from rSiteTrackClient: (mixed in below)
        this._addFunction('addSeries', this.addSeriesExe);
        this._addFunction('deleteSeries', this.deleteSeriesExe);
        this._addFunction('changeSeries', this.changeSeriesExe);
        this._addFunction('changeContest', this.changeContestExe);

        // the "same" functions also exist for the rTiming data
        this._addFunction('addSeriesTiming', this.addSeriesTExe);
        this._addFunction('deleteSeriesTiming', this.deleteSeriesTExe);
        this._addFunction('changeSeriesTiming', this.changeSeriesTExe);
        this._addFunction('changeContestTiming', this.changeContestTExe);

        // functions for result changes
        // TODO
    }

    updateInfoExe(infos){
        this.propertyTransfer(infos, this.data.infos);
    }

    // there is no exe function for this, since this is actually a note (sent as a request, since roomClient is not designed for notes yet). The note simply invokes changes, which are broadcast by other means.
    heatsToTimingInit(add, update, del, updateContest){
        this.addToStack('heatsToTiming', {add, update, delete:del, updateContest}, ()=>{});
    }
    heatToTimingInit(xContest, xSeries){
        this.addToStack('heatToTiming', {xContest, xSeries}, ()=>{});
    }

    // there is no exe function for this, since this is actually a note (sent as a request, since roomClient is not designed for notes yet). The note simply invokes changes, which are broadcast by other means.
    resultsToLAInit(add, update, includeReaction){
        this.addToStack('resultsToLA', {add, update, includeReaction}, ()=>{});
    }
    resultsToLASingleInit(xContest, xSeries, includeReaction){
        this.addToStack('resultsToLASingle', {xContest, xSeries, includeReaction}, ()=>{});
    }

    // provide the possibility to call onResponse-function when the response has arrived. Used if timers and auto are changed at the same time
    updateAutoInit(auto, onResponse=null){
        let override = undefined;
        if (onResponse){
            override = (newAuto) => {
                this.updateAutoExe(newAuto);
                onResponse();
            }
        }
        this.addToStack('updateAuto', auto, override);
    }
    updateAutoExe(auto){
        this.propertyTransfer(auto, this.data.auto);
    }

    updateTimersInit(timers){
        this.addToStack('updateTimers', timers);
    }
    updateTimersExe(timers){
        this.propertyTransfer(timers, this.data.timers);
    }

    updateSiteConfInit(siteConf){
        this.addToStack('updateSiteConf', siteConf);
    }
    updateSiteConfExe(siteConf){
        this.propertyTransfer(siteConf, this.data.siteConf);
    }

    updateTimingOptionsInit(timingOptions){
        this.addToStack('updateTimingOptions', timingOptions);
    }
    updateTimingOptionsExe(timingOptions){
        this.propertyTransfer(timingOptions, this.data.timingOptions);
    }

    updateSiteDataExe(contests){
        this.propertyTransfer(contests, this.data.contests, false);
    }

    changeContestTExe(contest){
        // search the contest first
        const ic = this.data.data.findIndex(c=>c.xContest==contest.xContest);
        // copy over the present series to the new contest object and save it
        contest.series = this.data.data[ic].series;
        this.data.data[ic] = contest;

        this.sortData();
    }

    changeSeriesTExe(series){
        // search the contest first
        const c = this.data.data.find(c=>c.xContest==series.xContest);
        if (c){
            // search the series
            const s = c.series.find(s=>s.xSeries == series.xSeries);

            // update it
            this.propertyTransfer(series, s)

        } else {
            this.logger.log(20, `Could not update xSeries=${series.xSeries} from xContest=${series.xContest} because this contest has no series on xSite=${this.site.xSite}.`)
        }

        this.sortData();
    }

    deleteSeriesTExe(series){
        // search the contest first
        const c = this.data.data.find(c=>c.xContest==series.xContest);
        if (c){
            // search the series
            const si = c.series.findIndex(s=>s.xSeries == series.xSeries);

            // delete it
            c.series.splice(si,1);

            // delete the contest if it has no series anymore
            if (c.series.length == 0){
                let i = this.data.data.findIndex(c=>c.xContest==series.xContest);
                if (i>=0){
                    // should always be the case
                    this.data.data.splice(i,1);
                }
            }
        } else {
            this.logger.log(20, `Could not delete xSeries=${series.xSeries} from xContest=${series.xContest} because this contest has no series on xSite=${this.site.xSite}.`)
        }
    }

    addSeriesTExe(data){
        // it should be possible to use here the same code as on the server
        const contest = data.contest;
        const series = data.series;

        // get (or create) the contest in the data of this room 
        const c = this.getOrCreateContestTiming(contest.xContest, contest);

        // add the series to the main data object
        c.series.push(series)

        this.sortData();
    }

    /**
     * Try to get the object of the specified contest
     * @param {integer} xContest 
     * @param {object} contest the contest data object for 
     */
    getOrCreateContestTiming(xContest, contest){
        let c = this.data.data.find(contest=>contest.xContest == xContest);
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
            this.data.data.push(c);
        }
        return c;
    }

    // sort the local data by the starttime, heat number and position
    sortData(){
        // first sort the contests
        this.data.data.sort((c1, c2)=>{
            return c1.datetimeStart-c2.datetimeStart;
        })

        // then sort each series
        for (let c of this.data.data){
            c.series.sort((s1, s2)=>{
                // use the number for sorting.
                return s1.number-s2.number;
            })

            // sort the athletes in the heat
            for (let s of c.series){
                s.SSRs.sort((ssr1, ssr2)=>{
                    return ssr1.position-ssr2.position;
                })
            }
        }
    }
}

// provide all functions of rSiteTrackClient also in rTimingClient.
// ATTENTION: the functions still must be referenced in the constructor
Object.assign(rTimingClient.prototype, mixin);