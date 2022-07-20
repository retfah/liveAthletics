const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return seriesstarts_track.init(sequelize, DataTypes);
}

class seriesstarts_track extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xSeriesStart_track: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstartsresults',
        key: 'xSeriesStart'
      }
    },
    lane: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'seriesstarts_track',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSeriesStart_track" },
        ]
      },
    ]
  });
  return seriesstarts_track;
  }
}
