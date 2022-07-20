/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('qualifications', {
    xQualification: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    qualif_type: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false
    },
    qualificationFromRound: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'rounds',
        key: 'xRound'
      }
    },
    qualificationToRound: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'rounds',
        key: 'xRound'
      }
    },
    qualif_conf: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    tableName: 'qualifications'
  });
};
