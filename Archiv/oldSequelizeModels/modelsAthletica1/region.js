/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('region', {
    xRegion: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    Anzeige: {
      type: DataTypes.STRING(6),
      allowNull: false,
      defaultValue: ''
    },
    Sortierwert: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    UKC: {
      type: DataTypes.ENUM('y','n'),
      allowNull: true,
      defaultValue: 'n'
    }
  }, {
    tableName: 'region'
  });
};
