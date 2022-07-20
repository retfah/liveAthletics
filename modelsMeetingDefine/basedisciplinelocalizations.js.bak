import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('basedisciplinelocalizations', {
    xDisciplinesLocalization: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xBaseDiscipline: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'basedisciplines',
        key: 'xBaseDiscipline'
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
    tableName: 'basedisciplinelocalizations',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xDisciplinesLocalization" },
          { name: "xBaseDiscipline" },
        ]
      },
      {
        name: "onlyOne",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xBaseDiscipline" },
          { name: "language" },
        ]
      },
      {
        name: "fk_baseDisciplineLocalizations_baseDisciplines1_idx",
        using: "BTREE",
        fields: [
          { name: "xBaseDiscipline" },
        ]
      },
    ]
  });
};
