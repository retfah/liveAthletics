/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('videowand', {
    xVideowand: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    xMeeting: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    X: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Y: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    InhaltArt: {
      type: DataTypes.ENUM('dyn','stat'),
      allowNull: false,
      defaultValue: 'dyn'
    },
    InhaltStatisch: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    InhaltDynamisch: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    Aktualisierung: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0'
    },
    Status: {
      type: DataTypes.ENUM('black','white','active'),
      allowNull: false,
      defaultValue: 'active'
    },
    Hintergrund: {
      type: DataTypes.STRING(6),
      allowNull: false,
      defaultValue: ''
    },
    Fordergrund: {
      type: DataTypes.STRING(6),
      allowNull: false,
      defaultValue: ''
    },
    Bildnr: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '0'
    }
  }, {
    tableName: 'videowand'
  });
};
