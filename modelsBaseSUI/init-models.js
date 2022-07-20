import _sequelize from "sequelize";
const DataTypes = _sequelize.DataTypes;
import _athletes from  "./athletes.js";
import _clubs from  "./clubs.js";
import _performances from  "./performances.js";

export default function initModels(sequelize) {
  const athletes = _athletes.init(sequelize, DataTypes);
  const clubs = _clubs.init(sequelize, DataTypes);
  const performances = _performances.init(sequelize, DataTypes);


  return {
    athletes,
    clubs,
    performances,
  };
}
