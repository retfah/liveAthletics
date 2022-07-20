/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('competitions', {
    xCompetition: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xMeeting: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      references: {
        model: 'meetings',
        key: 'xMeeting'
      }
    },
    competitionType: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    competitionName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    competitionIsTeam: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'competitions'
  });
};
