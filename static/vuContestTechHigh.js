

// connect to the room (defined by te ID in the URL/http-GET-param)
class vuContestTechHigh extends roomClientVue{
    constructor(vue, meetingShortname, xContest, writing=true){
        // parent constructor: initializes the room
        //(roomName, writing, storeInfos, path, className, datasetName='')
        super(`contests/${xContest}@${meetingShortname}`, writing, true, '/static/rContestTechHighClient.js', 'rContestTechHighClient', '')

        // needed to call things in the vue class
        this.vue = vue;
    }

    /**
     * called when a a writing ticket is stored or deleted
     */
    onWritingTicketChange(){
        this.vue.readOnly = this.room.writingTicketID==false;
    }

    onChange(){

        // some computed properties such as resultGridTemplate are not updated when its content changes (e.g. xHeight changed from negative values to the true value); thus we need this stupid fake property
        // is this still required?
        this.vue.fakeProperty++;

    }

    setProps(){

        // make sure that the series are sorted
        this.room.sortSeries();

        // set the changed data-property as data of the vue-instance
        this.vue.contest = this.room.data.contest;
        this.vue.series = this.room.data.series;
        this.vue.startgroups = this.room.data.startgroups;
        this.vue.relatedGroups = this.room.data.relatedGroups;
        this.vue.disciplines = this.room.data.disciplines;
        this.vue.meeting = this.room.data.meeting;
        this.vue.categories = this.room.data.categories;
        this.vue.roomAuxData = this.room.data.auxData;
        
        
        // this.vue.baseDisciplines = this.room.data.disciplines;
        // this.vue.categories = this.room.data.categories;

        // backtransfer the "proxied" data from the vue, so that changing data in the room runs through the proxy
        this.room.data.contest = this.vue.contest;
        this.room.data.startgroups = this.vue.startgroups;
        this.room.data.series = this.vue.series;
        this.room.data.relatedGroups = this.vue.relatedGroups;
        this.room.data.disciplines = this.vue.disciplines;
        this.room.data.auxData = this.vue.roomAuxData;
        // no backtransfer of meeting and categories required
    }
    
    afterFullreload(){

        // first, calculate the time offset of the browser's time and the time on the server
        // the offset is defiend as serverTime - timeHere; i.e. the value is positive, when the time here is lower than on the server.
        this.vue.timeOffset = new Date(this.room.data.serverTime) - new Date();

        // 
        this.setProps()

        // also update the writing status
        this.onWritingTicketChange();

    }
    
    dataArrived(){

        // 2022-12: same as afterFullReload
        this.afterFullreload()

        // OLD: 
        // this.setProps();
        
        // // also update the writing status
        // this.onWritingTicketChange();

    }

}