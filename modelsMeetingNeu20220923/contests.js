import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class contests extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('contests', {
    xContest: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xBaseDiscipline: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "Decision",
      references: {
        model: 'basedisciplines',
        key: 'xBaseDiscipline'
      }
    },
    datetimeAppeal: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: "2020-01-01 10:00:00",
      comment: "It shall be possible that the different times are not on the same date; on the UI, do not show the date by default"
    },
    datetimeCall: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: "2020-01-01 10:00:00",
      comment: "It shall be possible that the different times are not on the same date; on the UI, do not show the date by default"
    },
    datetimeStart: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: "2020-01-01 10:00:00",
      comment: "It shall be possible that the different times are not on the same date; on the UI, do not show the date by default"
    },
    status: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 10,
      comment: "Startliste\/Appell gemacht\/Serien eingeteilt\/Resultate erfasst\/..."
    },
    conf: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "(replacement for extra tables for each discipline)\nThe configuration for the discipline: timing-stuff, number of attempts in tech, do final in tech, # finalists, turnOrder, jumpoff techHhigh), heightIncreases, ..."
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: ""
    }
  }, {
    tableName: 'contests',
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
      {
        name: "fk_contests_baseDisciplines1_idx",
        using: "BTREE",
        fields: [
          { name: "xBaseDiscipline" },
        ]
      },
    ]
  });
  }
}
