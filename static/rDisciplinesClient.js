// NOTE: we typically will not use the actual roomData, but translated discipline objects, which are basically a merge between disciplines, baseDisciplines and baseDisciplinesLocalizations. The objects store teh following data: xDiscipline, xBaseDiscipline, sortorder, timeAppeal, timeCall, type, relay, name, shortname 

export class rDisciplinesClient extends roomClient{


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
        let successCB = ()=>{
            // create the "base" translation:
            this.createTranslation();
        }

        // the room name must include the meeting name (baseDiscipline@meetingShortname)
        super(v, roomName, wsHandler, eventHandler, true, writing, successCB, failCB, storeInfos, rM, datasetName); 

        // an object holding all translated lists of disciplines
        this.translations = {};


        // set the available functions
        this._addFunction('addBaseDiscipline', this.addBaseDisciplineExe);
        this._addFunction('deleteBaseDiscipline', this.deleteBaseDisciplineExe);
        this._addFunction('updateBaseDiscipline', this.updateBaseDisciplineExe);
        this._addFunction('updateLocalization', this.updateLocalizationExe);
        this._addFunction('addLocalization', this.addLocalizationExe);
        this._addFunction('deleteLocalization', this.deleteLocalizationExe);
    }

    getTranslatedDisciplines(lang){
        // check whether the translation already exists, otherwise translate and return it
        return (lang in this.translations) ? this.translations[lang] : this.createTranslation(lang);
    }

    createTranslation(lang='base'){
        // create a discipline-dataset providing everything needed for vue's: xDiscipline, xBaseDiscipline, sortorder, type, relay, name, shortname (before 2021-09 also timeAppeal and timeCall)
        // if lang='base', always the standard name and shortname are used as defined in baseDisciplines. Otherwise it will be tried to find a translation in the basedisciplinelocalizations
        
        let disciplines = [];

        // loop over all baseDisicplines:
        for (let bd of this.data){

            let name, shortname;
            // get the name and shortname: 
            if (lang=='base'){
                // use the default value
                name = bd.nameStd;
                shortname = bd.shortnameStd;
            } else {
                // try to get a translation: 
                let local = bd.basedisciplinelocalizations.find(bdl=>bdl.language==lang);
                if (local){
                    name = local.name;
                    shortname = local.shortname;
                }else {
                    // use the default value
                    name = bd.nameStd;
                    shortname = bd.shortnameStd;
                }
            }

            // loop over the linked disciplines
            for (let d of bd.disciplines){
                // add the discipline when active
                if (d.active){

                    // TODO: some disciplines need further modifications to the names and shortnames based on d.configuration (e.g. hurdle heights, weights)
                    // if we really make modules for different types of disciplines, then wach module should provide a "translator" function doing these modifications
                    if (d.xDiscipline==123){
                        name = name + "";
                        shortname = shortname + "";
                    }

                    // xDiscipline, xBaseDiscipline, sortorder, timeAppeal, timeCall, type, name, shortname 
                    disciplines.push({
                        xDiscipline: d.xDiscipline,
                        xBaseDiscipline: bd.xBaseDiscipline,
                        sortorder: d.sortorder,
                        indoor: bd.indoor,
                        /*timeAppeal: d.timeAppeal,
                        timeCall: d.timeCall,*/
                        type: bd.type,
                        /*relay: bd.relay,*/
                        name: name,
                        shortname: shortname,
                        configuration: d.configuration,
                        baseConfiguration: bd.baseConfiguration,
                        info: d.info,
                    })
                }
            }
        }

        // sort the disciplines:
        disciplines.sort((el1, el2)=>{return el1.sortorder-el2.sortorder})

        this.translations[lang] = disciplines;
        return disciplines;
    }

    addLocalizationInit(xBaseDiscipline, language, name, shortname){
        let data = {
            xBaseDiscipline,
            language, 
            name,
            shortname
        }
        this.addToStack('addLocalization', data)
    }
    addLocalizationExe(data){
        let bd = this.data.find(el=>el.xBaseDiscipline == data.xBaseDiscipline);
        bd.basedisciplinelocalizations.push(data);
    }

    updateLocalizationInit(xBaseDiscipline, xDisciplinesLocalization, language, name, shortname){
        let data = {
            xBaseDiscipline,
            xDisciplinesLocalization,
            language, 
            name,
            shortname
        }
        this.addToStack('updateLocalization', data)
    }
    updateLocalizationExe(data){
        let bd = this.data.find(el=>el.xBaseDiscipline == data.xBaseDiscipline);
        let bdl = bd.basedisciplinelocalizations.find(el=>el.xDisciplinesLocalization==data.xDisciplinesLocalization);
        this.propertyTransfer(data, bdl);
    }

    deleteLocalizationInit(xBaseDiscipline, xDisciplinesLocalization){
        let data = {
            xBaseDiscipline,
            xDisciplinesLocalization,
        }
        this.addToStack('deleteLocalization', data)
    }
    deleteLocalizationExe(data){
        let bd = this.data.find(el=>el.xBaseDiscipline == data.xBaseDiscipline);
        let ind = bd.basedisciplinelocalizations.findIndex(el=>el.xDisciplinesLocalization==data.xDisciplinesLocalization);
        bd.basedisciplinelocalizations.splice(ind, 1);
    }

    addBaseDisciplineInit(baseDiscipline){
        // baseDiscipline should contain all mandatory properties except the index...
        this.addToStack('addBaseDiscipline', baseDiscipline)
    }

    addBaseDisciplineExe(baseDiscipline){
        // the data should contain the complete object
        this.data.push(baseDiscipline);
    }

    deleteBaseDisciplineInit(baseDisciplineId){
        this.addToStack('deleteBaseDiscipline', baseDisciplineId);
    }

    deleteBaseDisciplineExe(baseDisciplineId){
        let ind = this.data.findIndex(el=>el.xBaseDiscipline == baseDisciplineId);
        this.data.splice(ind, 1);
    }

    updateBaseDisciplineInit(baseDiscipline){
        this.addToStack('updateBaseDiscipline', baseDiscipline);
    }

    updateBaseDisciplineExe(baseDisciplineUpdated){
        let baseDiscipline = this.data.find(el=>el.xBaseDiscipline == baseDisciplineUpdated.xBaseDiscipline);
        this.propertyTransfer(baseDisciplineUpdated, baseDiscipline, true)
    }
}