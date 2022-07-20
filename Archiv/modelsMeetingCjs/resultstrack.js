const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return resultstrack.init(sequelize, DataTypes);
}

class resultstrack extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xResultTrack: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstartsresults',
        key: 'xSeriesStart'
      }
    },
    resultTrackTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "in milliseconds\n"
    }
  }, {
    sequelize,
    tableName: 'resultstrack',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xResultTrack" },
        ]
      },
    ]
  });
  return resultstrack;
  }
}
