/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rounds_track', {
    xRounds_track: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'rounds',
        key: 'xRound'
      }
    },
    statusTimekeeper: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    trackQnty: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: '6'
    }
  }, {
    tableName: 'rounds_track'
  });
};
