/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('base_performance', {
    id_performance: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    id_athlete: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    discipline: {
      type: DataTypes.INTEGER(6),
      allowNull: false,
      defaultValue: '0'
    },
    category: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: ''
    },
    best_effort: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: ''
    },
    best_effort_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: '0000-00-00'
    },
    best_effort_event: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    season_effort: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: ''
    },
    season_effort_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: '0000-00-00'
    },
    season_effort_event: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    notification_effort: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: ''
    },
    notification_effort_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: '0000-00-00'
    },
    notification_effort_event: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    season: {
      type: DataTypes.ENUM('I','O'),
      allowNull: false,
      defaultValue: 'O'
    }
  }, {
    tableName: 'base_performance'
  });
};
