/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('teamsmathlet', {
    xTeamsm: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0',
      primaryKey: true
    },
    xAnmeldung: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0',
      primaryKey: true
    }
  }, {
    tableName: 'teamsmathlet'
  });
};
