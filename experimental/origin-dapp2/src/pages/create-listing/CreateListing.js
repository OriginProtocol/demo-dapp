import React, { Component } from 'react'
import { Switch, Route } from 'react-router-dom'

import Step1 from './Step1'
import Step2 from './Step2'
import Step3 from './Step3'
import Review from './Review'

import Store from 'utils/store'
const store = Store('sessionStorage')

class CreateListing extends Component {
  constructor() {
    super()
    this.state = {
      listing: store.get('create-listing', {
        title: '',
        description: '',
        category: '',
        subCategory: '',
        quantity: '1',
        location: '',
        price: '',
        boost: '0',
        media: []
      })
    }
  }

  setListing(listing) {
    store.set('create-listing', listing)
    this.setState({ listing })
  }

  render() {
    return (
      <div className="container create-listing">
        <Switch>
          <Route
            path="/create/step-2"
            render={() => (
              <Step2
                listing={this.state.listing}
                onChange={listing => this.setListing(listing)}
              />
            )}
          />
          <Route
            path="/create/step-3"
            render={() => (
              <Step3
                listing={this.state.listing}
                onChange={listing => this.setListing(listing)}
              />
            )}
          />
          <Route
            path="/create/review"
            render={() => <Review listing={this.state.listing} />}
          />
          <Route
            render={() => (
              <Step1
                listing={this.state.listing}
                onChange={listing => this.setListing(listing)}
              />
            )}
          />
        </Switch>
      </div>
    )
  }
}

export default CreateListing

require('react-styl')(`
  .create-listing
    padding-top: 3rem
    .step
      font-family: Lato
      font-size: 14px
      color: var(--dusk)
      font-weight: normal
      text-transform: uppercase
      margin-top: 0.75rem
    .step-description
      font-family: Poppins
      font-size: 24px
      font-weight: 300
      line-height: normal
`)
