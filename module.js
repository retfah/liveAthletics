export default class module {

    /**
     * Provide functions to the server as a module
     * @param {strimg} name The name of the module
     * @param {string} type The type of the module; to be defined.
     */
    constructor(name, type){
        this.name = name;
        this.type = type;
    }

    /**
     * This function will be called on startup of the server
     */
    startup() {

    }

    /**
     * Called to install a module. Not implemented yet!
     */
    install(){
        // TODO: e.g. implement here the creation of a database etc.
    }
}