const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return competitions.init(sequelize, DataTypes);
}

class competitions extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xCompetition: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    competitionType: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
      comment: "die Art des \"Wettkampfes\"=der Wettkampftyp, zB: normal, SVM-LigaA, Kids-Cup, ... (Referenz wird als Nummer abgelegt)\nSMALLINT: damit es sicherlich immer reicht für alle Typen (65535 Werte möglich)"
    },
    competitionName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: "",
      comment: "Name zur leichteren Identifikation, kann ev auf Anzeigen, Online oder auf den Wettkampfblättern gebruacht werden"
    },
    competitionIsTeam: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0
    }
  }, {
    sequelize,
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
  return competitions;
  }
}
