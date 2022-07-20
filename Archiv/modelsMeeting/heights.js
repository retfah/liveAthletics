import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class heights extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xHeight: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xSeries: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'series',
        key: 'xSeries'
      }
    },
    jumpoffOrder: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "defines the order if it is a jumpoff height. For all other heights, this property has to be 0. The height is then automatically given through the height, as it can only increase."
    },
    height: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'heights',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xHeight" },
        ]
      },
      {
        name: "fk_height_series1_idx",
        using: "BTREE",
        fields: [
          { name: "xSeries" },
        ]
      },
    ]
  });
  return heights;
  }
}
