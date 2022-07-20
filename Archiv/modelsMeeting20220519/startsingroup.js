import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class startsingroup extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('startsingroup', {
    xStartgroup: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xRound: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'xRound'
      }
    },
    number: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'number'
      }
    },
    xStart: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'starts',
        key: 'xStart'
      }
    },
    present: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    tableName: 'startsingroup',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xStartgroup" },
        ]
      },
      {
        name: "secondary",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xRound" },
          { name: "xStart" },
        ]
      },
      {
        name: "fk_xStart",
        using: "BTREE",
        fields: [
          { name: "xStart" },
        ]
      },
      {
        name: "fk_startsInGroup_groups1_idx",
        using: "BTREE",
        fields: [
          { name: "xRound" },
          { name: "number" },
        ]
      },
    ]
  });
  }
}
