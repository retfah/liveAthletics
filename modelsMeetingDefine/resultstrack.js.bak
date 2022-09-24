import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class resultstrack extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('resultstrack', {
    xResultTrack: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstartsresults',
        key: 'xSeriesStart'
      }
    },
    time: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "in 1\/100'000s (hopefully futureproof)\nsufficient for all runs; takes up to 11.9h\n"
    },
    timeRounded: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      comment: "rounded time, digits and rounding defined by the discipline"
    },
    rank: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      comment: "the ranking made by the finish-judge must be used and not the ranking given by the time!"
    }
  }, {
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
  }
}
