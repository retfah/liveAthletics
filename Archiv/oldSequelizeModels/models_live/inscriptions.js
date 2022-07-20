/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('inscriptions', {
    xInscription: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xMeeting: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'meetings',
        key: 'xMeeting'
      }
    },
    xCategory: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'categories',
        key: 'xCategory'
      }
    },
    number: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    athleteName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    athleteForename: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    birthday: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: '1900-01-01'
    },
    sex: {
      type: DataTypes.ENUM('f','m'),
      allowNull: true,
      defaultValue: 'f'
    },
    club: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    countryRegion: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    xAthlete: {
      type: DataTypes.INTEGER(11),
      allowNull: true
    }
  }, {
    tableName: 'inscriptions'
  });
};
