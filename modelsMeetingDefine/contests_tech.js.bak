import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('contests_tech', {
    xContest: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'contests',
        key: 'xContest'
      }
    },
    attempts: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
      comment: "how many attempts per athlete ("
    },
    final: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "could also be done by setting attmeptsBeforeFinal=0"
    },
    finalists: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    attempsBeforeFinal: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    },
    turnOrder: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    bestResOnly: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'contests_tech',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xContest" },
        ]
      },
    ]
  });
};
