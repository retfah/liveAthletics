/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('rundenlog', {
    xRundenlog: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Zeit: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: '0000-00-00 00:00:00'
    },
    Ereignis: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    xRunde: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'rundenlog'
  });
};
