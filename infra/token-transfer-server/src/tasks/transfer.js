const moment = require('moment')
const Sequelize = require('sequelize')

const {
  largeTransferThreshold,
  largeTransferDelayMinutes
} = require('../config')
const { Transfer, TransferTask, sequelize } = require('../models')
const { executeTransfer } = require('../lib/transfer')
const logger = require('../logger')
const enums = require('../enums')

const executeTransfers = async () => {
  logger.info('Running execute transfers job...')

  const transferTask = await sequelize.transaction(
    { isolationLevel: Sequelize.Transaction.ISOLATION_LEVELS.SERIALIZABLE },
    async txn => {
      const outstandingTasks = await TransferTask.findAll(
        {
          where: {
            end: null
          }
        },
        { transaction: txn }
      )
      if (outstandingTasks.length > 0) {
        logger.warn(
          `Found incomplete transfer task(s), wait for completion or clean up manually.`
        )
        return false
      }

      const waitingTransfers = await Transfer.findAll(
        {
          where: {
            [Sequelize.Op.or]: [
              {
                status: enums.TransferStatuses.WaitingConfirmation
              },
              {
                status: enums.TransferStatuses.Processing
              }
            ]
          }
        },
        { transaction: txn }
      )
      if (waitingTransfers.length > 0) {
        logger.warn(
          `Found unconfirmed transfer(s). Fix before running this script again.`
        )
        return false
      }

      const now = moment.utc()
      return await TransferTask.create(
        {
          start: now,
          created_at: now,
          updated_at: now
        },
        { transaction: txn }
      )
    }
  )

  if (!transferTask) return

  const cutoffTime = moment.utc().subtract(largeTransferDelayMinutes, 'minutes')
  const transfers = await Transfer.findAll({
    where: {
      [Sequelize.Op.or]: [
        {
          status: enums.TransferStatuses.Enqueued,
          amount: { [Sequelize.Op.gte]: largeTransferThreshold },
          createdAt: { [Sequelize.Op.lte]: cutoffTime }
        },
        {
          status: enums.TransferStatuses.Enqueued,
          amount: { [Sequelize.Op.lt]: largeTransferThreshold }
        }
      ]
    }
  })

  logger.info(`Processing ${transfers.length} transfers`)

  for (const transfer of transfers) {
    logger.info(`Processing transfer ${transfer.id}`)
    const result = await executeTransfer(transfer, transferTask.id)
    logger.info(
      `Processed transfer ${transfer.id}. Status: ${result.txStatus} TxHash: ${result.txHash}`
    )
  }

  await transferTask.update({
    end: moment.utc()
  })
}

module.exports = {
  executeTransfers
}
