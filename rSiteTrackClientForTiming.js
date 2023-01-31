
import mixin from "./static/rSiteTrackMixin.js";
import roomClient from "./roomClientForServer.js";

// NOTES:
// - the actual exe-functions also used in rSiteTrackClient (i.e. in the browser) are mixed in with "name2", i.e. updateSeriesExe in browser is updateSeriesExe2 here. The function with the original name handles the incoming change, but passes it directly to the mixed in function. After this, the function calls the respective function in rTiming so that also the clients (that are only connected to rTiming) get the changed data.  

// this class is actually mainly made for the timing (i.e. on a server, and not in the browser.). However, eventually we might merge those function with the regular rSiteTrackClient.
class rSiteTrackClientForTiming extends roomClient{
    /**
     * 
     * @param {wsProcessor} wsHandler websocket handler
     * @param {eventHandler} eventHandler The event handler
     * @param {string} roomName The name of the room; within a meeting, the room name is not automatically given by the class, but contains the meeting-shortname and therefore must be given
     */
    constructor(wsHandler, eventHandler, roomName, successCB, failureCB, logger, rTiming){

        // TODO: the roomManager-variable could be used to get error messages (this is actually its sole function in roomClient)

        // call the parent constructor
        //super(undefined, wsHandler, eventHandler, undefined, true, storeInfos='', datasetName='', roomName)
        //(v, name, wsHandler, eventHandler, onlineOnly, writing, success, failure, storeInfos=false, rM, datasetName='', writingChangedCB, extraLogger, ID=0, roomEnterOptions=undefined)
        super(undefined, roomName, wsHandler, eventHandler, true, true, successCB, failureCB, false, undefined, '', null, logger)

        this.rTiming = rTiming;

        // set the available functions
        this._addFunction('addSeries', this.addSeriesExe);
        this._addFunction('deleteSeries', this.deleteSeriesExe);
        this._addFunction('changeSeries', this.changeSeriesExe);
        this._addFunction('changeContest', this.changeContestExe);
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

    // override all exe-functions in rSiteTrackClient in order to be able to react to those events:
    changeContestExe(contest){
        // first, process the change regularly
        this.changeContestExe2(contest);

        // then, notify the clients of the timing about the change
        this.rTiming.relaySiteChange('changeContest', contest);

        // then let rTiming handle automatic take-over, if needed.
        this.rTiming.changeContestTiming(contest);
    }

    changeSeriesExe(series){
        // first, process the change regularly
        this.changeSeriesExe2(series);

        // then, notify the timing about the change
        this.rTiming.relaySiteChange('changeSeries', series);

        // then let rTiming handle automatic take-over, if needed.
        this.rTiming.changeSeriesTiming(series);
    }

    addSeriesExe(data){
        // first, process the change regularly
        this.addSeriesExe2(data);

        // then, notify the timing about the change
        this.rTiming.relaySiteChange('addSeries', data);

        // then let rTiming handle automatic take-over, if needed.
        this.rTiming.addSeriesTiming(data);
    }

    deleteSeriesExe(series){
        // first, process the change regularly
        this.deleteSeriesExe2(series);

        // then, notify the timing about the change
        this.rTiming.relaySiteChange('deleteSeries', series);

        // then let rTiming handle automatic take-over, if needed.
        this.rTiming.deleteSeriesTiming(series);
    }

    // We do nto have any roomClientVues connected here, so we override those "event-functions"
    onWritingTicketChange(){

    }

    afterFullreload(){

    }

    onChange(){

    }

}

// extend the class rSiteTrackCLient with all methods except the constructor
// need to rename the functions, since we overwrite them here!
const mixin2 = {}
for (let f in mixin){
    //rSiteTrackClientForTiming[`${f}2`] = mixin[f];
    if (f != 'getOrCreateContest'){
        mixin2[`${f}2`] = mixin[f];
    } else {
        mixin2[f] = mixin[f];
    }
}
Object.assign(rSiteTrackClientForTiming.prototype, mixin2);

export default rSiteTrackClientForTiming;