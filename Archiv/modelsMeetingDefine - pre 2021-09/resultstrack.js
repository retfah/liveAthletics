import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('resultstrack', {
    xResultTrack: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'seriesstartsresults',
        key: 'xSeriesStart'
      }
    },
    time: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: "in milliseconds\n"
    }
  }, {
    sequelize,
    tableName: 'resultstrack',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xResultTrack" },
        ]
      },
    ]
  });
};
