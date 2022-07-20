/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rundentyp_fr', {
    xRundentyp: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Typ: {
      type: DataTypes.CHAR(2),
      allowNull: false,
      defaultValue: '',
      unique: true
    },
    Name: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: '',
      unique: true
    },
    Wertung: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      defaultValue: '0'
    },
    Code: {
      type: DataTypes.CHAR(2),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'rundentyp_fr'
  });
};
