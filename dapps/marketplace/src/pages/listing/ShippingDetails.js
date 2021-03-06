import React, { useState, useCallback } from 'react'

import { fbt } from 'fbt-runtime'

import pick from 'lodash/pick'

import { withRouter } from 'react-router-dom'

import DocumentTitle from 'components/DocumentTitle'
import Redirect from 'components/Redirect'
import MobileModalHeader from 'components/MobileModalHeader'

import withIsMobile from 'hoc/withIsMobile'
import withWallet from 'hoc/withWallet'

import { formInput, formFeedback } from 'utils/formHelpers'

import Store from 'utils/store'

const localStore = Store('localStorage')

const ShippingDetails = ({
  listing,
  isMobile,
  history,
  next,
  updateShippingAddress,
  walletProxy
}) => {
  const storageKey = `${walletProxy}-shipping-address`

  const [inputState, setInputState] = useState(localStore.get(storageKey, {}))
  const [valid, setValid] = useState(null)
  const [redirect, setRedirect] = useState(false)

  const storeShippingAddress = useCallback(shippingAddress => {
    localStore.set(storageKey, shippingAddress)
  }, [])

  const input = formInput(
    inputState,
    useCallback(
      state => {
        const newState = { ...inputState, ...state }
        setInputState(newState)
        storeShippingAddress(newState)
      },
      [inputState]
    )
  )
  const Feedback = formFeedback(inputState)

  const validate = useCallback(() => {
    const newState = {}

    const stringFields = ['address1', 'city', 'stateProvinceRegion', 'country']

    for (const strField of stringFields) {
      if (!inputState[strField] || !inputState[strField].trim()) {
        newState[`${strField}Error`] = fbt(
          'This field is required',
          'This field is required'
        )
      }
    }

    const valid = Object.keys(newState).every(f => f.indexOf('Error') < 0)

    setInputState({
      ...inputState,
      ...newState
    })
    setValid(valid)

    return valid
  }, [valid, inputState])

  if (!listing) {
    return <Redirect to="/" />
  } else if (!listing.requiresShipping || redirect) {
    return <Redirect to={next} push />
  }

  return (
    <div className="container confirm-shipping-address">
      <DocumentTitle>{listing.title}</DocumentTitle>
      {!isMobile ? (
        <h1>
          <fbt desc="PurchaseListing.shippingAddressTitle">
            Shipping Address
          </fbt>
        </h1>
      ) : (
        <MobileModalHeader
          onBack={() => {
            history.goBack()
          }}
        >
          <fbt desc="PurchaseListing.shippingAddress">Shipping Address</fbt>
        </MobileModalHeader>
      )}
      <div className="form-container">
        <form
          className="shipping-address-form"
          onSubmit={e => {
            e.preventDefault()
            if (validate()) {
              updateShippingAddress(
                pick(inputState, [
                  'name',
                  'address1',
                  'address2',
                  'city',
                  'stateProvinceRegion',
                  'country',
                  'postalCode',
                  'instructions'
                ])
              )

              setRedirect(true)
            } else {
              window.scrollTo(0, 0)
            }
          }}
        >
          {isMobile ? null : (
            <h2>
              <fbt desc="PurchaseListing.shippingAddress">Shipping Address</fbt>
            </h2>
          )}
          <div className="desc">
            <fbt desc="PurchaseListing.enterShippingAddress">
              Let the seller know where to send your item.
            </fbt>
          </div>
          {valid !== false ? null : (
            <div className="alert alert-danger">
              <fbt desc="errorsInSubmissions">
                There were some errors with your shipping address. Please fix
                them to continue.
              </fbt>
            </div>
          )}
          <div className="form-group">
            <label>
              <fbt desc="ShippingAddress.name">Name</fbt>
            </label>
            <input {...input('name')} />
            {Feedback('name')}
          </div>
          <div className="form-group">
            <label>
              <fbt desc="ShippingAddress.address1">Street Address 1</fbt>
            </label>
            <input {...input('address1')} />
            {Feedback('address1')}
          </div>
          <div className="form-group">
            <label>
              <fbt desc="ShippingAddress.address2">Street Address 2</fbt>
            </label>
            <input {...input('address2')} />
            {Feedback('address2')}
          </div>
          <div className="form-group">
            <label>
              <fbt desc="ShippingAddress.city">City</fbt>
            </label>
            <input {...input('city')} />
            {Feedback('city')}
          </div>
          <div className="form-group">
            <label>
              <fbt desc="ShippingAddress.region">State/Province/Region</fbt>
            </label>
            <input {...input('stateProvinceRegion')} />
            {Feedback('stateProvinceRegion')}
          </div>
          <div className="form-group">
            <label>
              <fbt desc="ShippingAddress.postalCode">Zip/Postal Code</fbt>
            </label>
            <input {...input('postalCode')} />
            {Feedback('postalCode')}
          </div>
          <div className="form-group">
            <label>
              <fbt desc="ShippingAddress.country">Country</fbt>
            </label>
            <input {...input('country')} />
            {Feedback('country')}
          </div>
          <div className="form-group">
            <label>
              <fbt desc="ShippingAddress.instructions">
                Additional Instructions
              </fbt>
            </label>
            <input {...input('instructions')} />
            {Feedback('instructions')}
          </div>
          <div className="actions">
            <button type="submit" className="btn btn-primary btn-rounded">
              <fbt desc="Continue">Continue</fbt>
            </button>
            {isMobile ? null : (
              <button
                type="button"
                className="btn btn-outline-primary btn-rounded"
                onClick={() => history.goBack()}
              >
                <fbt desc="Back">Back</fbt>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default withRouter(withIsMobile(withWallet(ShippingDetails)))

require('react-styl')(`
  .confirm-shipping-address
    padding: 0
    display: flex
    flex-direction: column
    h1
      margin-top: 5rem
      text-align: center
    h2 
      margin-top: 3rem
      text-align: center
      font-weight: bold
    .form-container
      overflow: auto
      flex: 1
    .shipping-address-form
      padding: 1rem 2.625rem
      max-width: 600px
      margin: 0 auto
      border: 1px solid #c2cbd3
      border-radius: 10px
      .desc
        font-size: 1.125rem
        margin-bottom: 1rem
        text-align: center
      .form-group
        margin: 1.25rem 0
        label
          font-weight: bold
          color: #0d1d29
          font-size: 1.125rem
          margin: 0
        input
          border-radius: 0
          border: 0
          border-bottom: 1px solid #c2cbd3
    .actions
      padding: 1rem
      display: flex
      flex-direction: row-reverse
      .btn
        width: 100%
        padding: 0.875rem 0
        margin: 1rem 1rem 0 1rem
  
  @media (max-width: 767.98px)
    .confirm-shipping-address
      .shipping-address-form
        border: 0
        padding: 1rem
      .actions
        flex-direction: column
        padding: 1rem 0
        .btn
          margin-right: 0
          margin-left: 0
`)
