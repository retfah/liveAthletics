import { rContestClient } from "./rContestClient.js";

export class rContestTechHighClient extends rContestClient{

    /**
     * 
     * @param {roomClientVue} v The vue that should be linked first (can be undefined)
     * @param {wsProcessor} wsHandler websocket handler
     * @param {eventHandler} eventHandler The event handler
     * @param {roomManager} rM The roomManager instance
     * @param {boolean} writing Whether writing rights shall be requested or not
     * @param {boolean} storeInfos
     * @param {string} datasetName The name of the dataset to get from the server (surrently either ''=room data or 'meetingSelection')
     * @param {string} roomName The name of the room; within a meeting, the room name is not automatically given by the class, but contains the meeting-shortname and therefore must be given
     */
    constructor(v, wsHandler, eventHandler, rM, writing=false, storeInfos=true, datasetName='', roomName){

        super(v, wsHandler, eventHandler, rM, writing, storeInfos, datasetName, roomName);

        /*let failCB = (msg, code)=>{}
        let successCB = ()=>{}

        // call the parent constructor
        //(v, name, wsHandler, eventHandler, onlineOnly, writing, success, failure, storeInfos=false, rM, datasetName='', writingChangedCB)
        
        // the room name must include the meeting name (contest@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, false, writing, successCB, failCB, storeInfos, rM, datasetName);*/ 

        // ATTENTION: the same (!) default data must be present in the server room as well!
        this.defaultAuxData = {
            positionNext: [],
            position: [],
            attemptPeriod: 60, // s; mainly related to the next athlete
            periodStartTime: null, // date-string of the server time when the attempt period started
            showAttemptPeriod: false, 
            currentHeight: -1,
            currentJumpoffHeightInd: -1,
            attempt: 0,
            attemptNext: 0,
        }


        // set the available functions
        //this._addFunction('moveSeries', this.moveSeriesExe);
        this._addFunction('updateContest2', this.updateContest2Exe);
        //this._addFunction('updatePresentState', this.updatePresentStateExe);
        //this._addFunction('addStartsInGroup', this.addStartsInGroupExe);
        //this._addFunction('deleteStartsInGroup', this.deleteStartsInGroup);
        //this._addFunction('groupUnlinked', this.groupUnlinkedExe);
        //this._addFunction('groupLinked', this.groupLinkedExe);
        //this._addFunction('initialSeriesCreation', this.initialSeriesCreationExe);
        //this._addFunction('deleteAllSeries', this.deleteAllSeriesExe);
        //this._addFunction("deleteSSR", this.deleteSSRExe);
        this._addFunction('addSSR', this.addSSRExe);
        this._addFunction('changePosition', this.changePositionExe);
        this._addFunction('addHeight', this.addHeightExe);
        this._addFunction('deleteHeight', this.deleteHeightExe);
        this._addFunction('updateSSR', this.updateSSRExe);
        this._addFunction('addResult', this.addResultExe);
        this._addFunction('updateResult', this.updateResultExe);
        this._addFunction('deleteResult', this.deleteResultExe);
        //this._addFunction('updateSeries', this.updateSeriesExe);
        //this._addFunction('updateAuxData', this.updateAuxDataExe);
        //this._addFunction('addSeries', this.addSeriesExe);
        //this._addFunction('deleteSeries', this.deleteSeriesExe);
        //this._addFunction('updateHeatStarttimes', this.updateHeatStarttimesExe);
        //this._addFunction('renewStartgroups', this.renewStartgroupsExe);
    }

    // Infos about aux data:
        // what information to broadcast during the competition
        // - position and positionNext change
        // - start attemptPeriod / stop AttemptPeriod (can be done as follows: property "attemptPeriodStart" defines the time the attemptPeriod is started. If the property is empty, the attempt period is not running.)
        // - showAttemptPeriod (true/false; can then be used to either completely shut on/off the clock on the clients when not used, but also to hide temporarily) 
        // - attemptPeriod (how long it shall be; )
        // - some info about the clock-offset on the client DONE (on initialization)
        // - we must know whether the current athlete already has the result in this attempt or not! (eventuelly ba comparing the automatic positionNext and the present one OR by comparing "attempt" and the number of results present for the selected athlete on the current height)
        // - 

        // How to work apply the changes in the position / positionNext?
        // - when a new result arrives, we MUST call temporaryRankingData to make sure the shown results section is up to date; do NOT include here calculateNextAthlete, since we do not want that e.g. an athlete is removed, when he had his 3rd failed attempt. It should be waited until the next athlete shall be called (as defined in position and positionNext)
        // - when the result is already entered, set the OX- to disabled and somehow highlight the new result
        // - on advancing to the next athlete, calculateNextAthlete on the main client. Sending the new position and positionNext shall raise calculateNextAthlete on the client as well. 
        // - calculateNextAthlete shall do the same on the writing and non-writing clients, but basically NOT write directly to this.position and this.positionNext, but at the end of the function do the following: 
        //   - on the writing server simply set the position/positionNext to the newly calculated values; if the values have changed, broadcast the changed ausData with the new position and positionNext
        //   - on non-writing clients, compare the length of position and positionNext newly calculated locally with the data in roomAuxData. If it matches (as it always should), do not use the locally calculated data, but copy the data from the auxData. 

