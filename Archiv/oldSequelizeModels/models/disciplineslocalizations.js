/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('disciplineslocalizations', {
    xDisciplinesLocalization: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xDiscipline: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'disciplines',
        key: 'xDiscipline'
      }
    },
    disciplinesLocalizationLanguage: {
      type: DataTypes.CHAR(2),
      allowNull: false
    },
    disciplinesLocalizationName: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    disciplinesLocalizationShortname: {
      type: DataTypes.STRING(20),
      allowNull: false
    }
  }, {
    tableName: 'disciplineslocalizations'
  });
};
