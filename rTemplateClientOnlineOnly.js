
<% roomUpper = room[0].toUpperCase() + room.substring(1) %>
<% roomPlural = roomPlural ? roomPlural : room + "s" %>
<% roomUpperPlural = roomPlural[0].toUpperCase() + roomPlural.substring(1)  %>

export class r<%= roomUpperPlural %>Client extends roomClient{


    /**
     * 
     * @param {roomClientVue} v The vue that should be linked first (can be undefined)
     * @param {wsProcessor} wsHandler websocket handler
     * @param {eventHandler} eventHandler The event handler
     * @param {roomManager} rM The roomManager instance
     * @param {boolean} writing Whether writing rights shall be requested or not
     * @param {string} datasetName The name of the dataset to get from the server (surrently either ''=room data or 'meetingSelection')
     * @param {string} roomName The name of the room; within a meeting, the room name is not automatically given by the class, but contains the meeting-shortname and therefore must be given
     */
    constructor(v, wsHandler, eventHandler, rM, writing=false, storeInfos='', datasetName='', roomName){

        let failCB = (msg, code)=>{}
        let successCB = ()=>{}

        // call the parent constructor
        //(v, name, wsHandler, eventHandler, onlineOnly, writing, success, failure, storeInfos=false, rM, datasetName='', writingChangedCB)
        
        // the room name must include the meeting name (<%= room %>@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // set the available functions
        this._addFunction('add<%= roomUpper %>', this.add<%= roomUpper %>Exe);
        this._addFunction('delete<%= roomUpper %>', this.delete<%= roomUpper %>Exe);
        this._addFunction('update<%= roomUpper %>', this.update<%= roomUpper %>Exe);
    }

    add<%= roomUpper %>Init(<%= room %>){
        // <%= room %> should contain all mandatory properties except the index...
        this.addToStack('add<%= roomUpper %>', <%= room %>)
    }

    add<%= roomUpper %>Exe(<%= room %>){
        // the data should contain the complete object
        this.data.push(<%= room %>);
    }

    delete<%= roomUpper %>Init(<%= room %>Id){
        this.addToStack('delete<%= roomUpper %>', <%= room %>Id);
    }

    delete<%= roomUpper %>Exe(<%= room %>Id){
        let ind = this.data.findIndex(el=>el.<%= primary %> == <%= room %>Id);
        this.data.splice(ind, 1);
    }

    update<%= roomUpper %>Init(<%= room %>){
        this.addToStack('update<%= roomUpper %>', <%= room %>);
    }

    update<%= roomUpper %>Exe(<%= room %>Updated){
        let <%= room %> = this.data.find(el=>el.<%= primary %> == <%= room %>Updated.<%= primary %>);
        this.propertyTransfer(<%= room %>Updated, <%= room %>, true)
    }
}