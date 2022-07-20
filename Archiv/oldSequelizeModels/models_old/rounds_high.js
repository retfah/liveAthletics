/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rounds_high', {
    xRounds_high: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    jumpoff: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'rounds_high'
  });
};
