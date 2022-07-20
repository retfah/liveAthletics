/**
* eventHandling: Event handling on the client: the central event manager
* - store a list of all currently possible events
* - store a list of all listeners on each of these events
* - process an event by calling all listeners
* 
* @class eventHandling Description
*/
module.exports = class eventHandling{ // ES 2015 style syntax
   /**
    * - each event (name) can only appear once and is the identifier in the events object
    * - more 'security' could be introduced when not everybody could raise all events, but only the object/function that registred for it. 
    *   This could be done for example by returning a random string on registering an event and using this to process the events later   
    * - eventually add the possibility to inform the listener, if the event is unregistered/closed
    */

   constructor(){
           this._events = {}; // virually protected (not protected, but anybody should know not to touch it!)

   }

   /**
    * register a new event, to allow listeners to be bound to it
    * @method eventRegister
    * @param {String} name The name of the event 
    */
   eventRegister(name){
           // check if the event already exists
           if (this._events[name]){
                   // the event already exists
                   logger.log(10, "The event "+name+" already exists and cannot be registered!")
                   return false;
           } else {
                   this._events[name] = []; // every listener will be an entry in the array 
                   return true;
           }

   }

   /**
    * subscribe for an event / add a listener:
    * the subscribtion is transferred to the 
    * @method eventSubscribe
    * @param {String} name The name of the event
    * @param {Function} listener The function/listener to be called when the event is raised; one argument:data
    * @param {Boolean} autoCreate If the event chall be created automatically if it does not exist yet
    */
   eventSubscribe(name, listener, autoCreate=true){
       // check if the event exists

       function isFunction(){
           // TODO
           return true;
       }

       if (isFunction(listener)){
           if(this._events[name]){
                   this._events[name].push(listener);
                   return true;
           }else{
               if (autoCreate){
                   this._events[name]=[];
                   this._events[name].push(listener);
                   return true;
               }
           }   
       }
       return false; // should never arrive here
   }

   /**
    * 
    * @param {String} name 
    * @param {Function} listener 
    */
   eventUnsubscribe(name, listener){
       if(!this._events[name]){
           // this event does not exist, nothing to remove
           logger.log(10, 'Event ' + name + 'does not exist (anymore). nothing to remove the listener from.');
           return false;
       } else{
           let i=0;
           this._events[name].forEach(element => {
               if (element==listener){
                   // remove it
                   this._events[name].splice(i,1);
                   return true;
               }
               i++;
           })
           // listener was not/normore assigned to the event
           logger.log(10, 'listener ' + listener.toString() + ' was not/normore assigned to the event ' + name);
           return false;
       }
   }

   /**
    * raise: rasies an event, if there are listeners
    * @param {String} name 
    * @param {Object} data The data given to the listeners registered for that event 
    * @returns {Number} The number of listeners called
    */
   raise(name, data){
       if (name in this._events){
               this._events[name].forEach((element)=>{element(data)});
       } else {
               return 0;
       }
   }

}