/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rounds', {
    xRound: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xContest: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'contests',
        key: 'xContest'
      }
    },
    roundName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    roundOrder: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false
    },
    roundDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: '1900-01-01'
    },
    roundTimeAppeal: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '00:00:00'
    },
    roundTimeCall: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '00:00:00'
    },
    roundTimeStart: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '00:00:00'
    },
    roundStatus: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'rounds'
  });
};
