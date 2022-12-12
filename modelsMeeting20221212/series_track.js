import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class series_track extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('series_track', {
    xSeries: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'series',
        key: 'xSeries'
      }
    },
    wind: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0,
      comment: "this one must be signed!"
    },
    film: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    manual: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "manual timing?"
    }
  }, {
    tableName: 'series_track',
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
    ]
  });
  }
}
