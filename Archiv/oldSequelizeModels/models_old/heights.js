/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('heights', {
    xHeights: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xSeries: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'series',
        key: 'xSeries'
      }
    },
    heightOrder: {
      type: DataTypes.INTEGER(5).UNSIGNED,
      allowNull: false
    },
    height: {
      type: DataTypes.INTEGER(5).UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'heights'
  });
};
