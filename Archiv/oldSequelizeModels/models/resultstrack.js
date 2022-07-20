/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('resultstrack', {
    xResultTrack: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'results',
        key: 'xResult'
      }
    },
    resultTrackTime: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    }
  }, {
    tableName: 'resultstrack'
  });
};
