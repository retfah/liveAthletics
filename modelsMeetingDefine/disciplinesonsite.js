import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class disciplinesonsite extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('disciplinesonsite', {
    xSite: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'sites',
        key: 'xSite'
      }
    },
    xBaseDiscipline: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'basedisciplines',
        key: 'xBaseDiscipline'
      }
    }
  }, {
    tableName: 'disciplinesonsite',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSite" },
          { name: "xBaseDiscipline" },
        ]
      },
    ]
  });
  }
}
