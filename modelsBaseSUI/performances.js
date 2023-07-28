import _sequelize from 'sequelize';
const { Model, Sequelize } = _sequelize;

export default class performances extends Model {
  static init(sequelize, DataTypes) {
  return sequelize.define('performances', {
    license: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true
    },
    discipline: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "ATTENTION: this is not the same ID as in the competition DB. There will have to be a translation function for baseDisciplineIDs to liveAthleteicsIDs"
    },
    xDiscipline: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      primaryKey: true,
      comment: "xDiscipline as in the competition"
    },
    bestEffort: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: "",
      comment: "personal best\ntranslation to the internal datatype will be done on request. This is probably more efficient then translating during baseDataUpdates, since most of the base data will never be used until it is updated again."
    },
    bestEffortDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: "1900-01-01"
    },
    bestEffortEvent: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    seasonEffort: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: "",
      comment: "seasonal best: relly just the current season (probably even correctly indoor\/outdoor separated)\ntranslation to the internal datatype will be done on request. This is probably more efficient then translating during baseDataUpdates, since most of the base data will never be used until it is updated again."
    },
    seasonEffortDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: "1900-01-01"
    },
    seasonEffortEvent: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    notificationEffort: {
      type: DataTypes.STRING(15),
      allowNull: false,
      defaultValue: "",
      comment: "notification effort: the best of the last two years, including indoor and outdoor in the same field (at least in 2020 the data was provided like this by alabus)\ntranslation to the internal datatype will be done on request. This is probably more efficient then translating during baseDataUpdates, since most of the base data will never be used until it is updated again."
    },
    notificationEffortDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: "1900-01-01"
    },
    notificationEffortEvent: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: ""
    },
    season: {
      type: DataTypes.ENUM('I','O'),
      allowNull: false,
      defaultValue: "O",
      primaryKey: true
    }
  }, {
    tableName: 'performances',
    timestamps: false,
    indexes: [
      {
        name: "PRIMARY",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "license" },
          { name: "discipline" },
          { name: "season" },
        ]
      },
      {
        name: "license_UNIQUE",
        unique: true,
        using: "BTREE",
        fields: [
          { name: "license" },
        ]
      },
    ]
  });
  }
}
