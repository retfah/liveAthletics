

function roomRequestHandler(data, responseFunc, roomsReady, ws, rMeetings, wsProcessor){

    if (!roomsReady){
        responseFunc('The rooms are not ready yet. Please be patient', 4);
        return;
    }

    // requests to 'room' must look as defined in the following jsonSchema:
    /*
    data = {
        "type": "object",
        "properties": {
            "arg": {
                "type": "string",
                "enum": ["enter", "leave", "function", "fullData", "changeClientName"]
            },
            "roomName": {
                "type": "string"
            },
            "opt": {
                "type": {} // can be anything; for arg=enter it can be ID=123uuid and writing=true
            }
        },
        "required": ["arg", "roomName"]			
    }*/

    // check if the necessary arguments (arg, roomName) are given
    // tabId must have been reported before calling any room functions!
    if ('arg' in data && 'roomName' in data && ws.tabID){

        // if the room is of a specific meeting (contains '@'), check if the user has the rights for this meeting and try to get the room of this meeting
        let splitRoom = data.roomName.split('@');
        if (splitRoom.length==2){
            let meetingShortname = splitRoom[1];
            let fullRoomName = splitRoom[0];

            // the room name may contain a subroom name (roomName/subroom1name/subroom2name/...) --> get the roomName and pass the rest to the subroom-function
            let roomName = fullRoomName.split('/',1)[0];
            let subrooms = fullRoomName.slice(roomName.length+1);
            
            // try to get the meeting
            if (meetingShortname in rMeetings.activeMeetings && rMeetings.activeMeetings[meetingShortname].meeting.running){
                let room;
                if (room = rMeetings.activeMeetings[meetingShortname].rooms[roomName]){

                    // differentiate: we want a subroom OR the mainroom:
                    if (subrooms==''){
                        room.wsRequestIncoming(ws.tabID, wsProcessor, responseFunc, data.arg, data.opt, ws.session);
                    } else {
                        let subroom = room.getSubroom(subrooms); // return false on failure
                        if (!subroom){
                            logger.log(75, 'The subroom "' + subrooms + '" does not exist in the respective meeting.');
                            responseFunc('The subroom "' + subrooms + '" does not exist in the respective meeting.', 11);
                        } else {
                            subroom.wsRequestIncoming(ws.tabID, wsProcessor, responseFunc, data.arg, data.opt, ws.session);
                        }
                    }
                    
                } else {
                    logger.log(75, 'The room "' + roomName + '" does not exist in the respective meeting.');
                    responseFunc('The room "' + roomName + '" does not exist in the respective meeting.', 11);
                }
            } else {
                logger.log(75, 'The meeting "' + meetingShortname + '" does not exist. The room "' + data.roomName + '" cannot be loaded.');
                responseFunc('The meeting "' + meetingShortname + '" does not exist. The room "' + data.roomName + '" cannot be loaded.', 12);
            }

        }else {
            // check if room exists in global space
            if (data.roomName in rooms){


                // delegate the rest to the room:
                //rooms[data.roomName].wsNoteIncoming(ws.sid, wsProcessor, data.arg, data.opt)
                rooms[data.roomName].wsRequestIncoming(ws.tabID, wsProcessor, responseFunc, data.arg, data.opt, ws.session) // 2021-01: instead of the sid we now use the tabId; the sid is newly given via the "session" object, which additionally provides perimssion/login related infos for the respective client

            }else{
                // room does not exist
                logger.log(75, 'The room "' + data.roomName + '" does not exist');
                responseFunc('The room "' + data.roomName + '" does not exist', 13);
            }
        }


    } else {
        responseFunc('Missing arguments (a request to "room" must contain the properties "arg" and "roomName") OR tabId not reported yet.', 14);
    }

}

function roomNoteHandler(request, responseFunc){

}

export {roomRequestHandler, roomNoteHandler};