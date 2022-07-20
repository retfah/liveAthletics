import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class sites extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xSite: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'sites_track',
        key: 'xSite'
      }
    },
    siteName: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: ""
    },
    Homologiert: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    siteIsTrack: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    }
  }, {
    sequelize,
    tableName: 'sites',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xSite" },
        ]
      },
    ]
  });
  return sites;
  }
}
