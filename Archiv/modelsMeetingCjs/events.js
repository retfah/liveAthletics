const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return events.init(sequelize, DataTypes);
}

class events extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xEvent: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    xDiscipline: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'disciplines',
        key: 'xDiscipline'
      }
    },
    xCategory: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      references: {
        model: 'categories',
        key: 'xCategory'
      }
    },
    xEventGroup: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'eventgroup',
        key: 'xEventGroup'
      }
    },
    entryFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    bailFee: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0
    },
    eventOnlineId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    info: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'events',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xEvent" },
        ]
      },
      {
        name: "fk_discipline_disciplineType1_idx",
        using: "BTREE",
        fields: [
          { name: "xDiscipline" },
        ]
      },
      {
        name: "fk_discipline_category1_idx",
        using: "BTREE",
        fields: [
          { name: "xCategory" },
        ]
      },
      {
        name: "fk_events_eventGroup1_idx",
        using: "BTREE",
        fields: [
          { name: "xEventGroup" },
        ]
      },
    ]
  });
  return events;
  }
}
