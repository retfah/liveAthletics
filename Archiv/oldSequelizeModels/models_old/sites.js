/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sites', {
    xSite: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xStadium: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'stadiums',
        key: 'xStadium'
      }
    },
    siteName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    Homologiert: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    },
    siteIsTrack: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'sites'
  });
};
