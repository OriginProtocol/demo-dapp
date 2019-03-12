'use strict'

const Sequelize = require('sequelize')

const enums = require('../enums')

module.exports = (sequelize, DataTypes) => {
  const GrowthEvent = sequelize.define(
    'GrowthEvent',
    {
      customId: DataTypes.STRING,
      type: DataTypes.ENUM(enums.GrowthEventTypes),
      status: DataTypes.ENUM(enums.GrowthEventStatuses),
      ethAddress: DataTypes.STRING,
      data: DataTypes.JSONB,
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      // Creation date
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    },
    {
      tableName: 'growth_event',
      // Do not automatically add the timestamp attributes (updatedAt, createdAt).
      timestamps: false
    }
  )

  return GrowthEvent
}
