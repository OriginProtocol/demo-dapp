const { getSiteConfig } = require('../config')
const mjml2html = require('mjml')
const nodemailer = require('nodemailer')
const aws = require('aws-sdk')

const cartData = require('./cartData')
const encConf = require('./encryptedConfig')
const { SUPPORT_EMAIL_OVERRIDE } = require('./const')

const head = require('./templates/head')
const vendor = require('./templates/vendor')
const email = require('./templates/email')
const emailTxt = require('./templates/emailTxt')
const orderItem = require('./templates/orderItem')
const orderItemTxt = require('./templates/orderItemTxt')

function formatPrice(num) {
  return `$${(num / 100).toFixed(2)}`
}

function optionsForItem(item) {
  const options = []
  if (item.product.options && item.product.options.length && item.variant) {
    item.product.options.forEach((opt, idx) => {
      options.push(`${opt}: ${item.variant.options[idx]}`)
    })
  }
  return options
}

async function sendMail(shopId, cart, skip) {
  const config = await encConf.dump(shopId)
  if (!config.email || config.email === 'disabled') {
    console.log('Emailer disabled')
  }

  let transporter
  if (config.email === 'sendgrid') {
    let auth
    if (config.sendgridApiKey) {
      auth = {
        user: 'apikey',
        pass: config.sendgridApiKey
      }
    } else {
      auth = {
        user: config.sendgridUsername,
        pass: config.sendgridPassword
      }
    }
    transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth
    })
  } else if (config.email === 'sendgrid') {
    transporter = nodemailer.createTransport({
      host: config.mailgunSmtpServer,
      port: config.mailgunSmtpPort,
      auth: {
        user: config.mailgunSmtpLogin,
        pass: config.mailgunSmtpPassword
      }
    })
  } else if (config.email === 'aws') {
    const SES = new aws.SES({
      apiVersion: '2010-12-01',
      region: 'us-east-1',
      accessKeyId: config.awsAccessKey,
      secretAccessKey: config.awsAccessSecret
    })
    transporter = nodemailer.createTransport({ SES })
  } else {
    transporter = nodemailer.createTransport({ sendmail: true })
  }

  const dataURL = config.dataUrl
  let publicURL = config.publicUrl
  const data = await getSiteConfig(dataURL)
  const items = await cartData(dataURL, cart.items)

  const orderItems = items.map(item => {
    const img = item.variant.image || item.product.image
    const options = optionsForItem(item)
    return orderItem({
      img: `${dataURL}${item.product.id}/520/${img}`,
      title: item.product.title,
      quantity: item.quantity,
      price: formatPrice(item.price),
      options: options.length
        ? `<div class="options">${options.join(', ')}</div>`
        : ''
    })
  })

  const orderItemsTxt = items.map(item => {
    const options = optionsForItem(item)
    return orderItemTxt({
      title: item.product.title,
      quantity: item.quantity,
      price: formatPrice(item.price),
      options: options.length ? `\n(${options.join(', ')})` : ''
    })
  })

  let supportEmailPlain = SUPPORT_EMAIL_OVERRIDE || data.supportEmail
  if (supportEmailPlain.match(/<([^>]+)>/)[1]) {
    supportEmailPlain = supportEmailPlain.match(/<([^>]+)>/)[1]
  }

  if (!data.absolute) {
    publicURL += '/#'
  }

  const vars = {
    head,
    siteName: data.fullTitle || data.title,
    supportEmail: SUPPORT_EMAIL_OVERRIDE || data.supportEmail,
    supportEmailPlain,
    subject: data.emailSubject,
    storeUrl: publicURL,

    orderNumber: cart.offerId,
    firstName: cart.userInfo.firstName,
    lastName: cart.userInfo.lastName,
    email: cart.userInfo.email,
    orderUrl: `${publicURL}/order/${cart.tx}?auth=${cart.dataKey}`,
    orderUrlAdmin: `${publicURL}/admin/orders/${cart.offerId}`,
    orderItems,
    orderItemsTxt,
    subTotal: formatPrice(cart.subTotal),
    hasDiscount: cart.discount > 0 ? true : false,
    discount: formatPrice(cart.discount),
    shipping: formatPrice(cart.shipping.amount),
    total: formatPrice(cart.total),
    shippingAddress: [
      `${cart.userInfo.firstName} ${cart.userInfo.lastName}`,
      `${cart.userInfo.address1}`,
      `${cart.userInfo.city} ${cart.userInfo.province} ${cart.userInfo.zip}`,
      `${cart.userInfo.country}`
    ],
    billingAddress: [
      `${cart.userInfo.firstName} ${cart.userInfo.lastName}`,
      `${cart.userInfo.address1}`,
      `${cart.userInfo.city} ${cart.userInfo.province} ${cart.userInfo.zip}`,
      `${cart.userInfo.country}`
    ],
    shippingMethod: cart.shipping.label,
    paymentMethod: cart.paymentMethod.label
  }

  const htmlOutputVendor = mjml2html(vendor(vars), { minify: true })
  const htmlOutput = mjml2html(email(vars), { minify: true })
  const txtOutput = emailTxt(vars)

  const message = {
    from: vars.supportEmail,
    to: `${vars.firstName} ${vars.lastName} <${vars.email}>`,
    subject: vars.subject,
    html: htmlOutput.html,
    text: txtOutput
  }

  const messageVendor = {
    from: vars.supportEmail,
    to: vars.supportEmail,
    subject: `[${vars.siteName}] Order #${cart.offerId}`,
    html: htmlOutputVendor.html,
    text: txtOutput
  }

  if (!skip) {
    transporter.sendMail(message, (err, msg) => {
      if (err) {
        console.log('Error sending user confirmation email')
        console.log(err)
      } else {
        console.log(msg.envelope)
      }
    })
    transporter.sendMail(messageVendor, (err, msg) => {
      if (err) {
        console.log('Error sending merchant confirmation email')
        console.log(err)
      } else {
        console.log(msg.envelope)
      }
    })
  }

  return message
}

module.exports = sendMail
