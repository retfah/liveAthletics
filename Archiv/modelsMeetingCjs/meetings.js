const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return meetings.init(sequelize, DataTypes);
}

class meetings extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xMeeting: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    meetingName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    location: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
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
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true
    },
    isOnline: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    organizor: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    entryFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    entryFeeReduction: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    bailFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    meetingIsIndoor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'meetings',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xMeeting" },
        ]
      },
      {
        name: "Name",
        using: "BTREE",
        fields: [
          { name: "meetingName" },
        ]
      },
    ]
  });
  return meetings;
  }
}
