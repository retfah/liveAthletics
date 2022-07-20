/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('resultstechwind', {
    xResultTechWind: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xResult: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'results',
        key: 'xResult'
      }
    },
    resultTechWindDistance: {
      type: DataTypes.INTEGER(6),
      allowNull: false,
      defaultValue: '0'
    },
    resultTechWindAttempt: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false
    },
    resultTechWindWind: {
      type: DataTypes.INTEGER(6),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'resultstechwind'
  });
};
