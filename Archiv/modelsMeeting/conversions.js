import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class conversions extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xConversion: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    conversionName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: "possible problem: translation; as long as this is simply a general name like 'IAAF' or 'swiss-athletics', it is no problem",
      unique: "name_UNIQUE"
    },
    conversionType: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "defines the internal routine that should be called"
    }
  }, {
    sequelize,
    tableName: 'conversions',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xConversion" },
        ]
      },
      {
        name: "name_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "conversionName" },
        ]
      },
    ]
  });
  return conversions;
  }
}
