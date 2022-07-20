/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('seriesstarts_track', {
    xSeriesStart_track: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstarts',
        key: 'xSeriesStart'
      }
    },
    lane: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'seriesstarts_track'
  });
};
