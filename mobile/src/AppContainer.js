'use strict'

import React from 'react'
import { connect } from 'react-redux'
import { StatusBar } from 'react-native'
import { createAppContainer } from 'react-navigation'
import get from 'lodash.get'

import { Navigation } from './Navigation'
import { updateExchangeRate } from 'utils/exchangeRate'
import { findBestAvailableCurrency } from 'utils/currencies'
import PushNotifications from './PushNotifications'
import AuthenticationGuard from 'components/authentication-guard'
import UpdatePrompt from 'components/update-prompt'
import BackupPrompt from 'components/backup-prompt'

class MarketplaceApp extends React.Component {
  static router = Navigation.router

  componentDidMount = async () => {
    // Update exchange rates at a regular interval
    this.updateExchangeRates = () => {
      const fiatCurrency =
        this.props.settings.currency || findBestAvailableCurrency()
      updateExchangeRate(fiatCurrency.code, 'ETH')
      updateExchangeRate(fiatCurrency.code, 'DAI')
    }

    this.updateExchangeRates()
  }

  componentDidUpdate = prevProps => {
    // Update exchange rates on currency change
    if (get(prevProps, 'settings.currency') !== this.props.settings.currency) {
      this.updateExchangeRates()
    }
  }

  render() {
    return (
      <>
        <StatusBar />
        <AuthenticationGuard />
        <PushNotifications />
        <UpdatePrompt />
        <BackupPrompt />
        <Navigation navigation={this.props.navigation} />
      </>
    )
  }
}

const mapStateToProps = ({ settings }) => {
  return { settings }
}

const App = connect(
  mapStateToProps,
  null
)(MarketplaceApp)

export default createAppContainer(App)
