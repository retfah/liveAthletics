/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('serie', {
    xSerie: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Bezeichnung: {
      type: DataTypes.CHAR(2),
      allowNull: false,
      defaultValue: ''
    },
    Wind: {
      type: DataTypes.STRING(5),
      allowNull: true,
      defaultValue: ''
    },
    Film: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    Status: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Handgestoppt: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    xRunde: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    xAnlage: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    TVName: {
      type: DataTypes.STRING(70),
      allowNull: true
    },
    MaxAthlet: {
      type: DataTypes.INTEGER(3),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'serie'
  });
};
