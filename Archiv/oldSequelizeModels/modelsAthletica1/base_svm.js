/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('base_svm', {
    id_svm: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0',
      primaryKey: true
    },
    is_athletica_gen: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'y'
    },
    svm_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    svm_category: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: ''
    },
    account_code: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'base_svm'
  });
};
