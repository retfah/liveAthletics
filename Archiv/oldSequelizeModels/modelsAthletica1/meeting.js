/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('meeting', {
    xMeeting: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Name: {
      type: DataTypes.STRING(60),
      allowNull: false,
      defaultValue: ''
    },
    Ort: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: ''
    },
    DatumVon: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: '0000-00-00'
    },
    DatumBis: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    Nummer: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: ''
    },
    ProgrammModus: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      defaultValue: '0'
    },
    Online: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'y'
    },
    Organisator: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: ''
    },
    Zeitmessung: {
      type: DataTypes.ENUM('no','omega','alge'),
      allowNull: false,
      defaultValue: 'no'
    },
    Passwort: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    xStadion: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    xControl: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Startgeld: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    StartgeldReduktion: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    Haftgeld: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    Saison: {
      type: DataTypes.ENUM('','I','O'),
      allowNull: false,
      defaultValue: ''
    },
    AutoRangieren: {
      type: DataTypes.ENUM('n','y'),
      allowNull: false,
      defaultValue: 'n'
    },
    UKC: {
      type: DataTypes.ENUM('y','n'),
      allowNull: true,
      defaultValue: 'n'
    },
    StatusChanged: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'y'
    }
  }, {
    tableName: 'meeting'
  });
};
