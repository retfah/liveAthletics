import {pluginMongo} from './plugins.js';

export class dataProvider extends pluginMongo{
	constructor(name, logger, mongoDb, currentRangeFrom, currentRangeTo){

        super(name, logger, mongoDb);

		this.currentRangeFrom = currentRangeFrom;
		this.currentRangeTo = currentRangeTo;

		// this object will be added to the list of dataProviders in the overview
		this.data = {
			name, 
			lastUpdated: null, 
			showAlternate: false, 
			directHyperlink: '', 
			meetings:[], // items: {name (string), dateFrom (date), dateTo (date), place (string),source (string), hyperlink (string) }
			meetingsCurrent:[], // items as above, but only the current items; this is used to increase the speed of loading, since only those elements will be rendered at first
		};
	}

	dataUpdated(){
		this.data.lastUpdated = new Date();
	}

	// to be implemented by the inheritign class
	updateData(){

	}

	// potentially implemented by the inheritign class, e.g. to stop a timeout or interval
	destructor(){

	}
}