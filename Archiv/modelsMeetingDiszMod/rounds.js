import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('rounds', {
    xRound: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xEventGroup: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'eventgroups',
        key: 'xEventGroup'
      }
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ""
    },
    order: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false
    },
    numGroups: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1
    },
    qualiModule: {
      type: DataTypes.STRING(45),
      allowNull: false,
      defaultValue: "",
      comment: "the name of the qualiModule; must be unique among all modules (or only qualiModules) on the same server"
    },
    qualiConf: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "could also be BLOB; allows 65536=2^16 bytes to be stored; attention: with charsets where one character can take more than one bytes,  numBytes < numChars!"
    }
  }, {
    sequelize,
    tableName: 'rounds',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xRound" },
        ]
      },
      {
        name: "uniqueRound",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "order" },
          { name: "xEventGroup" },
        ]
      },
      {
        name: "fk_round_contest1_idx",
        using: "BTREE",
        fields: [
          { name: "xEventGroup" },
        ]
      },
    ]
  });
};
