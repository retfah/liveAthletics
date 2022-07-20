/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('kategorie', {
    xKategorie: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Kurzname: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: '',
      unique: true
    },
    Name: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ''
    },
    Anzeige: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '1'
    },
    Alterslimite: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '99'
    },
    Code: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: ''
    },
    Geschlecht: {
      type: DataTypes.ENUM('m','w'),
      allowNull: false,
      defaultValue: 'm'
    },
    aktiv: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'y'
    },
    UKC: {
      type: DataTypes.ENUM('y','n'),
      allowNull: true,
      defaultValue: 'n'
    }
  }, {
    tableName: 'kategorie'
  });
};
