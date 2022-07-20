import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class series extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('series', {
    xSeries: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xContest: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'contests',
        key: 'xContest'
      }
    },
    xSite: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      comment: "philosophy question about the differentiation between series and groups: \n- if series should be a sequence on the same site, then the site should be defiend for the contest\n- if differen series should really have the chance to be on different sites, then keep it as it is\n\nimportant difference not to forget: groups can (not must) be defined before the role call, while series are defined after!\nadvantage when site is set for the contest and is a sequence on the same site: it is no problem to have a room for the contest, but at the same time it is then impossible to have two parallel series with a common final (as typical for long jump). However this is important, thus the site should be defined on series level. However, it is anyway just one room with multiple series and an advanced conflict management. ",
      references: {
        model: 'sites',
        key: 'xSite'
      }
    },
    status: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 10
    },
    number: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      comment: "the number of the series; this was not implemented so far, the order of serie was given propably through xSeries; however, this is not very sexy.\nTODO: we could make xContest and number a unique constraint, but that would be difficult for series reordering"
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "",
      comment: "the name of the series: can be empty, but also e.g. \"A\" (for Final A; Final should be written in the round)"
    }
  }, {
    tableName: 'series',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSeries" },
        ]
      },
      {
        name: "fk_series_contest1_idx",
        using: "BTREE",
        fields: [
          { name: "xContest" },
        ]
      },
      {
        name: "fk_series_sites1_idx",
        using: "BTREE",
        fields: [
          { name: "xSite" },
        ]
      },
    ]
  });
  }
}
