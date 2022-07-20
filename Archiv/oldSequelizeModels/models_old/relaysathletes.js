/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('relaysathletes', {
    xRelayAthlete: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xInscription_athlete: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'inscription_athletes',
        key: 'xInscription_athlete'
      }
    },
    xInscription_relay: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'inscription_relays',
        key: 'xInscription_relay'
      }
    }
  }, {
    tableName: 'relaysathletes'
  });
};
