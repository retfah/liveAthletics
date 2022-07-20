import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('clubs', {
    xClub: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "",
      unique: "Name"
    },
    sortvalue: {
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
          { name: "name" },
        ]
      },
      {
        name: "Sortierwert",
        using: "BTREE",
        fields: [
          { name: "sortvalue" },
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
};
