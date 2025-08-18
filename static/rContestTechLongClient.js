import { rContestClient } from "./rContestClient.js";

export class rContestTechLongClient extends rContestClient{

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
            currentAttempt: -1,
        }


        // set the available functions
        this._addFunction('updateContest2', this.updateContest2Exe);
        this._addFunction('addSSR', this.addSSRExe);
        this._addFunction('changePosition', this.changePositionExe);
        this._addFunction('updateSSR', this.updateSSRExe);
        this._addFunction('addResult', this.addResultExe);
        this._addFunction('updateResult', this.updateResultExe);
        this._addFunction('deleteResult', this.deleteResultExe);
    }

    // Infos about aux data:
    // TODO
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

    // keep the series always sorted
    sortSeries(){
        this.data.series.sort((s1, s2)=>s1.number-s2.number);
    }

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

        let ind = ssr.resultstech.findIndex(r=>r.attempt==data.attempt && r.xResult == data.xResult); // actually the latter check should always be true; otherwise, we have a result added to the wrong ssr
        if (ind<0){
            this.logger.log(10, `Could not find the result to update (xResult=${data.xResult}, attempt=${data.attempt})`)
        } else {
            // should always be the case
            ssr.resultstech.splice(ind, 1);
        }

    }

    deleteResultInit(result, ssr){

        // instantly remove the result from the array
        // find the result in the results array
        let ind = ssr.resultstech.indexOf(result);

        // delete the result
        ssr.resultstech.splice(ind,1);

        let change = ()=>{
            return {
                xResult: result.xResult,
                attempt: result.attempt,
                xSeries: ssr.xSeries
            }
        }

        let success = ()=>{
            // actually there is nothing to do here
        };
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('deleteResult', change, success, rollback)
    }

    addResultInit(resulttech, ssr){

        if (ssr.resultstech.find(el=>el.attempt==resulttech.attempt)){
            throw("Result cannot be added, sicne it already exists");
        }

        ssr.resultstech.push(resulttech);
        
        let change = ()=>{
            return {
                result: resulttech,
                xSeries: ssr.xSeries
            }
        }

        let success = ()=>{
            // actually there is nothing to do here, since there is no auto-created key for a result.
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
        ssr.resultstech.push(data.result);
    }

    updateResultInit(resulttech, ssr){
        const res = ssr.resultstech.find(el=>el.attempt==resulttech.attempt);
        if (!res){
            throw("Result does not exist yet and cannot be updated");
        }

        // check the PK does not change
        if (res.xResult != resulttech.xResult || res.attempt != resulttech.attempt || resulttech.xResult != ssr.xSeriesStart){
            throw("Invalid primary key.")
        }

        this.propertyTransfer(resulttech, res);

        let change = ()=>{
            return {
                result: resulttech,
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

        let res = ssr.resultstech.find(r=>r.attempt==data.result.attempt && r.xResult == data.result.xResult); // actually the latter check should always be true; otherwise, we have a result added to the wrong ssr
        if (!res){
            this.logger.log(10, `Could not find the result to update (xResult=${data.result.xResult}, attempt=${data.result.attempt})`)
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

    deleteSeriesInit(data){
        super.deleteSeriesInit(data);
        // if needed, update the aux data for the merged series
        this.mergedFinalAuxData();
    }
    deleteSeriesExe(data){
        super.deleteSeriesExe(data);
        
        // if needed, update the aux data for the merged series
        this.mergedFinalAuxData();
    }

    deleteAllSeriesInit(data){
        super.deleteAllSeriesInit(data);
        // if needed, update the aux data for the merged series
        this.mergedFinalAuxData();
    }
    deleteAllSeriesExe(data){
        super.deleteAllSeriesExe(data);
        
        // if needed, update the aux data for the merged series
        this.mergedFinalAuxData();
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
            startConf: '', // probably not needed for tech long
            resultstech: [], // no results yet
        }
        
        series.seriesstartsresults.push(SSR)

        // send the change to server
        let success = (xSeriesStart)=>{
            // set the xSeriesStart
            SSR.xSeriesStart = xSeriesStart;

            // if there are already results, set xResult=xSeriesStart
            SSR.resultstech.forEach(res=>{
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
        
        // if needed, update the aux data for the merged series
        this.mergedFinalAuxData();
        
        this.addToStack('addSeries', newSeriesServer, executeSuccess, revert);

        this.sortSeries();

    }
    addSeriesExe(data){
        super.addSeriesExe(data);
        
        // if needed, update the aux data for the merged series
        this.mergedFinalAuxData();
    }

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
        // series[0].seriesstartsresults : all athletes in this series
        // series[0].seriesstartsresults[0].resultstech : the results of the athletes
        
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
                    startConf: '', // probably not needed for tech long
                    resultstech: [], // no results yet
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

        // if needed, update the aux data for the merged series
        this.mergedFinalAuxData();

        this.addToStack('initialSeriesCreation', change, executeSuccess, revert)

        this.sortSeries();

    }

    initialSeriesCreationExe(data){
        super.initialSeriesCreationExe(data);
        
        // if needed, update the aux data for the merged series
        this.mergedFinalAuxData();
    }

    updateContest2Init(prop, newVal, oldVal){
        this.data.contest[prop] = newVal; // might already be set

        this.addToStack('updateContest2', this.data.contest, ()=>{
            // nothing to do on success
        }, ()=>{
            // revert all changes on failure!
            this.data.contest[prop] = oldVal
        })
        
        // if needed, update the aux data for the merged series
        this.mergedFinalAuxData();
    }

    updateContest2Exe(data){
        // applies only when the change was done on another client
        this.propertyTransfer(data, this.data.contest, true);
        
        // if needed, update the aux data for the merged series
        this.mergedFinalAuxData();
    }

    // add/delete auxdata for the merged final, if it is now needed or not anymore needed
    mergedFinalAuxData(){
        if ('merged' in this.data.auxData && this.data.series.length<2){
            // delete auxData for merged series
            delete this.data.auxData['merged'];
        } else if (!('merged' in this.data.auxData) && this.data.series.length>1){
            // add auxData for merged series
            this.data.auxData['merged'] = JSON.parse(JSON.stringify(this.defaultAuxData));
        }
    }
}