/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('zeitmessung', {
    xZeitmessung: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    OMEGA_Verbindung: {
      type: DataTypes.ENUM('local','ftp'),
      allowNull: false,
      defaultValue: 'local'
    },
    OMEGA_Pfad: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    OMEGA_Server: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    OMEGA_Benutzer: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    OMEGA_Passwort: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    OMEGA_Ftppfad: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    OMEGA_Sponsor: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    ALGE_Typ: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: ''
    },
    ALGE_Ftppfad: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    ALGE_Passwort: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    ALGE_Benutzer: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    ALGE_Server: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    ALGE_Pfad: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    ALGE_Verbindung: {
      type: DataTypes.ENUM('local','ftp'),
      allowNull: false,
      defaultValue: 'local'
    },
    xMeeting: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'zeitmessung'
  });
};
