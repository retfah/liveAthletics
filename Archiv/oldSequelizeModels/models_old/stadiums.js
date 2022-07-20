/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('stadiums', {
    xStadium: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    stadiumName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    over1000m: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    },
    stadiumIsIndoor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'stadiums'
  });
};
