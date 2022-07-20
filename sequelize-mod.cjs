
// functions needed together with sequelize

// creates the Asscociatios, that are currently (04.2018) not set correctly
// when sequelize-auto-importer is used to generate the models, as the 'reference' property 
// in the models is no longer supported for setting the references from one to another
// model (DB-table)
function correctAssociations(models){
    // @param: models: the models array returned from sequelized-auto-import
    // iterate over all models and add their relations and add them where applicable
    for (var model of Object.getOwnPropertyNames(models)){
        console.log(model);
      for (var prop of Object.getOwnPropertyNames(models[model].rawAttributes)){
        var ref = models[model].rawAttributes[prop].references;
        if (ref){ // would be undesfined if it does not exist
          models[model].belongsTo(models[ref.model], {foreignKey: ref.key});
          models[ref.model].hasMany(models[model], {foreignKey: ref.key});
        }
      }
    }
  }

// CommonJS (Node-"legacy") notation
module.exports = correctAssociations
//  export everything in ecmascript syntax
//export default {correctAssociations};
//export {correctAssociations}
