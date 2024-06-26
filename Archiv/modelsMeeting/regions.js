import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class regions extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xRegion: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    countryCode: {
      type: DataTypes.CHAR(3),
      allowNull: false
    },
    countryName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    countrySortvalue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    regionName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    regionShortname: {
      type: DataTypes.STRING(6),
      allowNull: false,
      defaultValue: ""
    },
    regionSortvalue: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'regions',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xRegion" },
        ]
      },
    ]
  });
  return regions;
  }
}
