/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('disciplines', {
    xDiscipline: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    disciplineSortorder: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      defaultValue: '1'
    },
    disciplineIndoor: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    },
    disciplineType: {
      type: DataTypes.INTEGER(3).UNSIGNED,
      allowNull: false
    },
    disciplineTimeAppeal: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '00:00:00'
    },
    disciplineTimeCall: {
      type: DataTypes.TIME,
      allowNull: false,
      defaultValue: '00:00:00'
    },
    disciplineDistance: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: '0'
    },
    disciplineWind: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    },
    disciplineActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '1'
    },
    disciplineRelay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: '0'
    },
    disciplineNameStd: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: '',
      unique: true
    },
    disciplineShortnameStd: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: ''
    }
  }, {
    tableName: 'disciplines'
  });
};
