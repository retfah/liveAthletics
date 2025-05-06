// this line shall be no code, since it is a comment in 

// functions for formatting to be included in the methods part of vue-"classes"
/**
 * formatPerf: format a performance value to a string, e.g. the height in cm (350) to "3.5 m". 
 * @param {numeric} value The value to format
 * @param {integer} xBaseDiscipline the baseDiscipline; this decides about how the value is formatted 
 */
formatPerf(value, xBaseDiscipline){
    if (value===undefined || value===null){
        return '';
    }
    
    if (xBaseDiscipline==1){
        // pole vault or high jump
        return (value/100).toString() + " m";
    } else if (xBaseDiscipline==2){
        return (value/1000).toString() + " m";
    }
    // TODO: extend with other baseDisciplines
    return value;
    
},
/**
 * format a time string. Only the seconds when they deviate
 * @param {datetime-string} time The datetime to format as string
 * @param {integer} showDate 0 (default): never show a date, 1: show day and month, 2: show day, month and year
 * @param {integer} showSeconds 0 (default): never show the seconds, 1: show if !=0, 2: always show
 */
formatTime(time, showSeconds=0, showDate=0){
    // return a formatted time value.
    // if dateFrom=dateTo, only return the time; otherwise include the portion of date needed.
    // if seconds are given, include them
    let s = '';
    let d = new Date(time);
    if (showDate==2){
        s += (d.getFullYear()).toString() + ' ';
    }
    if (showDate){
        s += (d.getMonth()+1).toString().padStart(2,0);
        s += "." + d.getDate().toString().padStart(2,0) + ' ';
    }
    s += `${d.getHours()}`.padStart(2, '0');
    s += ":" + `${d.getMinutes()}`.padStart(2,'0');
    if (showSeconds==2 || (showSeconds==1 && d.getSeconds() != 0)){
        s += ':' + `${d.getSeconds()}`.padStart(2,'0');
    }

    return s;

},