import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class resultstechwind extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xResultTechWind: {
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
    resultTechWindDistance: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0,
      comment: "in cm"
    },
    resultTechWindAttempt: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      comment: "which attempt (start from 1)"
    },
    resultTechWindWind: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      defaultValue: 0,
      comment: "unfortunately Wind must appear twice in the column-name\n\nmust be signed (+-)!\nin m\/s\n"
    }
  }, {
    sequelize,
    tableName: 'resultstechwind',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xResultTechWind" },
          { name: "xResult" },
        ]
      },
      {
        name: "fk_resultsTechWind_seriesStartsResults1_idx",
        using: "BTREE",
        fields: [
          { name: "xResult" },
        ]
      },
    ]
  });
  return resultstechwind;
  }
}
