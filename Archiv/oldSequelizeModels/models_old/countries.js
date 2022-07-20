/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('countries', {
    xCountry: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      primaryKey: true
    },
    countryName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    countrySortvalue: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'countries'
  });
};
