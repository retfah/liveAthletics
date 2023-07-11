# Order of script (text/javascript and module) parsing and events

The parsing order of scripts, regular ones (type="text/javascript") and modules (type="module"), both inline or with src is not always clear. Moreover, there is a difference whether all stuff will be loaded from the server or whether we use the preloaded files and insert them. This is problematic, when we want to call a startup function "after loading", but we don't know whether all scripts are already loaded.

For this reason a small study was done (Vivaldi 5.4.2753.45 = Chrome 104.0.5112.112, 2023-07) with the following code:

moduleTest.js:
```javascript
alert("run external module")
function test(){
	return 'YES';
}
window.test2 = test;
```

Main code:
```html
<script type="module" src="/static/moduleTest.js" onload="alert('external module loaded')"></script>
<script type="module" onload="alert('inline module loaded')"> // onload will not be called!
    alert('run inline module');
    function test() {alert('run test')}
    window.test = test;
</script>
<script onload="alert('inline script loaded')"> // onload will not be called!
    //let x=10;

    alert('run inline classic script');

    function startupConstruction(){
        alert('startupConstruction');
        if (!('test' in globalThis)){
            alert('function from inline module does not exist yet!')
        } else {
            globalThis.test();
        }
    }

    // is the following event also raised when the page/script was inserted
    window.addEventListener("DOMContentLoaded", (event) => {
        alert("DOM fully loaded and parsed");
        });
        // we could use the load event on the script

</script>

```

### Order of execution on reload from server
- inline script
- inline module (note that in the DOM the module is first!)
- external module
- (onload-event of external module)
- DOMContentLoaded-event
- onload-event (startupConstruction)
- run test (added to globalThis in moduleTest.js)

### Order of execution when preloaded
- inline script
- onload-event (startupConstruction) &rarr; the "test" funciton from the external script is not loaded at that time! 
- inline module
- external module
- (onload-event of external module)

*Note: there are no onload or DOMContentLoaded events, since this is fired only when initially loaded from server.*

### Main findings:
- The onload event is raised only when loaded from the server. It is raised at the very end, i.e. when really all scripts (including modules) are loaded and ready. However, this event as well as DOMContentLoaded is not raised when we change the DOM including code.
- Unfortunately, load events on scripts (\<script onload="someFunction">) are only raised for external (src) scripts, but not raised for inline scripts. If it was also for inline scripts, we could listen to the events of the loaded scripts and run the onload-function as soon as all scripts are loaded (e.g. by creating a Promise for every script and waiting for Promise.all)
- **The only solution for the problem is probably to use a CustomEvent signaling when all scripts are loaded. This would have to be raised by the script which is known to load last or by any function in one of the loaded scripts that checks in some custom way, whether all the other scriopts have loaded already or not.**

### See also:
- https://stackoverflow.com/questions/8996852/load-and-execute-order-of-scripts
- https://v8.dev/features/modules#defer
- Mutation observer is likely not helpful, since it has nothing to do with when code is parsed: https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
