import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('teams', {
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
    name: {
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
    perf: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "e.g. last year performance; eventually needed for setting series"
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
};
