/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sites_track', {
    xSite: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    lanesStraight: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '6'
    },
    lanesTurn: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '6'
    },
    chronometryType: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    chronometryConf: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: ''
    },
    chonometryName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'sites_track'
  });
};
