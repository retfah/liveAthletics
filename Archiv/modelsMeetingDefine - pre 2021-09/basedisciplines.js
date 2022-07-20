import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default function(sequelize, DataTypes) {
  return sequelize.define('basedisciplines', {
    xBaseDiscipline: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    type: {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      comment: "an ID for the discipline module to use, e.g. run-in-lanes-wind, run-in-lanes-noWind, run-no-lanes, tech-long, tech-high. Using modules for the disciplines allows for flexibility with new disciplines, but it might add some difficulties, as the modules will hav eto implement their own tables, which means when activating\/deactivating the module, the DB has to be changed!"
    },
    relay: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "relays are a special discipline since it requires multiple athletes and therefore has a separate inscription"
    },
    nameStd: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ""
    },
    shortnameStd: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: ""
    }
  }, {
    sequelize,
    tableName: 'basedisciplines',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xBaseDiscipline" },
        ]
      },
    ]
  });
};
