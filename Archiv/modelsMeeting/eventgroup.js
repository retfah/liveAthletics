import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class eventgroup extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xEventGroup: {
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
    eventGroupName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ""
    },
    isCombined: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "this means it is a combined event (heptathlon, ...) --> prevents having multiple rounds as there every discipline has only one round"
    }
  }, {
    sequelize,
    tableName: 'eventgroup',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xEventGroup" },
        ]
      },
      {
        name: "fk_contest_disciplineType1_idx",
        using: "BTREE",
        fields: [
          { name: "xDiscipline" },
        ]
      },
    ]
  });
  return eventgroup;
  }
}
