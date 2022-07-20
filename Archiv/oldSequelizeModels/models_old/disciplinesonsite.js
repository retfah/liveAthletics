/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('disciplinesonsite', {
    xDisciplinesOnSite: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xSite: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'sites',
        key: 'xSite'
      }
    },
    xDiscipline: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'disciplines',
        key: 'xDiscipline'
      }
    }
  }, {
    tableName: 'disciplinesonsite'
  });
};