    /*updateAuxDataExe(data){
        this.propertyTransfer(data, this.data.auxData, true);
    }

    updateAuxDataInit(data){
        let change = ()=>{
            // do not send the heights and ssr array; therefore, copy the data
            return data
        }

        let success = ()=>{
            // actually there is nothing to do here, since the data has already been changed
        };
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('updateAuxData', change, success, rollback)
    }*/

    /*updateSeriesExe(data){
        let s = this.data.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            this.logger.log(10, `Could not find the series with xSeries=${data.xSeries}.`)
        }
        this.propertyTransfer(data,s,true);

        this.sortSeries();
    }*/

    // keep the series always sorted
    sortSeries(){
        this.data.series.sort((s1, s2)=>s1.number-s2.number);
    }

    /*updateSeriesInit(series2, prop, val){
        // series2 does not need to be the actual series object, but it shall contain all its properties
        let series = this.data.series.find(s=>s.xSeries==series2.xSeries);
        if (!series){
            return;
        }

        let change = ()=>{
            // do not send the heights and ssr array; therefore, copy the data
            let o = {
                xSeries: series.xSeries,
                xContest: series.xContest,
                xSite: typeof(series.xSite)=='string' ? null : series.xSite,
                status: series.status,
                number: series.number,
                name: series.name,
                datetime: series.datetime,
                id: series.id,
                aux: series.aux,
            };
            o[prop] = val;
            return o;
        }

        // changes between "null" and "object" cannot be done in propertyTransfer, since it would break the reference
        if (series[prop]===null && typeof(val)=='object' && val!=null){
            series[prop] = {};
        }
        if (typeof(series[prop])==='object' && series[prop]!==null){
            this.propertyTransfer(val,series[prop])
        } else {
            series[prop] = val;
        }

        let success = ()=>{
            // actually there is nothing to do here, since there is no auto-created key for a result. (The key is the combination of xHeight and xResult=xSeriesStart)
        };
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('updateSeries', change, success, rollback)

        this.sortSeries();

    }*/


    /**
     * n: the number of the series 
     **/
    /*getStarttime(n, interval){
        const d = new Date(this.data.contest.datetimeStart);
        // set a reasonable default value! Must change when the order of series changes
        let datetime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds() + interval*(n-1));
        return datetime;
    }*/

    /*updateHeatStarttimesInit(interval){
        // interval is the interval in s

        // sort the series by number (should already be the case)
        this.data.series.sort((a,b)=>a.number-b.number);

        // recreate all heat starttimes, starting from the starttime of the contest
        for (let h=1; h<= this.data.series.length; h++){
            this.data.series[h-1].datetime = this.getStarttime(h, interval).toJSON();
        }
        
        let change = interval;

        let success = ()=>{
            // actually there is nothing to do here, since the changes are already applied
        };
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('updateHeatStarttimes', change, success, rollback)
    }

    updateHeatStarttimesExe(interval){
        
        // sort the series by number (should already be the case)
        this.data.series.sort((a,b)=>a.number-b.number);

        // recreate all heat starttimes, starting from the starttime of the contest
        for (let h=1; h<= this.data.series.length; h++){
            this.data.series[h-1].datetime = this.getStarttime(h, interval).toJSON();
        }

    }*/

    deleteResultExe(data){

        // try to get the respecitve series, ssr, result
        let s = this.data.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            this.logger.log(10, `Could not find the series with xSeries=${data.xSeries}.`)
        }

        let ssr = s.seriesstartsresults.find(ssr=>ssr.xSeriesStart == data.xResult);
        if (!ssr){
            this.logger.log(10, `Could not find the xSeriesStart with xSeriesStart=${data.xResult}.`)
        }

