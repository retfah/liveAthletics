import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class sites extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('sites', {
    xSite: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ""
    },
    homologated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    type: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false
    },
    conf: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "''"
    }
  }, {
    tableName: 'sites',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSite" },
        ]
      },
    ]
  });
  }
}
