/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('contests', {
    xContest: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
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
    contestName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
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
    isCombined: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'contests'
  });
};
