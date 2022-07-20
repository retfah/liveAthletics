const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return baseathletes.init(sequelize, DataTypes);
}

class baseathletes extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    id_athlete: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    license: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    license_paid: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1
    },
    license_cat: {
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
      type: DataTypes.ENUM('m','w'),
      allowNull: false,
      defaultValue: "m"
    },
    nationality: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: ""
    },
    account_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ""
    },
    second_account_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ""
    },
    birth_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: "1900-01-01"
    },
    account_info: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: ""
    }
  }, {
    sequelize,
    tableName: 'baseathletes',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "id_athlete" },
        ]
      },
      {
        name: "account_code",
        using: "BTREE",
        fields: [
          { name: "account_code" },
        ]
      },
      {
        name: "second_account_code",
        using: "BTREE",
        fields: [
          { name: "second_account_code" },
        ]
      },
      {
        name: "license",
        using: "BTREE",
        fields: [
          { name: "license" },
        ]
      },
      {
        name: "lastname",
        using: "BTREE",
        fields: [
          { name: "lastname" },
        ]
      },
      {
        name: "firstname",
        using: "BTREE",
        fields: [
          { name: "firstname" },
        ]
      },
    ]
  });
  return baseathletes;
  }
}
