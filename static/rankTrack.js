// provide a function to rank track competitions, when the data is prepeared accordingly:
// the result object must contain the properties of ssr
// the data from the table resultstrack (usually accessed as ssr.resultstrack) must be included in the main object 
/*
    res.time = ssr.resultstrack.time
    res.timeRounded = ssr.resultstrack.timeRounded
    res.rank = ssr.resultstrack.rank
    //res.reactionTime = ssr.resultstrack.reactionTime
*/
export default rankTrack;
export {rankTrack};

// add ranks for track results
function rankTrack(results, label="default"){
    // always use simply the time; ranking based on the evaluation on the timing should already be present, but we will ensure it here

    results.sort((s1,s2)=>{
        if (Math.max(s1.resultOverrule,1) !=  Math.max(s2.resultOverrule,1)){ // regular (0) and retired (1) must be treated the same
            return s1.resultOverrule - s2.resultOverrule; // this should meansingfully sort also within resultOverrule
        }
        if (s1.timeRounded===null && s2.timeRounded===null){
            return 0;
        }
        if (s1.timeRounded===null){
            return 1;
        } 
        if (s2.timeRounded===null){
            return -1;
        } 
        if (s1.timeRounded-s2.timeRounded != 0){
            return s1.timeRounded-s2.timeRounded;
        }
        return s1.rank-s2.rank;
    });

    let lastRank = 0;
    let lastTime = -1;
    for (let i=0; i<results.length; i++){
        let res = results[i];
        if (res.timeRounded != lastTime){
            lastRank = i+1;
            lastTime = res.timeRounded;
        }

        // make sure the ranking object already exists
        if (!('ranking' in res)){
            res.ranking = {};
        }

        // rank=0 if there is a resultOverrule!
        if (res.resultOverrule>1 || res.timeRounded==null){
            res.ranking[label] = 0;
        } else {
            res.ranking[label] = lastRank;
        }
    }

}