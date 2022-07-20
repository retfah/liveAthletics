import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class relaysathletes extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xRelayAthlete: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xAthlete: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'athletes',
        key: 'xAthlete'
      }
    },
    xRelay: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'relays',
        key: 'xRelay'
      }
    }
  }, {
    sequelize,
    tableName: 'relaysathletes',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xRelayAthlete" },
        ]
      },
      {
        name: "Secondary",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xAthlete" },
          { name: "xRelay" },
        ]
      },
      {
        name: "fk_relaysAthletes_relays1_idx",
        using: "BTREE",
        fields: [
          { name: "xRelay" },
        ]
      },
    ]
  });
  return relaysathletes;
  }
}
