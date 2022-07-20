import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class categories extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xCategory: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    categoryShortname: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: "",
      unique: "Kurzname"
    },
    categoryName: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ""
    },
    categorySortorder: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    age: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 99
    },
    categoryCode: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: ""
    },
    sex: {
      type: DataTypes.ENUM('m','f'),
      allowNull: false,
      defaultValue: "m"
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
          { name: "categoryShortname" },
        ]
      },
      {
        name: "Anzeige",
        using: "BTREE",
        fields: [
          { name: "categorySortorder" },
        ]
      },
    ]
  });
  return categories;
  }
}
