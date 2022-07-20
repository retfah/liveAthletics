/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('meetings', {
    xMeeting: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xAccount: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'accounts',
        key: 'xAccount'
      }
    },
    meetingName: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    dateStart: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    dateEnd: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    meetingServerCapacity: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    }
  }, {
    tableName: 'meetings'
  });
};
