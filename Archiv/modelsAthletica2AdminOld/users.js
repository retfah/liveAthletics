/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('users', {
    xUser: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'xUser'
    },
    username: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'username'
    },
    password: {
      type: DataTypes.CHAR(60),
      allowNull: true,
      field: 'password'
    }
  }, {
    tableName: 'users'
  });
};
