import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class relayathletepositions extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xRelayAthlete: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'relaysathletes',
        key: 'xRelayAthlete'
      }
    },
    xStartgroup: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'startgroup',
        key: 'xStartgroup'
      }
    },
    relayAthletePosition: {
      type: DataTypes.SMALLINT.UNSIGNED,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'relayathletepositions',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xRelayAthlete" },
          { name: "xStartgroup" },
        ]
      },
      {
        name: "fk_relayAthletePositions_relaysAthletes1_idx",
        using: "BTREE",
        fields: [
          { name: "xRelayAthlete" },
        ]
      },
      {
        name: "fk_relayAthletePositions_startGroup1_idx",
        using: "BTREE",
        fields: [
          { name: "xStartgroup" },
        ]
      },
    ]
  });
  return relayathletepositions;
  }
}
