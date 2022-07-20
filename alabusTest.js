//alabusTest

// IMPORTANT: Actually, it would make sense that baseData is not stored within the meeting, but on the server. But this does NOT work i.a. for data protection reasons: It is likely that in some countries you have meeting or user specific data; the this data cannot be stored server wide, where everybody has access! Or make sure that only the users of some meetings have access. Eventually this can be ensured when clients have generally no direct access to the server-wide base data, but only access it through a room in the meeting. Direct access would be restricted to server admins. --> How to do update the stammdaten then? Eventuelly also through the meeting room.  

import https from 'https';
import fs from 'fs';
import zlib from 'zlib';
import {pipeline} from 'stream/promises';
import {parseStringPromise} from 'xml2js';


// something completely different: get Data from alabus! Works so far!
var options = {
	host: 'alabus.swiss-athletics.ch',
	port: 443,
	path: '/rest/License/Athletica/ExportStammDataFull',
	//method: 'GET', // not necessary when https.get is used
	headers: {
		authorization: "Basic " + Buffer.from("121832:struppi1").toString('base64'),// base64(username:pw)}
		connection: 'close'
	}
} 

let request = https.get(options);

request.on('error', (e)=>{
	console.log("Got error: " + e.message);
})
request.on('response', (res)=>{
	// first, simply store the compressed data (e.g. interesting for debugging to have the data file, but in the smaller, compressed version)
	
	// two pipelines in parallel:
	// storing to file (for debugging purposes)
	pipeline(res, fs.createWriteStream("StammdatenNode.gz"))
	// ungzip and import: 
	pipeline(res, zlib.createGunzip(), streamToString).then((xmlString)=>{
		// parse the xml (might take some time...)
		parseStringPromise(xmlString, {explicitArray:false,}).then((xml)=>{
			// TODO: implement here the actual import

			// for the moment: create mysql create code for the first n athletes
			let n = 1000;
			let inscriptionIndex = 100; // the first index to assign to the inscription entry
			let insertInscriptions = 'insert into inscriptions ("xInscription", "xCategory") values \n';
			let insertAthletes = 'insert into athletes ("lastname", "forename", "birthdate", sex, xClub, license, xRegion, xInscription) values \n';
			let athletes = xml.watDataset.athletes.athlete;
			for (let i=0; i<Math.min(n,athletes.length); i++){

				let ath = athletes[i];

				// for the category, simply differentiate male --> MAN and female --> WOM
				let xCategory=1;
				let sex = 'm';
				if (ath.sex=="W"){
					sex = 'f';
					xCategory = 7;
				}

				// create the birthdate
				let dates = ath.birthDate.split('.');
				let birthdate = dates[2] + '-' + dates[0] + '-' + dates[1];

				// club: the club is currently fixed:
				let xClub = 636;

				// region: currently fixed to SUI
				let xRegion = 1;

				insertInscriptions += `(${inscriptionIndex}, ${xCategory}),\n`
				insertAthletes += `("${ath.lastName}", "${ath.firstName}", "${birthdate}", "${sex}", ${xClub}, ${ath.$.license}, ${xRegion}, ${inscriptionIndex}),\n`;

				
				inscriptionIndex += 1;
			}

			insertInscriptions = insertInscriptions.slice(0,-3) + ";";
			insertAthletes = insertAthletes.slice(0,-3) + ";";

			/*console.log(insertInscriptions);
			console.log(insertAthletes);*/
			fs.writeFileSync('exampleAthletes.sql',`${insertInscriptions}\n${insertAthletes}`)
		})
	}) 

})

function streamToString (stream) {
	const chunks = [];
	return new Promise((resolve, reject) => {
	  stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
	  stream.on('error', (err) => reject(err));
	  stream.on('end', () => {
		  resolve(Buffer.concat(chunks).toString('latin1'));
		});
	})
  }