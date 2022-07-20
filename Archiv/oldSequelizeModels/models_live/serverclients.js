/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('serverclients', {
    xServerClients: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xMeeting: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'meetings',
        key: 'xMeeting'
      }
    },
    address: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    port: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    conf: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    serverClientCapacity: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    serverClientUsername: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    serverClientPassword: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    tableName: 'serverclients'
  });
};
