/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('events', {
    xEvent: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
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
    xDiscipline: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'disciplines',
        key: 'xDiscipline'
      }
    },
    xCombined: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      references: {
        model: 'combinedevents',
        key: 'xCombinedEvent'
      }
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
    GroupQnty: {
      type: DataTypes.INTEGER(5).UNSIGNED,
      allowNull: false,
      defaultValue: '1'
    },
    entryFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    bailFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    eventOnlineId: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    info: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'events'
  });
};
