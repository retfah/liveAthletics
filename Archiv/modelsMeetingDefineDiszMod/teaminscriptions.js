import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('teaminscriptions', {
    xInscription: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'inscriptions',
        key: 'xInscription'
      }
    },
    xTeam: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'teams',
        key: 'xTeam'
      }
    }
  }, {
    sequelize,
    tableName: 'teaminscriptions',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xInscription" },
          { name: "xTeam" },
        ]
      },
      {
        name: "fk_teamInscriptions_teams1_idx",
        using: "BTREE",
        fields: [
          { name: "xTeam" },
        ]
      },
    ]
  });
};
