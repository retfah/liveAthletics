import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class usersmeetings extends Model {
  static init(sequelize, DataTypes) {
  super.init({
    xUser: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'users',
        key: 'xUser'
      }
    },
    xMeeting: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'meetings',
        key: 'xMeeting'
      }
    }
  }, {
    sequelize,
    tableName: 'usersmeetings',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xUser" },
          { name: "xMeeting" },
        ]
      },
      {
        name: "xMeeting_idx",
        using: "BTREE",
        fields: [
          { name: "xMeeting" },
        ]
      },
    ]
  });
  return usersmeetings;
  }
}
