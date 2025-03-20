// some common functions that might be helpful in many modules:
// copy Objects, copeid from 'Speaking Javascript'-book

function copyObject(orig) {
    // 1. copy has same prototype as orig
    var copy = Object.create(Object.getPrototypeOf(orig));
    // 2. copy has all of orig’s properties
    copyOwnPropertiesFrom(copy, orig);
    return copy;
}
function copyOwnPropertiesFrom(target, source) {
    Object.getOwnPropertyNames(source) // (1)
    .forEach(function(propKey) { // (2)
    var desc = Object.getOwnPropertyDescriptor(source, propKey); // (3)
    Object.defineProperty(target, propKey, desc); // (4)
    });
    return target;
};
function uuidv4() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
	});
}
function streamToString (stream, encoding='latin1') {
	const chunks = [];
	return new Promise((resolve, reject) => {
	stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
	stream.on('error', (err) => reject(err));
	stream.on('end', () => {
		resolve(Buffer.concat(chunks).toString(encoding));
		});
	})
}
function streamToStringUTF8(stream){
	return streamToString(stream, 'UTF-8');
}
function streamToStringLatin1(stream){
	return streamToString(stream, 'latin1');
}

/**
 * Compares any number of objects. Copied from crazyx https://stackoverflow.com/questions/1068834/object-comparison-in-javascript
 * @property any number of objects, e.g. obj1, obj2, obj3, ...
 * @returns boolean 
 */
function compareObjects() {
	var i, l, leftChain, rightChain;

	function compare2Objects(x, y) {
		var p;

		// remember that NaN === NaN returns false
		// and isNaN(undefined) returns true
		if (isNaN(x) && isNaN(y) && typeof x === 'number' && typeof y === 'number') {
			return true;
		}

		// Compare primitives and functions.     
		// Check if both arguments link to the same object.
		// Especially useful on the step where we compare prototypes
		if (x === y) {
			return true;
		}

		// Works in case when functions are created in constructor.
		// Comparing dates is a common scenario. Another built-ins?
		// We can even handle functions passed across iframes
		if ((typeof x === 'function' && typeof y === 'function') ||
			(x instanceof Date && y instanceof Date) ||
			(x instanceof RegExp && y instanceof RegExp) ||
			(x instanceof String && y instanceof String) ||
			(x instanceof Number && y instanceof Number)) {
			return x.toString() === y.toString();
		}

		// At last checking prototypes as good as we can
		if (!(x instanceof Object && y instanceof Object)) {
			return false;
		}

		if (x.isPrototypeOf(y) || y.isPrototypeOf(x)) {
			return false;
		}

		if (x.constructor !== y.constructor) {
			return false;
		}

		if (x.prototype !== y.prototype) {
			return false;
		}

		// Check for infinitive linking loops
		if (leftChain.indexOf(x) > -1 || rightChain.indexOf(y) > -1) {
			return false;
		}

		// Quick checking of one object being a subset of another.
		// todo: cache the structure of arguments[0] for performance
		for (p in y) {
			if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
				return false;
			}
			else if (typeof y[p] !== typeof x[p]) {
				return false;
			}
		}

		for (p in x) {
			if (y.hasOwnProperty(p) !== x.hasOwnProperty(p)) {
				return false;
			}
			else if (typeof y[p] !== typeof x[p]) {
				return false;
			}

			switch (typeof (x[p])) {
				case 'object':
				case 'function':

					leftChain.push(x);
					rightChain.push(y);

					if (!compare2Objects(x[p], y[p])) {
						return false;
					}

					leftChain.pop();
					rightChain.pop();
					break;

				default:
					if (x[p] !== y[p]) {
						return false;
					}
					break;
			}
		}

		return true;
	}

	if (arguments.length < 1) {
		return true; //Die silently? Don't know how to handle such case, please help...
		// throw "Need two or more arguments to compare";
	}

	for (i = 1, l = arguments.length; i < l; i++) {

		leftChain = []; //Todo: this can be cached
		rightChain = [];

		if (!compare2Objects(arguments[0], arguments[i])) {
			return false;
		}
	}

	return true;
}

