/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('land', {
    xCode: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: '',
      primaryKey: true
    },
    Name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    Sortierwert: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'land'
  });
};
