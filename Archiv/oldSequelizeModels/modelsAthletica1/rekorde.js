/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rekorde', {
    record_type: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    season: {
      type: DataTypes.STRING(1),
      allowNull: false
    },
    discipline: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    category: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    result: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    firstname: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    lastname: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true
    }
  }, {
    tableName: 'rekorde'
  });
};
