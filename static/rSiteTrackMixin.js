
// define the methods for rSiteTrackClient here, and use them as a mixin for rSiteTrackClient (browser) and rSiteTrackClientForTiming (server)
export default {

    addUpdateResultExe: function(data){
        // data contains: xContest, xSeries, xSeriesStart, result
        // add or update a single result

        // get the contest
        let c = this.data.contests.find(contest=>contest.xContest == data.xContest);
        if (!c){
            throw {code:21, message: `Could not find the contest with xContest=${data.xContest}.`}
        }

        // partially copied form rContestTrack
        // try to get the respecitve series, ssr, result
        let s = c.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            throw {code:22, message: `Could not find the series with xSeries=${data.xSeries}.`}
        }

        let ssr = s.SSRs.find(ssr=>ssr.xSeriesStart == data.xSeriesStart);
        if (!ssr){
            throw {code:23, message: `Could not find the xSeriesStart with xSeriesStart=${data.xSeriesStart}.`}
        }

        let rankBefore;
        if (ssr.resultstrack===null){
            // add result
            ssr.resultstrack = data.result;

            rankBefore = Infinity;
        } else {
            // update result
            rankBefore = ssr.resultstrack.rank;
            ssr.resultstrack = data.result;
        }

        // if the rank is changed, update the necessary other ranks
        // what cases are possible and are they handled well?:
        // - regular time changes, where obviously the rank might change as well
        // - equal times, different rank to same (better) rank
        // - equal times, equal rank to worse rank.
        // if the better ranked result of two results with equal time is ranked down, then the other MUST be rnaked better. Otherwise we could end up having 1st, and twice third. However, the opposite way around is not true. 
        let currentResults = s.SSRs.filter(ssr2=>ssr2.resultstrack!==null && ssr2.xSeriesStart != data.result.xResultTrack);
        for (let ssr2 of currentResults){
            if (ssr2.resultstrack.rank <= rankBefore && ssr2.resultstrack.rank >= data.result.rank){
                // the rank of the changed result was lowered
                // if the rounded times are equal, we assume that having equal ranks is expected and no change is needed; otherwise, increase the rank
                // NOTE: currently we do no checks if the rank is realistic based on the times.
                if (ssr.resultstrack.timeRounded != ssr2.resultstrack.timeRounded || ssr2.resultstrack.rank != data.result.rank){ // NOTE: the last condition is needed in cases where >2 persons have the same time and the person of rank 3 is moved to 1 (together with the person that is already on 1; then, rank 2 must be increased to 3) 
                    ssr2.resultstrack.rank++;
                }
            } else if (ssr2.resultstrack.rank > rankBefore && ssr2.resultstrack.rank <= data.result.rank){
                // the rank of the changed result was increased
                ssr2.resultstrack.rank--;
            }
        }

    },

    deleteResultExe: function(data){
        // data contains: xContest, xSeries, xSeriesStart

        // get the contest
        let c = this.data.contests.find(contest=>contest.xContest == data.xContest);
        if (!c){
            throw {code:21, message: `Could not find the contest with xContest=${data.xContest}.`}
        }

        // try to get the respecitve series, ssr, result
        let s = c.series.find(s=>s.xSeries==data.xSeries);
        if (!s){
            throw {code:22, message: `Could not find the series with xSeries=${data.xSeries}.`}
        }

        let ssr = s.SSRs.find(ssr=>ssr.xSeriesStart == data.xSeriesStart);
        if (!ssr){
            throw {code:23, message: `Could not find the xSeriesStart with xSeriesStart=${data.xSeriesStart}.`}
        }

        let rankDeleted = ssr.resultstrack.rank;

        // remove locally
        ssr.resultstrack=null; 

        // decrease the rank of all other SSRs in the same heat
        for (let ssr2 of s.SSRs){
            if (ssr2.resultstrack !== null){
                if (ssr2.resultstrack.rank > rankDeleted){
                    ssr2.resultstrack.rank--;
                }
            }
        }

    },

    // TODO: add all other result-functions here
    // addUpdateResultsHeat: used by timing to send results of full heat
    // deleteResultsHeat
    // addUpdateheatAux

    changeContestExe: function(contest){
        // search the contest first
        const ic = this.data.contests.findIndex(c=>c.xContest==contest.xContest);
        // copy over the present series to the new contest object and save it
        contest.series = this.data.contests[ic].series;
        this.propertyTransfer(contest, this.data.contests[ic])
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