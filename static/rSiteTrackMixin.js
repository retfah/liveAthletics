
// define the methods for rSiteTrackClient here, and use them as a mixin for rSiteTrackClient (browser) and rSiteTrackClientForTiming (server)
export default {
    changeContestExe: function(contest){
        // search the contest first
        const ic = this.data.contests.findIndex(c=>c.xContest==contest.xContest);
        // copy over the present series to the new contest object and save it
        contest.series = this.data.contests[ic].series;
        this.data.contests[ic] = contest;
    },

    changeSeriesExe: function(series){
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
    },

    deleteSeriesExe: function(series){
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
    },

    addSeriesExe: function(data){
        // it should be possible to use here the same code as on the server
        const contest = data.contest;
        const series = data.series;

        // get (or create) the contest in the data of this room 
        const c = this.getOrCreateContest(contest.xContest, contest);

        // add the series to the main data object
        c.series.push(series)
    },

    /**
     * Try to get the object of the specified contest
     * @param {integer} xContest 
     * @param {object} contest the contest data object for 
     */
    getOrCreateContest: function(xContest, contest){
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
                baseConfiguration: c2.baseConfiguration,
            }
            this.data.contests.push(c);
        }
        return c;
    },
}