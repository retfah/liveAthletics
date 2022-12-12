import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class competitions extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('competitions', {
    xCompetition: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    type: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "die Art des \"Wettkampfes\"=der Wettkampftyp, zB: normal, SVM-LigaA, Kids-Cup, ... (Referenz wird als Nummer abgelegt)\nSMALLINT: damit es sicherlich immer reicht für alle Typen (65535 Werte möglich)"
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "",
      comment: "Name zur leichteren Identifikation, kann ev auf Anzeigen, Online oder auf den Wettkampfblättern gebruacht werden"
    },
    teamCompetition: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    tableName: 'competitions',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xCompetition" },
        ]
      },
    ]
  });
  }
}
