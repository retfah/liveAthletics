/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('runde', {
    xRunde: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Datum: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: '0000-00-00'
    },
    Startzeit: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '00:00:00'
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
    Status: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Speakerstatus: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    StatusZeitmessung: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    StatusUpload: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    QualifikationSieger: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    QualifikationLeistung: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    Bahnen: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    Versuche: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    Gruppe: {
      type: DataTypes.CHAR(2),
      allowNull: false,
      defaultValue: ''
    },
    xRundentyp: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    xWettkampf: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    nurBestesResultat: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'n'
    },
    StatusChanged: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'y'
    },
    Endkampf: {
      type: DataTypes.ENUM('0','1'),
      allowNull: false,
      defaultValue: '0'
    },
    Finalisten: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '8'
    },
    FinalNach: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '3'
    },
    Drehen: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '3'
    },
    StatusUploadUKC: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    }
  }, {
    tableName: 'runde'
  });
};
