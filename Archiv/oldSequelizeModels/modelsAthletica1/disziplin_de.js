/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('disziplin_de', {
    xDisziplin: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Kurzname: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: '',
      unique: true
    },
    Name: {
      type: DataTypes.STRING(40),
      allowNull: false,
      defaultValue: ''
    },
    Anzeige: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '1'
    },
    Seriegroesse: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    Staffellaeufer: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    Typ: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Appellzeit: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '00:00:00'
    },
    Stellzeit: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '00:00:00'
    },
    Strecke: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    Code: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    xOMEGA_Typ: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    aktiv: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'y'
    }
  }, {
    tableName: 'disziplin_de'
  });
};
