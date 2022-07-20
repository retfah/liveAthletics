import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('combinedevents', {
    xCombinedEvent: {
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
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "\"\""
    },
    type: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      comment: "here the type of the combinedEvent is stored (like 7-Kampf, 10-Kampf, custom) --> the disciplines that should be connected to this type are defined in a conf-file (but not mandatory for all combinedEventTypes, to allow custom combined Events)\ncustom = ...KAMPF"
    },
    xConversion: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'conversions',
        key: 'xConversion'
      }
    }
  }, {
    sequelize,
    tableName: 'combinedevents',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xCombinedEvent" },
        ]
      },
      {
        name: "fk_event_conversion1_idx",
        using: "BTREE",
        fields: [
          { name: "xConversion" },
        ]
      },
      {
        name: "fk_combinedEvents_categories1_idx",
        using: "BTREE",
        fields: [
          { name: "xCategory" },
        ]
      },
    ]
  });
};
