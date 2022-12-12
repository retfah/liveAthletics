import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class countries extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('countries', {
    xCountry: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      primaryKey: true
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
    }
  }, {
    tableName: 'countries',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xCountry" },
        ]
      },
    ]
  });
  }
}
