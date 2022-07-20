import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class disciplinesonsite extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xSite: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'sites',
        key: 'xSite'
      }
    },
    xDiscipline: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'disciplines',
        key: 'xDiscipline'
      }
    }
  }, {
    sequelize,
    tableName: 'disciplinesonsite',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xDiscipline" },
          { name: "xSite" },
        ]
      },
      {
        name: "fk_disciplines_on_site_sites1_idx",
        using: "BTREE",
        fields: [
          { name: "xSite" },
        ]
      },
      {
        name: "fk_disciplines_on_site_disciplines1_idx",
        using: "BTREE",
        fields: [
          { name: "xDiscipline" },
        ]
      },
    ]
  });
  return disciplinesonsite;
  }
}
