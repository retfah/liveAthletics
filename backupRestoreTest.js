// test backup and restore, using the command line to run mongodump / mongorestore and mysqldump 

import {spawn} from 'child_process';
import conf from './conf.js';
import fs from 'fs';
import { readFile, writeFile } from 'fs/promises';
import zlib from 'zlib';
import { promisify } from 'util';
const doGZip = promisify(zlib.gzip);
const doGUnzip = promisify(zlib.gunzip);

// ...
// TODO: add UN (-u) and PW (-p)
// out can be "-", which is stdout!
// --gzip
// -out or --archive ? Archive creates one file, while -out is actually a folder structure, replicating DB/collection/...
// for out we need to arguments --out "file"
// for archive it is just one: "--archive=file"
var args = ['--host', `${conf.databaseMongo.host}:${conf.databaseMongo.port}` , '--db', 'administration', '--archive=C:/Users/Reto/Documents/Reto/Programmieren/liveAthletics/mongodump.gz', '--gzip'] // '--collection', 'test'
let mongoDumpProm = new Promise((resolve, reject)=>{
    var mongodump = spawn('mongodump', args);
    mongodump.stdout.on('data', function (data) {
        console.log('stdout: ' + data);
    });
    mongodump.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });
    mongodump.on('exit', function (code) {
        console.log('mongodump exited with code ' + code);
        if (code==0){
            console.log('mongoDumpDone')
            resolve();
        }else {
            reject();
        }
    });
})


  
// dump sql-db
let dbString = "a2dbdisz"; // TODO: change
args = ['--port', conf.database.port, '--host', conf.database.host, `--password=${conf.database.password}`, `--user=${conf.database.username}`, dbString, "--result-file=C:/Users/Reto/Documents/Reto/Programmieren/liveAthletics/mysqldump.sql"]
let mysqlDumpProm = new Promise((resolve, reject)=>{
	var mysqldump = spawn('C:/Program Files/MariaDB 10.6/bin/mariadb-dump', args)
	mysqldump.stdout.on('data', function (data) {
    	console.log('mysqldump stdout: ' + data);
	});
  	mysqldump.stderr.on('data', function (data) {
    	console.log('mysqldump stderr: ' + data);
  	});
  	mysqldump.on('exit', function (code) {
    	console.log('mysqldump exited with code ' + code);
    	if (code==0){
    		console.log('mysqlDumpDone')
    		resolve();
    	} else {
    		reject();
    	}
  	});
})

await Promise.all([mongoDumpProm, mysqlDumpProm])
console.log('all dumps done')


// works so far

// read files
let fileSql = await readFile("C:/Users/Reto/Documents/Reto/Programmieren/liveAthletics/mysqldump.sql"); // return a buffer

// gzip the sql data
let fileZipped = await doGZip(fileSql);

let dataSentSql = JSON.stringify(fileZipped);
let fileContentReceivedSqlZipped = Buffer.from(JSON.parse(dataSentSql));
let fileContentReceivedSql = await doGUnzip(fileContentReceivedSqlZipped);
// actually, writing is not necessary
await writeFile("C:/Users/Reto/Documents/Reto/Programmieren/liveAthletics/mysqldumpReceived.sql", fileContentReceivedSql)


// Mongo:
let fileMongo = await readFile("C:/Users/Reto/Documents/Reto/Programmieren/liveAthletics/mongodump.gz");
let dataSentMongo = JSON.stringify(fileMongo);
let fileContentReceivedMongo = Buffer.from(JSON.parse(dataSentMongo));
await writeFile("C:/Users/Reto/Documents/Reto/Programmieren/liveAthletics/mongodumpReceived.gz", fileContentReceivedMongo)

// TODO: for the backup file, include some background data, e.g. the server version (and the version of the DB)