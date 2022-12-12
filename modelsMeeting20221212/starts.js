import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class starts extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('starts', {
    xStart: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xInscription: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'inscriptions',
        key: 'xInscription'
      }
    },
    xEvent: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'events',
        key: 'xEvent'
      }
    },
    paid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    bestPerf: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "best perfoamnce in life"
    },
    bestPerfLast: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "best performance in the range of interest"
    },
    inBase: {
      type: DataTypes.STRING(25),
      allowNull: true
    },
    competitive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "competitive or non-competitive:\nif non-competitive, an athlete will not automatically be qualified for the next round and will not get a rank in the rankinglist."
    }
  }, {
    tableName: 'starts',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xStart" },
        ]
      },
      {
        name: "noDoubleStarts",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xEvent" },
          { name: "xInscription" },
        ]
      },
      {
        name: "fk_start_inscription1_idx",
        using: "BTREE",
        fields: [
          { name: "xInscription" },
        ]
      },
      {
        name: "fk_starts_events1_idx",
        using: "BTREE",
        fields: [
          { name: "xEvent" },
        ]
      },
    ]
  });
  }
}
