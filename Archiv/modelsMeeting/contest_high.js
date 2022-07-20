import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class contest_high extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xContest_high: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'contest',
        key: 'xContest'
      }
    },
    jumpoff: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: "=Stichkampf yes\/no\ngeneraly only on championshiops, therefore the standard is no"
    }
  }, {
    sequelize,
    tableName: 'contest_high',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xContest_high" },
        ]
      },
    ]
  });
  return contest_high;
  }
}
