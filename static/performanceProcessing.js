// Provide functions needed for the different disciplines, e.g. formatting functions (130 => 1.30 m), check and modification functions (string to DB-value), etc

// all formatters for their baseDiscipline-type; 
// the parameters shall be as follows (value, discipline, showUnit=false, ..typeSpecificOptions)
// OPTION: dynamically extend this list with discipline types imported from modules
export const disciplineFormatters = {
    1: function (value, discipline, showUnit=false){
        if (value==0){
            return '';
        }
        const valObj = disciplineValueProcessors[1](value);
        if (showUnit){
            return `${valObj.m}.${valObj.cm.toString().padStart(2,0)} m`;    
        } 
        return `${valObj.m}.${valObj.cm.toString().padStart(2,0)}`;
    },
    2: function (value, discipline, showUnit=false){
        if (value==0){
            return '';
        }
        const valObj = disciplineValueProcessors[2](value);
        if (showUnit){
            return `${valObj.m}.${valObj.cm.toString().padStart(2,0)} m`;    
        }
        return `${valObj.m}.${valObj.cm.toString().padStart(2,0)}`;
    },
    3: function (value, discipline, showUnit=false, showMillis=false){
        // competition rules 19.23: up to and inlcuding 10'000m on track, the times have to be shown with 1/100 s precision. On track >10'000m (does that even exist?), times are shown with 1/10 precision. For disciplines partially or fully outside a track the times are precise to 1 s. 
        // since we do not differentiate on track/outside track at the moment, we simply take the distance as the criterion for the precision.

        // NOTE: performances from manual timing have to be rounded differently! However, there is no special treatment here, since it is assumed that those results are already entered with the correct rounding.

        // NOTE: never show units as soon as there is a doble dot in the time-string, e.g. when at least minutes are shown.

        if (!value){
            return '';
        }

        // get the configuration:
        const conf = JSON.parse(discipline.baseConfiguration);
        
        if (!conf?.distance){
            throw {code: 101, message: `Discipline ${discipline?.xDiscipline} is lacking a distance in the configuration.`}
        }
        if (conf.distance<=10000){
            // get the rounded values
            const valObj = disciplineValueProcessors[3](value, showMillis ? 3:2); 
            if (conf.distance<=400){
                // only show seconds, even if there are minutes
                let txt;
                if (showMillis){
                    txt = `${valObj.minutes*60 + valObj.seconds}.${valObj.millis.toString().padStart(3,'0')}`
                } else{
                    txt = `${valObj.minutes*60 + valObj.seconds}.${valObj.hundreths.toString().padStart(2,'0')}`
                }
                
                if (showUnit){
                    return `${txt} s`;    
                }
                return txt;
            } else {
                // never show the unit here, since it is clear from the format with ":". But differentiate whether there are hours or not
                if (valObj.hours){
                    if (showMillis){
                        return `${valObj.hours}:${valObj.minutes.toString().padStart(2,'0')}:${valObj.seconds.toString().padStart(2,'0')}.${valObj.millis.toString().padStart(3,'0')}`
                    } else{
                        return `${valObj.hours}:${valObj.minutes.toString().padStart(2,'0')}:${valObj.seconds.toString().padStart(2,'0')}.${valObj.hundreths.toString().padStart(2,'0')}`
                    }
                }
                // no hours --> no need to pad minutes, but the seconds
                if (showMillis){
                    return `${valObj.minutes}:${valObj.seconds.toString().padStart(2,'0')}.${valObj.millis.toString().padStart(3,'0')}`
                } else {
                    return `${valObj.minutes}:${valObj.seconds.toString().padStart(2,'0')}.${valObj.hundreths.toString().padStart(2,'0')}`
                }
            }
        } else {
            // >10000m, do not show anything smaller than milliseconds
            // the unit is never used
            const valObj = disciplineValueProcessors[3](value, 0); 
            if (valObj.hours){
                return `${valObj.hours}:${valObj.minutes}:${valObj.seconds}`;    
            }
            return `${valObj.minutes}:${valObj.seconds}`;  
        }
    },
    '2wind': function (value, showUnit=true, showSign=false){
        // wind for tech long (long jump, triple jump)
        // wind is in cm/s; must be scaled to m/s
        const wind = Math.ceil(value/10)/10; // round up to the next dm/s
        let sign='';
        let unit='';
        if (showSign && wind>=0){
            sign='+';
        }
        if (showUnit){
            unit=' m/s';
        }
        return `${sign}${wind.toFixed(1)}${unit}`;
    }
}

