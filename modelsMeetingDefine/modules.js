import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class modules extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('modules', {
    xModule: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    moduleName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "moduleName_UNIQUE"
    },
    moduleActivated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    moduleType: {
      type: DataTypes.SMALLINT,
      allowNull: false
    }
  }, {
    tableName: 'modules',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xModule" },
        ]
      },
      {
        name: "moduleName_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "moduleName" },
        ]
      },
    ]
  });
  }
}
