var DataTypes = require("sequelize").DataTypes;
var _baseaccount = require("./baseaccount");
var _baseathletes = require("./baseathletes");
var _meetings = require("./meetings");
var _users = require("./users");
var _usersgroups = require("./usersgroups");
var _usersmeetings = require("./usersmeetings");

function initModels(sequelize) {
  var baseaccount = _baseaccount(sequelize, DataTypes);
  var baseathletes = _baseathletes(sequelize, DataTypes);
  var meetings = _meetings(sequelize, DataTypes);
  var users = _users(sequelize, DataTypes);
  var usersgroups = _usersgroups(sequelize, DataTypes);
  var usersmeetings = _usersmeetings(sequelize, DataTypes);

  meetings.belongsToMany(users, { through: usersmeetings, foreignKey: "xMeeting", otherKey: "xUser" });
  users.belongsToMany(meetings, { through: usersmeetings, foreignKey: "xUser", otherKey: "xMeeting" });
  usersmeetings.belongsTo(meetings, { as: "xMeeting_meeting", foreignKey: "xMeeting"});
  meetings.hasMany(usersmeetings, { as: "usersmeetings", foreignKey: "xMeeting"});
  usersgroups.belongsTo(users, { as: "xUser_user", foreignKey: "xUser"});
  users.hasMany(usersgroups, { as: "usersgroups", foreignKey: "xUser"});
  usersmeetings.belongsTo(users, { as: "xUser_user", foreignKey: "xUser"});
  users.hasMany(usersmeetings, { as: "usersmeetings", foreignKey: "xUser"});

  return {
    baseaccount,
    baseathletes,
    meetings,
    users,
    usersgroups,
    usersmeetings,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
