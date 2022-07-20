import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class series_track extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xSeries_track: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'series',
        key: 'xSeries'
      }
    },
    series_trackWind: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0,
      comment: "this one must be signed!"
    },
    series_trackFilm: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    series_trackManualTime: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'series_track',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSeries_track" },
        ]
      },
    ]
  });
  return series_track;
  }
}
