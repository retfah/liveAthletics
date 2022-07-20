/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('combinedevents', {
    xCombinedEvent: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xCategory: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'categories',
        key: 'xCategory'
      }
    },
    xCompetition: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'competitions',
        key: 'xCompetition'
      }
    },
    combinedEventName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    combinedEventType: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false
    },
    xConversion: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'conversions',
        key: 'xConversion'
      }
    }
  }, {
    tableName: 'combinedevents'
  });
};
