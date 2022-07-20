import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class contest_high extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('contest_high', {
    xContests: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'contests',
        key: 'xContest'
      }
    },
    jumpoff: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0,
      comment: "=Stichkampf yes\/no\ngeneraly only on championshiops, therefore the standard is no"
    }
  }, {
    tableName: 'contest_high',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xContests" },
        ]
      },
    ]
  });
  }
}
