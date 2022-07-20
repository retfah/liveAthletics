/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('relayathletepositions', {
    xRound: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'rounds',
        key: 'xRound'
      }
    },
    xRelayAthlete: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'relaysathletes',
        key: 'xRelayAthlete'
      }
    },
    relayAthletePosition: {
      type: DataTypes.INTEGER(5).UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'relayathletepositions'
  });
};
