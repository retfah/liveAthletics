import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class users extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xUser: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(45),
      allowNull: false,
      unique: "username_UNIQUE"
    },
    password: {
      type: DataTypes.CHAR(60),
      allowNull: false
    },
    passwordState: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: "used to invalidate passwords or to note that the password is initial and needs to be changed on the first login.\n0: everythink ok.\n-1: to be changed on first login, because it is the initial password\n-2: password was invalidated for some other reason. Als"
    }
  }, {
    sequelize,
    tableName: 'users',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xUser" },
        ]
      },
      {
        name: "username_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "username" },
        ]
      },
    ]
  });
  return users;
  }
}
