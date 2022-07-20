/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('kategorie_svm', {
    xKategorie_svm: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ''
    },
    Code: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'kategorie_svm'
  });
};
