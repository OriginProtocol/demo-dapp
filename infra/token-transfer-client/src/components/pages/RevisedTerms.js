import React, { Component } from 'react'
import { Redirect } from 'react-router-dom'

class RevisedTerms extends Component {
  state = {
    accepted: true,
    redirectTo: null
  }

  render() {
    if (this.state.redirectTo) {
      return <Redirect push to={this.state.redirectTo} />
    }

    return (
      <>
        <div className="action-card">
          <h1>Revised Schedule Agreement</h1>
          <p>
            Please agree to the agreement below and click Continue to proceed.
          </p>
          <div className="form-group">
            <div className="terms-wrapper">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Mauris
              odio lorem, lacinia sed molestie nec, suscipit quis ligula. Morbi
              vitae ornare felis. Curabitur leo justo, laoreet vel sem ac,
              vestibulum mollis mauris. Maecenas iaculis elit non elit dictum,
              ac pharetra nunc interdum. Mauris volutpat scelerisque quam non
              cursus. Sed eros purus, rhoncus et ex efficitur, dapibus convallis
              justo. Vestibulum diam eros, condimentum ut ante sit amet, porta
              mollis quam. Suspendisse sed magna vestibulum, imperdiet tellus a,
              venenatis metus. Nulla non volutpat dolor, vel placerat risus.
              Maecenas a imperdiet metus. Nulla volutpat lectus ligula, eget
              malesuada eros fringilla eget. Pellentesque porttitor ultricies
              mauris non congue.
              <br />
              <br />
              Nulla non volutpat dolor, vel placerat risus. Maecenas a imperdiet
              metus. Nulla volutpat lectus ligula, eget malesuada eros fringilla
              eget. Pellentesque porttitor ultricies mauris non congue.
            </div>
          </div>
          <div className="form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="acceptCheck"
              onClick={e => this.setState({ accepted: e.target.checked })}
              checked
            />
            <label className="form-check-label mt-0" htmlFor="acceptCheck">
              I have read and agree to the Revised Token Unlock Schedule
              Agreement
            </label>
          </div>
          <button
            className="btn btn-secondary btn-lg mt-5"
            disabled={!this.state.accepted}
            onClick={() => this.setState({ redirectTo: '/phone' })}
          >
            Accept Agreement
          </button>
        </div>
      </>
    )
  }
}

export default RevisedTerms
