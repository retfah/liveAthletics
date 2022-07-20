import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class relays extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xRelay: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    relayName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    xClub: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'clubs',
        key: 'xClub'
      }
    },
    country: {
      type: DataTypes.CHAR(3),
      allowNull: false
    },
    xCategory: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "while an athlet has an birthdate, a relay simply has a category --> must be proven, that the athetes have the correct age at the date of the competition",
      references: {
        model: 'categories',
        key: 'xCategory'
      }
    },
    xBase: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "the ID of the relay in the base data, analog to the license of an athlete"
    },
    xInscription: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'inscriptions',
        key: 'xInscription'
      }
    }
  }, {
    sequelize,
    tableName: 'relays',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xRelay" },
          { name: "xClub" },
          { name: "xCategory" },
        ]
      },
      {
        name: "fk_relay_club1_idx",
        using: "BTREE",
        fields: [
          { name: "xClub" },
        ]
      },
      {
        name: "fk_relay_category1_idx",
        using: "BTREE",
        fields: [
          { name: "xCategory" },
        ]
      },
      {
        name: "fk_relays_inscriptions1_idx",
        using: "BTREE",
        fields: [
          { name: "xInscription" },
        ]
      },
    ]
  });
  return relays;
  }
}
