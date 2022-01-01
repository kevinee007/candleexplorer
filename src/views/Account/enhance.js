import { compose, withHandlers } from 'recompose'
import { graphql } from 'react-apollo'
import gql from 'graphql-tag'
import { MathBN } from '../../utils'
import { mockAccount } from '@livepeer/graphql-sdk'
import {
  connectCoinbaseQuery,
  connectCurrentRoundQuery,
  connectProtocolQuery,
  connectToasts,
} from '../../enhancers'

const accountQuery = gql`
  fragment AccountFragment on Account {
    id
    ensName
    ethBalance
    tokenBalance
  }

  query AccountOverviewQuery($id: String!) {
    account(id: $id) {
      ...AccountFragment
    }
  }
`

const connectAccountQuery = graphql(accountQuery, {
  props: ({ data, ownProps }) => {
    const { account, ...accountData } = data
    return {
      ...ownProps,
      account: {
        ...accountData,
        data: mockAccount(account),
      },
    }
  },
  options: ({ match }) => ({
    pollInterval: 5 * 1000,
    variables: {
      id: match.params.accountId,
    },
  }),
})

const MeDelegatorTranscoderQuery = gql`
  fragment DelegatorFragment on Delegator {
    id
    status
    delegateAddress
    bondedAmount
    fees
    delegatedAmount
    lastClaimRound
    startRound
    withdrawRound
  }

  fragment TranscoderFragment on Transcoder {
    id
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

  fragment AccountFragment on Account {
    id
    ethBalance
    tokenBalance
    delegator {
      ...DelegatorFragment
    }
    transcoder {
      ...TranscoderFragment
    }
  }

  query MeDelegatorTranscoderQuery {
    me {
      ...AccountFragment
    }
  }
`

const connectMeDelegatorTranscoderQuery = graphql(MeDelegatorTranscoderQuery, {
  props: ({ data, ownProps }) => {
    const { me, ...queryData } = data
    return {
      ...ownProps,
      me: {
        ...queryData,
        data: mockAccount(me),
      },
    }
  },
  options: ({ match }) => ({
    // pollInterval: 5 * 1000,
    variables: {},
  }),
})

const mapMutationHandlers = withHandlers({
  bond: ({ currentRound, history, me, protocol, toasts }) => ({ id }) => {
    const { id: lastInitializedRound } = currentRound.data
    const { status, lastClaimRound } = me.data.delegator
    const { maxEarningsClaimsRounds } = protocol.data
    const isUnbonded = status === 'Unbonded'
    const unclaimedRounds = isUnbonded
      ? ' 0'
      : MathBN.sub(lastInitializedRound, lastClaimRound)
    if (!currentRound.data.initialized) {
      return toasts.push({
        id: 'bond',
        type: 'warn',
        title: 'Unable to bond',
        body: 'The current round is not initialized.',
      })
    }
    if (MathBN.gt(unclaimedRounds, maxEarningsClaimsRounds)) {
      return toasts.push({
        id: 'bond',
        type: 'warn',
        title: 'Unable to bond',
        body: `You have unclaimed earnings from more than ${maxEarningsClaimsRounds} previous rounds.`,
      })
    }
    history.push(`#/bond/${id}`)
  },
  unbond: ({ currentRound, history, me, protocol, toasts }) => async ({
    id,
  }) => {
    try {
      const { id: lastInitializedRound } = currentRound.data
      const { status, lastClaimRound } = me.data.delegator
      const { maxEarningsClaimsRounds } = protocol.data
      const isUnbonded = status === 'Unbonded'
      const unclaimedRounds = isUnbonded
        ? ' 0'
        : MathBN.sub(lastInitializedRound, lastClaimRound)
      if (!currentRound.data.initialized) {
        return toasts.push({
          id: 'unbond',
          type: 'warn',
          title: 'Unable to unbond',
          body: 'The current round is not initialized.',
        })
      }
      if (MathBN.gt(unclaimedRounds, maxEarningsClaimsRounds)) {
        return toasts.push({
          id: 'unbond',
          type: 'warn',
          title: 'Unable to unbond',
          body: `You have unclaimed earnings from more than ${maxEarningsClaimsRounds} previous rounds.`,
        })
      }
      history.push(`#/unbond/${id}`)
    } catch (err) {
      if (!/User denied/.test(err.message)) {
        toasts.push({
          id: 'unbond',
          type: 'error',
          title: 'Unbond Failed',
          body: err.message,
        })
      }
    }
  },
})

export default compose(
  connectAccountQuery,
  connectCoinbaseQuery,
  connectCurrentRoundQuery,
  connectMeDelegatorTranscoderQuery,
  connectProtocolQuery,
  connectToasts,
  mapMutationHandlers,
)
