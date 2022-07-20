/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('heightincreases', {
    xHeightIncreases: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xRound_high: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      references: {
        model: 'rounds_high',
        key: 'xRounds_high'
      }
    },
    heightIncreaseStartheight: {
      type: DataTypes.INTEGER(5).UNSIGNED,
      allowNull: false
    },
    heightIncrease: {
      type: DataTypes.INTEGER(5).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'heightincreases'
  });
};
