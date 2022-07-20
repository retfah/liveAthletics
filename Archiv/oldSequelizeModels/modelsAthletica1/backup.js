/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('backup', {
    Backup_Pfad: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    Backup_Intervall: {
      type: DataTypes.INTEGER(3),
      allowNull: false,
      defaultValue: '30'
    },
    Backup_Zuletzt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: '0000-00-00 00:00:00'
    }
  }, {
    tableName: 'backup'
  });
};
