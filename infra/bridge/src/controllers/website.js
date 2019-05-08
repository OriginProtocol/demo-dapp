'use strict'

const express = require('express')
const router = express.Router()
const request = require('superagent')
const get = require('lodash/get')

const Attestation = require('../models/index').Attestation
const AttestationTypes = Attestation.AttestationTypes
const { generateAttestation } = require('../utils/attestation')
const { generateWebsiteCode } = require('../utils')
const logger = require('../logger')

router.get('/generate-code', async (req, res) => {
  const code = generateWebsiteCode(req.query.identity, req.query.websiteHost)
  res.send({ code })
})

router.post('/verify', async (req, res) => {
  const { identity, websiteHost } = req.body
  const code = generateWebsiteCode(identity, websiteHost)

  // Ignore the pathname and query params in the URL and 
  // check if the file exists in the root of the domain
  const remoteOrigin = (new URL(websiteHost)).origin
  const remoteFileURL = `${remoteOrigin}/${identity}.html`

  let response
  try {
    response = await request.get(remoteFileURL)
  } catch (error) {
    const statusCode = get(error, 'response.status')
    if (statusCode === 404) {
      logger.warn(
        `File`
      )
      return res.status(400).send({
        errors: [`File "${identity.html}" was not found in remote host.`]
      })
    } else {
      return res.status(500).send({
        errors: [`Could not fetch website at '${remoteOrigin}'.`]
      })
    }
  }

  if (response.text.trim() !== code) {
    return res.status(400).send({
      errors: [
        `Origin verification code "${code}" was not found.`
      ]
    })
  }

  const attestationBody = {
    verificationMethod: {
      pubAuditableUrl: {
        proofUrl: remoteFileURL
      }
    },
    // TBD: Should `site` attribute be used for this instead of `domain`?
    domain: {
      verified: true
    }
  }

  const attestation = await generateAttestation(
    AttestationTypes.WEBSITE,
    attestationBody,
    remoteOrigin,
    req.body.identity,
    req.ip
  )

  return res.send(attestation)
})

module.exports = router
