/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('verein', {
    xVerein: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      unique: true
    },
    Sortierwert: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '0'
    },
    xCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ''
    },
    Geloescht: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'verein'
  });
};
