// This is the sideChannelClient to be used on the server (for secondary servers!) For the identically named file for the browser see in the folder /static/ !


import roomClient from './roomClientForServer.js';

export default class rSideChannelClient extends roomClient{

    /**
     * 
     * @param {wsProcessor} wsHandler websocket handler
     * @param {eventHandler} eventHandler The event handler
     * @param {string} meetingShortnameMain The meeting shortname on the main server.
     * @param {string} meetingShortnameThis The meeting shortname on this server. The main server MUST use 'sideChannel@meetingShortnameThis' when sending changes to this server to make shure teh change is applied in the right meeting on the secondary server. 
     * @param {object} logger the logger instance (unusual for client rooms actually, but since we run this client on the server, we need it because tehr eis no global logger available)
     * @param {object} rSideChannel The sideChannel room
     * @param {string} token The token of this server, used for authentication on the main server
     * @param {function} success Called when successfully entered the room on the server
     * @param {function} fail Called when entering the room on the server failed
     */
    constructor(wsHandler, eventHandler, meetingShortnameMain, meetingShortnameThis, logger, rSideChannel, token, success=()=>{}, fail=()=>{}){

        let writing = false;
        let storeInfos = false;
        let datasetName = '';
        let roomManager = undefined; // there is no roomManager here, but it does not matter, since it would only be needed if changes the client requests cannot be made. However, this should not happen here, since this client basically listens to broadcasts, apart of requetsing the last changes after a reconenct. 

        let roomName = `sideChannel@${meetingShortnameMain}`

        // callbacks for connection success and failure:
        let failCB = (msg, code)=>{
            fail(msg, code);
        }
        let successCB = ()=>{
            // when the connection and data initialization was successful, set the respective status properties in rBackup to true
            rSideChannel.rBackup.data.status.connectionToMain.successfulInitialization = true;
            rSideChannel.rBackup.data.status.connectionToMain.clientOnMain = true;
            rSideChannel.rBackup.data.status.connectedToMain = true; // should be already true
            // broadcast the statusChange
            rSideChannel.rBackup.serverFuncWrite('statusChanged',undefined).catch(()=>{});

            // if requested (e.g. by startStopPull)
            success();

        }

        // call the parent constructor
        //(v, name, wsHandler, eventHandler, onlineOnly, writing, success, failure, storeInfos=false, rM, datasetName='', writingChangedCB)

        let enterOptions = {
            token: token,
            meetingShortnameClient: meetingShortnameThis,
        }
        
        // the room name must include the meeting name (contest@meetingShortname)
        super(undefined, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, roomManager, datasetName, ()=>{}, logger, rSideChannel.ID, enterOptions); 

        this.meetingShortnameMain = roomName;

        // initialize the data and the ID (get it from sideChannel)
        this.rSideChannel = rSideChannel;
        //this.ID = rSideChannel.ID; // already done in the super-constructor
        //this.stack;

        // check if we have the current data or try to get the changes since then --> should be done somehow automatically by roomCLient. But the main difference is that we do have some initial data here, which is not the case on typical roomClients in the browser! Eventually we need to change some stuff in roomClientForServer to be able to this. (We are for example not able to set the data and ID prior to calling super; however, calling super probably/likely already starts the process of asking the main server for the latest data.)
        // TODO

        // set the available functions

        //this._addFunction('updateContest2', this.updateContest2Exe);
    }


    /**
     * The broadcasted changes do NOT arrive here (, they go diretly to rSideChannel because the room handler only knows the server rooms and not the client rooms). However, when the secondary server (re-)connects to the main server and gets incremental changes, then those changes will be "applied" in this room. Therefore, we need this function, which actually does not do much more than calling the respective function in rSideChannel.
     */
    async change(data, ID){

        // TODO: check if the ID arrives here.
        await this.rSideChannel.serverFuncWrite('change', data, ID).catch(err=>{
            this.logger.log(20,`rSideChannel:The incoming note-change could not be processed. A full reload of the data will be done. ${JSON.stringify(err)}`);
            if (this.connectionToMain){
                this.connectionToMain.getFullData();
            }
        })
 
        // the ID of the main room (rSideChannel) needs to be changed as well, as soon as the incoingChange function has finished --> done in onChange()

    }


    /**
     * Overwrite teh default behavior what should be done after a change was processed. Normally, the vues are notified. Here, we update the ID of the actual server, i.e. rSideChannel. (rSideChannelClient already has the new ID.)
     */
    onChange(){
        this.rSideChannel.ID = this.ID;
    }

    // this function is called, after the full data update is done. The data is then already stored in this.data; however this data is not needed there, but we need to restore it as if it was a regular backup (what it is)
    async afterFullreload(){
        // this.data contains the pure backup. The restore function needs two additional properties
        let dataPrep = {
            backup:this.data, // TODO: this must stay a string!
            restoreSideChannelData: false,
            restoreSideChannelConfiguration: false,
        }
        await this.rSideChannel.rBackup.serverFuncWrite('restoreBackup', dataPrep).then(()=>{
            // set the ID of the main room! (the ID of this room will be the ID of the main server; we need to transfer it to the rSideChannel, since rSideChannel would not realize that the ID has changed)
            this.rSideChannel.ID = this.ID;
        }).catch(err=>{
            // we are in serious trouble...
            // write a note to the log and close the connection!

            this.logger.log(2, `The sideChannel could not restore the backup, which would have been required for the initial replication! using the side channel under those circumstances (this meeting on this main server with its version and the local meeting with the version found here): ${JSON.stringify(err)}`)

            this.close()
            // TODO: eventually it also would make sense to let this function simply crash and catch the error in rSideChannel and then return the error also to calling function (either on the pushServer or here in rBackup)
        })

        await this.rSideChannel.storeID();
    }

    /**
     * NOTE
     * changes broadcasted by the main server are automatically handled by rSideChannel (and not rSideChannelClient), since the incoming notes are passed through the noteHandler, which only knows the roomServers and not this client. This is not a problem, but a feature.
     */

    
}