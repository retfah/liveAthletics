import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class meetings extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('meetings', {
    xMeeting: {
      autoIncrement: true,
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(75),
      allowNull: false,
      defaultValue: ""
    },
    shortname: {
      type: DataTypes.STRING(10),
      allowNull: false,
      comment: "The shortname used for the database name and to identify the meeting. It is the same on master and slave and this name is the one stored in the Client-cookie (if needed). Thereby transferring a session from the master to a slave is easier, when the meeting identificator does not change",
      unique: "shortname_UNIQUE"
    },
    location: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      comment: "is this meeting active (i.e. should the rooms get loaded)"
    },
    dateFrom: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: "is this the master, i.e. does is store incoming data other than those from the master"
    },
    dateTo: {
      type: DataTypes.DATEONLY,
      allowNull: true
},
    // add a virtual property that is not stored in the DB: we need to add the property here such that the default toJSON function of sequelize also stringifies this property. Usually ot would not stringify it. We could override this with an instanceMethod "toJSON" (see commented below), but this would be more compicated
    running: {
      type: DataTypes.VIRTUAL,
      allowNull: false,
      defaultValue: false,
      //field: null
    }
  }, {
    tableName: 'meetings',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "xMeeting" },
        ]
      },
      {
        name: "shortname_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "shortname" },
        ]
      },
    ]
  });
  }
}
