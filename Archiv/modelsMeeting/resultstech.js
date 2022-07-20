import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class resultstech extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xResultTech: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xResult: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstartsresults',
        key: 'xSeriesStart'
      }
    },
    resultTechDistance: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0,
      comment: "in cm\n-1 for failed trial"
    },
    resultTechAttempt: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      comment: "which attempt (start from 1)"
    }
  }, {
    sequelize,
    tableName: 'resultstech',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xResultTech" },
          { name: "xResult" },
        ]
      },
      {
        name: "fk_resultsTech_seriesStartsResults1_idx",
        using: "BTREE",
        fields: [
          { name: "xResult" },
        ]
      },
    ]
  });
  return resultstech;
  }
}
