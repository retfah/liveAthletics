import { dataProvider } from "./dataProvider.js";
import https from 'https';
import { pipeline } from 'stream/promises';
import {streamToString} from './common.js';
import {parseStringPromise} from 'xml2js';

/**
 * get the list of competitions from the seltec server. 
 * Problem: sometimes the server responds very slow or there is even an ETIMEDOUT error. Potentially, the server might also dislike many requests at the same time. Therefore, we should (1), limit the number of requests per time, (2) try to store older data (i.e. a meeting in the past will hardly change again and does not need an update every few minutes) and (3) make sure that errors lead to a retry of this request. 
 * - read past, current, upcoming with different intervals
 * - internally use two lists: past (will hardly change over the day), and upcoming+current (might change during the day)
 * - the
 */
export class laportal extends dataProvider{
	constructor(logger, mongoDb){
		super('laportal', logger, mongoDb);

		this.data.directHyperlink = "https://slv.laportal.net/Competitions/Current";

		// define separate intervals
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

	merge(){
		this.data.meetings = [...this.meetingsCurrent, ...this.meetingsPast, ...this.meetingsUpcoming];
		if (this.errorCurrent || this.errorPast || this.errorUpcoming){
			this.data.showAlternate=true;
		} else {
			this.data.showAlternate=false;
		}
	}

	// only does the actual request and either returns the resultstream, or returns (! not rejects) with the error
	async request(path){
		return new Promise((resolve, reject)=>{
			let request = https.get(path);

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

		return pipeline(res, streamToString).then((s)=>{
			//console.log(s);
			return parseStringPromise(s, {strict:false, explicitCharkey:true})
		}).then((dom)=>{ 
			//console.log(dom);
			let meetings = [];
			for (let tr of dom.HTML.BODY[0].SECTION[0].DIV[0].SECTION[0].TABLE[0].TBODY[0].TR){
				let dateStr = tr.TD[0].A[0].TIME[0]._; // in the format "17. Sep 2023"
				let href = "https://slv.laportal.net" + tr.TD[0].A[0].$.HREF;
				let date = new Date(dateStr);
				// meetings with/out CIS do have a slightly different structure (one div in between) 
				let name;
				if (tr.TD[1].A===undefined){
					// CIS meeting
					tr.TD[1].DIV[0].A[0]._.trim();

				} else {
					name = tr.TD[1].A[0]._.trim();
				}
				meetings.push({
					name, 
					dateFrom: date, 
					dateTo: date, 
					place: tr.TD[2].A[0]._.trim(), 
					source: 'seltec', 
					hyperlink: href,
				})

			}
			
			let UL = dom.HTML.BODY[0].SECTION[0].DIV[0].SECTION[0].DIV[0].DIV[0].UL[0];
			let numPages = parseInt(UL.LI[UL.LI.length-1].A[0]._.trim());
			this.logger.log(97, `${path} processed. Totally ${numPages} pages present.`);
            //console.log(meetings);
			// finally resolve
			return {meetings, numPages}
		}).catch((err)=>{
			throw(err);
		})

	}

	async updateCurrentData(){
		// do not update while another update is currently done
		if (this.updatingCurrent){
			return
		}
		this.updatingCurrent = true;
		return this.getMeetings('https://slv.laportal.net/Competitions/Current').then((m)=>{
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
		return this.getMeetings('https://slv.laportal.net/Competitions/Upcoming').then((m)=>{
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
		return this.getMeetings('https://slv.laportal.net/Competitions/Past').then((m)=>{
			this.errorPast = false;
			this.meetingsPast = m;
			this.merge();
			this.dataUpdated();
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
			let x = await this.getParsedFile(path+`?page=${i}`)
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