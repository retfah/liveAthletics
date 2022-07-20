/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('categories', {
    xCategory: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    categoryShortname: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: '',
      unique: true
    },
    categoryName: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ''
    },
    categorySortorder: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      defaultValue: '1'
    },
    sex: {
      type: DataTypes.ENUM('m','w'),
      allowNull: false,
      defaultValue: 'm'
    }
  }, {
    tableName: 'categories'
  });
};
