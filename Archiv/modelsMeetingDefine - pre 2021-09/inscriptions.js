import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('inscriptions', {
    xInscription: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xCategory: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'xCategory'
      }
    },
    number: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "bib"
    }
  }, {
    sequelize,
    tableName: 'inscriptions',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xInscription" },
        ]
      },
      {
        name: "fk_inscription_category1_idx",
        using: "BTREE",
        fields: [
          { name: "xCategory" },
        ]
      },
    ]
  });
};
