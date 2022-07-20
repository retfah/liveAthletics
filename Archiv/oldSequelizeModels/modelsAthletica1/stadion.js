/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('stadion', {
    xStadion: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    Name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ''
    },
    Bahnen: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '6'
    },
    BahnenGerade: {
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '8'
    },
    Ueber1000m: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'n'
    },
    Halle: {
      type: DataTypes.ENUM('y','n'),
      allowNull: false,
      defaultValue: 'n'
    }
  }, {
    tableName: 'stadion'
  });
};
