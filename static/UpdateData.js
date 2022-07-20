/**
 * This class is used to update the Mongo-DB entries based on the MySQL-DB. The update of certain entries must be started by calling the respective functions.
 */


 /**
  * @class updateData Class to update the mongo-DB for mentioned
  */
class updateData{
    /**
     * Constructor of the updateDate class. 
     * @param {eventHandling} eventhandling the eventHandling instance; the respective events are called when things are changing 
     * @param {logger} logger a logger instance, to wirte logs in the oficial log-way 
     */
    constructor(eventHanlding, logger){
        this.eH = eventHandling;
        this.logger = logger;
    }

    /**
     * renew the complete Mongo-DB entries for all or a specified meeting. The old Mongo-DB data is simply deleted and everything is replaced with the new data gathered directly out of the mysql-DB (with sequelize).
     * @param {integer array} meetings optional; An array of meeting-IDs of which the mongo-DB data shall be recreated. If not given, all meetings will be updated.
     */
    renew(meetings=[]){
        // wichtige Frage: kriegt man es hin mit Sequelize direkt einige Datan als js-objekt zu erhalten, sodass man es danach gar nciht mehr übersetzen muss für die MongoDB-DB? wahrscheinlich nicht weil die Namen anders heissen; ansonsten wäre es eine sehr praktische angelegenheit
    }

    // the structure of the data in MongoDB and how they can be updated separately:

    // updating-capabilities
    /* - single athletes with his event registrations
       - all athletes
       - the meeting background data (name, date, ...) without the long lists like competitors, etc
       - the meeting, complete (-->renew)
       - ...events...
       - ...staffeln...

    */

