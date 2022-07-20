const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return sites_track.init(sequelize, DataTypes);
}

class sites_track extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xSite: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    lanesStraight: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 6
    },
    lanesTurn: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 6
    },
    chronometryType: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    chronometryConf: {
      type: DataTypes.STRING(200),
      allowNull: false,
      defaultValue: ""
    },
    chonometryName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ""
    }
  }, {
    sequelize,
    tableName: 'sites_track',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSite" },
        ]
      },
    ]
  });
  return sites_track;
  }
}
