const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return seriesstarts_high.init(sequelize, DataTypes);
}

class seriesstarts_high extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xSeriesStart_high: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstartsresults',
        key: 'xSeriesStart'
      }
    },
    startHeight: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "hier bewusst keine Referenz auf height, da dort der Eintrag erst später erstellt werden können soll, wenn die Höhe dran kommt (oder wenn jemand darauf verzeichtet)\n--> so programmieren, dass eine ungültige Starthöhe egal ist und dass programmseitig geprüft wird dass dies nicht passiert"
    }
  }, {
    sequelize,
    tableName: 'seriesstarts_high',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSeriesStart_high" },
        ]
      },
    ]
  });
  return seriesstarts_high;
  }
}
