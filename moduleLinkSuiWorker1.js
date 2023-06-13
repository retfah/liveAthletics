// (future: download and) parse the XML received from swiss athletics in a separate thread in order not to block the main thread for e.g. 20s

import {
    Worker, isMainThread, parentPort, workerData
    } from 'node:worker_threads';
import {parseString} from 'xml2js';
const xmlString = workerData;

console.log(`Worker thread started`); // :${xmlString.slice(0,1000)} avoid showing the whole string since it is way too long
parseString(xmlString, {explicitArray:false,}, (err, result)=> {
    console.log(`Parsed successfully in worker thread`);
    parentPort.postMessage(result);
}) 