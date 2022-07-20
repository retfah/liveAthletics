/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('seriesstarts_high', {
    xSeriesStart_high: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstarts',
        key: 'xSeriesStart'
      }
    },
    startHeight: {
      type: DataTypes.INTEGER(5).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'seriesstarts_high'
  });
};
