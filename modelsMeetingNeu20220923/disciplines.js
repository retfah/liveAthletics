import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class disciplines extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('disciplines', {
    xDiscipline: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xBaseDiscipline: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "Use the same number for disciplines which shall be joinable.",
      references: {
        model: 'basedisciplines',
        key: 'xBaseDiscipline'
      }
    },
    sortorder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: "Sortierwert?"
    },
    indoor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    configuration: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "''",
      comment: "This should contain e.g. a JSON string with discipline specific settings, e.g. distance, wind, whatever, which is then interpreted by the type of the discipline. "
    }
  }, {
    tableName: 'disciplines',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xDiscipline" },
          { name: "xBaseDiscipline" },
        ]
      },
      {
        name: "Anzeige",
        using: "BTREE",
        fields: [
          { name: "sortorder" },
        ]
      },
      {
        name: "baseDiscipline",
        using: "BTREE",
        fields: [
          { name: "xBaseDiscipline" },
        ]
      },
    ]
  });
  }
}
