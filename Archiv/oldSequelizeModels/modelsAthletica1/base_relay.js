/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('base_relay', {
    id_relay: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0',
      primaryKey: true
    },
    is_athletica_gen: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'y'
    },
    relay_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    category: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: ''
    },
    discipline: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: ''
    },
    account_code: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'base_relay'
  });
};
