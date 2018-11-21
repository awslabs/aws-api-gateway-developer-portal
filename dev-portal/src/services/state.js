// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { observable, reaction } from 'mobx'
import _ from 'lodash'

import { getSubscribedUsagePlan } from 'services/api-catalog'

/**
 * A function that returns a new object contain the default store
 */
function storeDefaults() {
  return {
    api: undefined,
    apiKey: undefined,
    
    apiList: {
      loaded: false,
      apiGateway: [],
      generic: []
    },

    cognitoUser: undefined,

    usagePlans: [],

    subscriptions: []
  }
}

/**
 * Trick for logging the store: clone the object. i.e. _.cloneDeep(store) or JSON.parse(JSON.stringify(store))
 */
export const store = observable({
  ...(storeDefaults()),

  initialize() {
    Object.assign(this, storeDefaults())

    return this
  },

  /**
   * Reset the entire store to the original values
   */
  clear() {
    return this.initialize()
  },

  /**
   * Reset specific keys on the store to their initial values
   * 
   * @param {string[]} keys   The keys that should be reset. Accepts lodash paths. (e.g. )
   */
  reset(...keys) {
    const defaults = storeDefaults()
    keys.forEach(key =>_.set(this, key, _.get(defaults, key)))
    return this
  },

  resetUserData() {
    this.reset('apiKey', 'cognitoUser', 'subscriptions')
  }
})

/**
 * 
 * A short-hand function for creating reactions with protections against cyclical errors.
 * 
 * @param {Function} triggerFn   A function that determines when fire the effectFn and what to pass to the effectFn.
 * @param {Function} effectFn   The side-effect to run when the data tracked by the triggerFn is changed.
 * 
 * A note on MobX reactions: the side effect will "only react to data that was accessed in the data expression" and will only fire "when the data returned by the expression has changed". (https://mobx.js.org/refguide/reaction.html)
 */
function reactTo(triggerFn, effectFn) {
  // note -- had issues with cyclical reactions in the past
  // the comments below will fix them if they come up again
  // DO NOT REMOVE THEM

  // function restartReaction() {
    reaction(
      triggerFn,
      (data, action) => {
        // action.dispose() // clear this "listener" so we don't cycle
        
        effectFn(data, action)

        // restartReaction() // restart the reaction after doing stuff to the data
      }
    )
  // }

  // restartReaction()
}
reactTo(
  () => ({ subscriptions: store.subscriptions, usagePlans: store.usagePlans }),
  ({ usagePlans }) => {
    updateSubscriptionStatus(usagePlans)
  }
)

reactTo(
  () => store.apiList,
  apiList => {
    fetchApiImage(apiList)
  }
)

/**
 * 
 */
function fetchApiImage(apiList) {
  ([].concat(apiList.apiGateway, apiList.generic)).forEach(api => {
    if (!api.logo) {
      let specificLogo = `/custom-content/api-logos/${api.id}_${api.stage}.png`
  
      // fetch automatically follows redirects; setting redirect to `manual` prevents this
      // we need to prevent it so that we can accurately determine if the image exists
      fetch(specificLogo, { headers: { Accept: "image/png" }, redirect: "manual" }).then(response => {
        if (response.ok)
          api.logo = specificLogo

        else api.logo = '/custom-content/api-logos/default.png'
      })
    }
  })
}

/**
 * A helper function that simple re-builds the subscribed status for each api in the catalog.
 * 
 * Should be run every time either the catalog updates or the 
 */
function updateSubscriptionStatus(usagePlans) {
  if (usagePlans)
    usagePlans.forEach(usagePlan => {
      let subscribed = !!getSubscribedUsagePlan(usagePlan.id)
      usagePlan.subscribed = subscribed

      usagePlan.apis.forEach(api => api.subscribed = subscribed)
    })
}

export default store.initialize()
