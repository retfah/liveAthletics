const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return rounds.init(sequelize, DataTypes);
}

class rounds extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
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
        model: 'eventgroup',
        key: 'xEventGroup'
      }
    },
    roundName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ""
    },
    roundOrder: {
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
        name: "fk_round_contest1_idx",
        using: "BTREE",
        fields: [
          { name: "xEventGroup" },
        ]
      },
    ]
  });
  return rounds;
  }
}
