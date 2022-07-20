/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('anmeldung', {
    xAnmeldung: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Startnummer: {
      type: DataTypes.INTEGER(5).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    Erstserie: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'n'
    },
    Bezahlt: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'y'
    },
    Gruppe: {
      type: DataTypes.CHAR(2),
      allowNull: false,
      defaultValue: ''
    },
    BestleistungMK: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    Vereinsinfo: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: ''
    },
    xAthlet: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0',
      references: {
        model: 'athlet',
        key: 'xAthlet'
      }
    },
    xMeeting: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    xKategorie: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    },
    xTeam: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    BaseEffortMK: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'n'
    },
    Anmeldenr_ZLV: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    KidID: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    },
    Angemeldet: {
      type: DataTypes.ENUM('y','n'),
      allowNull: true,
      defaultValue: 'n'
    },
    VorjahrLeistungMK: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      defaultValue: '0'
    }
  }, {
    tableName: 'anmeldung'
  });
};
