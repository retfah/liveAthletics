import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('resultshigh', {
    xResult: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstartsresults',
        key: 'xSeriesStart'
      }
    },
    xHeight: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      primaryKey: true,
      references: {
        model: 'heights',
        key: 'xHeight'
      }
    },
    resultsHighFailedAtempts: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "- how many failed attempts on this height\n- this number also helps to count the total not passed attempts for the ordering"
    },
    resultsHighValid: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: "passed this height already yes\/no"
    },
    resultsHighPassed: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: "verzichtet (-)"
    }
  }, {
    sequelize,
    tableName: 'resultshigh',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xHeight" },
          { name: "xResult" },
        ]
      },
      {
        name: "fk_result_high_height1_idx",
        using: "BTREE",
        fields: [
          { name: "xHeight" },
        ]
      },
      {
        name: "fk_resultsHigh_seriesStartsResults1_idx",
        using: "BTREE",
        fields: [
          { name: "xResult" },
        ]
      },
    ]
  });
};
