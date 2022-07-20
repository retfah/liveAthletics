/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('clubs', {
    xClub: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    clubName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      unique: true
    },
    clubSortvalue: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '0'
    },
    usercode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: ''
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'clubs'
  });
};
