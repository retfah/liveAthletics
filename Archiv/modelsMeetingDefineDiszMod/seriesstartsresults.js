import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('seriesstartsresults', {
    xSeriesStart: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xStartgroup: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'startsingroup',
        key: 'xStartgroup'
      },
      unique: "fk_seriesStarts_startGroup1"
    },
    xSeries: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'series',
        key: 'xSeries'
      },
      unique: "secondary"
    },
    position: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "position:\nfor tech: the order of athletes\nfor track: side number; IMORTANT: for sprint this is the same as the lane defined in seriesStarts_track, but for middle\/long distance it is not!"
    },
    resultOverrule: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "DNS, DQ, DNF, NM, r (retired), withdrawal (combined only)\n(--> maybe NM and DNF not here)\n\n0=normal\n1=r (retired)=hört mitten im Wettkampf auf\n2=NM=o.g.V. (needed?)\n3=DNF=aufg.\n4=withdrawal=abgemeldet \n5=DNS=n.a.\n6=DQ=disq. --> nur diziplinarisch (kein Fehlstart --> ist im Resultat drin), damit man hiermit bestimmen kann, ob jemamnd nicht mehr starten darf"
    },
    resultRemark: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    qualification: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
      comment: "stores how somebody was qualified AND also if somebody retired from the competition; the qualification-module must define whcih number belongs to what and must also provide what is needed for translation of that status into different languages!\nall modules MUST use 0 as default= not qualified for next round!"
    },
    startConf: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: "''",
      comment: "the lane in track races and the startHeight for techHigh; replaces the separate tables"
    }
  }, {
    sequelize,
    tableName: 'seriesstartsresults',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSeriesStart" },
        ]
      },
      {
        name: "fk_seriesStarts_startGroup1_idx",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xStartgroup" },
        ]
      },
      {
        name: "secondary",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSeries" },
          { name: "xStartgroup" },
        ]
      },
      {
        name: "fk_seriesStart_series1_idx",
        using: "BTREE",
        fields: [
          { name: "xSeries" },
        ]
      },
    ]
  });
};
