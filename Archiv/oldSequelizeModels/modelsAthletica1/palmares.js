/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('palmares', {
    license: {
      type: DataTypes.INTEGER(10),
      allowNull: true
    },
    palmares_international: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    palmares_national: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'palmares'
  });
};
