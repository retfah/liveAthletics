/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('resultat', {
    xResultat: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Leistung: {
      type: DataTypes.INTEGER(9),
      allowNull: false,
      defaultValue: '0'
    },
    Info: {
      type: DataTypes.CHAR(5),
      allowNull: false,
      defaultValue: '-'
    },
    Punkte: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    xSerienstart: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'resultat'
  });
};
