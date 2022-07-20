import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class teams extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xTeam: {
      type: DataTypes.INTEGER.UNSIGNED.ZEROFILL,
      allowNull: false,
      primaryKey: true
    },
    xCompetition: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      comment: "really necessary?",
      references: {
        model: 'competitions',
        key: 'xCompetition'
      }
    },
    teamName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    xClub: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'clubs',
        key: 'xClub'
      }
    },
    Perf: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
    tableName: 'teams',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xTeam" },
        ]
      },
      {
        name: "fk_teams_clubs1_idx",
        using: "BTREE",
        fields: [
          { name: "xClub" },
        ]
      },
      {
        name: "fk_teams_competitions1_idx",
        using: "BTREE",
        fields: [
          { name: "xCompetition" },
        ]
      },
    ]
  });
  return teams;
  }
}
