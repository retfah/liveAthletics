import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class conversionparams extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xConversion: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'conversions',
        key: 'xConversion'
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
    },
    conversionParamConf: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    }
  }, {
    sequelize,
    tableName: 'conversionparams',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xConversion" },
          { name: "xDiscipline" },
        ]
      },
      {
        name: "fk_conversionParams_conversion_idx",
        using: "BTREE",
        fields: [
          { name: "xConversion" },
        ]
      },
      {
        name: "fk_conversionParams_disciplineType_idx",
        using: "BTREE",
        fields: [
          { name: "xDiscipline" },
        ]
      },
    ]
  });
  return conversionparams;
  }
}
