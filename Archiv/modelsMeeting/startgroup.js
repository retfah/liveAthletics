import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class startgroup extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xStartgroup: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xStart: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'starts',
        key: 'xStart'
      },
      unique: "fk_startGroup_starts1"
    },
    xGroup: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'groups',
        key: 'xGroup'
      }
    }
  }, {
    sequelize,
    tableName: 'startgroup',
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
        name: "fk_startGroup_groups1_idx",
        using: "BTREE",
        fields: [
          { name: "xGroup" },
        ]
      },
    ]
  });
  return startgroup;
  }
}
