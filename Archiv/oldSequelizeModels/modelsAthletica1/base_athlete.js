/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('base_athlete', {
    id_athlete: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    license: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    license_paid: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'y'
    },
    license_cat: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: ''
    },
    lastname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    firstname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    sex: {
      type: DataTypes.ENUM('m','w'),
      allowNull: false,
      defaultValue: 'm'
    },
    nationality: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: ''
    },
    account_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ''
    },
    second_account_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ''
    },
    birth_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: '0000-00-00'
    },
    account_info: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'base_athlete'
  });
};
