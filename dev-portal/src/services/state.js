import { observable, computed } from 'mobx'
import _ from 'lodash'

import { getSubscribedUsagePlan } from 'services/api-catalog'

export const store = observable({
  api: undefined,
  apiList: undefined,

  /**
   * We have a bunch of side-effects we need to run when we're setting `catalog` and 
   * `subscriptions`. That's accomplished by using getters and setters. We're storing
   * the actual data in `storeCache` so that people can't update `catalog` and 
   * `subscriptions` without hitting the side-effects.
   */

  // Catalog side-effects
  // 1 - update each api to have a usagePlan object nested in them
  // 2 - update the apiList based on the catalog 
  // 3 - update the subscribed status of each api
  set catalog(catalog = []) {
    storeCache.catalog = addUsagePlanToApis(catalog)
    store.apiList = createApiList(storeCache.catalog)
    fetchApiImage(store.apiList)
    updateSubscriptionStatus()

    return storeCache.catalog
  },
  get catalog() { return storeCache.catalog },

  // Subscription side-effects
  // 1 - update the subscribed status of each api
  set subscriptions(subscriptions = []) {
    storeCache.subscriptions = subscriptions
    updateSubscriptionStatus()

    return storeCache.subscriptions
  },
  get subscriptions() { return storeCache.subscriptions },
}, {
  catalog: computed,
  subscriptions: computed
})

// This is the cache for the actual catalog and subscriptions. DO NOT MODIFY and DO NOT USE.
const storeCache = observable({
  catalog: [],
  subscriptions: []
})

/**
 * A function that takes an input catalog and performs some side-effects on it.
 * 
 * - Makes sure each api has a non-recursive 'usagePlan' object
 * - recalculates the `apiList`
 */
function addUsagePlanToApis(catalog) {
  return catalog.map(usagePlan => {
    usagePlan.apis = usagePlan.apis.map(api => {
      api.usagePlan = _.cloneDeep(usagePlan)
      // remove the apis from the cloned usagePlan so we don't go circular
      delete api.usagePlan.apis
      return api
    })

    return usagePlan
  })
}

function createApiList(catalog) {
  return catalog.reduce((acc, usagePlan) => acc.concat(usagePlan.apis), [])
}

function fetchApiImage() {
  store.apiList.forEach(api => {
    let specificLogo = `/custom-content/api-logos/${api.id}_${api.stage}.png`

    if(!api.logo)
      fetch(specificLogo, { headers: { Accept: "image/png" } }).then(response => {
        if (response.ok)
          api.logo = specificLogo

        else api.logo = '/custom-content/api-logos/default.png'
      })
  })
}

/**
 * A helper function that simple re-builds the subscribed status for each api in the catalog.
 * 
 * Should be run every time either the catalog updates or the 
 */
function updateSubscriptionStatus() {
  if (storeCache.catalog)
    storeCache.catalog.forEach(usagePlan => {
      let subscribed = !!getSubscribedUsagePlan(usagePlan.id)
      usagePlan.subscribed = subscribed
      
      usagePlan.apis.forEach(api => api.subscribed = subscribed)
  })
}

export default store
