/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('omega_typ', {
    xOMEGA_Typ: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0',
      primaryKey: true
    },
    OMEGA_Name: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: ''
    },
    OMEGA_Kurzname: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'omega_typ'
  });
};
