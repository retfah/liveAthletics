import _sequelize from "sequelize";
const DataTypes = _sequelize.DataTypes;
import _baseaccount from  "./baseaccount.js";
import _baseathletes from  "./baseathletes.js";
import _meetings from  "./meetings.js";
import _users from  "./users.js";
import _usersgroups from  "./usersgroups.js";
import _usersmeetings from  "./usersmeetings.js";

export default function initModels(sequelize) {
  const baseaccount = _baseaccount.init(sequelize, DataTypes);
  const baseathletes = _baseathletes.init(sequelize, DataTypes);
  const meetings = _meetings.init(sequelize, DataTypes);
  const users = _users.init(sequelize, DataTypes);
  const usersgroups = _usersgroups.init(sequelize, DataTypes);
  const usersmeetings = _usersmeetings.init(sequelize, DataTypes);

  // original:
  /*meetings.belongsToMany(users, { as: 'xUser_users', through: usersmeetings, foreignKey: "xMeeting", otherKey: "xUser" });
  users.belongsToMany(meetings, { as: 'xMeeting_meetings', through: usersmeetings, foreignKey: "xUser", otherKey: "xMeeting" });
  usersmeetings.belongsTo(meetings, { as: "xMeeting_meeting", foreignKey: "xMeeting"});
  meetings.hasMany(usersmeetings, { as: "usersmeetings", foreignKey: "xMeeting"});
  usersgroups.belongsTo(users, { as: "xUser_user", foreignKey: "xUser"});
  users.hasMany(usersgroups, { as: "usersgroups", foreignKey: "xUser"});
  usersmeetings.belongsTo(users, { as: "xUser_user", foreignKey: "xUser"});
  users.hasMany(usersmeetings, { as: "usersmeetings", foreignKey: "xUser"});*/

  meetings.belongsToMany(users, { through: usersmeetings, foreignKey: "xMeeting", otherKey: "xUser" });
  users.belongsToMany(meetings, { through: usersmeetings, foreignKey: "xUser", otherKey: "xMeeting" });
  usersmeetings.belongsTo(meetings, {foreignKey: "xMeeting"});
  meetings.hasMany(usersmeetings, { foreignKey: "xMeeting"});
  usersgroups.belongsTo(users, {foreignKey: "xUser"});
  users.hasMany(usersgroups, { foreignKey: "xUser"});
  usersmeetings.belongsTo(users, {foreignKey: "xUser"});
  users.hasMany(usersmeetings, {foreignKey: "xUser"});

  return {
    baseaccount,
    baseathletes,
    meetings,
    users,
    usersgroups,
    usersmeetings,
  };
}
