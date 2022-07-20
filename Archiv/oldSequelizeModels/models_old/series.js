/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('series', {
    xSeries: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xRound: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'rounds',
        key: 'xRound'
      }
    },
    xSite: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true,
      defaultValue: '0',
      references: {
        model: 'sites',
        key: 'xSite'
      }
    },
    seriesStatus: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false
    },
    seriesNumber: {
      type: DataTypes.INTEGER(5).UNSIGNED,
      allowNull: false
    },
    seriesName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'series'
  });
};
