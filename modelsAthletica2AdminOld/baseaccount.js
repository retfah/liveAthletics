import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class baseaccount extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    account_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ""
    },
    account_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""
    },
    account_short: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ""
    },
    account_type: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    lg: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    }
  }, {
    sequelize,
    tableName: 'baseaccount',
    timestamps: false,
    indexes: [
      {
        name: "account_code_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "account_code" },
        ]
      },
      {
        name: "account_code",
        using: "BTREE",
        fields: [
          { name: "account_code" },
        ]
      },
    ]
  });
  return baseaccount;
  }
}
