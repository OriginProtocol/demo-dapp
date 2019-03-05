'use strict'

const express = require('express')
const router = express.Router()
const request = require('superagent')
const get = require('lodash/get')

const Attestation = require('../models/index').Attestation
const AttestationTypes = Attestation.AttestationTypes
const { airbnbGenerateCode, airbnbVerifyCode } = require('../utils/validation')
const { generateAttestation } = require('../utils/attestation')
const { generateAirbnbCode } = require('../utils')
const logger = require('../logger')

/* Generate a deterministic six word code from the Airbnb user id.
 *
 */
router.get('/generate-code', airbnbGenerateCode, async (req, res) => {
  const code = generateAirbnbCode(req.query.identity, req.query.airbnbUserId)
  res.send({ code: code })
})

/* Verify a code generated by the /airbnb/generate-code route.
 *
 */
router.post('/verify', airbnbVerifyCode, async (req, res) => {
  const code = generateAirbnbCode(req.body.identity, req.body.airbnbUserId)

  let response
  try {
    response = await request.get(
      `https://www.airbnb.com/users/show/${req.body.airbnbUserId}`
    )
  } catch (error) {
    const statusCode = get(error, 'response.status')
    if (statusCode === 404) {
      logger.warn(
        `Attestation attempt for invalid Airbnb user: ${req.body.airbnbUserId}`
      )
      return res.status(400).send({
        errors: ['Airbnb user not found.']
      })
    } else {
      return res.status(500).send({
        errors: ['Could not fetch Airbnb profile.']
      })
    }
  }

  if (!response.text.includes(code)) {
    return res.status(400).send({
      errors: [
        `Origin verification code "${code}" was not found in Airbnb profile.`
      ]
    })
  }

  const attestationBody = {
    verificationMethod: {
      pubAuditableUrl: {}
    },
    site: {
      siteName: 'airbnb.com',
      userId: {
        raw: req.body.airbnbUserId
      }
    }
  }

  const attestation = await generateAttestation(
    AttestationTypes.AIRBNB,
    attestationBody,
    req.body.airbnbUserId,
    req.body.identity,
    req.ip
  )

  return res.send(attestation)
})

module.exports = router
