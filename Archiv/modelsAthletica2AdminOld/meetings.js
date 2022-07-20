/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('meetings', {
    xMeeting: {
      type: DataTypes.INTEGER(10).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'xMeeting'
    },
    name: {
      type: DataTypes.STRING(75),
      allowNull: false,
      defaultValue: '',
      field: 'name'
    },
    shortname: {
      type: DataTypes.STRING(10),
      allowNull: false,
      unique: true,
      field: 'shortname'
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'code'
    },
    active: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      field: 'active'
    },
    isSlave: {
      type: DataTypes.INTEGER(1),
      allowNull: false,
      defaultValue: '0',
      field: 'isSlave'
    },
    masterAddress: {
      type: DataTypes.STRING(100),
      allowNull: false,
      defaultValue: '',
      field: 'masterAddress'
    },
    masterUsername: {
      type: DataTypes.STRING(45),
      allowNull: false,
      defaultValue: 'default',
      field: 'masterUsername'
    },
    masterPassword: {
      type: DataTypes.STRING(45),
      allowNull: false,
      defaultValue: '',
      field: 'masterPassword'
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
    /*instanceMethods:{
      toJSON: function(){stringify all data properties, but no background properties}, // it seems like sequelize is having its own toJSON method, which only stringifies the data properties. As we manually add 'running' to the instance, 'running' would not be strinified. Thus we could hereby override the toJSON method. However, adding a virtual property does the same and is easier. 
    }*/
    
  });
};
