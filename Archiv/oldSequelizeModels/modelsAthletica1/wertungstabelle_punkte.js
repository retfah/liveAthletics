/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('wertungstabelle_punkte', {
    xWertungstabelle_Punkte: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xWertungstabelle: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    xDisziplin: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Geschlecht: {
      type: DataTypes.ENUM('W','M'),
      allowNull: false,
      defaultValue: 'M'
    },
    Leistung: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    Punkte: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'wertungstabelle_punkte'
  });
};