        let ind = ssr.resultshigh.findIndex(r=>r.xHeight==data.xHeight && r.xResult == data.xResult); // actually the latter check should always be true; otherwise, we have a result added to the wrong ssr
        if (ind<0){
            this.logger.log(10, `Could not find the result to update (xResult=${data.xResult}, xHeight=${data.xHeight})`)
        } else {
            // should always be the case
            ssr.resultshigh.splice(ind, 1);
        }

    }

    deleteResultInit(result, ssr){

        // instantly remove the result from the array
        // find the result in the results array
        let ind = ssr.resultshigh.indexOf(result);

        // delete the result
        ssr.resultshigh.splice(ind,1);

        let change = ()=>{
            return {
                xResult: result.xResult,
                xHeight: result.xHeight,
                xSeries: ssr.xSeries
            }
        }

        let success = ()=>{
            // actually there is nothing to do here, since there is no auto-created key for a result. (The key is the combination of xHeight and xResult=xSeriesStart)
        };
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('deleteResult', change, success, rollback)
    }

    addResultInit(resulthigh, ssr){
        
        let change = ()=>{
            return {
                result: resulthigh,
                xSeries: ssr.xSeries
            }
        }

        let success = ()=>{
            // actually there is nothing to do here, since there is no auto-created key for a result. (The key is the combination of xHeight and xResult=xSeriesStart)
        };
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('addResult', change, success, rollback)

    }

    addResultExe(data){
        // try to get the respecitve ssr
        let s = this.data.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            this.logger.log(10, `Could not find the series with xSeries=${data.xSeries}.`)
            return
        }

        let ssr = s.seriesstartsresults.find(ssr=>ssr.xSeriesStart == data.result.xResult);
        if (!ssr){
            this.logger.log(10, `Could not find the xSeriesStart with xSeriesStart=${data.result.xResult}.`)
            return
        }
        
        // add the result to the ssr
        ssr.resultshigh.push(data.result);
    }

    updateResultInit(resulthigh, ssr){

        let change = ()=>{
            return {
                result: resulthigh,
                xSeries: ssr.xSeries
            }
        }

        let success = ()=>{
            // actually there is nothing to do here
        };
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('updateResult', change, success, rollback)
    }

    updateResultExe(data){
        // try to get the respecitve series, ssr, result
        let s = this.data.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            this.logger.log(10, `Could not find the series with xSeries=${data.xSeries}.`)
            return
        }

        let ssr = s.seriesstartsresults.find(ssr=>ssr.xSeriesStart == data.result.xResult);
        if (!ssr){
            this.logger.log(10, `Could not find the xSeriesStart with xSeriesStart=${data.result.xResult}.`)
            return
        }

        let res = ssr.resultshigh.find(r=>r.xHeight==data.result.xHeight && r.xResult == data.result.xResult); // actually the latter check should always be true; otherwise, we have a result added to the wrong ssr
        if (!res){
            this.logger.log(10, `Could not find the result to update (xResult=${data.result.xResult}, xHeight=${data.result.xHeight})`)
            return
        }

        // update the result
        this.propertyTransfer(data.result, res, true)

    }

    updateSSRExe(data){
        // data is the changed ssr
        let series = this.data.series.find(s=>s.xSeries == data.xSeries);
        if (!series){
            this.logger.log(10, `Could not find the series ${data.xSeries}`);
            return;
        }
        let ssr = series.seriesstartsresults.find(s=>s.xSeriesStart==data.xSeriesStart);
        if (!ssr){
            this.logger.log(10, `Could not find the seriesstartresult ${data.xSeriesStart}`);
            return;
        }

        this.propertyTransfer(data, ssr, true);

    }

    updateSSRInit(ssr){
        // ssr is the same ssr object we also have in the data here (not a copy of the vue!)

        // not needed due to above fact
        /*let series = this.data.series.find(s=>s.xSeries == ssr.xSeries);
        if (!series){
            console.log(`Could not find the series ${data.xSeries}`);
            return;
        }
        let ssrIndex = series.seriesstartsresults.findIndex(s=>s.xSeriesStart==data.xSeriesStart);
        if (ssrIndex==-1){
            console.log(`Could not find the seriesstartresult ${data.xSeriesStart}`);
            return;
        }*/

        let change = ()=>{
            return ssr;
        }

        let success = ()=>{};
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('updateSSR', change, success, rollback)

    }

    changePositionExe(data){
        let oldSeries = this.data.series.find(el=>el.xSeries == data.fromXSeries);
        let newSeries = this.data.series.find(el=>el.xSeries == data.toXSeries);
        if (!oldSeries || !newSeries){
            this.logger.log(10, `Cannot find the old (${data.fromXSeries}) or new (${data.toXSeries}).`);
            return;
        }

        let ssrIndex = oldSeries.seriesstartsresults.findIndex(s=>s.xSeriesStart==data.xSeriesStart);
        let ssr = oldSeries.seriesstartsresults[ssrIndex];
        if (!ssr){
            this.logger.log(10, `Could not find the seriesstartresult ${data.xSeriesStart}`);
        }

        let oldPosition = ssr.position;

        // all positions after the previous position of the moved person must be reduced by 1 
        oldSeries.seriesstartsresults.forEach(ssr2 =>{
            if (ssr2.position > oldPosition){
                ssr2.position--;
            }
        })

        // all position in the new series must be increased by one after the inserted person.
        newSeries.seriesstartsresults.forEach(ssr2=>{
            if (ssr2.position>=data.toPosition){ // newIndex is zero-based, the position is one-based
                ssr2.position++;
            }
        })

        ssr.position = data.toPosition;
        
        // if the series changes as well:
        if (oldSeries != newSeries){
            ssr.xSeries = newSeries.xSeries; 
            
            oldSeries.seriesstartsresults.splice(ssrIndex,1);
            newSeries.seriesstartsresults.push(ssr);
        } else {
            // Unfortunately, the proxy does not realize that the position got changed and does not recreate (and thereby sort) the "seriesAsStartgroups". Thus, we have to sort ourselves:
            newSeries.seriesstartsresults.sort((a,b)=>{
                return a.position-b.position;
            })
        }

    }

    /*deleteSSRExe(data){

        let series = this.data.series.find(s=>s.xSeries == data.fromXSeries);
        if (!series){
            this.logger.log(10, `Could not find the series ${data.fromXSeries}`);
            return;
        }
        let ssrIndex = series.seriesstartsresults.findIndex(s=>s.xSeriesStart==data.xSeriesStart);
        if (ssrIndex==-1){
            this.logger.log(10, `Could not find the seriesstartresult ${data.xSeriesStart}`);
            return;
        }
        
        let deletedPosition = series.seriesstartsresults[ssrIndex].position;
        series.seriesstartsresults.splice(ssrIndex, 1); // delete from local data

        // change the position of the seriesstartsresults after the deleted position
        series.seriesstartsresults.forEach(ssr2 =>{
            if (ssr2.position>deletedPosition){
                ssr2.position--;
            }
        })

    }

    // change the order of series
    moveSeriesInit(oldIndex, newIndex){
        // IMPORTANT: number is one-based, not zero-based!
        // the index in the parameters is zero-based!

        let changedSeries = this.data.series.find(s=>s.number==oldIndex+1);
        if (!changedSeries){
            this.logger.log(15, "Series could not be moved, since the series was not found.")
            return;
        }

        // all positions after the previous position of the moved series must be reduced by 1
        this.data.series.forEach(s =>{
            if (s.number > oldIndex){
                s.number--;
            }
        })

        // all positions in the new series must be increased by one after the inserted person.
        this.data.series.forEach(s=>{
            if (s.number>=newIndex+1){ // newIndex is zero-based, the number is one-based
                s.number++;
            }
        })

        // now change the actual series
        changedSeries.number = newIndex+1;

        // now sort the series (otherwise the chnage would not be visible)
        this.data.series.sort((a,b)=>{return a.number - b.number});

        // send the change to server
        // As a function to be called when the change is actually sent, eventually after xSeries was added
        let change = ()=>{
            // this function creates the actual data to be sent at the time of sending the change request (needed for the case when we did stuff not yet processed on the server, e.g. the series have no xSeries yet)
            return {
                xSeries: changedSeries.xSeries,
                toNumber: newIndex+1
            }
        }
        let success = ()=>{};
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('moveSeries', change, success, rollback)


    }

    moveSeriesExe(change){
        const xSeries = change.xSeries;
        const toNumber = change.toNumber;

        // make sure that the series are sorted already (should actually not be necessary)
        this.data.series.sort((a,b)=>{return a.number - b.number});

        // find the series
        const series = this.data.series.find(s=>s.xSeries == xSeries); 
        const fromNumber = series.number; 

        // all positions after the previous position of the moved series must be reduced by 1
        this.data.series.forEach(s =>{
            if (s.number > fromNumber){
                s.number--;
            }
        })

        // all positions in the new series must be increased by one after the inserted person.
        this.data.series.forEach(s=>{
            if (s.number>=toNumber){ // s.number was already reduced before
                s.number++;
            }
        })

        // now change the actual series
        series.number = toNumber;

        // now sort the series (otherwise the chnage would not be visible)
        this.data.series.sort((a,b)=>{return a.number - b.number});
    }*/

    addHeightInit(series, newHeight){

        // the height is added here and not in the vue
        series.heights.push(newHeight);

        let change = () =>{

            // the xSeries from newHeight might be outdated at the time of sending, e.g. when the series were created locally without processing the change yet on the server (due to lack of connection)

            // the xSeries now should be known
            newHeight.xSeries = series.xSeries;

            return {
                xSeries: series.xSeries, 
                jumpoffOrder: newHeight.jumpoffOrder,
                height: newHeight.height,
            }
        }

        let success = (xHeight)=>{
            // set xHeight in the actual height object but also in every result referencing the xHeight
            let xHeightTemp = newHeight.xHeight;
            newHeight.xHeight = xHeight;

            series.seriesstartsresults.forEach(ssr=>{
                let rh;
                if (rh = ssr.resultshigh.find(rh=>rh.xHeight==xHeightTemp)){
                    rh.xHeight = xHeight;
                }
            })

        }

        let rollback = null; // do full rollback; should not happen
        this.addToStack('addHeight', change, success, rollback)
    }

    addHeightExe(newHeight){
        let series = this.data.series.find(s=>s.xSeries == newHeight.xSeries);
        if (series){
            series.heights.push(newHeight)
        } else {
            // do full reload
            this.logger.log(5, `Could not add height given by the server, sicne the series does not exist. Reoad all`);
            this.getFullData();
        }
    }

    deleteHeightInit(height){

        // get the series
        let series = this.data.series.find(s=>s.xSeries==height.xSeries)
        if (!series){
            this.logger.log(10, `Cannot delete the height, since the series cannot be found.`)
            return;
        }

        // find the height within that series
        let ind = series.heights.indexOf(height);
        if (ind==-1){
            this.logger.log(10, `Cannot delete the height, since the height is not part of the series.`)
            return;
        }

        // delete the height locally
        series.heights.splice(ind,1);

        let success = ()=>{
            // nothing to do, since it is already deleted here
        }

        // create the object at the moment of sending the change to ensure we also include the eventually later defined xHeight
        let change = ()=>{
            return {
                xHeight: height.xHeight,
                xSeries: height.xSeries
            }
        }

        let rollback = null; // do full rollback; should not happen
        this.addToStack('deleteHeight', change, success, rollback)

    }

    deleteHeightExe(data){
        // data contains xSeries and xHeight
        // get the series
        let series = this.data.series.find(s=>s.xSeries==data.xSeries)
        if (!series){
            this.logger.log(10, `Cannot delete the height, since the series cannot be found.`)
            return;
        }

        // find the height within that series
        let ind = series.heights.findIndex(h=>h.xHeight==data.xHeight);
        if (ind==-1){
            this.logger.log(10, `Cannot delete the height, since the height is not part of the series.`)
            return;
        }

        // delete the height locally
        series.heights.splice(ind,1);
    }

    // this function has no direct exe equivalent
    // the inputted parameters must be those of the original objects and not local copies done within Vue.
    changePositionInit(ssr, oldSeries, newSeries, newIndex){

        // instantly apply the changes locally

        // IMPORTANT: position is one-based, not zero-based!

        let oldPosition = ssr.position;

        // all positions after the previous position of the moved person must be reduced by 1 
        oldSeries.seriesstartsresults.forEach(ssr2 =>{
            if (ssr2.position > oldPosition){
                ssr2.position--;
            }
        })
        
        // all position in the new series must be increased by one after the inserted person.
        newSeries.seriesstartsresults.forEach(ssr2=>{
            if (ssr2.position>=newIndex+1){ // newIndex is zero-based, the position is one-based
                ssr2.position++;
            }
        })

        // now change the actual ssr
        ssr.position = newIndex+1;

        if (oldSeries != newSeries){
            ssr.xSeries = newSeries.xSeries; 
            let i = oldSeries.seriesstartsresults.indexOf(ssr);
            if (i<0){
                this.logger.log(10, 'Could not find the seriesstartsresult to move in the respective list. Should never happen.')
                return;
            }
            oldSeries.seriesstartsresults.splice(i,1);
            newSeries.seriesstartsresults.push(ssr);
        } else {
            // Unfortunately, the proxy does not realize that the position got changed and does not recreate (and thereby sort) the "seriesAsStartgroups". Thus, we have to sort ourselves:
            newSeries.seriesstartsresults.sort((a,b)=>{
                return a.position-b.position;
            })
        }


        // send the change to server
        // As a function to be called when the change is actually sent, eventually after xSeries was added
        let change = ()=>{
            // this function creates the actual data to be sent at the time of sending the change request
            return {
                xSeriesStart: ssr.xSeriesStart,
                fromXSeries: oldSeries.xSeries, // helps the server to find SSR
                toXSeries: newSeries.xSeries,
                toPosition: newIndex+1
            }
        }
        let success = ()=>{};
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('changePosition', change, success, rollback)

    }

    deleteSSR(series, ssr){

        // all positions after the previous position of the moved person must be reduced by 1 
        series.seriesstartsresults.forEach(ssr2 =>{
            if (ssr2.position>ssr.position){
                ssr2.position--;
            }
        })
        let i = series.seriesstartsresults.indexOf(ssr)
        if (i<0){
            this.logger.log(10, 'Could not find the seriesstartsresult to move in the respective list. Should never happen.')
            return;
        }
        series.seriesstartsresults.splice(i,1);
        
        // send the change to server
        // As a function to be called when the change is actually sent, eventually after xSeries was added
        let change = ()=>{
            // this function creates the actual data to be sent at the time of sending the change request
            return {
                xSeriesStart: ssr.xSeriesStart,
                fromXSeries: series.xSeries, // helps the server to find SSR
            }
        }
        let success = ()=>{};
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('deleteSSR', change, success, rollback)
    }

    addSSRExe(ssr){
        // check that xSeries and xStartgroup are valid (can be found in the available data)
        let series = this.data.series.find(el=>el.xSeries == ssr.xSeries);
        if (!series){
            this.logger.log(10, `Cannot find the series ${ssr.xSeries}.`);
            return
        }
        // move all positions that are >= the new position
        series.seriesstartsresults.forEach(currentSSR=>{
            if (currentSSR.position>=ssr.position){
                currentSSR.position++;
            }
        })
        // add to the list of seriesstartsresults
        series.seriesstartsresults.push(ssr);
        
    }

    addSSR(series, xStartgroup, newIndex){

        // all position in the series must be increased by one after the inserted person.
        series.seriesstartsresults.forEach(ssr2=>{
            if (ssr2.position>=newIndex+1){ // newIndex is zero-based, the position is one-based
                ssr2.position++;
            }
        })

        // create the seriresstartsresults entry for the athlete to add
        let SSR = {
            //xSeriesStart: -1, // to be defined later!
            xStartgroup,
            xSeries: series.xSeries,
            position: newIndex+1,
            resultOverrule: 0,
            resultRemark: '',
            qualification: 0, // not used yet
            startConf: '', // here will be the startheight as JSON
            resultshigh: [], // no results yet
        }
        
        series.seriesstartsresults.push(SSR)

        // send the change to server
        let success = (xSeriesStart)=>{
            // set the xSeriesStart
            SSR.xSeriesStart = xSeriesStart;

            // if there are already results, set xResult=xSeriesStart
            SSR.resultshigh.forEach(res=>{
                res.xResult = xSeriesStart;
            })

        };
        let rollback = ()=>{
            // find the SSR and delete it
            let i = series.seriesstartsresults.indexOf(SSR);
            if (i>=0){
                series.seriesstartsresults.splice(i,1);
            }
        }
        this.addToStack('addSSR', SSR, success, rollback)

    }

    /*deleteAllSeriesExe(data){
        //delete all series locally
        let l = this.data.series.length;
        for (let i=0; i<l; i++){
            this.data.series.pop();
        }

        // delete all auxData
        for(let key in this.data.auxData){
            delete this.data.auxData[key];
        }

        this.sortSeries();
    }

    deleteAllSeriesInit(){

        // check that no series has a result
        if (this.hasResults()){
            return;
        }

        // object for reverting the changes on failure:
        let oldData = this.data.series.slice();
        const oldAuxData = JSON.stringify(this.data.auxData);

        //delete all series locally
        let l = this.data.series.length;
        for (let i=0; i<l; i++){
            this.data.series.pop();
        }
        for (let key in this.data.auxData){
            delete this.data.auxData[key];
        }

        // request deletion on the server
        this.addToStack('deleteAllSeries', true, ()=>{
            // nothing to do on success
        }, ()=>{
            // on failure, recreate the previous data
            for (let i=0; i<oldData.length; i++){
                this.data.series.push(oldData[i]);
            }

            const auxToRecreate = JSON.parse(oldAuxData);
            // must do this one by one in roder for the proxies in Vue to work
            for (let key in auxToRecreate){
                this.data.auxData[key] = auxToRecreate[key];
            }
        })

        this.sortSeries();
    }

    initialSeriesCreationExe(data){
        // actually, series should already be empty; but ensure it
        let l = this.data.series.length;
        for (let i=0; i<l; i++){
            this.data.series.pop();
        }
        // same for the aux data
        for (let xSeries in this.data.auxData){
            delete this.data.auxData[xSeries];
        }

        // add all new series:
        for (let i=0;i<data.length; i++){
            this.data.series.push(data[i])

            // create the new auxData
            this.data.auxData[data[i].xSeries] = JSON.parse(JSON.stringify(this.defaultAuxData));
        }

        this.sortSeries();
    }

    deleteSeriesInit(xSeries){
        // first find the respective number
        const iSeries = this.data.series.findIndex(s=>s.xSeries == xSeries);
        const series = this.data.series[iSeries];
        const delNumber = series.number;

        // check that there are no results yet
        let hasResults = false;
        series.seriesstartsresults.forEach(ssr=>{
            if (ssr.resultstrack){
                hasResults = true;
            }
        }) 
        if (hasResults){
            return;
        }

        const seriesToMove = this.data.series.filter(s=>s.number>delNumber);

        // decrease the number of every series after the deleted series
        seriesToMove.forEach(s=>s.number--);

        // delete the series
        this.data.series.splice(iSeries,1);

        // actually there should be no need to handle anything with seriesstartsresults

        // success
        const success = ()=>{
            // nothing to do.
        }

        // on error
        const revert = ()=>{

            // increase the number of all subsequent series
            seriesToMove.forEach(s=>s.number ++);

            // add the series again
            this.data.series.push(series);

        }

        this.addToStack('deleteSeries', xSeries, success, revert);

    }

    deleteSeriesExe(xSeries){
        const iSeries = this.data.series.findIndex(s=>s.xSeries = xSeries);
        const series = this.data.series[iSeries];
        const delNumber = series.number;

        const seriesToMove = this.data.series.filter(s=>s.number>delNumber);

        // decrease the number of every series after the deleted series
        seriesToMove.forEach(s=>s.number--);

        // delete the series
        this.data.series.splice(iSeries,1);
    }*/

    addSeriesInit(defaultxSite=null, datetime){
        // add an empty series

        // find the most negative xSeries:
        let xSeriesMin = this.data.series.reduce((a,b)=>Math.min(a,b.xSeries),0);

        let newSeries = {
            xContest: this.data.contest.xContest,
            xSeries: --xSeriesMin, // not available yet
            xSite: defaultxSite, 
            status: 10,
            number: this.data.series.length+1,
            name: '',
            seriesstartsresults: [],
            //heights: [], // no heights defined yet
            datetime: datetime,
            id: null,
        };
        let newSeriesServer = { // same, but without xSeries
            xContest: this.data.contest.xContest,
            //xSeries: --xSeriesMin, // not available yet
            xSite: defaultxSite, 
            status: 10,
            number: this.data.series.length+1,
            name: '',
            seriesstartsresults: [],
            //heights: [], // no heights defined yet
            datetime: datetime,
            id: null,
        };
        let i = this.data.series.push(newSeries);
        newSeries = this.data.series[i-1]; // transfer back the proxied data

        // add the auxData
        let newAuxData = JSON.parse(JSON.stringify(this.defaultAuxData));
        this.data.auxData[xSeriesMin] = newAuxData;
        newAuxData = this.data.auxData[xSeriesMin]; // transfer back the proxied data

        const revert = ()=>{
            // remove the series 
            let i = this.data.series.indexOf(newSeries);
            if (i>=0){
                this.data.series.splice(i,1);
            }

            delete this.data.auxData[xSeriesMin];
        }

        const executeSuccess = (data)=>{
            // data is the xSeries assigned on the server
            newSeries.xSeries = data; 
            newAuxData.xSeries = data;
            this.data.auxData[data] = this.data.auxData[xSeriesMin];
            delete this.data.auxData[xSeriesMin];
        }
        
        this.addToStack('addSeries', newSeriesServer, executeSuccess, revert);

        this.sortSeries();

    }

    /*addSeriesExe(newSeries){
        // add the series to the local series
        this.data.series.push(newSeries);

        // create the new auxData object
        this.data.auxData[newSeries.xSeries] = JSON.parse(JSON.stringify(this.defaultAuxData));

        this.sortSeries();
    }*/

    initialSeriesCreationInit(newSeries){
        // do not only send the request, but also change the data here already.

        // first create the revert function
        // actually, this function should only be called when there were no series before anyway

        // create a list of all series to add again and at the same time delete all current series one by one. 
        let oldSeries = [];
        for (let i=0;i<this.data.series.length; i++){
            oldSeries.push(this.data.series.shift());
        }

        let oldAuxData = {};
        for (let xSeries in this.data.auxData){
            oldAuxData[xSeries] = this.data.auxData[xSeries];
            delete this.data.auxData[xSeries];
        }

        let revert = ()=>{
            // delete all current series and add all old series
            // we cannot just reset the array to [] because we would loose teh proxy
            let l = this.data.series.length;
            for (let i=0;i<l; i++){
                this.data.series.pop()
            }
            for (let i=0; i<oldSeries.length; i++){
                this.data.series.push(oldSeries[i])
            }
            for (let key in this.data.auxData){
                delete this.data.auxData[key];
            }
            for (let key in oldAuxData){
                this.data.auxData[key] = oldAuxData[key];
            }

        }
        
        // now populate the empty series array with the new series
        // The series structure should look like this
        // series : all series objects
        // series[0].heights : the heights jumped in this series
        // series[0].seriesstartsresults : all athletes in this series
        // series[0].seriesstartsresults[0].resultshigh : the results of the athletes
        
        // temporary key for xSeries; needed to reference the auxData 
        let xSeries = -1;
        for (let series of newSeries){

            // TODO: we probably need some temporary keys for the series and the seriesstartsresults as an identifier.

            // make sure all possible properties are initialized!

            // prepare seriesStartsResults:
            let seriesstartsresults = []
            for (let i=0;i< series.startsingroup.length; i++){
                let SIG = series.startsingroup[i];
                seriesstartsresults.push({
                    //xSeriesStart: xSeries, // not defined yet
                    xStartgroup: SIG.xStartgroup,
                    xSeries, // negative, since not defined yet
                    position: i+1,
                    resultOverrule: 0,
                    resultRemark: '',
                    qualification: 0, // not used yet
                    startConf: '', // here will be the startheight as JSON
                    resultshigh: [], // no results yet
                })
            }

            this.data.series.push({
                xContest: this.data.contest.xContest,
                //xSeries: -1, // not available yet
                xSite: typeof(series.xSite)=='string' ? null : series.xSite, // not used yet
                status: series.status,
                number: series.number,
                name: series.name,
                seriesstartsresults: seriesstartsresults,
                heights: [], // no heights defined yet
                id:null,
                datetime: series.datetime,
            })

            // create the local auxData for each series; the server will create the same there
            this.data.auxData[xSeries--] = JSON.parse(JSON.stringify(this.defaultAuxData));
            
        }

        // prepare everything needed for the change:

        // create copies of the current arrays with references to the respective objects, which might be in a different order or even not exist anymore in the actual arrays at the time of xSeries / xSeriesStart replacement
        let seriesForIndexReplacement = this.data.series.slice(); // copied array of series
        let seriesstartsForIndexReplacement = this.data.series.map(el=>el.seriesstartsresults.slice()); // array of copied seriesstarts array
        
        let executeSuccess = (data)=>{
            // IMPORTANT: this function must also work if we did some changes to the data meanwhile! That means
            // - do NOT rely on the avalability of the objects in this.data.series(.seriesstartsresults) and do not rely on the order in those arrays!

            // basically we just need to replace all xSeries and xSeriesStart 
            // the order in the response array MUST be the same as in our array here --> TODO: check this!
            for (let i=0;i<data.length;i++){

                const oldXSeries = -1-i;

                // create the new reference in the auxData; at the very end delete the old data
                this.data.auxData[data[i].xSeries] = this.data.auxData[oldXSeries];
                
                // should have the same length as seriesForIndexReplacement
                seriesForIndexReplacement[i].xSeries = data[i].xSeries;
                
                for (let j=0; j<data[i].seriesstartsresults.length; j++){
                    seriesstartsForIndexReplacement[i][j].xSeriesStart = data[i].seriesstartsresults[j];
                    seriesstartsForIndexReplacement[i][j].xSeries = data[i].xSeries;
                }
                // delete the old, temporary reference in the auxData
                delete this.data.auxData[oldXSeries];

            } 
        }
        
        let change = this.data.series;

        this.addToStack('initialSeriesCreation', change, executeSuccess, revert)

        this.sortSeries();

    }

    /*groupLinkedExe(data){
        this.data.relatedGroups.push(data.group);
        // push every single new startgroup (Note: concat cannot be used, since it would destroy the proxies)
        data.startgroups.forEach(SG=>{
            this.data.startgroups.push(SG);    
        })
        
    }

    groupUnlinkedExe(data){
        let i2 = this.data.relatedGroups.findIndex(el=>el.number==data.number && el.xRound==data.xRound)
        if (i2>=0){
            // should always come here
            this.data.relatedGroups.splice(i2,1);
        }
        // remove startgroups
        for (let i=this.data.startgroups.length-1; i>=0; i--){
            let SIG = this.data.startgroups[i];
            if (SIG.xRound == data.xRound && SIG.number == data.number ){
                this.data.startgroups.splice(i,1);
            }
        }
    }

    deleteStartsInGroup(xStartgroup){
        let index = this.data.startgroups.findIndex(el=>el.xStartgroup==xStartgroup);
        if (index>=0){
            this.data.startgroups.splice(index,1);
        }
    }*/

    /*renewStartgroupsExe(startgroups){
        this.propertyTransfer(startgroups, this.data.startgroups, false);
    }*/

    // can be add or update
    /*addStartsInGroupExe(data){
        let i = this.data.startgroups.findIndex(SG=>SG.xStartgroup == data.xStartgroup); 
        if (i>=0){
            this.propertyTransfer(data, this.data.startgroups[i]);
        } else {
            this.data.startgroups.push(data);
        }
    }

    updatePresentStateInit(affectedRow){

        let change = {
            xStart: affectedRow.xStart,
            xStartgroup: affectedRow.xStartgroup,
            newState: affectedRow.present
        }

        let revertState = !affectedRow.present;

        this.addToStack('updatePresentState', change, ()=>{
            // nothing to do on success
        }, ()=>{
            // revert on failure
            affectedRow.present = revertState; // the previous state
        })
    }

    updatePresentStateExe(data){
        // get the respective startgroup and update the present state
        let startgroup;
        if (startgroup = this.data.startgroups.find(el=>el.xStartgroup==data.xStartgroup)){
            startgroup.present = data.present;
        }
        
    }*/

    updateContest2Init(newContest, oldContest){
        this.addToStack('updateContest2', newContest, ()=>{
            // nothing to do on success
        }, ()=>{
            // revert all changes on failure!
            this.propertyTransfer(oldContest, this.data.contest, true);
        })
    }

    updateContest2Exe(data){
        // applies only when the change was done on another client
        this.propertyTransfer(data, this.data.contest, true);
    }

}