const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return disciplines.init(sequelize, DataTypes);
}

class disciplines extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xDiscipline: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    disciplineSortorder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: "Sortierwert?"
    },
    disciplineIndoor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    disciplineType: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      comment: "an ID for the discipline module to use, e.g. run-in-lanes-wind, run-in-lanes-noWind, run-no-lanes, tech-long, tech-high. Using modules for the disciplines allows for flexibility with new disciplines, but it might add some difficulties, as the modules will hav eto implement their own tables, which means when activating\/deactivating the module, the DB has to be changed!"
    },
    disciplineTimeAppeal: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: "00:00:00"
    },
    disciplineTimeCall: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: "00:00:00"
    },
    disciplineDistance: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    disciplineWind: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    disciplineActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    disciplineRelay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    disciplineNameStd: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "",
      comment: "falls in einer Sprache nicht verfügbar",
      unique: "Kurzname"
    },
    disciplineShortnameStd: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "",
      comment: "falls in einer sprache nicht verfügbar"
    }
  }, {
    sequelize,
    tableName: 'disciplines',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xDiscipline" },
        ]
      },
      {
        name: "Kurzname",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "disciplineNameStd" },
        ]
      },
      {
        name: "Anzeige",
        using: "BTREE",
        fields: [
          { name: "disciplineSortorder" },
        ]
      },
      {
        name: "Staffel",
        using: "BTREE",
        fields: [
          { name: "disciplineRelay" },
        ]
      },
    ]
  });
  return disciplines;
  }
}
