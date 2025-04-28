import { dataProvider } from "./dataProvider.js";
import https from 'https';
//import http from 'http';
import { pipeline } from 'stream/promises';
import {streamToStringUTF8} from './common.js';
import {parseStringPromise} from 'xml2js';

/**
 * get the list of competitions from the seltec server. 
 * Problem: sometimes the server responds very slow or there is even an ETIMEDOUT error. Potentially, the server might also dislike many requests at the same time. Therefore, we should (1), limit the number of requests per time, (2) try to store older data (i.e. a meeting in the past will hardly change again and does not need an update every few minutes) and (3) make sure that errors lead to a retry of this request. 
 * - read past, current, upcoming with different intervals
 * - internally use three separate lists: past (will hardly change over the day), and upcoming+current (might change during the day)
 * - whenever one of the lists is updated, all three lists get merged to be delivered to the client as one list
 * - the past list is stored to mongoDB when finished, since it takes long to regenerate (in order to be instantly ready with some data)
 * - on startup, the list is loaded from MongoDB and replaced ("updated") as soon as grabbing past has finished.
 */
export class laportal extends dataProvider{
	constructor(logger, mongoDb, currentRangeFrom, currentRangeTo){
		super('laportal', logger, mongoDb, currentRangeFrom, currentRangeTo);

		this.baseUrl = "https://slv.laportal.net";
		this.data.directHyperlink = this.baseUrl + "/Competitions/Current";

		// define separate intervals
		// ATTENTION: make sure that the lowest value is reasonably low (e.g. 300), since meetingsCurrent shall always represent the current date, but only gets updated whenever an interval is updated.
		this.tIntervalPast = 24*3600; // in s
		this.tIntervalCurrent = 60; // in s
		this.tIntervalUpcoming = 120; // in s

		this.errorCurrent = false;
		this.errorPast = false;
		this.errorUpcoming = false;

		this.meetingsCurrent = [];
		this.meetingsUpcoming = [];
		this.meetingsPast = [];

		// store a variable to make sure we do not start updating if another update is still going on
		this.updatingCurrent = false;
		this.updatingUpcoming = false;
		this.updatingPast = false;

		// initial creation of data
		this.updateCurrentData();
		this.updatePastData();
		this.updateUpcomingData();

		// start intervals for future updates
		this.intervalPast = setInterval(this.updatePastData.bind(this), this.tIntervalPast*1000);
		this.intervalCurrent = setInterval(this.updateCurrentData.bind(this), this.tIntervalCurrent*1000);
		this.intervalUpcoming = setInterval(this.updateUpcomingData.bind(this), this.tIntervalUpcoming*1000);
	}

	async onMongoConnected(){
		// get the data for the past meetings, to avoid waiting for a long time until all pages are up to date

		// initially load the data from Mongo
		// get the list of currently checked out writing tickets
		let len = await this.collection.countDocuments({type:'data'}) // returns a cursor to the data
		if (len>1){
			let errMsg = "Too many documents with type:'data' for laportalMeetings";
			this.logger.log(3, errMsg);
			throw new Error(errMsg);

		} else if(len==0) {
			// create new document of type  with the newly created ID:
			this.dataProviders = [];
			await this.collection.insertOne({type:'data', past:[]})

		} else {
			// everything normal:
			let cursor = await this.collection.find({type:'data'}) // returns a cursor to the data
			let doc = await cursor.next();
			this.meetingsPast = doc.past;
			this.merge();
		}
	}

	async storePast(){
		try {
			await this.collection.updateOne({type:'data'}, {$set:{past: this.meetingsPast}})
		} catch (e){
			this.logger.log(3, `Error in MongoDB during storeData in laportalMeetings`)
			throw e;
		}   
	}

