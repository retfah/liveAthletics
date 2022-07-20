/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('relays', {
    xRelay: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    relayName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    xClub: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'clubs',
        key: 'xClub'
      }
    },
    country: {
      type: DataTypes.CHAR(3),
      allowNull: false
    },
    xCategory: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'categories',
        key: 'xCategory'
      }
    },
    xBase: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'relays'
  });
};
