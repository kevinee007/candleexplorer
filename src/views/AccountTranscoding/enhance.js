import { compose } from 'recompose'
import { graphql } from 'react-apollo'
import gql from 'graphql-tag'
import { mockTranscoder } from '@livepeer/graphql-sdk'
import { connectCoinbaseQuery, connectCurrentRoundQuery } from '../../enhancers'

const AccountTranscoderQuery = gql`
  fragment TranscoderFragment on Transcoder {
    active
    status
    lastRewardRound {
      id
    }
    rewardCut
    feeShare
    pricePerSegment
    pendingRewardCut
    pendingFeeShare
    pendingPricePerSegment
    activationRound
    deactivationRound
  }

  query AccountTranscoderQuery($id: ID!) {
    transcoder(id: $id) {
      id
      ...TranscoderFragment
    }
  }
`

const connectAccountTranscoderQuery = graphql(AccountTranscoderQuery, {
  props: ({ data, ownProps }) => {
    const { account, ...queryProps } = data
    const { transcoder } = data || {}
    return {
      ...ownProps,
      transcoder: {
        ...queryProps,
        data: mockTranscoder(transcoder ? transcoder : {}),
      },
    }
  },
  options: ({ match }) => ({
    pollInterval: 30 * 1000,
    variables: {
      id: match.params.accountId,
    },
  }),
})

export default compose(
  connectCoinbaseQuery,
  connectAccountTranscoderQuery,
  connectCurrentRoundQuery,
)
