/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('conversions', {
    xConversion: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    conversionName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    conversionType: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'conversions'
  });
};
