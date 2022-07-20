/**
 * ---------- TODO ---------------
 * --> update this document based on the 'standard' that openTrack and EA want to implement. Ideally, the data exchange here should be the same or an extension of the standard. The extension might be necessary to allow for the differentiation between events and contests.
 */



// this js-class is intended to be able to handle live results of all track disciplines. 
// it is initialized by definition of:
// - a div where shall be written to
// - a hidden div containing all the sample-html-parts corretly translated, which will be copied and data filled in
// - what event / etc to show 

// TODO: make sure the inscription part also works when no contest is defined yet --> show event

// data for local testing; the same that could be received from the server when data demanded for the first time
initData = {
    background:{
        contest:{ // the information about this contest
            events:{}, // a list of all events of this 
            round:1,  // number of round this is
            roundtype:1 // which roundType 
        }, 
        state: 1, // the status of the contest (inscriptions, series made, results-ive, rankinglist) --> this defines how data is interperted and shown
        version: 1 // a number incresing with every change, to know how to current version of the data
        
    },
    // normally there is only one state called 'data'; here we exemplarily have all possibilities.

    /**
     * the data structure must allow to effieciently process several single changes ideally without reloading everything, at least when there is no state change (* when the state changes e.g. from inscription to series a complete change in the drawing is probably needed anyway so there it would be ok):
     * - delete athlete
     * - add athlete
     * - update athlete's data, e.g. result, bestPerf, bib (eventually allow any data to be changed except the ID)
     * - eventually have two main structures: athletes, and series --> where to put results? (for techHigh there must be at least an additional heights structure)
     */ 

    // two variants:
    dataState1_Variant1: {
        // inscriptions only
        A123456:{
            id:123456, // the id is used as identifier and also given here as integer for simplicity
            surname:"S1",
            forename:"F1",
            dateOfBirth: new Date(1970,1,1), // for data protection, the server MUST normally not send the whole dateOfBirst, but only the year (1.1.20xx). This reference implementation gives the option to easily change to the full dateOfBirth without too many client side changes
            club:"Club Nr 1",
            bestperf:123, // not string!, we want to be able to sort by this
            bib:123,
            category, // the category the person is registred
            event, // the eventID the person is registred --> makes it possible to sort/group/filter by event
        },
        athID2:{},
        athID3:{}
    },

    dateState1_Variant2:[
        {
            id:123456,
            surname:"S1",
            forename:"F1",
            dateOfBirth: new Date(1970,1,1), // for data protection, the server MUST normally not send the whole dateOfBirst, but only the year (1.1.20xx). This reference implementation gives the option to easily change to the full dateOfBirth without too many client side changes
            club:"Club Nr 1",
            bestperf:123, // not string!, we want to be able to sort by this
            bib:123,
            category, // the category the person is registred
            event, // the eventID the person is registred --> makes it possible to sort/group/filter by event
        },
        {
            id:98765
            // others
        },
        {
            id:567654
            //others
        }
    ],

    // state 2, 3, and 4 look the same for track
    dataState2: {
        // series prepared
        series:{
            S1:{
                id:1,
                cameraId:123,
                wind=undefined,
                athletes=[], //needed?
                
            }
        }
    },
    dataState3:{
        // results live
    },
    dataState4:{
        // rankinglist
    }

}