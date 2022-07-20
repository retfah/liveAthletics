import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class resultstrack extends Model {
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
