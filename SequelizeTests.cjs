/* -----------------
this file needs the following modules:
- sequelize
- sequelize-auto-import
- (sequlize-auto is used for generating the models automatically from the mysql-DB)


------------------*/

// imports:
const Sequelize = require('sequelize');
var DataTypes = require('sequelize/lib/data-types'); // included in sequelize package

debugger;

// try to connect to DB, load some data and write some others
const sequelize = new Sequelize('athletica', 'athletica', 'athletica', {
    dialect: 'mysql',
    host: "localhost",
    port: 3306,
    operatorsAliases: false,
    // application wide model options: 
    define: {
      timestamps: false // we generally do not want timestamps in the database in every record, or do we?
    }
  })

var t3=3;

// test the connection:
sequelize
  .authenticate()
  .then(() => {
    console.log('Connection has been established successfully.');
    rest(); // rest cannot be called prior to successfully opening the connection
  })
  .catch(err => {
    console.error('Unable to connect to the database:', err);
  });



function rest(){

  

// import all models
var models = require('sequelize-auto-import')(sequelize, __dirname+'/modelsAthletica1');


// create references ("Associations") between the tables

// creates the Asscociatios, that are currently (04.2018) not set correctly
// when sequelize-auto is used to generate the models, as the 'reference' property 
// in the models is no longer supported for setting the references from one to another
// model (DB-table)
function correctAssociations(models){
  // @param: models: the models array returned from sequelized-auto-import
  // iterate over all models and add their relations and add them where applicable
  for (var model of Object.getOwnPropertyNames(models)){
    for (var prop of Object.getOwnPropertyNames(models[model].rawAttributes)){
      var ref = models[model].rawAttributes[prop].references;
      if (ref){ // would be undesfined if it does not exist
        models[model].belongsTo(models[ref.model], {foreignKey: ref.key});
        models[ref.model].hasMany(models[model], {foreignKey: ref.key});
      }
    }
  }
}
correctAssociations(models)


// entweder:
async function test(){
  console.log(t3);
  //var res = await models.anmeldung.findOne({attributes: ['Startnummer', ['BestleistungMK', 'BMK'], 'athlet.Name', 'athlet.Vorname'], where: {xAnmeldung:22903}, include:[{model:models.athlet}]}).then(element => console.log(element)).catch((err)=>{console.log("There was an error: " & err)});
  // attributes: ['Startnummer', ['BestleistungMK', 'BMK']], // with attributes we can select the columns and can also rename them by entering an array with two values 
  //res.forEach(element => console.log(element));

  //var res = await models.start.findOne({attributes: ['xStart', ['Bestleistung', 'BestLst'], 'xAnmeldung', 'anmeldung.Startnummer'], where: {xStart:45052}, include:[{model:models.anmeldung}]}).then(element => console.log(element)).catch((err)=>{console.log("There was an error: " & err)});
  var res = await models.start.findOne({attributes: ['xStart', ['Bestleistung', 'BestLst']], where: {xStart:45052}, include:[{model:models.anmeldung, attributes:['xAnmeldung', 'Startnummer'],include:[{model:models.athlet, attributes:['xAthlet','Name', 'Vorname']}]}]}).then(element => {
    /*t3=element;
    element.Bestleistung = 10001;
    element.save();
    console.log(element);*/
    element.anmeldung.athlet.Name = 'Gasser';
    console.log(element);
    element.anmeldung.athlet.save().then(console.log('done')).catch((err)=>{console.log("There was an error: " & err)});
  }).catch((err)=>{console.log("There was an error: " & err)});

  console.log('here2');

  /*models.athlet.findOne({where:{xAthlet:9}}).then(ath =>{
    console.log(ath);
    ath.Name=ath.Name + '1';
    ath.save();
  })*/
};
test().then(()=>{console.log(t3);});

// oder:
//var res = models.accounts.findAll().then(accs => console.log(accs));


// raw queries example: 
sequelize.query("SELECT * FROM disziplin_de", { type: Sequelize.QueryTypes.SELECT}).then(myTableRows => {
  //console.log(myTableRows)
})


// there are several ways to get data from the DB, e.g. findById, findOne, findAll, ...
//var res = models.inscriptions.findById(3).then(data => {console.log(data.get())});
/*
// try to load an inscription with the meeting and the account for the meeting
// that's how deeper requests can be done:
var res = models.inscriptions.findOne({where: {xInscription: 3}, include: [{model: models.meetings, include: models.accounts}]}) 
  .then(inscr => {
    console.log(inscr.athleteName);
    if (inscr.athleteName = 'Suter'){
      inscr.athleteName = 'Muster';
    } else{
      inscr.athleteName = 'Suter';
    }
    inscr.save().then(()=>{console.log('success'); return false;}).catch((err) => {concole.log("ehat to catch: " + err)})
    }).catch(err =>{console.log(err)}); 
    // with catch, any error that occures is catched and does not lead to an application 
    // crash --> so this is extremely important that there is a catch function in a productive server, especially where
    // external sources can possibly define parts of the queries and thus might lead to an applicaiton crash!
  */
 }
  setTimeout(()=>{
    console.log();
  },1000)