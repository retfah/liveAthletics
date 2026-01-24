

/** TODO
 * - all strings that may appear multiple times should not be in a sub-object per print-class, but in "static translations"! Move all that stuff as soon as possible. 
 * - ...
 */

export const confPrint={

    // EN = DEFAULT:
    // translations can be defined for en as well, however, the name used in the printing functions should be english already and will simply not be translated when it is not available as a translation here
    en: {
        pageSize: [595.28, 841.89], // in points; A4=[595.28, 841.89],
        pHeaderFooter: {
            fontsize: 11,
            font: "Helvetica",
            TODO: 42
        },
        marginLeft: 40,
        marginRight: 40,
        // no marginTop/bottom, since those will anyway be given elsewhere

        // pdf metadata
        title: 'liveAthletics document',
        author: 'liveAthletics',
        subject: '',
        producer: 'liveAthletics',
        creator: 'liveAthletics',
        keywords: ['liveAthletics', 'athletics', 'track and field'],

        staticTranslations:{
            DNS: 'DNS',
            NM: 'NM',
            retiredAbbreviation: 'r.',
            DNF: 'DNF',
            'disq.': 'disq.',
            withdrawal: 'withdrawal',
            A: 'A', // attempt abbreviation
        },
        // TODO: remove
        specialResult:{
            DNS: 'DNS',
            NM: 'NM',
            retired: 'r.',
            DNF: 'DNF',
            disqualified: 'disq.',
            withdrawal: 'withdrawal',
        },

        headerFooter: {

            // header and footer are not drawn "live", but after the document is actually finished. This is to allow to write also the total number of pages, which would not be known at time of regular drawing. 
            // The drawback of this approach is that the height of header and footer MUST be defined separately and cannot be calculated from the actual print function.
            headerHeight: 32,
            footerHeight: 32,

            // The header is printed as a table. All properties of the meeting are available (TODO) and a dateString (dString), the current page number (currentPage) and the toal nmber of pages (numPages). 
            headerTable: {
                margin:11, // spacing from the page boundary
                columns:[198.3, 198.3, 198.3],
                //linesVertical
                //linesHorizontal
                rowHeight: null,
                cells: [
                    {
                        alignmentH:'L', 
                        p: "name", // the meeting name
                        size: 10,
                        font: 'HelveticaBold',
                    },
                    {
                        alignmentH:'C',
                        size: 10,
                        font: 'HelveticaBold',
                    },
                    {
                        alignmentH:'R',
                        p: 'dString',
                        size: 10,
                        font: 'HelveticaBold',
                    }
                ]
            },

            // The footer is printed as a table. Fully configurable
            footerTable: {
                margin:11,
                columns:[198.3, 198.3, 198.3],
                //linesVertical
                //linesHorizontal
                rowHeight: null,
                cells: [
                    {
                        alignmentH:'L', 
                        p:'organizer',
                        size: 10,
                        font: 'HelveticaBold',
                    },
                    {
                        alignmentH:'C',
                        size: 10,
                        font: 'HelveticaBold',
                    },
                    {
                        alignmentH:'R',
                        size: 10,
                        font: 'HelveticaBold',
                        // here actually is "page X of Y"!
                        p:[ , 'currentPage', , 'numPages'], 
                        t:['Page ', , ' of '],
                    }
                ]
            },
        },

        contestResultsHigh: {
            font:'Helvetica',
            fontSeries: 'HelveticaBold',
            fontContestHeader: 'HelveticaBold',
            size: 10,
            sizeContestHeader: 12,
            sizeContestInfo: 10,
            sizeHeightBackground: 10,
            spaceBetweenAthletes: 3,
            spaceAfter: 5,
            sizeSeries: 12,
            marginTopSeries: 3,
            marginBottomSeries: 3,
            marginRight: 3, // margin to the right of "Results" and "Heights"
            athleteColumns: {
                // the athletes "header"
                margin:[3,2,2,0],
                columns:[25, 180, 20, 30, 150, 35, 75], // bib, name, cat, birthyear, country, club
                font:'Helvetica',
                fontHeader: 'HelveticaBold',
                size: 10,
                alignmentH: 'C',
                hs: 0.75, // horizontal scaling
                cells:[
                    {p:'rankFormatted', alignmentH:'R', },
                    {p:['lastname', 'firstname'], t:[,' '], alignmentH:'L'}, // font:"HelveticaBold"
                    {p:'year2'},
                    //{p:'categoryName'},
                    {p:'country'},
                    {p:'clubName', alignmentH:'L'},
                    {pt:'resultFormatted', alignmentH:'L'},
                    {p:'resultRemark', alignmentH:'L'},
                ],
                cellsHeader:[
                    {t:'Rank', alignmentH:'R', nf:'scale'},
                    {t: 'Name', alignmentH:'L'},
                    {t: 'Year', nf:'scale'},
                    //{t: 'Category'},
                    {t:'Country', nf:'scale'},
                    {t:'Club', alignmentH:'L', nf:'scale'},
                    {t:'Result', alignmentH:'L', nf:'scale'},
                    {t:'Remark', alignmentH:'L', nf:'scale'},
                ]
            },
            resultsRow:{ // configuration for printCell
                p:'resultsStr',
                nf: 'wordWrap',
                size:8,
                font:'Helvetica',
                alignmentH: 'L',
            },
            resultsMaxWidth: 515, // potentially end the results string line before the end of the page to avoid that it looks ugly
            strAttempts: 'Attempts',
            strJumpoffPrefix: 'J',
            strSeries: 'Series',
            strResults: 'Results',
            strHeights: 'Heights',
            strFurtherSeries: 'See next page for further series.',
            strHelp: 'O: valid trial, X: failed trial, -: passed trial, r: retired from competition, DNS: did not start, NM: no valid trial recorded, DQ: disqualified',
            strAppeal: 'Appeal',
            strCall: 'Call',
        },

        contestResultsLong: {
            font:'Helvetica',
            fontSeries: 'HelveticaBold',
            fontContestHeader: 'HelveticaBold',
            size: 10,
            sizeContestHeader: 12,
            sizeContestInfo: 10,
            sizeHeightBackground: 10,
            spaceBetweenAthletes: 3,
            spaceAfter: 5,
            sizeSeries: 12,
            marginTopSeries: 3,
            marginBottomSeries: 3,
            marginRight: 3, // margin to the right of "Results" and "Heights"
            athleteColumns: {
                // the athletes "header"
                margin:[3,2,2,0],
                columns:[25, 180, 20, 30, 150, 35, 75], // bib, name, cat, birthyear, country, club
                font:'Helvetica',
                fontHeader: 'HelveticaBold',
                size: 10,
                alignmentH: 'C',
                hs: 0.75, // horizontal scaling
                cells:[
                    {p:'rankFormatted', alignmentH:'R', },
                    {p:['lastname', 'firstname'], t:[,' '], alignmentH:'L'}, // font:"HelveticaBold"
                    {p:'year2'},
                    //{p:'categoryName'},
                    {p:'country'},
                    {p:'clubName', alignmentH:'L'},
                    {pt:'resultFormatted', alignmentH:'L'},
                    {p:'resultRemark', alignmentH:'L'},
                ],
                cellsHeader:[
                    {t:'Rank', alignmentH:'R', nf:'scale'},
                    {t: 'Name', alignmentH:'L'},
                    {t: 'Year', nf:'scale'},
                    //{t: 'Category'},
                    {t:'Country', nf:'scale'},
                    {t:'Club', alignmentH:'L', nf:'scale'},
                    {t:'Result', alignmentH:'L', nf:'scale'},
                    {t:'Remark', alignmentH:'L', nf:'scale'},
                ]
            },
            resultsRow:{ // configuration for printCell
                p:'resultsStr',
                nf: 'wordWrap',
                size:8,
                font:'Helvetica',
                alignmentH: 'L',
            },
            resultsMaxWidth: 515, // potentially end the results string line before the end of the page to avoid that it looks ugly
            strAttempts: 'Attempts',
            strJumpoffPrefix: 'J',
            strSeries: 'Series',
            strResults: 'Results',
            strHeights: 'Heights',
            strFurtherSeries: 'See next page for further series.',
            strHelp: 'O: valid trial, X: failed trial, -: passed trial, r: retired from competition, DNS: did not start, NM: no valid trial recorded, DQ: disqualified',
            strAppeal: 'Appeal',
            strCall: 'Call',
        },

        contestResultsTrack: {
            font:'Helvetica',
            fontSeries: 'HelveticaBold',
            fontContestHeader: 'HelveticaBold',
            size: 10,
            sizeContestHeader: 12,
            sizeContestInfo: 10,
            sizeHeightBackground: 10,
            spaceBetweenAthletes: 3,
            spaceAfter: 5,
            sizeSeries: 12,
            marginTopSeries: 3,
            marginBottomSeries: 3,
            marginRight: 3, // margin to the right of "Results" and "Heights"
            athleteColumns: {
                // the athletes "header"
                margin:[3,2,2,0],
                columns:[25, 180, 20, 30, 150, 35, 15, 60], // bib, name, birthyear, country, club, result, qualification, remark
                font:'Helvetica',
                fontHeader: 'HelveticaBold',
                size: 10,
                alignmentH: 'C',
                hs: 0.75, // horizontal scaling
                cells:[
                    {p:'rankFormatted', alignmentH:'R', },
                    {p:['lastname', 'firstname'], t:[,' '], alignmentH:'L'}, // font:"HelveticaBold"
                    {p:'year2'},
                    //{p:'categoryName'},
                    {p:'country'},
                    {p:'clubName', alignmentH:'L'},
                    {pt:'resultFormatted', alignmentH:'L'},
                    {pt:'qualificationFormatted', alignmentH:'L'},
                    {p:'resultRemark', alignmentH:'L'},
                ],
                cellsHeader:[
                    {t:'Rank', alignmentH:'R', nf:'scale'},
                    {t: 'Name', alignmentH:'L'},
                    {t: 'Year', nf:'scale'},
                    //{t: 'Category'},
                    {t:'Country', nf:'scale'},
                    {t:'Club', alignmentH:'L', nf:'scale'},
                    {t:'Result', alignmentH:'L', nf:'scale'},
                    {t:'', alignmentH:'L', nf:'scale'},
                    {t:'Remark', alignmentH:'L', nf:'scale'},
                ]
            },
            resultsRow:{ // configuration for printCell
                p:'resultsStr',
                nf: 'wordWrap',
                size:8,
                font:'Helvetica',
                alignmentH: 'L',
            },
            resultsMaxWidth: 515, // potentially end the results string line before the end of the page to avoid that it looks ugly
            strSeries: 'Heats',
            strResults: 'Results',
            strFurtherSeries: 'See next page for further heats.',
            strHelp: 'O: valid trial, X: failed trial, -: passed trial, r: retired from competition, DNS: did not start, NM: no valid trial recorded, DQ: disqualified', // TODO: replace with a different variable
            strAppeal: 'Appeal',
            strCall: 'Call',
            strHeat: 'Heat',
            strOf: 'of',
        },


        // will be used both in series (for the header) and in person (for the content)
        contestSheetHigh: {
            resColumns: 14, // number of result columns
            resRows: 2, // number of result rows
            resRowHeight: 20, // result row height
            resLineWidth: 1, // linewidth of the result grid
            font:'Helvetica',
            fontSeries: 'HelveticaBold',
            fontContestHeader: 'HelveticaBold',
            size: 10,
            sizeContestHeader: 12,
            sizeContestInfo: 10,
            sizeHeightBackground: 10,
            opacityHeightBackground: 0.2,
            showHeightBackground: true, // shows the heights in the background of every cell with a certain opacity
            numEmptyHeights: 3, // keep some height-fields always empty for the judges to use for special heights; the others will be filled with heights if present
            spaceBetweenAthletes: 8,
            sizeSeries: 12,
            sizeHeights: 10,
            marginTopSeries: 3,
            marginBottomSeries: 3,
            marginRight: 3, // margin to the right of "Results" and "Heights"
            athleteColumns: {
                // the athletes "header"
                margin:3,
                columns:[30, 195, 45, 20, 30, 195], // bib, name, cat, birthyear, country, club
                font:'HelveticaBold',
                size: 10,
                alignmentH: 'C',
                cells:[
                    {p:'bib', alignmentH:'L', font:"HelveticaBold"},
                    {p:['lastname', 'firstname'], t:[,' '], alignmentH:'L', font:"HelveticaBold"},
                    {p:'categoryName'},
                    {p:'year2'},
                    {p:'country'},
                    {p:'clubName', alignmentH:'L'}
                ],
            },
            strSeries: 'Series',
            strResults: 'Results',
            strHeights: 'Heights',
            strFurtherSeries: 'See next page for further series.',
            strHelp: 'O: valid trial, X: failed trial, -: passed trial, r: retired from competition, DNS: did not start, NM: no valid trial recorded, DQ: disqualified',
            strAppeal: 'Appeal',
            strCall: 'Call',
        },

        // TODO: cleanup; based on copy of contestSheetHigh
        contestSheetLong: {
            font:'Helvetica',
            // fontSeries: 'HelveticaBold',
            fontContestHeader: 'HelveticaBold',
            size: 10,
            sizeContestHeader: 12,
            sizeContestInfo: 10,
            opacityBackground: 0.2,
            spaceBetweenAthletes: 8,
            sizeSeries: 12,
            marginTopSeries: 3,
            marginBottomSeries: 3,
            lineWidth: 1,
            rowHeight: 20,
            maxColWidthResults: 50, // the total width is generally split over all required columns, considering the colWidthRatioResulToRank. However, an upper limit for the column width may be set.
            colWidthRatioResulToRank: 2, // resultWidth / rankWidth
            athleteColumns: {
                // the athletes "header"
                margin:3,
                columns:[30, 195, 45, 20, 30, 195], // bib, name, cat, birthyear, country, club
                font:'HelveticaBold',
                size: 10,
                alignmentH: 'C',
                cells:[
                    {p:'bib', alignmentH:'L', font:"HelveticaBold"},
                    {p:['lastname', 'firstname'], t:[,' '], alignmentH:'L', font:"HelveticaBold"},
                    {p:'categoryName'},
                    {p:'year2'},
                    {p:'country'},
                    {p:'clubName', alignmentH:'L'}
                ],
            },
            strSeries: 'Series',
            strResults: 'Results',
            strFurtherSeries: 'See next page for further series.',
            strHelp: 'O: valid trial, X: failed trial, -: passed trial, r: retired from competition, DNS: did not start, NM: no valid trial recorded, DQ: disqualified',
            strAppeal: 'Appeal',
            strCall: 'Call',
            strBestRes:'Best',
            strRank: 'Rank',
            strAttemptAbbr: "A ${i}", // ${i} will be replaced by i
        },

        // TODO: copied from techHigh -> delete properties that are not needed anymore 
        contestSheetTrack: {
            resRowHeight: 20, // result row height
            font:'Helvetica',
            fontSeries: 'HelveticaBold',
            fontContestHeader: 'HelveticaBold',
            size: 10,
            sizeContestHeader: 12,
            sizeContestInfo: 8, // for ID
            sizeHeightBackground: 10,
            opacityWindBackground: 0.2,
            spaceBetweenHeats: 20, 
            sizeSeries: 12,
            marginRight: 3, // margin to the right of "Results" and "Heights"
            athleteColumns: {
                // NOTE: the columns for lane, position, result, rank, reactionTime will be activated/deactivated based on the setting by the user
                // the athletes "header"
                totalWidth: 515, // scale columns to this width
                margin:3,
                rowHeight: 22,
                rowHeightHeader: 15,
                columns:[30, 30, 30, 180, 30, 30, 180, 35, 50, 70, 35], // order see cells below
                linesVertical: [1,0,0,0,0,0,0,0,1,1,1,1],
                linesHorizontal: [0,1],
                font:'Helvetica',
                fontHeader: 'HelveticaBold', // use for the header
                size: 10,
                alignmentH: 'L',
                maxMarginScale: 0.5,
                cells:[
                    {p: 'startConf', headerTextProp: 'strLane'}, // lane
                    {p: 'position', headerTextProp: 'strPos'},
                    {p:'bib', headerTextProp: 'strBib'},
                    {p:['lastname', 'firstname'], t:[,' ']},
                    {p:'year2'},
                    {p:'country'},
                    {p:'clubName'},
                    // do not remove/change the identifier when translating!!!
                    {p:'hurdle', identifier:'hurdles', nf:'scale', hs:0.75},
                    {t:'', identifier:'reaction', nf:'scale', hs:0.75}, // placeholder for reactiontime
                    {t:'', identifier:'result', nf:'scale', hs:0.75}, // placeholder for result
                    {t:'', identifier:'rank', nf:'scale', hs:0.75}, // placeholder for rank
                ],
                cellsHeader:[ // use for the header
                    {t: 'Lane', nf:'scale', hs:0.75}, // lane
                    {t: 'Pos.'},
                    {t:'Bib'},
                    {t:'Name'},
                    {t:'Year', nf:'scale', hs:0.75},
                    {t:'Country', nf:'scale', hs:0.75},
                    {t:'Club'},
                    {t:'Hurdles', nf:'scale', hs:0.75},
                    {t:'Reac.T.', nf:'scale', hs:0.75}, 
                    {t:'Result', nf:'scale', hs:0.75}, 
                    {t:'Rank', nf:'scale', hs:0.75}, 
                ],
            },
            strHeat: 'Heat',
            strOf: 'of',
            strWind: 'Wind m/s',
            strResults: 'Results',
            strFurtherSeries: 'See next page for further series.',
            strAppeal: 'Appeal',
            strCall: 'Call',
        },
        
        
    },
    // the actual text content is given by the concatenation of bare text ("t" or "text"), translated text ("tt" or "translatedText") and data property values ("p" or "prop"). All of them can be an array (also with empty items). The concatenation will be made like this: t[0]+tt[0]+p[0] + t[1]+tt[1]+p[1] + ...; if a property is not an array, it will be repeated in every loop (while the loop length is defined by the longest array). If one array is shorter than an other, the "missing" elements at the end are simply treated as empty. 


    // alignmentH: 
    // C: center (centered between the margins)
    // L: left (default)
    // R: right

    // alignmentV (only considered when vertical size is defined and not the result of the plot itself):
    // C: center (default) (centered between the margins)
    // T: top
    // B: bottom

    /**
     * If a text is too long for the present space, fitting text works as follows:
     * 1. reduce the margin down to maxHorizontalScale*margin (at max)
     * 2. horizontally scale the text down to maxHorizontalScale (at max)
     * 3. if both options did not lead to a fitting text, apply one of four strategies defined by noFitStrategy:
     *    - cut (default): cut the text that does not fit and add a period at the end
     *    - overrun: simply do not care and overrun the available space
     *    - wordWrap: (attention: do not use when the height of the cell is predefined!) does word wrapping between words and at "-". If a single word does not fit the line, then it is automaticaly horizontally scaled to fit. (Margin and font size are not reduced since it would look overly ugly together with the other regular lines.)
     *    - scale: scale the font-size to make it fit.
     * 
     * Options: 
     * - maxMarginScale = ms (default=1)
     * - maxHorizontalScale = hs (default=1)
     * - noFitStrategy = nf: cut (default), overrun, wordWrap, scale (font-size)
     */

    // the configuration of languages that are not available or properties that are not specified in the specific language are automatically taken from en

    // DE
    de: {

        staticTranslations:{
            DNS: 'n.a.',
            NM: 'o.g.V.',
            retired: 'verz.',
            DNF: 'aufg.',
            disqualified: 'disq.',
            withdrawal: 'ab.',
            Q: 'Q',
            QD: 'Q*',
            q: 'q',
            qd: 'q*',
            w: 'ab', // withdrawal
            qR: 'qR', // referee
            qJ: 'qJ', // jury
            'q+': 'q+',
        },

        headerFooter: {
            footerTable:{
                cells:[{},{},{t:['Seite ', , ' von '],}]
            }
        },
        contestResultsHigh:{
            athleteColumns: {
                cellsHeader:[
                    {t:'Rang', alignmentH:'R', nf:'scale'}, // why is the left alignment wrong? It should not overrun!
                    {t: 'Name', alignmentH:'L'},
                    {t: 'Jg', nf:'scale'},
                    //{t: 'Category'},
                    {t:'Land', nf:'scale'},
                    {t:'Verein', alignmentH:'L', nf:'scale'},
                    {t:'Resultat', alignmentH:'L', nf:'scale'},
                    {t:'Bemerkung', alignmentH:'L', nf:'scale'},
                ]
            },
            strAttempts: 'Versuche',
            strJumpoffPrefix: 'J',
            strSeries: 'Serie',
            strResults: 'Resultate',
            strFurtherSeries: 'Weitere Serien auf der nächsten Seite.',
        },
        

        contestSheetHigh:{
            strSeries: 'Serie',
            strResults: 'Resultate',
            strHeights: 'Höhen',
            strFurtherSeries: 'Weitere Serien auf der nächsten Seite.',
            strHelp: 'O: gültiger Versuch, X: ungültiger Versuch, -: Verzicht auf Versuch, verz.: zurückgezogen vom Wettkampf, n.a.: nicht angetreten, o.g.V: ohne gültigen Versuch, disq.: disqualifiziert',
            strAppeal: 'Appell',
            strCall: 'Stellzeit',
        },
        contestSheetLong:{
            strSeries: 'Serie',
            strResults: 'Resultate',
            strHeights: 'Höhen',
            strFurtherSeries: 'Weitere Serien auf der nächsten Seite.',
            strHelp: 'O: gültiger Versuch, X: ungültiger Versuch, -: Verzicht auf Versuch, verz.: zurückgezogen vom Wettkampf, n.a.: nicht angetreten, o.g.V: ohne gültigen Versuch, disq.: disqualifiziert',
            strAppeal: 'Appell',
            strCall: 'Stellzeit',
            strAttemptAbbr: "V${i}", // ${i} will be replaced by i
        },

        contestSheetTrack:{
            athleteColumns: {
                cellsHeader:[
                    {t: 'Bahn', nf:'scale', hs:0.75}, // lane
                    {t: 'Pos.'},
                    {t:'Stnr'},
                    {t:'Name'},
                    {t:'Jg'},
                    {t:'Land', nf:'scale', hs:0.75},
                    {t:'Verein'},
                    {t:'Hürden'},
                    {t:'Reak.z.'}, 
                    {t:'Resultat'}, 
                    {t:'Rang'}, 
                ]
            },
            strHeat: 'Lauf',
            strOf: 'von',
            strWind: 'Wind m/s',
            strResults: 'Resultate',
            strFurtherSeries: 'Weitere Serien auf der nächsten Seite.',
            strAppeal: 'Appell',
            strCall: 'Stellzeit',
        },
        contestResultsTrack: {
            strHeat: 'Lauf',
            strOf: 'von',
            strWind: 'Wind m/s',
            strResults: 'Resultate',
            strFurtherSeries: 'Weitere Serien auf der nächsten Seite.',
            strAppeal: 'Appell',
            strCall: 'Stellzeit',
            athleteColumns:{
                cellsHeader:[
                    {t:'Rang', alignmentH:'R', nf:'scale'},
                    {t: 'Name', alignmentH:'L'},
                    {t: 'Jg', nf:'scale'},
                    //{t: 'Category'},
                    {t:'Land', nf:'scale'},
                    {t:'Verein', alignmentH:'L', nf:'scale'},
                    {t:'Resultat', alignmentH:'L', nf:'scale'},
                    {t:'', alignmentH:'L', nf:'scale'},
                    {t:'Bemerkung', alignmentH:'L', nf:'scale'},
                ],
            }
        },
    }

}