// A function to process the data value of a performance into an object
// process the preformance values for each discipline type and return the value as an object; for heights/distances returns mcm (distance in meters as float, including cm), m, cm. For track disciplines returns hours, minutes, seconds, hundreths and milli, where all times except the two smallest are complementary (i.e. minutes do not include hours). 
// this function shall be usable not only to format a value with units, but e.g. also to check whether the value is reasonable or not
// OPTION: dynamically extend this list with discipline types imported from modules
const disciplineValueProcessors = {
    1: function (value){
        // tech high disciplines: the integer value is always in cm --> change to m
        const m = Math.floor(value/100);
        const cm = value-100*m;
        return {
            mcm: value/100,
            m,
            cm,
            // add here ft in etc
        }
    },
    2: function(value){
        // tech long disciplines: the integer value is always in mm --> change to m
        const m = Math.floor(value/1000);
        const cm = Math.floor((value-1000*m)/10);
        const mm = value-1000*m;
        return {
            mcm: m+cm/100,
            mmm: value/1000,
            m,
            cm,
            mm,
            // add here ft in etc
        }
    }, 
    /**
     * A function to process the data value of a track performance into an object with hours, minutes etc.
     * @param {numeric} value The value to format as an integer with 1/100'000s precision
     * @param {integer} subSecRounding To how many digits after the full second shall be rounded up (default=5= no rounding.)
     * @returns object, with hours, minutes, seconds, hundreths, milliseonds, subSec, where the last three are not complementary. Additionally, subSec is not rounded, but contains the full subsecond part. For subSecRounding=0 this means that whenever subsec is not zero, the actual second-value (if merged together again) is one lower than indicated, since it was rounded up!
     */
    3: function(value, subSecRounding=5){
        // track disciplines: all track disciplines are stored as integers with 1/100'000 s precision. But the resutls are shown diferently to the user of course.

        const ret = {
            hours:0,
            minutes:0,
            seconds:0,
            hundreths:0,
            millis:0,
            subSec:0,
        }
        ret.hours = Math.floor(value/(3600*100000));
        value -= ret.hours*3600*100000;
        ret.minutes = Math.floor(value/(60*100000));
        value -= ret.minutes*60*100000;
        // differentiate whether there is a subSec part or not
        if (subSecRounding==0){
            // include the rounded in subSecond part in the second by rounding up!
            let secondsFloored = Math.floor(value/100000);
            ret.subSec = value-secondsFloored*100000;
            
            // round up the seconds for the second to return
            ret.seconds = Math.ceil(value/100000);

        } else {
            // apply the rouding on the chosen subsecond-level. This must be done BEFORE the seconds are split, otherwise 0.9999 would not be rounded up to 1.0000!
            value = Math.ceil(value/(10**(5-subSecRounding)))*10**(5-subSecRounding);

            ret.seconds = Math.floor(value/100000);
            value -= ret.seconds*100000;
            // now, value contains only the sub-seconds part
            // apply the general rounding
            ret.subSec = value;
            // millis and hundreths are always rounded up as well
            ret.millis = Math.ceil(value/100) // round up!
            ret.hundreths = Math.ceil(value/1000) // round up!
        }
        
        return ret;
        
    }
}

