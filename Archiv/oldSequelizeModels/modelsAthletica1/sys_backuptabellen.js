/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('sys_backuptabellen', {
    xBackup: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Tabelle: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    SelectSQL: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    tableName: 'sys_backuptabellen'
  });
};
