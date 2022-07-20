/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('anlage', {
    xAnlage: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Bezeichnung: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: ''
    },
    Homologiert: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'y'
    },
    xStadion: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'anlage'
  });
};
