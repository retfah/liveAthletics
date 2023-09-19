import {pluginMongo} from './plugins.js';

export class dataProvider extends pluginMongo{
	constructor(name, logger, mongoDb){

        super(name, logger, mongoDb);

		// this object will be added to the list of dataProviders in the overview
		this.data = {
			name, 
			lastUpdated: null, 
			showAlternate: false, 
			directHyperlink: '', 
			meetings:[]
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