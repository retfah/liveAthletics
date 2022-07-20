import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('disciplinelocalizations', {
    xDisciplinesLocalization: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
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
    language: {
      type: DataTypes.CHAR(2),
      allowNull: false,
      comment: "language shortcut according to ISO639-1: http:\/\/www.loc.gov\/standards\/iso639-2\/php\/code_list.php\n"
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    shortname: {
      type: DataTypes.STRING(20),
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'disciplinelocalizations',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xDisciplinesLocalization" },
          { name: "xDiscipline" },
        ]
      },
      {
        name: "fk_disciplinesLocalizations_disciplines1_idx",
        using: "BTREE",
        fields: [
          { name: "xDiscipline" },
        ]
      },
    ]
  });
};
