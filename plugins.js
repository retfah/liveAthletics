
// presents two base classes for plugins, with and without mongo usage 

export class plugin{
	constructor(name, logger){
		this.name = name;
		this.logger = logger;
	}
}

export class pluginMongo extends plugin{
	constructor(name, logger, mongoDB){
		super(name, logger)
		this.mongoDB = mongoDB;
		this.collection;

		this.initMongo();
	}

	// to be overriden by the inheriting class, when Mongo is used
	async onMongoConnected(){

	}

	async initMongo(){

        try {
            // load Mongo stuff            
            this.collection = await this.mongoDB.collection(this.name);
            this.onMongoConnected();

        } catch (e){
            this.logger.log(3, e)
            throw e;
        }

    }

	// some example code for Mongo:

	// implement plugin-specific mongoStuff here
	/*async onMongoConnected(){
		// initially load the data from Mongo
		// get the list of currently checked out writing tickets
		len = await this.collection.countDocuments({type:'data'}) // returns a cursor to the data
		if (len>1){
			let errMsg = "Too many documents with type:'data' for slvCompetitionOverview";
			this.logger.log(3, errMsg);
			throw new Error(errMsg);

		} else if(len==0) {
			// create new document of type  with the newly created ID:
			this.dataProviders = [];
			await this.collection.insertOne({type:'data', data:this.dataProviders})

		} else {
			// everything normal:
			let cursor = await this.collection.find({type:'data'}) // returns a cursor to the data
			let doc = await cursor.next();
			this.dataProviders = doc.data;
		}
	}

	async storeData(){
		try {
			await this.collection.updateOne({type:'data'}, {$set:{data: this.dataProviders}})
		} catch (e){
			this.logger.log(3, `Error in MongoDB during storeData in slvCompetitionOverview`)
			throw e;
		}   
	}*/
}