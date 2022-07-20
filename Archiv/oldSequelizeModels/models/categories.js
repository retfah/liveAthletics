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
    age: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false,
      defaultValue: '99'
    },
    categoryCode: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: ''
    },
    sex: {
      type: DataTypes.ENUM('m','w'),
      allowNull: false,
      defaultValue: 'm'
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '1'
    }
  }, {
    tableName: 'categories'
  });
};
