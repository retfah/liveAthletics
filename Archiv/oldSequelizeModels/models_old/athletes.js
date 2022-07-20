/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('athletes', {
    xAthlete: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
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
    xClub: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'clubs',
        key: 'xClub'
      }
    },
    license: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    licenseType: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    xCountry: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: '',
      references: {
        model: 'countries',
        key: 'xCountry'
      }
    },
    xRegion: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      references: {
        model: 'regions',
        key: 'xRegion'
      }
    }
  }, {
    tableName: 'athletes'
  });
};
