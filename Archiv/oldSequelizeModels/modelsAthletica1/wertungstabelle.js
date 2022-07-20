/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('wertungstabelle', {
    xWertungstabelle: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'wertungstabelle'
  });
};
