const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return heightincreases.init(sequelize, DataTypes);
}

class heightincreases extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xHeightIncrease: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xRound_high: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "to which series this incrementation belongs",
      references: {
        model: 'contest_high',
        key: 'xContest_high'
      }
    },
    heightIncreaseStartheight: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      comment: "starting at which height"
    },
    heightIncrease: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "increase steps from this height on"
    }
  }, {
    sequelize,
    tableName: 'heightincreases',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xHeightIncrease" },
        ]
      },
      {
        name: "fk_heightIncreases_rounds_high1_idx",
        using: "BTREE",
        fields: [
          { name: "xRound_high" },
        ]
      },
    ]
  });
  return heightincreases;
  }
}
