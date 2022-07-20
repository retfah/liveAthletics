/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('teaminscriptions', {
    xInscription: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'inscriptions',
        key: 'xInscription'
      }
    },
    xCompetition: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'competitions',
        key: 'xCompetition'
      }
    },
    xTeam: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'teams',
        key: 'xTeam'
      }
    }
  }, {
    tableName: 'teaminscriptions'
  });
};
