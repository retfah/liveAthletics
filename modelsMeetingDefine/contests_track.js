import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class contests_track extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('contests_track', {
    xContest: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'contests',
        key: 'xContest'
      }
    },
    statusTimekeeper: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "what is that for? store whether the data has already been writen (then it maybe should be changed to series, given the chronometry can import single series and not only groups of series)?"
    },
    trackQnty: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 6,
      comment: "maybe deleted and replace with the setting that is made via the site"
    }
  }, {
    tableName: 'contests_track',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xContest" },
        ]
      },
    ]
  });
  }
}
