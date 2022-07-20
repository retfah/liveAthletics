const Sequelize = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  return modules.init(sequelize, DataTypes);
}

class modules extends Sequelize.Model {
  static init(sequelize, DataTypes) {
  super.init({
    xModule: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    moduleName: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "moduleName_UNIQUE"
    },
    moduleActivated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    moduleType: {
      type: DataTypes.SMALLINT,
      allowNull: false
    }
  }, {
    sequelize,
    tableName: 'modules',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xModule" },
        ]
      },
      {
        name: "moduleName_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "moduleName" },
        ]
      },
    ]
  });
  return modules;
  }
}
