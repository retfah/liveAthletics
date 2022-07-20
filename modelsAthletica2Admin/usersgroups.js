import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class usersgroups extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xUser: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'xUser'
      }
    },
    group: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    }
  }, {
    sequelize,
    tableName: 'usersgroups',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xUser" },
          { name: "group" },
        ]
      },
    ]
  });
  return usersgroups;
  }
}
