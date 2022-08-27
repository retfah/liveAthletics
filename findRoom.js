

// tries to get the room specified in the specified meeting and run the mentioned function; this process is required in both noteHandler and requestHandler as well as in rSideChannel

// CHANGES: 
// 2022-08: especially for rooms that are created dynamically, simply returning the room is not very helpful, since the following command to the room (e.g. enter) will fail, since the room is not ready. Thus, if awaitRoomReady=true, the function will not resolve until the room is actually ready.  

/**
 * 
 * @param {string} roomName 
 * @param {string} rMeetings What meeting to search for
 * @returns 
 */
export default async function findRoom(meetingAndRoomName, rMeetings, serverRooms, logger={log:()=>{}}, awaitRoomReady=true){

    // if the room is of a specific meeting (contains '@'), check if the user has the rights for this meeting and try to get the room of this meeting
    let splitRoom = meetingAndRoomName.split('@');
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
                    if (awaitRoomReady){
                        await room._roomReady();
                    }
                    return room; 
                } else {
                    let subroom = room.getSubroom(subrooms); // return false on failure
                    if (!subroom){
                        logger.log(75, 'The subroom "' + subrooms + '" does not exist in the respective meeting.');
                        throw {message:'The subroom "' + subrooms + '" does not exist in the respective meeting.', code:11} ;
                    } else {
                        if (awaitRoomReady){
                            await subroom._roomReady();
                        }
                        return subroom;
                    }
                }
                
            } else {
                logger.log(75, 'The room "' + roomName + '" does not exist in the respective meeting.');
                throw {message:'The room "' + roomName + '" does not exist in the respective meeting.', code:11} ;
            }
        } else {
            logger.log(75, 'The meeting "' + meetingShortname + '" does not exist. The room "' + meetingAndRoomName + '" cannot be loaded.');
            throw {message:'The meeting "' + meetingShortname + '" does not exist. The room "' + meetingAndRoomName + '" cannot be loaded.', code:12};
        }

    }else {
        // check if room exists in global space
        if (meetingAndRoomName in serverRooms){

            // delegate the rest to the room:
            // await ready
            if (awaitRoomReady){
                await serverRooms[meetingAndRoomName]._roomReady();
            }
            return serverRooms[meetingAndRoomName];

        }else{
            // room does not exist
            logger.log(75, 'The room "' + meetingAndRoomName + '" does not exist');
            throw  {message: 'The room "' + meetingAndRoomName + '" does not exist', code:13};
        }
    }
}