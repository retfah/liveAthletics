/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('modules', {
    xModule: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    moduleName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true
    },
    moduleActivated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '1'
    },
    moduleType: {
      type: DataTypes.INTEGER(6),
      allowNull: false
    }
  }, {
    tableName: 'modules'
  });
};
