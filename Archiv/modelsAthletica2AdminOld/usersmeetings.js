/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('usersmeetings', {
    xUser: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'xUser'
      },
      field: 'xUser'
    },
    xMeeting: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'meetings',
        key: 'xMeeting'
      },
      field: 'xMeeting'
    }
  }, {
    tableName: 'usersmeetings'
  });
};
