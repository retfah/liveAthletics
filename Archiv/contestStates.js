// a list of all contests-states to show the client. 
// The name given to the state is the default name if no language specific name is given in the language file. It should be in english. 

// TODO: these status are NOT correct yet (just copied from seltec )
// - the values have some space in between on purpose to allow later additions
// - eventually it will make sense to add another property "referenced", indicating whether the status is just for information or has a specific meaning for the software. (However, when every software function relying on the status uses a certain range, then this should not be important.)
// note: the status should never be checked like ==20, but like >=20 && <30 to allow for userdefined status inbetween with the same meaning for the program
// current official parts:  
// 0-59: before roll call done
// 60-79: roll call done, before startlist official
// 80-119: startlist official, competition not yet started
// 120-179: competition running
// 180-255: competition finished
// numbers available (tinyint): 0-255

// TODO: replace this and put it in a simple ejs file, which will be injected. The approach here with the extra/special translaztion stuff is way too complicated!

let contestStates = [
    {value: 10, text: 'Round defined'}, // planned
    {value: 15, text: 'Roll call printed'},
    {value: 16, text: 'Entries available'}, // entries available
    {value: 60, text: 'Roll call finished'}, // evnetually equivalent to group/contest assignment done
    {value: 70, text: 'Editing Start List'}, // the overlay for the initial series setting shall only be possible when the state is editing startlist 
    {value: 75, text: 'Start List finished'},
    {value: 80, text: 'Start List official'},
    {value: 120, text: 'In progress'}, 
    {value: 180, text: 'Finished', },
    {value: 200, text: 'Results Official', },
    {value: 230, text: 'Certificate printed', }
]

// TODO: define the series states that are programmatically needed and their ranges!
let seriesStates = [
    {value: 10, text: 'Series under definition'}, // 
    {value: 70, text: 'Series official'}, // 
    {value: 130, text: 'In progress'}, // 
    {value: 180, text: 'Finished'}, // 
    {value: 200, text: 'Official'}, // 
]

export default contestStates;
export {seriesStates, contestStates};