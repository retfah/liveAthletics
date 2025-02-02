// provide a function to rank techHigh competitions, when the data is prepeared accordingly:
// the result object must contain the properties of ssr
// results must be provided as an array ob objects, each containing the results of one seriesstartresult, including a property ranking data with:
/*
    res.rankingData = {
        totalFailedAttempts: 0, // until and with the last valid hight
        //failedAttemptsSinceLastValid: 0, // after 3, the person is out of the competition. 
        failedAttemptsOnLastValid: 0,
        lastValidHeight: 0,
        numFailedJumpoffAttempts:0,
        numValidJumpoffAttempts:0,
        //lastFinishedHeight: 0,
        //firstUnfinishedHeight: ,
    }
*/
// and a results array with objects of the single results,:
/*
    res.results.push({
        height: r.height,
        // resultStr: resStr,
        jumpoffOrder: r.jumpoffOrder,
        resultsHighFailedAttempts: r.resultsHighFailedAttempts,
        resultsHighValid: r.resultsHighValid,
        resultsHighPassed: r.resultsHighPassed,
    })
*/
export default rankTechHigh;
export {rankTechHigh};

// add ranks for techHigh results
// will write the rank to res.ranking[label] = rank; the label allows to add different ranks for different "bundles", e.g. with the same series, over all series, etc.
function rankTechHigh(results, label="default"){
    // sort the results
    results.sort((s1, s2)=>{
        if (Math.max(s1.resultOverrule,1) !=  Math.max(s2.resultOverrule,1)){ // regular (0) and retired (1) must be treated the same
            return s1.resultOverrule - s2.resultOverrule; // this should meansingfully sort also within resultOverrule
        }
        // both result overrules are <2
        let r1 = s1.rankingData;
        let r2 = s2.rankingData;

        // 1) lastValidHeight
        if (r1.lastValidHeight != r2.lastValidHeight){
            return r2.lastValidHeight - r1.lastValidHeight; // the lower the more to the right.
        }

        // 2) failed attempts on last valid height
        if (r1.failedAttemptsOnLastValid != r2.failedAttemptsOnLastValid){
            return r1.failedAttemptsOnLastValid - r2.failedAttemptsOnLastValid; // the lower the more to the left
        }

        // 3) failed attempts in total
        if (r1.totalFailedAttempts != r2.totalFailedAttempts){
            return r1.totalFailedAttempts - r2.totalFailedAttempts; // the lower the more to the left
        }

        // jumpoff:

        // 4) the more results (independent whetrher valid or not) there are in the jumpoff, the better
        // (in contrast to the ranking in techHighBase, we can assume here that the results are correct and we only do the calculation at the end of the competition, and not between two athletes on the same jumpoff height)
        if (r1.numValidJumpoffAttempts + r1.numFailedJumpoffAttempts != r2.numValidJumpoffAttempts + r2.numFailedJumpoffAttempts){
            return r2.numValidJumpoffAttempts + r2.numFailedJumpoffAttempts - r1.numValidJumpoffAttempts - r1.numFailedJumpoffAttempts; // the more the better, i.e. the lower thew rank
        }

        // 5) it is also deemed 'failure' when an athlete retired after the last height. Thus if both have failed at the same height, but one is finally called retired, he actually left before and thus is ranked worse
        if (r1.resultOverrule != r2.resultOverrule){
            return r1.resultOverrule - r2.resultOverrule;
        }

        // equal results
        return 0;

    })

    // current rank during rank assignment
    let rank=1;
    // from the sorted array, derive the ranking
    for (let i=0; i<results.length; i++){

        // make sure the ranking object already exists
        if (!('ranking' in results[i])){
            results[i].ranking = {};
        }

        if (results[i].resultOverrule<2){
            let r2 = results[i].rankingData;
            if (i>0){
                let r1 = results[i-1].rankingData;
                // check if the element equals the last
                let equal = (r1.lastValidHeight == r2.lastValidHeight && r1.failedAttemptsOnLastValid == r2.failedAttemptsOnLastValid && r1.totalFailedAttempts == r2.totalFailedAttempts && r2.numValidJumpoffAttempts + r2.numFailedJumpoffAttempts == r1.numValidJumpoffAttempts + r2.numFailedJumpoffAttempts && r1.resultOverrule == r2.resultOverrule); 
                if (!equal){
                    rank = i+1;
                }
            }
            // assign a rank only if there is a valid height
            if (r2.lastValidHeight){ // if there is no valid height, it will be 0
                results[i].ranking[label] = rank;
            }else{
                results[i].ranking[label] = 0
            }
            
        } else {
            results[i].ranking[label] = 0; // TODO: eventually, no rank is something undefined instead of 0 or we use rank as a string and tranlate the overrule-code here to DQ, DNS, DNF, ...
        }
        
    }

}