import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class groups extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xGroup: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    rounds_xRound: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'rounds',
        key: 'xRound'
      }
    },
    contest_xContest: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'contest',
        key: 'xContest'
      }
    },
    groupNr: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    groupName: {
      type: DataTypes.STRING(45),
      allowNull: false,
      defaultValue: "",
      comment: "shall be implemented in the future: each group can have a name, and not only a number."
    }
  }, {
    sequelize,
    tableName: 'groups',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xGroup" },
        ]
      },
      {
        name: "fk_rounds_has_contest_rounds1_idx",
        using: "BTREE",
        fields: [
          { name: "rounds_xRound" },
        ]
      },
      {
        name: "fk_groups_contest1_idx",
        using: "BTREE",
        fields: [
          { name: "contest_xContest" },
        ]
      },
    ]
  });
  return groups;
  }
}
