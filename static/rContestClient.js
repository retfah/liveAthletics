
// base class for all track/tech clients
export class rContestClient extends roomClient{
    
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

        let failCB = (msg, code)=>{}
        let successCB = ()=>{}

        // call the parent constructor
        //(v, name, wsHandler, eventHandler, onlineOnly, writing, success, failure, storeInfos=false, rM, datasetName='', writingChangedCB)
        
        // the room name must include the meeting name (contest@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, false, writing, successCB, failCB, storeInfos, rM, datasetName); 

        /**
         * general: 
         * - all functions except addHeight deleteHeight exist in both rooms
         * - add / delete / update results are room specific.
         * - updateSSR is room specific (eventually the techHigh could be used as a basis, overwritten for track only)
         * - changePosition is nearly identical, but not fully (track has the position in startConf if not started in lanes)
         * 
        */
        
        this._addFunction('updateAuxData', this.updateAuxDataExe);
        this._addFunction('updateSeries', this.updateSeriesExe);
        this._addFunction('allSeriesStatusChange', this.allSeriesStatusExe);
        this._addFunction('updateHeatStarttimes', this.updateHeatStarttimesExe);
        this._addFunction("deleteSSR", this.deleteSSRExe);
        this._addFunction('moveSeries', this.moveSeriesExe);
        this._addFunction('deleteAllSeries', this.deleteAllSeriesExe);
        this._addFunction('deleteSeries', this.deleteSeriesExe);
        this._addFunction('initialSeriesCreation', this.initialSeriesCreationExe);
        this._addFunction('addSeries', this.addSeriesExe);
        this._addFunction('groupUnlinked', this.groupUnlinkedExe);
        this._addFunction('groupLinked', this.groupLinkedExe);
        this._addFunction('updatePresentState', this.updatePresentStateExe);
        this._addFunction('addStartsInGroup', this.addStartsInGroupExe);
        this._addFunction('renewStartgroups', this.renewStartgroupsExe);
        this._addFunction('deleteStartsInGroup', this.deleteStartsInGroupExe);
    }

    updateAuxDataExe(data){
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
    }

    updateSeriesExe(data){
        let s = this.data.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            this.logger.log(10, `Could not find the series with xSeries=${data.xSeries}.`)
        }
        this.propertyTransfer(data,s,true);

        this.sortSeries();
    }

    // keep the series always sorted
    sortSeries(){
        this.data.series.sort((s1, s2)=>s1.number-s2.number);
    }

    // set all series to a certain status
    allSeriesStatusInit(status){

        for (let s of this.data.series){
            s.status = status;
        }

        let success = ()=>{
            // actually there is nothing to do here, since the data has already been changed
        };
        let rollback = null; // currently no single rollback planned; get the full data from the server again
        this.addToStack('allSeriesStatusChange', status, success, rollback)
    }

    allSeriesStatusExe(status){
        for (let s of this.data.series){
            s.status = status;
        }
    }

    updateSeriesInit(series2, prop, val){
        // series2 does not need to be the actual series object, but it shall contain all its properties
        let series = this.data.series.find(s=>s.xSeries==series2.xSeries);
        if (!series){
            return;
        }

        let change = ()=>{
            // do not send the ssr array; therefore, copy the data
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

    }


    /**
     * n: the number of the series 
     **/
    getStarttime(n, interval){
        const d = new Date(this.data.contest.datetimeStart);
        // set a reasonable default value! Must change when the order of series changes
        let datetime = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds() + interval*(n-1));
        return datetime;
    }    

    updateHeatStarttimesInit(interval){
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

    }

    deleteSSRExe(data){

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
    }

    hasResults(){
        console.log('hasResults is not implemented by the inheriting class and could not be checked.')
        return false;
    }

    deleteAllSeriesExe(data){
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
    }

    addSeriesExe(newSeries){
        // add the series to the local series
        this.data.series.push(newSeries);

        // create the new auxData object
        this.data.auxData[newSeries.xSeries] = JSON.parse(JSON.stringify(this.defaultAuxData));

        this.sortSeries();
    }

    groupLinkedExe(data){
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

    deleteStartsInGroupExe(xStartgroup){
        let index = this.data.startgroups.findIndex(el=>el.xStartgroup==xStartgroup);
        if (index>=0){
            this.data.startgroups.splice(index,1);
        }
    }

    renewStartgroupsExe(startgroups){
        this.propertyTransfer(startgroups, this.data.startgroups, false);
    }

    // can be add or update
    addStartsInGroupExe(data){
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
        
    }

}