    // data for one competition, according to openTrack
    data = {
        "address": "somewhere",
        "competitors": [
            // an array storing an object for each athlete; updating possible for single or all athletes
            {
                "ageGroup": "U20", // what is the difference between age groups and category
                "category": "U20M", 
                "checkedIn": false, // what is that
                "competitorId": "1", // seems to be a unique ID
                "dateOfBirth": "1999-05-15", 
                "eventsEntered": [
                  {
                    "eventCode": "5000", 
                    "eventId": "6"
                  }
                ], 
                "firstName": "William", 
                "flagUrl": "http://file.opentrack.run/clubflags/GBR/LONH.png", // we dont need this
                "gender": "M", 
                "lastName": "Griffiths", 
                "notablePerformances": [], 
                "numbered": false, // ???
                "otAthleteId": "8a6a90c7-a09e-47f0-9f62-80f4038687c4", 
                "sortAgeGroup": "0-U20", // sorting should in my opinion not be part of transmitted data
                "sortBib": "00001", 
                "sortEventCode": "1_05000_5000", 
                "teamId": "LONH" // seems to be a unique shortcut for the club
            },
            
        {
            "ageGroup": "SEN", 
            "category": "SM", 
            "checkedIn": false, 
            "competitorId": "10", 
            "dateOfBirth": "1995-05-08", 
            "eventsEntered": [
            {
                "eventCode": "5000", 
                "eventId": "6", 
                "qp": "14:37"
            }
            ], 
            "firstName": "Peter", 
            "flagUrl": "http://file.opentrack.run/clubflags/GBR/HIGH.png", 
            "gender": "M", 
            "lastName": "Chambers", 
            "notablePerformances": [], 
            "numbered": false, 
            "otAthleteId": "2c85191f-5083-4dc8-90bb-2a5d35b279e8", 
            "sortAgeGroup": "1-SEN", 
            "sortBib": "00010", 
            "sortEventCode": "1_05000_5000", 
            "teamId": "HIGH"
        }, 
        ],
        "country": "SUI",
        "date": "2121-01-01",
        "englishName": "ein englischer Meetingname",
        "events": [
            // Sprint:
            {
                "ageGroups": [
                  "ALL"
                ], // why defining age groups? 
                "category": "OPEN", 
                "cutAfterRound": 0, 
                "cutSurvivors": 0, 
                "day": 1, 
                "eventCode": "100", 
                "eventId": "2", 
                "genders": "MF", 
                "lanes": 8, 
                "r1Time": "18:45", 
                "r2Day": 1, 
                "r3Day": 1, 
                "rounds": "4", 
                "status": "none", 
                "units": [
                  {
                    "distance": 100, 
                    "heat": 1, 
                    "precision": 2, 
                    "results": [
                      {
                        "bib": "83", 
                        "performance": "11.82", 
                        "place": 1, 
                        "points": 0
                      }, 
                      {
                        "bib": "104", 
                        "performance": "12.52", 
                        "place": 2, 
                        "points": 0
                      }, 
                      {
                        "bib": "114", 
                        "performance": "12.52", 
                        "place": 3, 
                        "points": 0
                      }, 
                      {
                        "bib": "73", 
                        "performance": "13.62", 
                        "place": 4, 
                        "points": 0
                      }
                    ], 
                    "resultsStatus": "provisional", 
                    "round": 1, 
                    "scheduledStartTime": "18:45", 
                    "showAgeGrade": false, 
                    "showAthleteDetails": false, 
                    "showAthlonPoints": false, 
                    "showPoints": false, 
                    "showReactionTime": false, 
                    "splitsLap": 0, 
                    "splitsStart": 0, 
                    "status": "finished", 
                    "windAssistance": "-4.1"
                  }, 
                  {
                    "distance": 100, 
                    "heat": 2, 
                    "precision": 2, 
                    "results": [
                      {
                        "bib": "135", 
                        "performance": "12.84", 
                        "place": 1, 
                        "points": 0
                      }, 
                      {
                        "bib": "109", 
                        "performance": "13.44", 
                        "place": 2, 
                        "points": 0
                      }, 
                      {
                        "bib": "123", 
                        "performance": "13.84", 
                        "place": 3, 
                        "points": 0
                      }, 
                      {
                        "bib": "105", 
                        "performance": "13.96", 
                        "place": 4, 
                        "points": 0
                      }, 
                      {
                        "bib": "98", 
                        "performance": "14.83", 
                        "place": 5, 
                        "points": 0
                      }, 
                      {
                        "bib": "71", 
                        "performance": "15.51", 
                        "place": 6, 
                        "points": 0
                      }
                    ], 
                    "resultsStatus": "provisional", 
                    "round": 1, 
                    "scheduledStartTime": "18:48", 
                    "showAgeGrade": false, 
                    "showAthleteDetails": false, 
                    "showAthlonPoints": false, 
                    "showPoints": false, 
                    "showReactionTime": false, 
                    "splitsLap": 0, 
                    "splitsStart": 0, 
                    "status": "finished", 
                    "windAssistance": "-5.3"
                  }, 
                  {
                    "distance": 100, 
                    "heat": 3, 
                    "precision": 2, 
                    "results": [
                      {
                        "bib": "60", 
                        "performance": "14.78", 
                        "place": 1, 
                        "points": 0
                      }, 
                      {
                        "bib": "142", 
                        "performance": "15.79", 
                        "place": 2, 
                        "points": 0
                      }, 
                      {
                        "bib": "63", 
                        "performance": "17.69", 
                        "place": 3, 
                        "points": 0
                      }, 
                      {
                        "bib": "67", 
                        "performance": "18.04", 
                        "place": 4, 
                        "points": 0
                      }
                    ], 
                    "resultsStatus": "provisional", 
                    "round": 1, 
                    "scheduledStartTime": "18:51", 
                    "showAgeGrade": false, 
                    "showAthleteDetails": false, 
                    "showAthlonPoints": false, 
                    "showPoints": false, 
                    "showReactionTime": false, 
                    "splitsLap": 0, 
                    "splitsStart": 0, 
                    "status": "finished", 
                    "windAssistance": "-3.5"
                  }, 
                  {
                    "distance": 100, 
                    "heat": 4, 
                    "precision": 2, 
                    "results": [
                      {
                        "bib": "77", 
                        "performance": "14.87", 
                        "place": 1, 
                        "points": 0
                      }, 
                      {
                        "bib": "117", 
                        "performance": "15.73", 
                        "place": 2, 
                        "points": 0
                      }, 
                      {
                        "bib": "72", 
                        "performance": "16.41", 
                        "place": 3, 
                        "points": 0
                      }, 
                      {
                        "bib": "122", 
                        "performance": "16.59", 
                        "place": 4, 
                        "points": 0
                      }, 
                      {
                        "bib": "101", 
                        "performance": "20.34", 
                        "place": 5, 
                        "points": 0
                      }
                    ], 
                    "resultsStatus": "provisional", 
                    "round": 1, 
                    "scheduledStartTime": "18:54", 
                    "showAgeGrade": false, 
                    "showAthleteDetails": false, 
                    "showAthlonPoints": false, 
                    "showPoints": false, 
                    "showReactionTime": false, 
                    "splitsLap": 0, 
                    "splitsStart": 0, 
                    "status": "finished", 
                    "windAssistance": "-2.8"
                  }
                ]
              }, 
              // middle distance (800):
              
    {
        "ageGroups": [
          "ALL"
        ], 
        "category": "OPEN", 
        "cutAfterRound": 0, 
        "cutSurvivors": 0, 
        "day": 1, 
        "eventCode": "800", 
        "eventId": "5", 
        "genders": "MF", 
        "lanes": 8, 
        "r1Time": "19:30", 
        "r2Day": 1, 
        "r3Day": 1, 
        "rounds": "4", 
        "status": "none", 
        "units": [
          {
            "distance": 800, 
            "heat": 1, 
            "precision": 2, 
            "results": [
              {
                "bib": "86", 
                "performance": "2:02.50", 
                "place": 1, 
                "points": 0
              }, 
              {
                "bib": "113", 
                "performance": "2:03.28", 
                "place": 2, 
                "points": 0
              }, 
              {
                "bib": "103", 
                "performance": "2:09.09", 
                "place": 3, 
                "points": 0
              }, 
              {
                "bib": "79", 
                "performance": "2:17.55", 
                "place": 4, 
                "points": 0
              }, 
              {
                "bib": "102", 
                "performance": "2:21.68", 
                "place": 5, 
                "points": 0
              }, 
              {
                "bib": "80", 
                "performance": "2:38.31", 
                "place": 6, 
                "points": 0
              }
            ], 
            "resultsStatus": "provisional", 
            "round": 1, 
            "scheduledStartTime": "19:30", 
            "showAgeGrade": false, 
            "showAthleteDetails": false, 
            "showAthlonPoints": false, 
            "showPoints": false, 
            "showReactionTime": false, 
            "splitsLap": 200, 
            "splitsStart": 200, 
            "status": "finished"
          }, 
          {
            "distance": 800, 
            "heat": 2, 
            "precision": 2, 
            "results": [
              {
                "bib": "143", 
                "performance": "2:18.86", 
                "place": 1, 
                "points": 0
              }, 
              {
                "bib": "121", 
                "performance": "2:21.82", 
                "place": 2, 
                "points": 0
              }, 
              {
                "bib": "108", 
                "performance": "2:23.79", 
                "place": 3, 
                "points": 0
              }, 
              {
                "bib": "61", 
                "performance": "2:29.62", 
                "place": 4, 
                "points": 0
              }, 
              {
                "bib": "90", 
                "performance": "2:32.21", 
                "place": 5, 
                "points": 0
              }, 
              {
                "bib": "75", 
                "performance": "2:39.33", 
                "place": 6, 
                "points": 0
              }, 
              {
                "bib": "112", 
                "performance": "2:51.42", 
                "place": 7, 
                "points": 0
              }, 
              {
                "bib": "62", 
                "performance": "3:07.97", 
                "place": 8, 
                "points": 0
              }
            ], 
            "resultsStatus": "provisional", 
            "round": 1, 
            "scheduledStartTime": "19:35", 
            "showAgeGrade": false, 
            "showAthleteDetails": false, 
            "showAthlonPoints": false, 
            "showPoints": false, 
            "showReactionTime": false, 
            "splitsLap": 200, 
            "splitsStart": 200, 
            "status": "finished"
          }, 
          {
            "distance": 800, 
            "heat": 3, 
            "precision": 2, 
            "results": [
              {
                "bib": "106", 
                "performance": "2:31.01", 
                "place": 1, 
                "points": 0
              }, 
              {
                "bib": "81", 
                "performance": "2:31.89", 
                "place": 2, 
                "points": 0
              }, 
              {
                "bib": "64", 
                "performance": "2:36.24", 
                "place": 3, 
                "points": 0
              }, 
              {
                "bib": "67", 
                "performance": "2:39.57", 
                "place": 4, 
                "points": 0
              }, 
              {
                "bib": "120", 
                "performance": "2:39.71", 
                "place": 5, 
                "points": 0
              }, 
              {
                "bib": "126", 
                "performance": "2:43.30", 
                "place": 6, 
                "points": 0
              }, 
              {
                "bib": "70", 
                "performance": "2:51.81", 
                "place": 7, 
                "points": 0
              }, 
              {
                "bib": "63", 
                "performance": "2:55.63", 
                "place": 8, 
                "points": 0
              }
            ], 
            "resultsStatus": "provisional", 
            "round": 1, 
            "scheduledStartTime": "19:40", 
            "showAgeGrade": false, 
            "showAthleteDetails": false, 
            "showAthlonPoints": false, 
            "showPoints": false, 
            "showReactionTime": false, 
            "splitsLap": 200, 
            "splitsStart": 200, 
            "status": "finished"
          }, 
          {
            "distance": 800, 
            "heat": 4, 
            "precision": 2, 
            "results": [
              {
                "bib": "74", 
                "performance": "2:43.98", 
                "place": 1, 
                "points": 0
              }, 
              {
                "bib": "65", 
                "performance": "2:44.31", 
                "place": 2, 
                "points": 0
              }, 
              {
                "bib": "87", 
                "performance": "2:50.57", 
                "place": 3, 
                "points": 0
              }, 
              {
                "bib": "78", 
                "performance": "2:50.99", 
                "place": 4, 
                "points": 0
              }, 
              {
                "bib": "72", 
                "performance": "2:55.75", 
                "place": 5, 
                "points": 0
              }, 
              {
                "bib": "111", 
                "performance": "2:56.55", 
                "place": 6, 
                "points": 0
              }, 
              {
                "bib": "101", 
                "performance": "3:08.84", 
                "place": 7, 
                "points": 0
              }, 
              {
                "bib": "133", 
                "performance": "3:13.69", 
                "place": 8, 
                "points": 0
              }, 
              {
                "bib": "129", 
                "performance": "4:06.93", 
                "place": 9, 
                "points": 0
              }
            ], 
            "resultsStatus": "provisional", 
            "round": 1, 
            "scheduledStartTime": "19:45", 
            "showAgeGrade": false, 
            "showAthleteDetails": false, 
            "showAthlonPoints": false, 
            "showPoints": false, 
            "showReactionTime": false, 
            "splitsLap": 200, 
            "splitsStart": 200, 
            "status": "finished"
          }
        ]
      }, 

      // long distance:
      
    {
        "ageGroups": [
          "SEN", 
          "U20"
        ], 
        "category": "OPEN", 
        "cutAfterRound": 0, 
        "cutSurvivors": 0, 
        "day": 1, 
        "eventCode": "5000", 
        "eventId": "6", 
        "genders": "MF", 
        "lanes": 8, 
        "r1Time": "20:20", 
        "r2Day": 1, 
        "r3Day": 1, 
        "rounds": "2", 
        "status": "none", 
        "units": [
          {
            "distance": 5000, 
            "heat": 1, 
            "precision": 2, 
            "results": [
              {
                "bib": "4", 
                "performance": "16:12.39", 
                "place": 1, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "36", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:16", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:56", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:35", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:14", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:53", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:32", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:11", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:50", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:29", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:09", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:48", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:28", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:08", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:48", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:28", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:08", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:48", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:29", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:09", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:49", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:28", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:04", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:39", 
                    "lapTime": "34"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "16:11", 
                    "lapTime": "32"
                  }
                ]
              }, 
              {
                "bib": "32", 
                "performance": "16:19.67", 
                "place": 2, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:17", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:57", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:36", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:15", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:53", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:32", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:11", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:51", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:30", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:10", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:49", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:28", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:08", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:48", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:28", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:08", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:48", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:29", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:09", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:50", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:28", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:05", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:41", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "16:19", 
                    "lapTime": "37"
                  }
                ]
              }, 
              {
                "bib": "39", 
                "performance": "16:21.30", 
                "place": 3, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "36", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:16", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:56", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:35", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:14", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:53", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:32", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:11", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:50", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:30", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:09", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:48", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:29", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:08", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:48", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:28", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:08", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:48", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:29", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:09", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:50", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:29", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:07", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:44", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "16:20", 
                    "lapTime": "36"
                  }
                ]
              }, 
              {
                "bib": "30", 
                "performance": "16:27.53", 
                "place": 4, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "37", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:17", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:56", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:35", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:14", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:52", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:31", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:10", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:50", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:29", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:08", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:48", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:27", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:07", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:47", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:27", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:07", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:47", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:28", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:08", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:49", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:29", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:09", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:48", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "16:26", 
                    "lapTime": "38"
                  }
                ]
              }, 
              {
                "bib": "34", 
                "performance": "16:29.74", 
                "place": 5, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:16", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:56", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:34", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:13", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:52", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:31", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:10", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:50", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:29", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:09", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:48", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:28", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:07", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:48", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:27", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:07", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:47", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:28", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:08", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:49", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:29", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:09", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:49", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "16:29", 
                    "lapTime": "39"
                  }
                ]
              }, 
              {
                "bib": "35", 
                "performance": "16:41.42", 
                "place": 6, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "40", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:20", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "2:01", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:41", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:21", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:01", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:41", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:20", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:58", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:36", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:16", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:54", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:33", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:12", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:52", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:32", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:13", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:53", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:35", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:16", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:58", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:38", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:20", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "16:01", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "16:40", 
                    "lapTime": "39"
                  }
                ]
              }, 
              {
                "bib": "46", 
                "performance": "16:50.57", 
                "place": 7, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:18", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:59", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:40", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:20", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:01", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:42", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:22", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:03", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:43", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:24", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:04", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:45", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:26", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:07", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:47", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:29", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:10", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:52", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:33", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "14:14", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:55", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:36", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "16:14", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "16:50", 
                    "lapTime": "35"
                  }
                ]
              }, 
              {
                "bib": "36", 
                "performance": "17:03.51", 
                "place": 8, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:17", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:58", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:38", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:19", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:59", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:40", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:21", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:02", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:43", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:24", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:05", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:46", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:28", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:10", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:52", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:33", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:16", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:58", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:41", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "14:23", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "15:04", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:44", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "16:24", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "17:02", 
                    "lapTime": "38"
                  }
                ]
              }, 
              {
                "bib": "40", 
                "performance": "17:04.11", 
                "place": 9, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:19", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "2:00", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:42", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:24", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:05", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:46", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:27", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:09", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:50", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:31", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:12", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:53", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:35", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:17", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:58", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:39", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:21", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "13:03", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:45", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "14:26", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "15:07", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:49", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "16:28", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "17:03", 
                    "lapTime": "35"
                  }
                ]
              }, 
              {
                "bib": "42", 
                "performance": "17:09.13", 
                "place": 10, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:17", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:56", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:35", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:14", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:53", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:32", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:11", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:50", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:30", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:09", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:49", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:30", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:13", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:55", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:38", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:22", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:06", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:51", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:34", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "14:17", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "15:01", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:44", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "16:27", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "17:08", 
                    "lapTime": "40"
                  }
                ]
              }, 
              {
                "bib": "44", 
                "performance": "17:21.14", 
                "place": 11, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:17", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:59", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:39", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:22", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:04", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:46", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:29", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:12", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:55", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:38", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:20", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "9:03", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:46", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:29", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "11:11", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:53", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:35", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "13:17", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:59", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "14:40", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "15:21", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "16:01", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "16:41", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "17:20", 
                    "lapTime": "39"
                  }
                ]
              }, 
              {
                "bib": "43", 
                "performance": "17:21.67", 
                "place": 12, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:19", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "2:01", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:43", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:24", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:06", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:48", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:31", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:13", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:56", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:39", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:21", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "9:04", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:47", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:30", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "11:12", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:54", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:35", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "13:17", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:59", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "14:41", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "15:21", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "16:02", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "16:42", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "17:20", 
                    "lapTime": "38"
                  }
                ]
              }, 
              {
                "bib": "9", 
                "performance": "17:27.89", 
                "place": 13, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "40", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:21", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "2:03", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:45", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:27", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:10", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:53", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:35", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:17", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:59", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:41", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:24", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "9:07", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:49", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:33", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "11:15", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:57", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:42", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "13:24", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "14:07", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "14:49", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "15:31", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "16:13", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "16:52", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "17:27", 
                    "lapTime": "34"
                  }
                ]
              }, 
              {
                "bib": "47", 
                "performance": "17:35.42", 
                "place": 14, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:19", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:59", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:40", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:22", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:04", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:46", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:29", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:12", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:55", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:38", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:21", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "9:04", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:47", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:30", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "11:13", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:55", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:37", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "13:21", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "14:04", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "14:46", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "15:30", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "16:13", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "16:55", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "17:34", 
                    "lapTime": "39"
                  }
                ]
              }, 
              {
                "bib": "1", 
                "performance": "17:47.86", 
                "place": 15, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:19", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "2:00", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:40", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:22", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:04", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:46", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:29", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:12", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:55", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:39", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:21", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "9:04", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:46", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:29", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "11:12", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:55", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:38", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "13:22", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "14:06", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "14:50", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "15:35", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "16:20", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "17:06", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "17:47", 
                    "lapTime": "40"
                  }
                ]
              }, 
              {
                "bib": "45", 
                "performance": "17:55.49", 
                "place": 16, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:18", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:59", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:40", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:21", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:03", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:45", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:28", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:10", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:53", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:37", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:21", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "9:05", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:48", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:34", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "11:18", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "12:03", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:48", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "13:33", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "14:17", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "15:02", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "15:45", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "16:31", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "17:14", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "17:54", 
                    "lapTime": "40"
                  }
                ]
              }, 
              {
                "bib": "3", 
                "performance": "17:57.46", 
                "place": 17, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:19", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "2:01", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:42", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:24", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:05", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:47", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:29", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:13", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:56", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:39", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:22", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "9:04", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:47", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:30", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "11:13", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:57", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:41", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "13:27", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "14:12", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "14:59", 
                    "lapTime": "46"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "15:44", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "16:31", 
                    "lapTime": "46"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "17:15", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "17:56", 
                    "lapTime": "41"
                  }
                ]
              }, 
              {
                "bib": "13", 
                "performance": "18:11.55", 
                "place": 18, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:19", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "2:01", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:42", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:24", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:06", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:48", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:31", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:13", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:57", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:39", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:22", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "9:06", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:50", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:36", 
                    "lapTime": "46"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "11:22", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "12:08", 
                    "lapTime": "46"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:54", 
                    "lapTime": "46"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "13:40", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "14:25", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "15:10", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "15:54", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "16:41", 
                    "lapTime": "46"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "17:26", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "18:10", 
                    "lapTime": "44"
                  }
                ]
              }, 
              {
                "bib": "49", 
                "performance": "18:37.90", 
                "place": 19, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "42", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:26", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "2:12", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:58", 
                    "lapTime": "46"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:43", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:29", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "5:14", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "6:00", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:46", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "7:31", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "8:15", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "9:00", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "9:45", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "10:30", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "11:16", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "12:01", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "12:45", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "13:31", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "14:16", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "15:00", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "15:45", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "16:30", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "17:14", 
                    "lapTime": "44"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "17:57", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "18:37", 
                    "lapTime": "40"
                  }
                ]
              }, 
              {
                "bib": "50", 
                "performance": "19:28.18", 
                "place": 20, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "41", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:25", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "2:10", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:56", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:42", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:28", 
                    "lapTime": "46"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "5:13", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:59", 
                    "lapTime": "46"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "6:45", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "7:31", 
                    "lapTime": "46"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "8:17", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "9:04", 
                    "lapTime": "46"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "9:51", 
                    "lapTime": "47"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "10:38", 
                    "lapTime": "47"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "11:26", 
                    "lapTime": "47"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "12:14", 
                    "lapTime": "47"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "13:02", 
                    "lapTime": "48"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "13:50", 
                    "lapTime": "48"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "14:38", 
                    "lapTime": "48"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "15:27", 
                    "lapTime": "48"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "16:16", 
                    "lapTime": "48"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "17:04", 
                    "lapTime": "48"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "17:53", 
                    "lapTime": "48"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "18:41", 
                    "lapTime": "48"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "19:27", 
                    "lapTime": "45"
                  }
                ]
              }, 
              {
                "bib": "51", 
                "performance": "21:39.37", 
                "place": 21, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "43", 
                    "lapTime": "43"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:28", 
                    "lapTime": "45"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "2:15", 
                    "lapTime": "47"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "3:03", 
                    "lapTime": "47"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:52", 
                    "lapTime": "48"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "4:41", 
                    "lapTime": "49"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "5:31", 
                    "lapTime": "49"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "6:22", 
                    "lapTime": "51"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "7:12", 
                    "lapTime": "49"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "8:05", 
                    "lapTime": "53"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "8:58", 
                    "lapTime": "52"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "9:52", 
                    "lapTime": "53"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "10:45", 
                    "lapTime": "53"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "11:38", 
                    "lapTime": "53"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "12:31", 
                    "lapTime": "52"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "13:25", 
                    "lapTime": "54"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "14:21", 
                    "lapTime": "55"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "15:20", 
                    "lapTime": "58"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "16:21", 
                    "lapTime": "1:01"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "17:22", 
                    "lapTime": "1:01"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "18:17", 
                    "lapTime": "54"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "19:10", 
                    "lapTime": "52"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "20:02", 
                    "lapTime": "52"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "20:52", 
                    "lapTime": "49"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "21:38", 
                    "lapTime": "46"
                  }
                ]
              }
            ], 
            "resultsStatus": "provisional", 
            "round": 1, 
            "scheduledStartTime": "20:20", 
            "showAgeGrade": false, 
            "showAthleteDetails": false, 
            "showAthlonPoints": false, 
            "showPoints": false, 
            "showReactionTime": false, 
            "splitsLap": 200, 
            "splitsStart": 200, 
            "status": "finished"
          }, 
          {
            "distance": 5000, 
            "heat": 2, 
            "precision": 2, 
            "results": [
              {
                "bib": "7", 
                "performance": "14:50.05", 
                "place": 1, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "36", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:12", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:48", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:24", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:00", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:35", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:11", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:47", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:23", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "5:59", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:35", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:11", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "7:47", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:23", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "8:58", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:33", 
                    "lapTime": "34"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:08", 
                    "lapTime": "34"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "10:43", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:19", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "11:55", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "12:30", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:05", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "13:42", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "14:17", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "14:50", 
                    "lapTime": "32"
                  }
                ]
              }, 
              {
                "bib": "6", 
                "performance": "14:53.18", 
                "place": 2, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "37", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:14", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:49", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:25", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:00", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:36", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:12", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:48", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:24", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:00", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:36", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:12", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "7:48", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:24", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "8:59", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:35", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:10", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "10:46", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:22", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "11:57", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "12:33", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:08", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "13:44", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "14:19", 
                    "lapTime": "34"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "14:53", 
                    "lapTime": "33"
                  }
                ]
              }, 
              {
                "bib": "11", 
                "performance": "14:55.02", 
                "place": 3, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "37", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:13", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:49", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:25", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:00", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:36", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:12", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:47", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:23", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:00", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:36", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:12", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "7:48", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:23", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "8:59", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:34", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:10", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "10:45", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:20", 
                    "lapTime": "34"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "11:55", 
                    "lapTime": "34"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "12:30", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:05", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "13:42", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "14:18", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "14:55", 
                    "lapTime": "37"
                  }
                ]
              }, 
              {
                "bib": "19", 
                "performance": "14:57.28", 
                "place": 4, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "37", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:13", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:48", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:24", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:00", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:36", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:11", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:47", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:23", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "5:59", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:35", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:12", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "7:48", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:23", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "8:59", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:34", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:10", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "10:46", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:22", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "11:58", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "12:35", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:11", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "13:48", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "14:23", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "14:57", 
                    "lapTime": "34"
                  }
                ]
              }, 
              {
                "bib": "17", 
                "performance": "15:06.94", 
                "place": 5, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "35", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:12", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:48", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:24", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:00", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:35", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:11", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:47", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:23", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "5:59", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:35", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:12", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "7:48", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:24", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:00", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:36", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:12", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "10:50", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:28", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:04", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "12:42", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:19", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "13:56", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "14:33", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:07", 
                    "lapTime": "33"
                  }
                ]
              }, 
              {
                "bib": "2", 
                "performance": "15:19.25", 
                "place": 6, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "37", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:13", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:49", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:24", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "2:59", 
                    "lapTime": "34"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:35", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:11", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:47", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:24", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:00", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:36", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:13", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "7:49", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:25", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:02", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:38", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:16", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "10:54", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:32", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:10", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "12:48", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:26", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:05", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "14:43", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:19", 
                    "lapTime": "36"
                  }
                ]
              }, 
              {
                "bib": "14", 
                "performance": "15:21.93", 
                "place": 7, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "36", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:13", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:49", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:26", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:03", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:39", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:15", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:52", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:29", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:06", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:43", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:20", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "7:57", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:34", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:11", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:47", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:25", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:02", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:39", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:16", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "12:54", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:31", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:09", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "14:46", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:22", 
                    "lapTime": "36"
                  }
                ]
              }, 
              {
                "bib": "23", 
                "performance": "15:26.96", 
                "place": 8, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:16", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:53", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:29", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:06", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:42", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:18", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:54", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:31", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:07", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:45", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:23", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:00", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:39", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:17", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:54", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:32", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:09", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:46", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:23", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:01", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:39", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:16", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "14:52", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:27", 
                    "lapTime": "34"
                  }
                ]
              }, 
              {
                "bib": "20", 
                "performance": "15:28.77", 
                "place": 9, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:16", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:53", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:30", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:07", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:43", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:20", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:57", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:34", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:11", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:49", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:26", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:03", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:41", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:18", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:56", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:33", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:11", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:48", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:26", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:04", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:41", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:19", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "14:55", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:29", 
                    "lapTime": "33"
                  }
                ]
              }, 
              {
                "bib": "10", 
                "performance": "15:31.64", 
                "place": 10, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "37", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:14", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:50", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:26", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:03", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:39", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:16", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:52", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:30", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:07", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:44", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:22", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:00", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:17", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:55", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:32", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:10", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:48", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:25", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:03", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:42", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:20", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "14:58", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:31", 
                    "lapTime": "33"
                  }
                ]
              }, 
              {
                "bib": "16", 
                "performance": "15:32.64", 
                "place": 11, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:14", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:50", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:26", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:02", 
                    "lapTime": "35"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:39", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:15", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:51", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:29", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:07", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:45", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:23", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:01", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:38", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:16", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:54", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:32", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:10", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:48", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:25", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:04", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:41", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:20", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "14:57", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:32", 
                    "lapTime": "35"
                  }
                ]
              }, 
              {
                "bib": "21", 
                "performance": "15:47.18", 
                "place": 12, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:16", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:53", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:30", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:07", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:44", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:21", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:59", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:37", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:16", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:55", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:34", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:13", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:51", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:29", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:07", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:47", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:25", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:03", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:42", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:21", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:59", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:37", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:14", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:47", 
                    "lapTime": "33"
                  }
                ]
              }, 
              {
                "bib": "24", 
                "performance": "15:48.23", 
                "place": 13, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:17", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:54", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:31", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:08", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:45", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:23", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:00", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:38", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:16", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:55", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:33", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:12", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:51", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:29", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:07", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:46", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:25", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:03", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:42", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:21", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:59", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:37", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:14", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:48", 
                    "lapTime": "33"
                  }
                ]
              }, 
              {
                "bib": "33", 
                "performance": "15:48.92", 
                "place": 14, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:16", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:53", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:30", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:08", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:46", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:23", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:01", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:39", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:17", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:56", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:35", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:13", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:52", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:31", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:09", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:48", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:26", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:04", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:43", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:22", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:00", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:15", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:49", 
                    "lapTime": "33"
                  }
                ]
              }, 
              {
                "bib": "15", 
                "performance": "15:50.51", 
                "place": 15, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:15", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:53", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:30", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:07", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:43", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:21", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:57", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:36", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:13", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:52", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:31", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:10", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:49", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:28", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:07", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:46", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:25", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:04", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:42", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:21", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:00", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:15", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:50", 
                    "lapTime": "35"
                  }
                ]
              }, 
              {
                "bib": "31", 
                "performance": "15:54.44", 
                "place": 16, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:15", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:52", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:30", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:07", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:44", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:21", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:59", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:37", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:16", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:55", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:34", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:13", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:52", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:30", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:09", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:48", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:27", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:06", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:45", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:25", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:04", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:43", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:21", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:54", 
                    "lapTime": "33"
                  }
                ]
              }, 
              {
                "bib": "25", 
                "performance": "15:55.04", 
                "place": 17, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "37", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:14", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:50", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:26", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:03", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:39", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:15", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "4:52", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:30", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:06", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:44", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:22", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:01", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:39", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:18", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "9:56", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:35", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:15", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "11:55", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:35", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:16", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "13:57", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:37", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:16", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "15:55", 
                    "lapTime": "38"
                  }
                ]
              }, 
              {
                "bib": "18", 
                "performance": "16:07.19", 
                "place": 18, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:17", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:54", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:30", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:07", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:45", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:22", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:00", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:38", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:16", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "6:55", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:34", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:13", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "8:51", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:31", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:10", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "10:51", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:31", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:12", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "12:53", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:33", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:12", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "14:51", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "15:30", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "16:07", 
                    "lapTime": "37"
                  }
                ]
              }, 
              {
                "bib": "29", 
                "performance": "16:40.62", 
                "place": 19, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "39", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:17", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:54", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:31", 
                    "lapTime": "36"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:08", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:45", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:23", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:01", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:41", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:21", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:01", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "7:42", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:22", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:03", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "9:45", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:26", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:09", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "11:50", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:32", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:14", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "13:57", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:39", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:21", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "16:02", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "16:40", 
                    "lapTime": "38"
                  }
                ]
              }, 
              {
                "bib": "5", 
                "performance": "16:57.32", 
                "place": 20, 
                "points": 0, 
                "splits": [
                  {
                    "distance": 200, 
                    "elapsedTime": "40", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 400, 
                    "elapsedTime": "1:17", 
                    "lapTime": "37"
                  }, 
                  {
                    "distance": 600, 
                    "elapsedTime": "1:55", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 800, 
                    "elapsedTime": "2:34", 
                    "lapTime": "38"
                  }, 
                  {
                    "distance": 1000, 
                    "elapsedTime": "3:14", 
                    "lapTime": "39"
                  }, 
                  {
                    "distance": 1200, 
                    "elapsedTime": "3:54", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1400, 
                    "elapsedTime": "4:34", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1600, 
                    "elapsedTime": "5:15", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 1800, 
                    "elapsedTime": "5:56", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2000, 
                    "elapsedTime": "6:37", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2200, 
                    "elapsedTime": "7:18", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2400, 
                    "elapsedTime": "8:00", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2600, 
                    "elapsedTime": "8:41", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 2800, 
                    "elapsedTime": "9:22", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 3000, 
                    "elapsedTime": "10:05", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 3200, 
                    "elapsedTime": "10:46", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3400, 
                    "elapsedTime": "11:28", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3600, 
                    "elapsedTime": "12:10", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 3800, 
                    "elapsedTime": "12:53", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4000, 
                    "elapsedTime": "13:34", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4200, 
                    "elapsedTime": "14:17", 
                    "lapTime": "42"
                  }, 
                  {
                    "distance": 4400, 
                    "elapsedTime": "14:59", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4600, 
                    "elapsedTime": "15:40", 
                    "lapTime": "41"
                  }, 
                  {
                    "distance": 4800, 
                    "elapsedTime": "16:21", 
                    "lapTime": "40"
                  }, 
                  {
                    "distance": 5000, 
                    "elapsedTime": "16:57", 
                    "lapTime": "36"
                  }
                ]
              }
            ], 
            "resultsStatus": "provisional", 
            "round": 1, 
            "scheduledStartTime": "20:39", 
            "showAgeGrade": false, 
            "showAthleteDetails": false, 
            "showAthlonPoints": false, 
            "showPoints": false, 
            "showReactionTime": false, 
            "splitsLap": 200, 
            "splitsStart": 200, 
            "status": "finished"
          }
        ]
      }, 
      // technical horizontal (discus):
      
    {
        "ageGroups": [
          "ALL"
        ], 
        "category": "OPEN", 
        "cutAfterRound": 0, 
        "cutSurvivors": 0, 
        "day": 1, 
        "eventCode": "DT", 
        "eventId": "7", 
        "genders": "MF", 
        "lanes": 8, 
        "r1Time": "18:30", 
        "r2Day": 1, 
        "r3Day": 1, 
        "rounds": "1", 
        "status": "none", 
        "units": [
          {
            "heat": 1, 
            "results": [
              {
                "bib": "69", 
                "order": 1, 
                "performance": "11.73", 
                "place": 11, 
                "points": 0
              }, 
              {
                "bib": "85", 
                "order": 2, 
                "performance": "30.93", 
                "place": 5, 
                "points": 0
              }, 
              {
                "bib": "91", 
                "order": 3, 
                "points": 0
              }, 
              {
                "bib": "100", 
                "order": 4, 
                "performance": "35.99", 
                "place": 2, 
                "points": 0
              }, 
              {
                "bib": "103", 
                "order": 5, 
                "performance": "0.00", 
                "place": 12, 
                "points": 0
              }, 
              {
                "bib": "107", 
                "order": 6, 
                "performance": "30.03", 
                "place": 6, 
                "points": 0
              }, 
              {
                "bib": "110", 
                "order": 7, 
                "performance": "19.57", 
                "place": 9, 
                "points": 0
              }, 
              {
                "bib": "115", 
                "order": 8, 
                "performance": "13.58", 
                "place": 10, 
                "points": 0
              }, 
              {
                "bib": "124", 
                "order": 9, 
                "performance": "34.14", 
                "place": 3, 
                "points": 0
              }, 
              {
                "bib": "132", 
                "order": 10, 
                "performance": "33.57", 
                "place": 4, 
                "points": 0
              }, 
              {
                "bib": "137", 
                "order": 11, 
                "performance": "27.25", 
                "place": 7, 
                "points": 0
              }, 
              {
                "bib": "138", 
                "order": 12, 
                "points": 0
              }, 
              {
                "bib": "140", 
                "order": 13, 
                "performance": "20.22", 
                "place": 8, 
                "points": 0
              }, 
              {
                "bib": "141", 
                "order": 14, 
                "performance": "41.15", 
                "place": 1, 
                "points": 0
              }
            ], 
            "resultsStatus": "provisional", 
            "round": 1, 
            "rounds": 6, 
            "scheduledStartTime": "18:30", 
            "showAgeGrade": false, 
            "showAthleteDetails": false, 
            "showAthlonPoints": false, 
            "showPartials": false, 
            "showPoints": false, 
            "status": "finished", 
            "trials": [
              {
                "bib": "69", 
                "result": "11.23", 
                "round": 1
              }, 
              {
                "bib": "85", 
                "result": "29.08", 
                "round": 1
              }, 
              {
                "bib": "100", 
                "result": "35.99", 
                "round": 1
              }, 
              {
                "bib": "103", 
                "result": "x", 
                "round": 1
              }, 
              {
                "bib": "107", 
                "result": "27.68", 
                "round": 1
              }, 
              {
                "bib": "110", 
                "result": "19.57", 
                "round": 1
              }, 
              {
                "bib": "115", 
                "result": "x", 
                "round": 1
              }, 
              {
                "bib": "124", 
                "result": "x", 
                "round": 1
              }, 
              {
                "bib": "132", 
                "result": "33.57", 
                "round": 1
              }, 
              {
                "bib": "137", 
                "result": "x", 
                "round": 1
              }, 
              {
                "bib": "69", 
                "result": "11.73", 
                "round": 2
              }, 
              {
                "bib": "141", 
                "result": "x", 
                "round": 1
              }, 
              {
                "bib": "85", 
                "result": "x", 
                "round": 2
              }, 
              {
                "bib": "100", 
                "result": "x", 
                "round": 2
              }, 
              {
                "bib": "103", 
                "result": "x", 
                "round": 2
              }, 
              {
                "bib": "107", 
                "result": "30.03", 
                "round": 2
              }, 
              {
                "bib": "110", 
                "result": "x", 
                "round": 2
              }, 
              {
                "bib": "115", 
                "result": "9.24", 
                "round": 2
              }, 
              {
                "bib": "124", 
                "result": "34.14", 
                "round": 2
              }, 
              {
                "bib": "132", 
                "result": "33.10", 
                "round": 2
              }, 
              {
                "bib": "137", 
                "result": "27.25", 
                "round": 2
              }, 
              {
                "bib": "141", 
                "result": "x", 
                "round": 2
              }, 
              {
                "bib": "140", 
                "result": "x", 
                "round": 1
              }, 
              {
                "bib": "140", 
                "result": "20.22", 
                "round": 2
              }, 
              {
                "bib": "69", 
                "result": "10.95", 
                "round": 3
              }, 
              {
                "bib": "85", 
                "result": "30.93", 
                "round": 3
              }, 
              {
                "bib": "100", 
                "result": "x", 
                "round": 3
              }, 
              {
                "bib": "103", 
                "result": "x", 
                "round": 3
              }, 
              {
                "bib": "107", 
                "result": "26.73", 
                "round": 3
              }, 
              {
                "bib": "110", 
                "result": "x", 
                "round": 3
              }, 
              {
                "bib": "115", 
                "result": "13.58", 
                "round": 3
              }, 
              {
                "bib": "124", 
                "result": "x", 
                "round": 3
              }, 
              {
                "bib": "132", 
                "result": "32.93", 
                "round": 3
              }, 
              {
                "bib": "137", 
                "result": "x", 
                "round": 3
              }, 
              {
                "bib": "141", 
                "result": "41.15", 
                "round": 3
              }, 
              {
                "bib": "140", 
                "result": "19.84", 
                "round": 3
              }, 
              {
                "bib": "85", 
                "result": "x", 
                "round": 4
              }, 
              {
                "bib": "100", 
                "result": "33.50", 
                "round": 4
              }, 
              {
                "bib": "107", 
                "result": "29.07", 
                "round": 4
              }, 
              {
                "bib": "124", 
                "result": "x", 
                "round": 4
              }, 
              {
                "bib": "132", 
                "result": "x", 
                "round": 4
              }
            ]
          }
        ]
      }, 
      // technical vertical (high jump)
      
    {
        "ageGroups": [
          "ALL"
        ], 
        "category": "OPEN", 
        "cutAfterRound": 0, 
        "cutSurvivors": 0, 
        "day": 1, 
        "eventCode": "HJ", 
        "eventId": "8", 
        "genders": "MF", 
        "lanes": 8, 
        "r1Time": "19:00", 
        "r2Day": 1, 
        "r3Day": 1, 
        "rounds": "1", 
        "status": "none", 
        "units": [
          {
            "heat": 1, 
            "heights": [], 
            "initialHeight": "1.00", 
            "results": [
              {
                "bib": "82", 
                "order": 1, 
                "points": 0
              }, 
              {
                "bib": "84", 
                "order": 2, 
                "points": 0
              }, 
              {
                "bib": "105", 
                "order": 3, 
                "points": 0
              }, 
              {
                "bib": "110", 
                "order": 4, 
                "points": 0
              }, 
              {
                "bib": "116", 
                "order": 5, 
                "points": 0
              }, 
              {
                "bib": "134", 
                "order": 6, 
                "points": 0
              }
            ], 
            "resultsStatus": "in_progress", 
            "round": 1, 
            "scheduledStartTime": "19:00", 
            "showAgeGrade": false, 
            "showAthleteDetails": false, 
            "showAthlonPoints": false, 
            "showPartials": false, 
            "showPoints": false, 
            "status": "unscheduled", 
            "trials": [
              {
                "bib": "84", 
                "height": "1.15", 
                "result": "-"
              }, 
              {
                "bib": "116", 
                "height": "1.15", 
                "result": "-"
              }, 
              {
                "bib": "82", 
                "height": "1.15", 
                "result": "-"
              }, 
              {
                "bib": "105", 
                "height": "1.15", 
                "result": "-"
              }, 
              {
                "bib": "134", 
                "height": "1.15", 
                "result": "-"
              }, 
              {
                "bib": "110", 
                "height": "1.15", 
                "result": "o"
              }, 
              {
                "bib": "84", 
                "height": "1.20", 
                "result": "-"
              }, 
              {
                "bib": "110", 
                "height": "1.20", 
                "result": "-"
              }, 
              {
                "bib": "82", 
                "height": "1.20", 
                "result": "-"
              }, 
              {
                "bib": "105", 
                "height": "1.20", 
                "result": "-"
              }, 
              {
                "bib": "134", 
                "height": "1.20", 
                "result": "-"
              }, 
              {
                "bib": "116", 
                "height": "1.20", 
                "result": "o"
              }, 
              {
                "bib": "116", 
                "height": "1.45", 
                "result": "-"
              }, 
              {
                "bib": "110", 
                "height": "1.45", 
                "result": "-"
              }, 
              {
                "bib": "82", 
                "height": "1.45", 
                "result": "-"
              }, 
              {
                "bib": "105", 
                "height": "1.45", 
                "result": "-"
              }, 
              {
                "bib": "134", 
                "height": "1.45", 
                "result": "-"
              }, 
              {
                "bib": "84", 
                "height": "1.45", 
                "result": "o"
              }, 
              {
                "bib": "116", 
                "height": "1.50", 
                "result": "-"
              }, 
              {
                "bib": "110", 
                "height": "1.50", 
                "result": "-"
              }, 
              {
                "bib": "82", 
                "height": "1.50", 
                "result": "-"
              }, 
              {
                "bib": "105", 
                "height": "1.50", 
                "result": "-"
              }, 
              {
                "bib": "134", 
                "height": "1.50", 
                "result": "-"
              }, 
              {
                "bib": "84", 
                "height": "1.50", 
                "result": "x"
              }, 
              {
                "bib": "84", 
                "height": "1.50", 
                "result": "x"
              }, 
              {
                "bib": "84", 
                "height": "1.50", 
                "result": "o"
              }, 
              {
                "bib": "84", 
                "height": "1.55", 
                "result": "x"
              }, 
              {
                "bib": "84", 
                "height": "1.55", 
                "result": "x"
              }, 
              {
                "bib": "84", 
                "height": "1.55", 
                "result": "x"
              }, 
              {
                "bib": "116", 
                "height": "1.55", 
                "result": "x"
              }, 
              {
                "bib": "116", 
                "height": "1.55", 
                "result": "x"
              }, 
              {
                "bib": "116", 
                "height": "1.55", 
                "result": "x"
              }, 
              {
                "bib": "110", 
                "height": "1.55", 
                "result": "x"
              }, 
              {
                "bib": "110", 
                "height": "1.55", 
                "result": "x"
              }, 
              {
                "bib": "110", 
                "height": "1.55", 
                "result": "x"
              }
            ]
          }
        ]
      }, 


        ], // the events do not only store the event background info, but also series and results
        "finishDate": "2121-01-01",
        "fullName": "der ganze name", 
        "id": "9fa28029-969e-4d27-a169-2fd51d3fd740", // woher diese verrückte ID? 
        "organiser": "0655fff5-60a0-49ae-8aa9-b340ddc23e07", // seems to be an ID for the organiser
        "relayTeams": [], // relays
        "shortName": "Highgate Harriers Early Season",  
        "slug": "high_early_open", // probably the short name mainly for short URLs
        "teamTypes": "ORG", // ???
        "teams": [], // ??? probably any team apart of relays
        "venue": "bc22a22f-f9db-4a07-b300-06848263d305", // seems to be a stadium-ID 
        "year": 2121
    }
}