/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('layout', {
    xLayout: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    BildT: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    TypTL: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    TextTL: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    BildTL: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    TypTC: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    TextTC: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    BildTC: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    TypTR: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    TextTR: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    BildTR: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    BildB: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    TypBL: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    TextBL: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    BildBL: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    TypBC: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    TextBC: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    BildBC: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    TypBR: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    TextBR: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    BildBR: {
      type: DataTypes.STRING(255),
      allowNull: false,
      defaultValue: ''
    },
    xMeeting: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'layout'
  });
};
