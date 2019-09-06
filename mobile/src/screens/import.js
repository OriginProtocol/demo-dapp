'use strict'

import React from 'react'
import { StyleSheet, Text, View } from 'react-native'
import SafeAreaView from 'react-native-safe-area-view'
import { fbt } from 'fbt-runtime'

import OriginButton from 'components/origin-button'
import CommonStyles from 'styles/common'
import withIsSamsungBKS from 'hoc/withIsSamsungBKS'

const importAccountScreen = props => {

  const renderImportButtons = () => {
    return (
      <>
        <OriginButton
          size="large"
          type="primary"
          title={fbt(
            'Use Recovery Phrase',
            'ImportScreen.useRecoveryPhraseButton'
          )}
          onPress={() => this.props.navigation.navigate('ImportMnemonic')}
        />
        <OriginButton
          size="large"
          type="primary"
          title={fbt('Use Private Key', 'ImportScreen.usePrivateKeyButton')}
          onPress={() => this.props.navigation.navigate('ImportPrivateKey')}
        />
      </>
    )
  }

  const renderAddSamsungBKSAccountButton = () => {
    return (
      <OriginButton
        size="large"
        type="primary"
        title={fbt(
          'Add Account',
          'ImportScreen.addSamsungBKSAccount'
        )}
        onPress={() => {
          console.log('Add account')
        }}
      />
    )
  }

  if (props.isSamsungBKS) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={{ ...styles.container, flexGrow: 2 }}>
          <Text style={styles.title}>
            <fbt desc="ImportScreen.keystoreTitle">Samsung Keystore</fbt>
          </Text>
          <Text style={styles.subtitle}>
            <fbt desc="ImportScreen.keystoreSubtitle">
              Your wallet is managed by the Samsung Blockchain Keystore.
            </fbt>
          </Text>
          <View style={{ ...styles.container, ...styles.buttonContainer }}>
            {renderAddSamsungBKSAccountButton()}
            {__DEV__ && (
              <>
                <Text style={{...styles.text, marginTop: 30, marginBottom: 10 }}>Developer Options</Text>
                {renderImportButtons()}
              </>
            )}
          </View>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ ...styles.container, flexGrow: 2 }}>
        <Text style={styles.title}>
          <fbt desc="ImportScreen.title">Import your wallet</fbt>
        </Text>
        <Text style={styles.subtitle}>
          <fbt desc="ImportScreen.subtitle">
            You can import a wallet using one of the methods below.
          </fbt>
        </Text>
        <View style={{ ...styles.container, ...styles.buttonContainer }}>
          {renderImportButtons()}
        </View>
      </View>
    </SafeAreaView>
  )
}

export default withIsSamsungBKS(importAccountScreen)

const styles = StyleSheet.create({
  ...CommonStyles,
  text: {
    textAlign: 'center',
    color: '#98a7b4',
    fontFamily: 'Lato'
  }
})
