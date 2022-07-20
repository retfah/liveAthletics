const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return series.init(sequelize, DataTypes);
}

class series extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xSeries: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xContest: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'contest',
        key: 'xContest'
      },
      unique: "fk_series_contest1"
    },
    xSite: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: 0,
      references: {
        model: 'sites',
        key: 'xSite'
      }
    },
    seriesStatus: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false
    },
    seriesNumber: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      comment: "the number of the series; this was not implemented so far, the order of serie was given propably through xSeries; however, this is not very sexy."
    },
    seriesName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "",
      comment: "the name of the series: can be empty, but also e.g. \"A\" (for Final A; Final should be written in the round)"
    }
  }, {
    sequelize,
    tableName: 'series',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSeries" },
        ]
      },
      {
        name: "secondary",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xContest" },
        ]
      },
      {
        name: "fk_series_site1_idx",
        using: "BTREE",
        fields: [
          { name: "xSite" },
        ]
      },
      {
        name: "fk_series_contest1_idx",
        using: "BTREE",
        fields: [
          { name: "xContest" },
        ]
      },
    ]
  });
  return series;
  }
}