/**
 * Transfer the values of the properties in objFrom to the properties in objTo. Recursive. 
 * If updateOnly=false (default), then properties that do exist only in objTo will be deleted. 
 * @param {object or array} objFrom 
 * @param {object or array} objTo 
 * @param {boolean} updateOnly If true, properties in objTo are not deleted when they do not exist in objFrom. Default: false 
 */
function propertyTransfer(objFrom, objTo, updateOnly=false){

	if (Array.isArray(objFrom)){

		if (!Array.isArray(objTo)){
			console.log('objTo was not of type array, but objFrom was. The property transfer would fail and thus is aborted.')
			return
		}

		// use pop and push to alter the length of the array. Note that we do not detect moved elements. We rather delete or add elements at the end and just transfer the values at each position. (Push is actually not needed, since assigning to elements outside the range is possible.)
		while (objTo.length>objFrom.length){
			objTo.pop();
		}
		/*
		let l = objTo.length; 
		for (let i=0;i<l-objFrom.length;i++){
			// delete the last elements
			objTo.pop();
		}*/

		// copy the elements
		for (let i=0;i<objFrom.length;i++){
			// pay attention to objects and arrays --> recursive calls needed
			if (typeof(objFrom[i])=='object'){
				// since typeof(null)=object, we have to handle this separately here
				if (objTo[i]===null){
					objTo[i] = objFrom[i];
				} else if (typeof(objTo[i])!='object'){
					// if this is not done here and if objTo[i] is just a property, the recursive call on propertyTransfer will not occur byReference, as it must be to work.
					if (Array.isArray(objFrom[i])){
						objTo[i] = [];
					} else {
						objTo[i] = {};
					}
				} else {
					// typeof(null)=object; therefore
					// is it of the same type? otherwise reset the element in objTo
					if (Array.isArray(objTo[i]) && !Array.isArray(objFrom[i])){
						objTo[i] = {};
					} else if (!Array.isArray(objTo[i]) && Array.isArray(objFrom[i])){
						objTo[i] = [];
					}
				}
				propertyTransfer(objFrom[i], objTo[i], updateOnly);
			} else {
				objTo[i] = objFrom[i];
			}
		}
		
	} else {

		if (Array.isArray(objTo)){
			console.log('objTo was of type array, but should be a normal object as objFrom. The property transfer would fail and thus is aborted.')
			return
		}

		// is a regular object
		// copy new to objTo
		for (let prop in objFrom){
			if (typeof(objFrom[prop])=='object' && objFrom[prop] != null){ // null interestingly is an object...

				if (!(prop in objTo)){
					if (Array.isArray(objFrom[prop])){
						objTo[prop] = [];
					} else {
						objTo[prop] = {};
					}
				} else {
					// is it of the same type? otherwise reset the property in objTo
					if ((typeof(objTo[prop])!='object' || Array.isArray(objTo[prop])) && !Array.isArray(objFrom[prop])){
						objTo[prop] = {};
					} else if ((typeof(objTo[prop])!='object' || !Array.isArray(objTo[prop])) && Array.isArray(objFrom[prop])){
						objTo[prop] = [];
					}
				}
				// transfer the property
				propertyTransfer(objFrom[prop], objTo[prop], updateOnly);
			} else {
				// just copy from/to
				// the problem is that if properties are added in the property transfer, using the simple assignement does not raise any observer set by Vue. Thus vue will not be updated! 
				objTo[prop] = objFrom[prop];

				// TEST: if the property is not available in objTo, do not assign it to a property, but use a method that is observed
				//objTo = Object.assign(objTo, {[prop]:objFrom[prop]}) // does not work

			}
		}
		// delete all properties in objTo, which are not present in objFrom
		if (!updateOnly){
			for (let prop in objTo){
				if (!(prop in objFrom)){
					delete objTo[prop];
				}
			}
		}
	}
}

export {uuidv4, copyObject, copyOwnPropertiesFrom, propertyTransfer, streamToString, streamToStringUTF8, streamToStringLatin1, compareObjects};