	merge(){
		// we need to remove duplicates
		let m = [...this.meetingsCurrent, ...this.meetingsPast, ...this.meetingsUpcoming];
		this.data.meetings = m.sort((a,b)=>{
			if (a.hyperlink===b.hyperlink){
				return 0
			} else if (a.hyperlink<b.hyperlink) {
				return -1
			}
			return 1
		}).filter((item, pos, a)=>{
			// remove when equal to previous element
			return !pos || item.hyperlink != a[pos - 1].hyperlink;
		})
		
		if (this.errorCurrent || this.errorPast || this.errorUpcoming){
			this.data.showAlternate=true;
		} else {
			this.data.showAlternate=false;
		}

		// create meetingsCurrent
		// NOTE: it will use the current date in the server time zone!
		// first, create the daterange to filter
		let now = new Date();

		// this approach is needed to make sure that the date is in UTC time zone, i.e. hours and smaller are =0
		let dFrom = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()+this.currentRangeFrom));
		let dTo = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()+this.currentRangeTo));

		this.data.meetingsCurrent = this.data.meetings.filter(x=> {
			return !(x.dateFrom>dTo || x.dateTo<dFrom);
		});
	}

	// only does the actual request and either returns the resultstream, or returns (! not rejects) with the error
	async request(path){
		return new Promise((resolve, reject)=>{
			const options = {
				headers:{
					'User-Agent': 'RetoIndex',
				}
			}
			let request = https.get(path, options);

			request.on('error', (e)=>{
				resolve(e);
			})
			request.on('response', (res)=>{
				resolve(res);
			})
		})
	}

	// resolves after t seconds
	async wait(t){
		return new Promise(res=>{
			setTimeout(()=>res(), t*1000)
		})
	}

	async getParsedFile(path){

		// retry n-times, after a timeout of n*t, to get the file from the server, then process it.
		let n = 50;
		let t = 1; // s
		// total wait time until failure = n*t/2 (the total duration is larger by n*the duration until error)
		let attempt = async (i, n)=>{
			let s = await this.request(path);
			if (!(s instanceof Error)){
				return s;
			}else{
				//try again, if there are attempty remaining
				if (i<n){
					await this.wait((i+1)*t);
					return attempt(i+1,n);
				} else {
					throw(`Getting ${path} considered failed after ${n} attempts.`)
				}
			} 
		}
		const res = await attempt(0,n);

		// parse the html
		
		if (res.statusCode != 200){
			throw(`Server responded with code ${res.statusCode} and message ${res.statusMessage}`);
		}

		return pipeline(res, streamToStringUTF8).then((s)=>{
			//console.log(s);
			return parseStringPromise(s, {strict:false, explicitCharkey:true})
		}).then((dom)=>{ 
			//console.log(dom);
			let meetings = [];
			for (let tr of dom.HTML.BODY[0].SECTION[0].DIV[1].SECTION[0].TABLE[0].TBODY[0].TR){
				if (tr.TD[0]._ == 'No competitions found'){
					// following stuff would fail if there are no competitions
					return {meetings, numPages:1}
				}
				let dateStr = tr.TD[0].A[0].TIME[0]._; // in the format "17. Sep 2023"
				var dateTo, dateFrom;
				if (dateStr.indexOf('-')==-1){
					dateTo = new Date(dateStr + " Z"); // zulu time
					dateFrom = dateTo;
				} else {
					// we split at the - 
					let sArr = dateStr.split('-');
					// the second part is always a regular date
					dateTo = new Date(sArr[1]  + " Z");// zulu time
					
					// if the text is in german, then Mrz, Mai, Okt, Dez do not work!

					// if the first part contains anything else than numbers, then it contains also the month; if it also contains the year (havent seen that so far), then it also is a regular date
					// possible formats:
					//  "03 "  (3 letters)--> just the date
					// "30 Sep " (7 letters) --> date and month
					// "31 Dec 2023 " (12 letters) --> date, month and year
					if (sArr[0].length<=4){
						// only date
						dateFrom = new Date(dateTo);
						dateFrom.setDate(parseInt(sArr[0].trim().slice(0,2)));
					} else if (sArr[0].length==12){
						// interpret as full date
						dateFrom = new Date(sArr[0]  + " Z"); // zulu time
					} else {
						// date and month given; add the year and let it be interpreted
						dateFrom = new Date(sArr[0] + sArr[1].substr(-4)  + " Z"); // zulu time
					}

				}
				if (isNaN(dateTo)){
					this.logger.log(50, `laportal meetings: could not process dateTo ${dateStr}.`);
				}
				if (isNaN(dateFrom) ){
					this.logger.log(50, `laportal meetings: could not process dateFrom ${dateStr}.`);
				}
				// add the timezoneOffset to make sure the dates are correct in UTC with zero time (midnight)

				let href = this.baseUrl + tr.TD[0].A[0].$.HREF;

				// meetings with/out CIS do have a slightly different structure (one div in between) 
				let name;
				if (tr.TD[1].A===undefined){
					// CIS meeting
					name = tr.TD[1].DIV[0].A[0]._.trim();
				} else {
					name = tr.TD[1].A[0]._.trim();
				}
				meetings.push({
					name, 
					dateFrom: dateFrom, 
					dateTo: dateTo, 
					place: (tr.TD[2].A[0]._ ?? '').trim(), // if place is empty, _ is undefined and trim qould cause an error.
					source: 'seltec', 
					hyperlink: href,
				})

			}
			
			let UL = dom.HTML.BODY[0].SECTION[0].DIV[1].SECTION[0].DIV[0].DIV[0].UL[0];
			let numPages = parseInt(UL.LI[UL.LI.length-1].A[0]._.trim());
			this.logger.log(97, `${path} processed. Totally ${numPages} pages present.`);
			
			// finally resolve
			return {meetings, numPages}
		}).catch((err)=>{
			this.logger.log(20, err);
			throw(err);
		})

	}

	async updateCurrentData(){
		// do not update while another update is currently done
		if (this.updatingCurrent){
			return
		}
		this.updatingCurrent = true;
		// lang=en is needed to process the written dates
		return this.getMeetings(this.baseUrl + '/Competitions/Current?lang=en').then((m)=>{
			this.errorCurrent = false;
			this.meetingsCurrent = m;
			this.merge();
			this.dataUpdated();
		}).catch((err)=>{
			this.logger.log(20, `Error while parsing Seltec current page: ${err}`)
			this.errorCurrent = true;
		}).then(()=>{
			this.updatingCurrent = false;
		})
	}

	async updateUpcomingData(){
		// do not update while another update is currently done
		if (this.updatingUpcoming){
			return;
		}
		this.updatingUpcoming = true;
		// lang=en is needed to process the written dates
		return this.getMeetings(this.baseUrl + '/Competitions/Upcoming?lang=en').then((m)=>{
			this.errorUpcoming = false;
			this.meetingsUpcoming = m;
			this.merge();
			this.dataUpdated();
		}).catch((err)=>{
			this.logger.log(20, `Error while parsing Seltec upcoming page: ${err}`)
			this.errorUpcoming = true;
		}).then(()=>{
			this.updatingUpcoming = false;
		})
	}

	async updatePastData(){
		// do not update while another update is currently done
		if (this.updatingPast){
			return
		}
		this.updatingPast = true;
		// lang=en is needed to process the written dates
		return this.getMeetings(this.baseUrl + '/Competitions/Past?lang=en').then((m)=>{
			this.errorPast = false;
			this.meetingsPast = m;
			this.merge();
			this.dataUpdated();
			this.storePast().catch(()=>{});
		}).catch((err)=>{
			this.logger.log(20, `Error while parsing Seltec past page: ${err}`)
			this.errorPast = true;
		}).then(()=>{
			this.updatingPast = false;
		})
	}

	async getMeetings(path){
		// first, get the meetings on the base path, which is assumed to be page 1:
		let {meetings, numPages} = await this.getParsedFile(path)
		for (let i=2; i<=numPages; i++){
			let x = await this.getParsedFile(path+`&page=${i}`); //assumes that there is another parameter before, e.g. "?lang=en"
			meetings.push(...x.meetings);
		}
		return meetings;
	}

	destructor(){
		clearInterval(this.intervalCurrent);
		clearInterval(this.intervalUpcoming);
		clearInterval(this.intervalPast);
		this.intervalCurrent = null;
		this.intervalPast = null;
		this.intervalUpcoming = null;
	}
}