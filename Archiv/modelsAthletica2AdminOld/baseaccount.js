/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('baseaccount', {
    accountCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: '',
      field: 'account_code'
    },
    accountName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
      field: 'account_name'
    },
    accountShort: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: '',
      field: 'account_short'
    },
    accountType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      field: 'account_type'
    },
    lg: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      field: 'lg'
    }
  }, {
    tableName: 'baseaccount'
  });
};
