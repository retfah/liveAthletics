import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class seriestrack extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('seriestrack', {
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
    tableName: 'seriestrack',
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
