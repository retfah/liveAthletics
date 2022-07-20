/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('baseathletes', {
    idAthlete: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id_athlete'
    },
    license: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      defaultValue: '0',
      field: 'license'
    },
    licensePaid: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      defaultValue: '1',
      field: 'license_paid'
    },
    licenseCat: {
      type: DataTypes.STRING(4),
      allowNull: false,
      defaultValue: '',
      field: 'license_cat'
    },
    lastname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      field: 'lastname'
    },
    firstname: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      field: 'firstname'
    },
    sex: {
      type: DataTypes.ENUM('m','w'),
      allowNull: false,
      defaultValue: 'm',
      field: 'sex'
    },
    nationality: {
      type: DataTypes.CHAR(3),
      allowNull: false,
      defaultValue: '',
      field: 'nationality'
    },
    accountCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: '',
      field: 'account_code'
    },
    secondAccountCode: {
      type: DataTypes.STRING(30),
      allowNull: false,
      defaultValue: '',
      field: 'second_account_code'
    },
    birthDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: '1900-01-01',
      field: 'birth_date'
    },
    accountInfo: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: '',
      field: 'account_info'
    }
  }, {
    tableName: 'baseathletes'
  });
};
