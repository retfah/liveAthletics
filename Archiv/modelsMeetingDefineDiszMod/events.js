import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('events', {
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
      comment: "I think it is ok like this; but eventually we want to have the possibility for multiple categories per event for some reason. Then an additional table with the categories per ventu would be needed. ",
      references: {
        model: 'categories',
        key: 'xCategory'
      }
    },
    xEventGroup: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: {
        model: 'eventgroups',
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
    onlineId: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0
    },
    date: {
      type: DataTypes.DATE,
      allowNull: true
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
};
