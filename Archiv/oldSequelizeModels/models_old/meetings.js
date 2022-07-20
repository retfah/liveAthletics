/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('meetings', {
    xMeeting: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    meetingName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    dateFrom: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    dateTo: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    meetingOnlineId: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: true
    },
    isOnline: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    },
    organizor: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    xStadium: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      defaultValue: '0',
      primaryKey: true,
      references: {
        model: 'stadiums',
        key: 'xStadium'
      }
    },
    entryFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    entryFeeReduction: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    bailFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    meetingIsIndoor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'meetings'
  });
};
