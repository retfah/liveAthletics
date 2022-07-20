/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('results', {
    xResult: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xSeriesStart: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstarts',
        key: 'xSeriesStart'
      }
    },
    resultOverrule: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    resultRemark: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'results'
  });
};
