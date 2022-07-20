/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('inscription_relays', {
    xInscription_relay: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'inscriptions',
        key: 'xInscription'
      }
    },
    xRelay: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'relays',
        key: 'xRelay'
      }
    }
  }, {
    tableName: 'inscription_relays'
  });
};
