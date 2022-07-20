const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return contest.init(sequelize, DataTypes);
}

class contest extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xContest: {
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
    contestDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: "1900-01-01"
    },
    contestTimeAppeal: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: "00:00:00"
    },
    contestTimeCall: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: "00:00:00"
    },
    contestTimeStart: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: "00:00:00"
    },
    contestStatus: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "Startliste\/Appell gemacht\/Serien eingeteilt\/Resultate erfasst\/..."
    }
  }, {
    sequelize,
    tableName: 'contest',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xContest" },
        ]
      },
      {
        name: "fk_contest_disciplines1_idx",
        using: "BTREE",
        fields: [
          { name: "xDiscipline" },
        ]
      },
    ]
  });
  return contest;
  }
}
