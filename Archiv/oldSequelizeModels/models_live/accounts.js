/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('accounts', {
    xAccount: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    accountName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    accountUsername: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    accountPassword: {
      type: DataTypes.STRING(100),
      allowNull: false
    }
  }, {
    tableName: 'accounts'
  });
};
