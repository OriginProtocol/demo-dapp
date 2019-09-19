import React from 'react'
import { useQuery } from '@apollo/react-hooks'

import query from 'queries/Conversations'

function withMessaging(WrappedComponent) {
  const withMessaging = props => {
    const { error, data, loading, refetch } = useQuery(query, {
      fetchPolicy: 'network-only',
      notifyOnNetworkStatusChange: true
    })
    if (error) console.error(error)

    return (
      <WrappedComponent
        {...props}
        messaging={data ? data.messaging : null}
        messagingError={error}
        messagingLoading={loading}
        messagingRefetch={refetch}
      />
    )
  }
  return withMessaging
}

export default withMessaging
