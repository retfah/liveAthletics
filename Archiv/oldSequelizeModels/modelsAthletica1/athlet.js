/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('athlet', {
    xAthlet: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    Vorname: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    Jahrgang: {
      type: "YEAR(4)",
      allowNull: true
    },
    xVerein: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    xVerein2: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Lizenznummer: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Geschlecht: {
      type: DataTypes.ENUM('m','w'),
      allowNull: false,
      defaultValue: 'm'
    },
    Land: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: ''
    },
    Geburtstag: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: '0000-00-00'
    },
    Athleticagen: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'n'
    },
    Bezahlt: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'n'
    },
    xRegion: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Lizenztyp: {
      type: DataTypes.INTEGER(2),
      allowNull: false,
      defaultValue: '0'
    },
    Manuell: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      defaultValue: '0'
    },
    Adresse: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Plz: {
      type: DataTypes.INTEGER(6),
      allowNull: true,
      defaultValue: '0'
    },
    Ort: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Email: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'athlet'
  });
};
