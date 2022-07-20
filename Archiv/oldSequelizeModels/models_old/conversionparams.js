/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('conversionparams', {
    xConversion: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'conversions',
        key: 'xConversion'
      }
    },
    xDiscipline: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'disciplines',
        key: 'xDiscipline'
      }
    },
    conversionParamConf: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'conversionparams'
  });
};