// see validate performance for the requirements of the returned objects
export const disciplineValidators = {
    1:function(value, discipline){

        // get the configuration:
        const conf = JSON.parse(discipline.baseConfiguration);

        // when there is no comma or period and the number has three digits or more, it is in cm

        // new approach: 
        // remove text (e.g. units)
        value = value.replace(/[A-Za-z]/g, '');
        // replace comma by period
        value = value.replaceAll(',', '.');
        

        // try to interpret the string as a number
        let num = Number(value);

        if (isNaN(num)){
            return {
                valid: false,
                value,
                valueModified: false,
                realistic: false 
            }
        }

        let valueModified = false;

        // if the number is below 50 or has a period, it is in m (it would be funnier "if it is in in")
        if (num < 50 || value.indexOf('.') >= 0){
            // change to cm
            num = Math.round(num*100); // despite the fact in athletics we should always round down (floor), we should use round here, because the floats might be slightly "wrong", e.g. floor(4.85*100)=484 instad of 485. 
            valueModified = true;
        }
        // num is in cm now

        // check whether the value is realistic
        let realistic = true;
        if (conf.heightMax){
            if (num > conf.heightMax || num < conf.heightMax/5){
                realistic = false;
            }
        } else {
            console.log(`Could not check whether the value ${value} is realistic or not, since no boundaries are given for this base discipline.`);
        }

        return {
            valid: true,
            value: num, 
            valueModified,
            realistic,
        }

    },
    2:function(value, discipline){
        // tech long
        
        // get the configuration:
        const conf = JSON.parse(discipline.baseConfiguration);

        // when there is no comma or period and the number has three digits or more, it is in cm

        // new approach: 
        // remove text (e.g. units)
        value = value.replace(/[A-Za-z]/g, '');
        // replace comma by period
        value = value.replaceAll(',', '.');
        

        // try to interpret the string as a number
        let num = Number(value);

        if (isNaN(num) || num<=0){
            return {
                valid: false,
                value,
                valueModified: false,
                realistic: false 
            }
        }

        let valueModified = false;

        // if the number is below 120 or has a period, it is in m (it would be funnier "if it is in in"), otherwise in cm
        if (num < 120 || value.indexOf('.') >= 0){
            // change to mm
            num = Math.round(num*1000); // despite the fact in athletics we should always round down (floor), we should use round here, because the floats might be slightly "wrong", e.g. floor(4.85*100)=484 instad of 485. 
            valueModified = true;
        } else {
            // cm to mm
            num*=10;
        }
        // num is in mm now

        // check whether the value is realistic
        let realistic = true;
        if (conf.perfMax){
            if (num > conf.perfMax || num < conf.perfMax/25){
                realistic = false;
            }
        } else {
            console.log(`Could not check whether the value ${value} is realistic or not, since no boundaries are given for this base discipline.`);
        }

        return {
            valid: true,
            value: num, 
            valueModified,
            realistic,
        }
    },
    3:function(value, discipline){
        // track
        // probably we need to differentiate the disciplines...
        /*
        Inputs: 
        6 --> could be seconds or minutes
        6.23 --> could be ss.000 or mm:ss
        2:13 --> could be hh:mm or mm:ss
        3:13.34 --> likely mm:ss.00, eventually hh:mm:ss
         */

        
        // the most flexible approach would be that multiple interpretations are tested and the most realistic one is chosen. This could be achieved with a score system, including (1) how well the scheme is matched (e.g. a period is only used to split seconds and thousands, maxScore=8) (2) how realistic the input with this interpretation would be (maxScore=10).
        // Idea: (1) split by ",.:<space>", (2) try to figure out which part is what
        // for (2): if there is exactly one point or period this is the point after the second
        /*
        Formats, by the number of numeric fields 
        1: (hh), mm, ss
        2: hh:mm, mm:ss, ss.000
        3: hh:mm:ss, mm:ss.000
        4: hh:mm:ss.000
        */ 

        // provide a range of realistic times, based on two dependencies of the distance (<=2K, >2K). The maximum time is simply 3.5x the minimum
        // get the configuration:
        const conf = JSON.parse(discipline.baseConfiguration);
                
        if (!conf?.distance){
            throw {code: 101, message: `Discipline ${discipline?.xDiscipline} is lacking a distance in the configuration.`}
        }
        let realisticMin = 0;
        if (conf.distance<=2000){
            realisticMin = (2.768221904 + 0.021595552 * conf.distance ** 1.244221402) * 100000; // the actual formula is in s; multiply with 100000 to be comaprable
        } else {
            realisticMin = (0.099521788 * conf.distance ** 1.043362228) * 100000; // the actual formula is in s; multiply with 100000 to be comaprable
        }
        let realisticMax = 3.5*realisticMin;

        // handle letters, e.g. units
        // first, replace letters with a whitespace e.g. "1 min 13 s" -> "1  13  "
        // then trim whitespace at the end
        // then reduce multi-white-spaces with one white space
        // NEW: do not do the next step, since we include letters as delimiters
        //value = value.replace(/([A-z]+)/g, ' ').trim().replace(/\s{2,}/g);

        // create a regular expression that matches the needles ,.:.'\s 
        // NEW: also match letters
        //var r = /[\.:',\s]+/g; // match multiple to make sure also the '' ("seconds") is matched
        var r = /[\.:',\sA-z]+/g; // match multiple!

        let previousIndex = 0;
        let values = [];
        let valuesRaw = []; // we need the raw value (i.e. as string) for hundreths-seconds or milliseconds, since 10.02 s ==> Number("02") = 2 !, but we must translate it to .02 !
        let delimiters = [];
        let match;
        while ((match = r.exec(value)) != null){
            delimiters.push(value.slice(match.index, match.index+match[0].length))
            let val = value.slice(previousIndex, match.index)
            // check that the value is numeric
            let val2;
            if (Number.isNaN(val2=Number(val))){
                // we cannot process "value", because there are not allowed letters
                return {
                    valid: false,
                    value,
                    valueModified: false,
                    realistic: false 
                }
            }
            values.push(val2);
            valuesRaw.push(val);
            previousIndex = match.index+match[0].length;
        }
        // add the last part as well, if there is still
        if (previousIndex<value.length){
            valuesRaw.push(value.slice(previousIndex));
            let val2;
            if (Number.isNaN(val2=Number(value.slice(previousIndex)))){
                // we cannot process "value", because there are not allowed letters
                return {
                    valid: false,
                    value,
                    valueModified: false,
                    realistic: false 
                }
            }
            values.push(val2);
        }

        // if "value" started with a delimiter, there will be an "additional" value 0 as value[0] (since Number('')=0) --> remove this
        if (values[0]==0){
            values.splice(0,1);
            delimiters.splice(0,1);
        }
        

        // by now, we have a values array of integers and a delimiters array of the delimiting strings. Given the length of values is <=4, it is certainly valid
        // NOTE: Values are before delimiters, e.g. value[0] + delimiter[0]
        // NOTE: the values-array will have one element more typically than the delimiters

        // provide a function to get the splitSecond part, since it is a little more complex than the rest, since we cannot simply multiply with a number, but we must consider the length of the original string, since "02" (being 2 hundreths of a second) would be Number("02")=2, so we must make sure that the 2 pops up at the right place beind the point again!
        const getSplitSeconds = function (index){
            return values[index]*10**(5-valuesRaw[index].length);
        } 

        // now, test different interpretations
        let delimiterScores = []; // 1 = no delimiter matches, 8= all delimiters match. This maxScore must be lower than the realisticness-score to make sure that the realisticness is always the most important indicator. 
        let times = [];
        let valuesModified = []; // it is always modified, except when entered in 1/100000 s
        if (values.length==1){
            // hh
            times.push(values[0]*3600*100000)
            if (delimiters.length>0 && ['h'].indexOf(delimiters[0])>=0){
                delimiterScores.push(8);
            } else {
                delimiterScores.push(1);
            }
            valuesModified.push(true);

            // mm
            times.push(values[0]*60*100000)
            if (delimiters.length>0 && ['m','min'].indexOf(delimiters[0])>=0){
                delimiterScores.push(8);
            } else {
                delimiterScores.push(1);
            }
            valuesModified.push(true);

            // ss
            times.push(values[0]*100000)
            if (delimiters.length>0 && ['s', 'sec'].indexOf(delimiters[0])>=0){
                delimiterScores.push(8);
            } else {
                delimiterScores.push(1);
            }
            valuesModified.push(true);

            // 00000 (1/100000 s)
            // very unrealistic that somebody enters the data this way, but but this function can be called on a DB value, so:
            times.push(values[0]);
            delimiterScores.push(1); // always unrelaistic, but if the time matches, then it will be ok.
            valuesModified.push(false);

        } else if(values.length==2){
            // hh:mm
            times.push(values[0]*3600*100000 + values[1]*60*100000);
            delimiterScores.push([':', 'h'].indexOf(delimiters[0])>=0 ? 8 : 1);
            valuesModified.push(true);

            // mm:ss
            times.push(values[0]*60*100000 + values[1]*100000);
            delimiterScores.push([':','m','min'].indexOf(delimiters[0])>=0 ? 8 : 1);
            valuesModified.push(true);

            // ss.000
            times.push(values[0]*100000 + getSplitSeconds(1));
            delimiterScores.push([',', '.', 's', 'sec'].indexOf(delimiters[0])>=0 ? 8 : 1);
            valuesModified.push(true);

        } else if(values.length==3){
            // hh:mm:ss
            times.push(values[0]*3600*100000 + values[1]*60*100000 + values[2]*100000);
            let score = 1;
            if ([':', 'h'].indexOf(delimiters[0])>=0) score +=3.5;
            if ([':','m','min'].indexOf(delimiters[1])>=0) score +=3.5;
            delimiterScores.push(score);
            valuesModified.push(true);

            // mm:ss.000
            times.push(values[0]*60*100000 + values[1]*100000 + getSplitSeconds(2));
            score = 1;
            if ([':','m','min'].indexOf(delimiters[0])>=0) score +=3.5;
            if ([',', '.', 'sec', 's'].indexOf(delimiters[1])) score +=3.5;
            delimiterScores.push(score);
            valuesModified.push(true);

        } else if (values.length==4){
            // hh:mm:ss.000
            times.push(values[0]*3600*100000 + values[1]*60*100000 + values[2]*100000 + getSplitSeconds(3));
            // there are three delimiters, each may increase the score by 3
            let score = 1;
            if ([':','h'].indexOf(delimiters[0])>=0) score +=7/3;
            if ([':','m','min'].indexOf(delimiters[1])>=0) score +=7/3;
            if ([',', '.', 's', 'sec'].indexOf(delimiters[2])) score +=7/3;
            delimiterScores.push(score);
            valuesModified.push(true);

        } else {
            // something is wrong with that input
            return {
                valid: false,
                value,
                valueModified: false,
                realistic: false 
            }
        }

        // evaluate which interpretations have the highest score and return this result 

        let realistic = [];
        let timeScores = [];

        // NEW: since the different time interpretations are clearly different from each other, there is no need for a complex timeScore. Just set to 10 when the time is within the range (i.e. =realistic) and to 1 otherwise
        for (let time of times){
            realistic.push(time>realisticMin && time < realisticMax)
            timeScores.push((time>realisticMin && time < realisticMax) ? 10 : 1)
        }


        let indexMax = 0;
        let scoreMax = 0;
        for (let i=0;i<realistic.length;i++){
            let totalScore;
            if ((totalScore = timeScores[i] * delimiterScores[i]) > scoreMax){
                scoreMax = totalScore;
                indexMax = i;
            }
        }
        //console.log(scoreMax);

        // the best match is found
        return {
            valid: true,
            value: times[indexMax],
            valueModified: valuesModified[indexMax], // this is always true, except if the time was entered as needed for the DB, i.e. in 1/100000 s...
            realistic: realistic[indexMax],
        }

    },
}

/**
 * validatePerformance: validate the given string input value for the specified xBaseDiscipline. This also includes that the string is interpreted, e.g. 470 for pole vault cannot be in m, but must be in cm. The corrected value is returned as part of the returned object. 
 * @param {string} value  The value to validate. If the value is undefined, it will be replaced with ''
 * @param {object} discipline The discipline-object
 * @return {object} 
 * @return {boolean} obj.valid true if the now defined value is valid
 * @return {integer} obj.value The numeric integer as it will be stored in the DB
 * @return {boolean} obj.valueModified true if the value changed
 * @return {boolean} obj.realistic false if the entered value is technically fine, but unrealistic (e.g. 100.23m javelin)
 **/ 
export function validatePerformance(value, discipline){
    // IDEA: every discipline-type should provide its own function to do the validation. 
    
    // make sure value is not undefined and surely a string
    if (value==undefined){
        value = '';
    } else if (typeof(value) != 'string'){
        value = value.toString();
    }

    // first trim
    let trimmed = value.trim();
    if (trimmed != value){
        value = trimmed;
    }

    if (discipline.type in disciplineValidators){
        return disciplineValidators[discipline.type](value, discipline)
    } else {
        // if there is no real method, just return that the value is ok. 
        return {
            valid: true,
            value,
            valueModified: false,
            realistic: true
        }
    }
}

export function formatCountryRegion(region){
    // if there is country and region defined, return "country / region", otherwise just "country"
    if (region.regionShortname){
        return region.country + " / " + region.regionShortname;
    } else if (region.regionName){
        return region.country + " / " + region.regionName;
    } else {
        return region.country;
    }
}