import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class heightincreases extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('heightincreases', {
    xHeightIncrease: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xContest: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "to which series this incrementation belongs",
      references: {
        model: 'contest_high',
        key: 'xContests'
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
          { name: "xContest" },
        ]
      },
    ]
  });
  }
}
