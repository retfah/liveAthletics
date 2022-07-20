/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('wettkampf', {
    xWettkampf: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Typ: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    Haftgeld: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    Startgeld: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    Punktetabelle: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: '0'
    },
    Punkteformel: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '0'
    },
    Windmessung: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    Info: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    Zeitmessung: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    ZeitmessungAuto: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    xKategorie: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '1'
    },
    xDisziplin: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '1'
    },
    xMeeting: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '1'
    },
    Mehrkampfcode: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Mehrkampfende: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    Mehrkampfreihenfolge: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    },
    xKategorie_svm: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    OnlineId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    TypAenderung: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'wettkampf'
  });
};
