import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('categories', {
    xCategory: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    shortname: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: "",
      unique: "Kurzname"
    },
    name: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ""
    },
    sortorder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    ageMax: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 99
    },
    ageMin: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    code: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: ""
    },
    sex: {
      type: DataTypes.ENUM('m','f'),
      allowNull: false,
      defaultValue: "f"
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'categories',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xCategory" },
        ]
      },
      {
        name: "Kurzname",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "shortname" },
        ]
      },
      {
        name: "Anzeige",
        using: "BTREE",
        fields: [
          { name: "sortorder" },
        ]
      },
    ]
  });
};
