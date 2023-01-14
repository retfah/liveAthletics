
import mixin from "./static/rSiteTrackMixin.js";
import roomClient from "./roomClientForServer.js";

// TODO: copy (Object.assign) all methods from rSiteTrackClient to rSiteTrackClientForTiming

// this class is actually mainly made for the timing (i.e. on a server, and not in the browser.). However, eventually we might merge those function with the regular rSiteTrackClient.
class rSiteTrackClientForTiming extends roomClient{
    /**
     * 
     * @param {wsProcessor} wsHandler websocket handler
     * @param {eventHandler} eventHandler The event handler
     * @param {string} roomName The name of the room; within a meeting, the room name is not automatically given by the class, but contains the meeting-shortname and therefore must be given
     */
    constructor(wsHandler, eventHandler, roomName, successCB, failureCB, logger){

        // TODO: the roomManager-variable could be used to get error messages (this is actually its sole function in roomClient)

        // call the parent constructor
        //super(undefined, wsHandler, eventHandler, undefined, true, storeInfos='', datasetName='', roomName)
        //(v, name, wsHandler, eventHandler, onlineOnly, writing, success, failure, storeInfos=false, rM, datasetName='', writingChangedCB, extraLogger, ID=0, roomEnterOptions=undefined)
        super(undefined, roomName, wsHandler, eventHandler, true, true, successCB, failureCB, false, undefined, '', null, logger)

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

    // TODO: override all exe-functions in rSiteTrackClient in order to be able to react to those events
    changeContestExe(contest){
        // first, process the change regularly
        super.changeContestExe2(contest);

        // then, notify the timing about the change
        // TODO
    }

    changeSeriesExe(contest){
        // first, process the change regularly
        super.changeSeriesExe2(contest);

        // then, notify the timing about the change
        // TODO
    }

    addSeriesExe(contest){
        // first, process the change regularly
        super.addSeriesExe2(contest);

        // then, notify the timing about the change
        // TODO
    }

    deleteSeriesExe(contest){
        // first, process the change regularly
        super.deleteSeriesExe2(contest);

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

// extend the class rSiteTrackCLient with all methods except the constructor
// need to rename the functions, since we overwrite them here!
for (let f in mixin){
    rSiteTrackClientForTiming[`${f}2`] = mixin[f];
}
//Object.assign(rSiteTrackClientForTiming.prototype, mixin);

export default rSiteTrackClientForTiming;