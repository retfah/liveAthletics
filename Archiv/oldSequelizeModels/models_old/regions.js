/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('regions', {
    xRegion: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    regionName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    regionShortname: {
      type: DataTypes.STRING(6),
      allowNull: false
    },
    regionSortvalue: {
      type: DataTypes.INTEGER(11),
      allowNull: false
    },
    xCountry: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      references: {
        model: 'countries',
        key: 'xCountry'
      }
    }
  }, {
    tableName: 'regions'
  });
};
