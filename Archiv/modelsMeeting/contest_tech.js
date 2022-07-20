import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class contest_tech extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    attempts: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1
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
    },
    xContest_tech: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'contest',
        key: 'xContest'
      }
    }
  }, {
    sequelize,
    tableName: 'contest_tech',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xContest_tech" },
        ]
      },
    ]
  });
  return contest_tech;
  }
}
