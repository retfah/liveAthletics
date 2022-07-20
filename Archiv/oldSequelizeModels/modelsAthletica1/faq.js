/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('faq', {
    xFaq: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Frage: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    Antwort: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    Zeigen: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'y'
    },
    PosTop: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    PosLeft: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    height: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    width: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Seite: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    Sprache: {
      type: DataTypes.CHAR(2),
      allowNull: false,
      defaultValue: ''
    },
    FarbeTitel: {
      type: DataTypes.STRING(6),
      allowNull: false,
      defaultValue: 'FFAA00'
    },
    FarbeHG: {
      type: DataTypes.STRING(6),
      allowNull: false,
      defaultValue: 'FFCC00'
    }
  }, {
    tableName: 'faq'
  });
};
