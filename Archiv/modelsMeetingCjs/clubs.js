const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return clubs.init(sequelize, DataTypes);
}

class clubs extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xClub: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    clubName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "",
      unique: "Name"
    },
    clubSortvalue: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "0"
    },
    usercode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: "",
      comment: "the username in the alabus database --> why do we need this?"
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "because clubs can not be delted as long as it is referenced --> do not "
    }
  }, {
    sequelize,
    tableName: 'clubs',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xClub" },
        ]
      },
      {
        name: "Name",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "clubName" },
        ]
      },
      {
        name: "Sortierwert",
        using: "BTREE",
        fields: [
          { name: "clubSortvalue" },
        ]
      },
      {
        name: "xCode",
        using: "BTREE",
        fields: [
          { name: "usercode" },
        ]
      },
    ]
  });
  return clubs;
  }
}
