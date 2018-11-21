// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import _ from 'lodash'

import { apiGatewayClient } from './api'
import { store } from './state'

/* Catalog and API Utils */

/**
 * 
 * Does all operations to get user data at once.
 * 
 * @param {Boolean} bustCache=true   Ignore the cache and re-make the calls? Defaults to true.
 */
export function updateAllUserData(bustCache = true) {
  return Promise.all([
    updateUsagePlansAndApisList(bustCache),
    updateSubscriptions(bustCache),
    updateApiKey(bustCache)
  ])
}

/**
 * 
 * Update the catalog for the current user. Both request and response are cached, so unless the cache is busted, this should only ever make one network call.
 * 
 * @param {Boolean} [bustCache=false]   Ignore the cache and re-make the network call. Defaults to false.
 * 
 */
export function updateUsagePlansAndApisList(bustCache = false) {
  // if we've already tried, just return that promise
  if (!bustCache && catalogPromiseCache) return catalogPromiseCache

  return catalogPromiseCache = apiGatewayClient()
    .then(apiGatewayClient => apiGatewayClient.get('/catalog', {}, {}, {}))
    .then(({ data = [] }) => {
      store.usagePlans = data.apiGateway

      if (!store.apiList) store.apiList = {}
      store.apiList.apiGateway = getApiGatewayApisFromUsagePlans(store.usagePlans) // MUST create
      store.apiList.generic = data.generic
      store.apiList.loaded = true
    })
    .catch(() => {
      store.apiList = null
      store.usagePlans = null
      store.apiList.loaded = true
    })
}
let catalogPromiseCache // WARNING: Don't touch this. Should only be used by updateCatalogAndApisList.

/**
 * A function that takes an input usage plans and creates an list of apis out of it.
 * 
 * - Makes sure each api has a non-recursive 'usagePlan' object
 * 
 * returns an array of apis
 */
function getApiGatewayApisFromUsagePlans(usagePlans) {
  return usagePlans.reduce((acc, usagePlan) => {

    usagePlan.apis.forEach(api => {
      api.usagePlan = _.cloneDeep(usagePlan)
      // remove the apis from the cloned usagePlan so we don't go circular
      delete api.usagePlan.apis
    })

    return acc.concat(usagePlan.apis)
  }, [])
}

/**
 * Return the API with the provided apiId. Can also provide the special strings "FIRST" or "ANY" to get the first API returned. Can select the api returned as a side-effect.
 * 
 * @param {String} apiId   An apiId or the special strings 'FIRST' or 'ANY'. 'FIRST' and 'ANY' both return the first api encountered.
 * @param {Boolean} [selectIt=false]   If true, sets the found API as the current 'selected' API.
 */
export function getApi(apiId, selectIt = false) {
  return updateUsagePlansAndApisList()
    .then(() => {
      let thisApi

      let allApis = [].concat(store.apiList.apiGateway, store.apiList.generic)
  
      if (allApis.length) {
        if (apiId === 'ANY' || apiId === 'FIRST') {
          thisApi = allApis[0]
        }

        else {
          thisApi = allApis.find(api => api.id.toString() === apiId)
        }
      }

      if (selectIt) store.api = thisApi

      return thisApi
    })
}

/* Subscription Utils */

/**
 * Fetch and update subscriptions store. Uses caching to determine if it should actually fetch or return the stored result.
 * 
 * @param {Boolean} [bustCache=false]   Ignore the cache and re-make the network call. Defaults to false.
 */
export function updateSubscriptions(bustCache = false) {
  let subscriptionsOrPromise = store.subscriptions.length ? store.subscriptions : subscriptionsPromiseCache
  if (!bustCache && subscriptionsOrPromise) return Promise.resolve(subscriptionsOrPromise)

  return subscriptionsPromiseCache = apiGatewayClient()
    .then(apiGatewayClient => apiGatewayClient.get('/subscriptions', {}, {}, {}))
    .then(({ data }) => (store.subscriptions = data))
}
let subscriptionsPromiseCache // WARNING: Don't touch this. Should only be used by updateCatalogAndApisList.

export function getSubscribedUsagePlan(usagePlanId) {
  return store.subscriptions.find(sub => sub.id === usagePlanId)
}

export function subscribe(usagePlanId) {
  return apiGatewayClient()
    .then(apiGatewayClient => apiGatewayClient.put('/subscriptions/' + usagePlanId, {}, {}))
    .then(() => updateSubscriptions(true))
}

export function unsubscribe(usagePlanId) {
  return apiGatewayClient()
    .then(apiGatewayClient => apiGatewayClient.delete(`/subscriptions/${usagePlanId}`, {}, {}))
    .then(() => updateSubscriptions(true))
}

/**
 * 
 * Fetches and updates the apiKey in the store. Both request and response are cached, so unless the cache is busted, this should only ever make one network call.
 * 
 */
export function updateApiKey(bustCache) {
  let apiKeyOrPromise = store.apiKey ? store.apiKey : apiKeyPromiseCache
  if (!bustCache && apiKeyOrPromise) return Promise.resolve(apiKeyOrPromise)

  return apiGatewayClient()
    .then(apiGatewayClient => apiGatewayClient.get('/apikey', {}, {}, {}))
    .then(({data}) => (store.apiKey = data.value))
}
let apiKeyPromiseCache

export function fetchUsage(usagePlanId) {
  const date = new Date()
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toJSON().split('T')[0]
  const end = date.toJSON().split('T')[0]
  return apiGatewayClient()
    .then(apiGatewayClient => apiGatewayClient.get('/subscriptions/' + usagePlanId + '/usage', { start, end }, {}))
}

export function mapUsageByDate(usage, usedOrRemaining) {
  const dates = {}
  Object.keys(usage.items).forEach(apiKeyId => {
    const apiKeyUsage = mapApiKeyUsageByDate(usage.items[apiKeyId], usage.startDate, usedOrRemaining)

    // handles the bizarre case that the user has more than one api key
    // currently not possible (and my never be), so we probably don't need it
    apiKeyUsage.forEach(dailyUsage => {
      const date = dailyUsage[0]
      const used = dailyUsage[1]
      const remaining = dailyUsage[2]
      
      if (!dates[date])
      dates[date] = { used: 0, remaining: 0 }

      dates[date].used += used
      dates[date].remaining += remaining
    })
  })
  
  const usageByDate = Object.keys(dates).sort().map(date => [
    parseInt(date, 10), 
    dates[date].used, 
    dates[date].remaining 
  ])
  
  return usageByDate
}

function mapApiKeyUsageByDate(apiKeyUsage, startDate) {
  const apiKeyDate = new Date(startDate)
  
  if (apiKeyUsage && !Array.isArray(apiKeyUsage[0]))
    apiKeyUsage = [apiKeyUsage]
  
  return apiKeyUsage.map((usage) => {
    const date = apiKeyDate.setDate(apiKeyDate.getDate())
    const item = [date, ...usage]
    apiKeyDate.setDate(apiKeyDate.getDate() + 1)
    return item
  })
}

/* Marketplace integration */

export function confirmMarketplaceSubscription(usagePlanId, token) {
  if (!usagePlanId) {
    return
  }
  
  return apiGatewayClient()
    .then(apiGatewayClient => apiGatewayClient.put('/marketplace-subscriptions/' + usagePlanId, {}, {"token" : token}))
}