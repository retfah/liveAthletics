import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class seriesstarts_track extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('seriesstarts_track', {
    xSeriesStart_track: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstartsresults',
        key: 'xSeriesStart'
      }
    },
    lane: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'seriesstarts_track',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSeriesStart_track" },
        ]
      },
    ]
  });
  }
}
