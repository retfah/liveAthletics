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
    name: {
      type: DataTypes.STRING(75),
      allowNull: false,
      defaultValue: ""
    },
    shortname: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: "The shortname used for the database name and to identify the meeting. It is the same on master and slave and this name is the one stored in the Client-cookie (if needed). Thereby transferring a session from the master to a slave is easier, when the meetin",
      unique: "shortname_UNIQUE"
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    active: {
      type: DataTypes.TINYINT,
      allowNull: false,
      comment: "is this meeting active (i.e. should the rooms get loaded)"
    },
    isSlave: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: "is this the master, i.e. does is store incoming data other than those from the master"
    },
    masterAddress: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    masterUsername: {
      type: DataTypes.STRING(45),
      allowNull: false,
      defaultValue: "default",
      comment: "the username to log in on the masterserver; not implemented yet"
    },
    masterPassword: {
      type: DataTypes.STRING(45),
      allowNull: false,
      defaultValue: "",
      comment: "the passwort to log in on the masterserver; not implemented yet"
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
        name: "shortname_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "shortname" },
        ]
      },
    ]
  });
  return meetings;
  }
}
