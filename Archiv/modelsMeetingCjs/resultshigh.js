const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return resultshigh.init(sequelize, DataTypes);
}

class resultshigh extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
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
    DELETEresultsHighSortOrder: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: "-1=an den Anfang\n0=normal\n1=an Ende\n2=verzichtet auf dieser Höhe"
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
          { name: "xResult" },
          { name: "xHeight" },
        ]
      },
      {
        name: "fk_result_high_height1_idx",
        using: "BTREE",
        fields: [
          { name: "xHeight" },
        ]
      },
    ]
  });
  return resultshigh;
  }
}
