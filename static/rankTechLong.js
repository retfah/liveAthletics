// provide a function to rank techLong competitions, when the data is prepeared accordingly:
// the result object must contain the properties of ssr
// results must be provided as an array ob objects, each containing the results of one seriesstartresult, including a property ranking data with:
/*
    res.rankingData = {
        bestResultWindValid: 0, // will ALWAYS be filled with the best result where the wind either does not exist (e.g throws or indoor) or where it is <=2.0 m/s
        bestResultWindValidWind: null, // will be set to the wind of the best result with valid wind
        bestResult: 0, // the overall best result
        bestResultWind: null, // the wind for the respective result
        resultsSorted: [], // best first; only non-zero results, but independent of the wind; will be used for ranking later (Note: the wind is not important here)
    }
*/
// and a results array with objects of the single results (NOTE: .results is equal to the default .resultstech from the DB):
/*
    res.results.push({
        attempt: r.attempt,
        result: r.result,
        wind: r.wind,
    })
*/
export default rankTechLong;
export {rankTechLong};

// add ranks for techLong results
function rankTechLong(results, label){
    results.sort((r1, r2)=>{
        // compare the sorted Results
        for (let i=0; Math.min(r1.rankingData.resultsSorted.length, r2.rankingData.resultsSorted.length); i++){
            if (r1.rankingData.resultsSorted[i]>r2.rankingData.resultsSorted[i]){
                // r1 is better
                return -1;
            } 
            if (r2.rankingData.resultsSorted[i]>r1.rankingData.resultsSorted[i]){
                // r2 is better
                return 1;
            } 
            // both are equal
            return 0;
        }

        // if one athlete had more results than another, he/she is better if at least the best of the additional results is valid

        if (r1.rankingData.resultsSorted.length>r2.rankingData.resultsSorted.length && r1.rankingData.resultsSorted[r2.rankingData.resultsSorted.length-1]>0){
            // r1 is better
            return -1;
        }
        if (r2.rankingData.resultsSorted.length>r1.rankingData.resultsSorted.length && r2.rankingData.resultsSorted[r1.rankingData.resultsSorted.length-1]>0){
            // r2 is better
            return 1;
        }

        // both are equal
        return 0;
    })

    // do the ranking
    // current rank during rank assignment
    let rank=1;
    // from the sorted array, derive the ranking
    for (let i=0; i<results.length; i++){

        // make sure the ranking object already exists
        if (!('ranking' in results[i])){
            results[i].ranking = {};
        }

        if (results[i].resultOverrule<2){
            let r2 = results[i];
            if (i>0){
                let r1 = results[i-1];
                // check if the element equals the last
                let equal = true;
                for (let j=0; j<Math.min(r1.rankingData.resultsSorted.length, r2.rankingData.resultsSorted.length); j++){
                    if (r2.rankingData.resultsSorted[j] != r1.rankingData.resultsSorted[j]){
                        equal = false;
                        break;
                    }
                }
                if (!equal){
                    rank = i+1;
                }
            }
            // assign a rank only if there is a valid result
            if (r2.rankingData.bestResult){ // if there is no valid result, it will be 0
                results[i].ranking[label] = rank;
            }else{
                results[i].ranking[label] = 0
            }
            
        } else {
            results[i].ranking[label] = 0; // TODO: eventually, no rank is something undefined instead of 0 or we use rank as a string and tranlate the overrule-code here to DQ, DNS, DNF, ...
        }
        
    }

}