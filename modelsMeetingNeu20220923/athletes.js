import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class athletes extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('athletes', {
    xAthlete: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    lastname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    forename: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    birthdate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: "1900-01-01"
    },
    sex: {
      type: DataTypes.ENUM('f','m'),
      allowNull: true,
      defaultValue: "f"
    },
    xClub: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'clubs',
        key: 'xClub'
      }
    },
    identifier: {
      type: DataTypes.STRING(36),
      allowNull: true,
      comment: "varchar allows up to UUIDv4 and most integers"
    },
    nationalBody: {
      type: DataTypes.CHAR(3),
      allowNull: true
    },
    xRegion: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'regions',
        key: 'xRegion'
      }
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
    tableName: 'athletes',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xAthlete" },
        ]
      },
      {
        name: "uniqueBase",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "identifier" },
          { name: "nationalBody" },
        ]
      },
      {
        name: "fk_athlete_club1_idx",
        using: "BTREE",
        fields: [
          { name: "xClub" },
        ]
      },
      {
        name: "fk_athlete_regions1_idx",
        using: "BTREE",
        fields: [
          { name: "xRegion" },
        ]
      },
      {
        name: "fk_athletes_inscriptions1_idx",
        using: "BTREE",
        fields: [
          { name: "xInscription" },
        ]
      },
    ]
  });
  }
}
