import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class resultstech extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('resultstech', {
    xResult: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstartsresults',
        key: 'xSeriesStart'
      }
    },
    result: {
      type: DataTypes.MEDIUMINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "in mm"
    },
    attempt: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "which attempt (start from 1)"
    },
    wind: {
      type: DataTypes.SMALLINT,
      allowNull: true,
      comment: "unfortunately Wind must appear twice in the column-name\n\nmust be signed (+-)!\nin m\/s\n"
    }
  }, {
    tableName: 'resultstech',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xResult" },
          { name: "attempt" },
        ]
      },
    ]
  });
  }
}
