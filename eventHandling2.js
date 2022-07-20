

import {uuidv4} from './common.js';

/**
* eventHandling: Event handling on the client: the central event manager, in version 2 with an object as listener-list instead of an array. This is beneficial on unsubscribing, where not the whole arra must be searched. 
* - store a list of all currently possible events
* - store a list of all listeners on each of these events
* - process an event by calling all listeners
* 
* @class eventHandling Description
*/
export default class eventHandling2{ // ES 2015 style syntax
   /**
    * - each event (name) can only appear once and is the identifier in the events object
    * - more 'security' could be introduced when not everybody could raise all events, but only the object/function that registred for it. 
    *   This could be done for example by returning a random string on registering an event and using this to process the events later   
    * - eventually add the possibility to inform the listener, if the event is unregistered/closed
    */

   constructor(logger){
       this._events = {}; // virually protected (not protected, but anybody should know not to touch it!)
       this.logger = logger;
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
           this.logger.log(10, "The event "+name+" already exists and cannot be registered!")
           return false;
       } else {
           this._events[name] = {}; // every listener will be an named entry in the object
           return true;
       }

   }

   /**
    * subscribe for an event / add a listener:
    * 
    * @method eventSubscribe
    * @param {String} name The name of the event
    * @param {Function} listener The function/listener to be called when the event is raised; one argument:data
    * @param {string} listenerName A name of the listener, which is also used to delete the listener again. If not specified, a listenerName will be generated automatically.
    * @param {Boolean} autoCreate If the event shall be created automatically if it does not exist yet
    * @returns {mixed} false when subscription not possible because the listenerName is already used; otherwise the listenerName
    */
   eventSubscribe(name, listener, listenerName=false, autoCreate=true){

       function isFunction(){
           // TODO
           return true;
       }

       if (!listenerName){
           listenerName = uuidv4();
       }

       if (isFunction(listener)){
           if(this._events[name]){
               // check that listener does not yet exist
               if (listenerName in this._events[name]){
                   return false;
               }
               this._events[name][listenerName] = listener;
               return listenerName;
           }else{
               if (autoCreate){
                   this._events[name]={};
                   this._events[name][listenerName] = listener;
                   return listenerName;
               }
           }   
       }
       return false; // should never arrive here
   }

   /**
    * 
    * @param {String} name 
    * @param {Function} listenerName
    */
   eventUnsubscribe(name, listenerName){
       if(!this._events[name]){
           // this event does not exist, nothing to remove
           this.logger.log(10, 'Event ' + name + 'does not exist (anymore). nothing to remove the listener from.');
           return false;
       } else{
           delete this._events[name][listenerName];
           return true; // the deleting will always work and return true, so we do not need to check whether the listenerName was evcven registered
       }
   }

   /**
    * raise: raises an event, if there are listeners
    * @param {String} name 
    * @param {Object} data The data given to the listeners registered for that event 
    * @returns {Number} The number of listeners called
    */
   raise(name, data){
       if (name in this._events){
           for (let listenerName in this._events[name]){
               this._events[name][listenerName](data);
           }
       } else {
               return 0;
       }
   }

}