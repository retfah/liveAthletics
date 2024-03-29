const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return inscriptions.init(sequelize, DataTypes);
}

class inscriptions extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
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
      defaultValue: 0
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
  return inscriptions;
  }
}
