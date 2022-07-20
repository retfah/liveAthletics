import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('groups', {
    xRound: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'rounds',
        key: 'xRound'
      }
    },
    number: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      primaryKey: true
    },
    xContest: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "eventually allow null here",
      references: {
        model: 'contests',
        key: 'xContest'
      }
    },
    name: {
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
          { name: "xRound" },
          { name: "number" },
        ]
      },
      {
        name: "uq_xRound_number",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xRound" },
          { name: "number" },
        ]
      },
      {
        name: "fk_rounds_has_contest_rounds1_idx",
        using: "BTREE",
        fields: [
          { name: "xRound" },
        ]
      },
      {
        name: "fk_groups_contest1_idx",
        using: "BTREE",
        fields: [
          { name: "xContest" },
        ]
      },
    ]
  });
};
