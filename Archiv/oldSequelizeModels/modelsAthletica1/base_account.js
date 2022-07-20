/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('base_account', {
    account_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ''
    },
    account_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    account_short: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    account_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    lg: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'base_account'
  });
};
