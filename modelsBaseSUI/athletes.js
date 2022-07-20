import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class athletes extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('athletes', {
    license: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      primaryKey: true
    },
    licensePaid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 1
    },
    licenseCategory: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: ""
    },
    lastname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    firstname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    sex: {
      type: DataTypes.ENUM('m','f'),
      allowNull: false,
      defaultValue: "m"
    },
    nationality: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: ""
    },
    clubCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ""
    },
    birthdate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: "1900-01-01"
    }
  }, {
    tableName: 'athletes',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "license" },
        ]
      },
      {
        name: "license_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "license" },
        ]
      },
    ]
  });
  }
}
