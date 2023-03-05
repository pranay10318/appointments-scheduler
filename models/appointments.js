"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class appointments extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      appointments.belongsTo(models.Admin, {
        foreignKey: "adminId",
      });
    }
    static addAppointment({ description, startTime, endTime, adminId }) {
      //refactoring for business logic and we can add a todo at any endpoint
      return this.create({
        description,
        startTime,
        endTime,
        adminId,
      }); //userId shorthand property  for attribut and value same in javascript
    }
    static getAppointments(adminId) {
      return this.findAll({
        order: ["startTime"],
        where: {
          adminId,
        },
      }); //from sequelize package  donot confuse bro
    }
    static deleteAppointment(id, adminId) {
      return this.destroy({
        where: {
          id: id,
          adminId,
        },
      });
    }

    static async editAppointmentName(id, adminId, description) {
      return this.update(
        { description: description },
        {
          where: {
            id,
            adminId,
          },
        }
      );
    }
  }
  appointments.init(
    {
      description: DataTypes.STRING,
      startTime: DataTypes.TIME,
      endTime: DataTypes.TIME,
    },
    {
      sequelize,
      modelName: "appointments",
    }
  );
  return appointments;
};
