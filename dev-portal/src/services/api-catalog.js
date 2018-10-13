import { apiGatewayClient } from './api'
import { store } from './state'

/* Catalog and API Utils */

// wrap the catalogPromiseCache
export const updateCatalogAndApisList = ((() => {
  let catalogPromiseCache

  return function(bustCache = false) {
    let catalogOrPromise = store.catalog.length ? store.catalog : catalogPromiseCache
    if (!bustCache && catalogOrPromise) return Promise.resolve(catalogOrPromise)

    return catalogPromiseCache = apiGatewayClient()
      .then(apiGatewayClient => apiGatewayClient.get('/catalog', {}, {}, {}))
      .then(({ data = [] }) => {
        // attach usage plan data to each api
        store.catalog = data.map(usagePlan => {
          usagePlan.apis = usagePlan.apis.map(api => {
            // remove the apis from the cloned usagePlan so we don't go circular
            api.usagePlan = cloneJson(usagePlan)
            delete api.usagePlan.apis
            return api
          })

          return usagePlan
        })

        updateSubscriptionStatus()

        store.apiList = store.catalog.reduce((acc, usagePlan) => acc.concat(usagePlan.apis), [])

        return store.catalog
      })
  }
})())

// will return the first api if no id provided
export function getApi(apiId, useFirst) {
  return updateCatalogAndApisList() // we're only waiting so that we can make sure this has been set
  .then(() => {

    console.log(store.apiList)

    let catalog = store.catalog
    if (catalog && catalog.length) {
      let api
      
      catalog.find(c => (api = c.apis.find(a => a.id === apiId)))
      
      return api
    }
  })
}

/**
 * Updates the viewed api to the api id provided. If that api ID
 */
export function updateApi(apiId) {
  return getApi(apiId)
    .then(api => store.api = api)
}

export function selectApi(apiId) {
  return updateCatalogAndApisList()
    .then(() => {
      if (store.api && store.api.id === apiId)
        return store.api
  
      if (store.apiList.length) {
        if (apiId === 'ANY') {
          return store.api = store.apiList[0]
        }

        else {
          return store.api = store.apiList.find(api => api.id === apiId)
        }
      }
    })
}

/**
 * Fetch and update subscriptions store. Uses caching to determine if it should actually fetch or return the stored result.
 * 
 * @param {Boolean} bustCache=false   Pass true to ignore the cached value, and refetch. Will set store to the new value.
 */
export const updateSubscriptions = ((() => {
  let subscriptionsPromiseCache

  return function(bustCache = false) {
    let subscriptionsOrPromise = store.subscriptions.length ? store.subscriptions : subscriptionsPromiseCache
    if (!bustCache && subscriptionsOrPromise) return Promise.resolve(subscriptionsOrPromise)

    let localClient

    return subscriptionsPromiseCache = apiGatewayClient()
      .then(apiGatewayClient => (localClient = apiGatewayClient))
      .then(() => localClient.get('/subscriptions', {}, {}, {}))
      .then(({ data }) => {
        store.subscriptions = data

        updateSubscriptionStatus()
      })
  }
})())

function updateSubscriptionStatus() {
  if (store.catalog)
    store.catalog.forEach(usagePlan => usagePlan.apis.forEach(api => {
      api.subscribed = isSubscribed(usagePlan.id)
    }))
}

export function isSubscribed(usagePlanId) {
  return !!getSubscribedUsagePlan(usagePlanId)
}

export function getSubscribedUsagePlan(usagePlanId) {
  return store.subscriptions.find(s => s.id === usagePlanId)
}

export function subscribe(usagePlanId) {
  let localClient

  return apiGatewayClient()
    .then(apiGatewayClient => (localClient = apiGatewayClient))
    .then(() => localClient.put('/subscriptions/' + usagePlanId, {}, {}))
    .then(() => updateSubscriptions(true))
}

export function unsubscribe(usagePlanId) {
  let localClient

  return apiGatewayClient()
    .then(apiGatewayClient => (localClient = apiGatewayClient))
    .then(() => localClient.delete(`/subscriptions/${usagePlanId}`, {}, {}))
    .then(() => updateSubscriptions(true))
}

export function confirmMarketplaceSubscription(usagePlanId, token) {
  if (!usagePlanId) {
    return
  }
  
  return apiGatewayClient().then(apiGatewayClient => {
    return apiGatewayClient.put('/marketplace-subscriptions/' + usagePlanId, {}, {"token" : token})
  })
}

export function fetchUsage(usagePlanId) {
  const date = new Date()
  const start = new Date(date.getFullYear(), date.getMonth(), 1).toJSON().split('T')[0]
  const end = new Date().toJSON().split('T')[0]
  return apiGatewayClient().then(apiGatewayClient => {
    return apiGatewayClient.get('/subscriptions/' + usagePlanId + '/usage', { start, end }, {})
  })
}

export function mapUsageByDate(usage, usedOrRemaining) {
  const apiKeyDates = {}
  Object.keys(usage.items).forEach(apiKeyId => {
    apiKeyDates[apiKeyId] = mapApiKeyUsageByDate(usage.items[apiKeyId], usage.startDate, usedOrRemaining)
  })
  
  const dates = {}
  Object.keys(apiKeyDates).forEach((apiKeyId, index) => {
    const apiKeyUsage = apiKeyDates[apiKeyId]
    apiKeyUsage.forEach(dailyUsage => {
      const date = dailyUsage[0]
      const value = dailyUsage[1]
      
      if (!dates[date])
      dates[date] = 0
      dates[date] += value
    })
  })
  
  const usageByDate = Object.keys(dates).sort().map(date => [date, dates[date]])
  
  return usageByDate
}

function mapApiKeyUsageByDate(apiKeyUsage, startDate, usedOrRemaining) {
  const dateParts = startDate.split('-')
  const year = dateParts[0]
  const month = dateParts[1]
  const day = dateParts[2]
  const apiKeyDate = new Date(year, month - 1, day)
  apiKeyDate.setHours(0, 0, 0, 0)
  const usedOrRemainingIndex = usedOrRemaining === 'used'
  ? 0
  : 1
  
  if (apiKeyUsage && !Array.isArray(apiKeyUsage[0]))
  apiKeyUsage = [apiKeyUsage]
  
  return apiKeyUsage.map((usage) => {
    const date = apiKeyDate.setDate(apiKeyDate.getDate())
    const item = [date, usage[usedOrRemainingIndex]]
    apiKeyDate.setDate(apiKeyDate.getDate() + 1)
    return item
  })
}

function cloneJson(object) {
  return JSON.parse(JSON.stringify(object))
}
