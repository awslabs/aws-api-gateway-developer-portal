// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict'

const util = require('./util')

const routes = [
  ['GET', {
    static: [
      ['/catalog', require('./routes/catalog').get],
      ['/apikey', require('./routes/apikey').get],
      ['/subscriptions', require('./routes/subscriptions').get],
      ['/feedback', require('./routes/feedback').get],
      ['/admin/catalog/visibility', require('./routes/admin/catalog/visibility').get],
      ['/admin/accounts', require('./routes/admin/accounts').get]
    ],
    dynamic: [
      [/^\/subscriptions\/([\w-]+)\/usage$/, require('./routes/subscriptions/usage').get],
      [/^\/catalog\/([\w-]+)\/sdk$/, require('./routes/catalog/sdk').get],
      [/^\/catalog\/([\w-]+)\/export$/, require('./routes/catalog/export').get],
      [/^\/admin\/catalog\/([\w-]+)\/sdkGeneration$/, require('./routes/admin/catalog/sdkGeneration').get]
    ]
  }],

  ['POST', {
    static: [
      ['/signin', require('./routes/signin').post],
      ['/feedback', require('./routes/feedback').post],
      ['/admin/catalog/visibility', require('./routes/admin/catalog/visibility').post],
      ['/admin/accounts', require('./routes/admin/accounts').post]
    ],
    dynamic: [
      // Marketplace support is currently broken
      // [/^\/marketplace-subscriptions\/([^/]+)$/, require('./routes/marketplace-subscriptions').get]
    ]
  }],

  ['PUT', {
    static: [
      ['/admin/accounts/resendInvite', require('./routes/admin/accounts/resendInvite').post]
    ],
    dynamic: [
      [/^\/subscriptions\/([\w-]+)$/, require('./routes/subscriptions').put]
      // Marketplace support is currently broken
      // [/^\/marketplace-confirm\/([^/]+)$/, require('./routes/marketplace-confirm').get]
    ]
  }],

  ['DELETE', {
    static: [],
    dynamic: [
      [/^\/subscriptions\/([\w-]+)$/, require('./routes/subscriptions').delete],
      [/^\/admin\/catalog\/visibility\/([\w-]+)$/, require('./routes/admin/catalog/visibility').delete],
      [/^\/admin\/catalog\/visibility\/generic\/([\w-]+)$/, require('./routes/admin/catalog/visibility/generic').delete],
      [/^\/admin\/accounts\/([\w-]+)$/, require('./routes/admin/accounts').delete],
      [/^\/admin\/accounts\/([\w-]+)\/promoteToAdmin$/, require('./routes/admin/accounts/promoteToAdmin').delete]
      // Not ready for prime time just yet.
      // [/^\/admin\/accounts\/([\w-]+)\/approveRequest$/, require('./routes/admin/accounts/approveRequest').delete],
      // [/^\/admin\/accounts\/([\w-]+)\/denyRequest$/, require('./routes/admin/accounts/denyRequest').delete],
    ]
  }]
]

const methodMap = new Map()

for (const [name, routeData] of routes) {
  const method = new Map(routeData.static)
  method.matchers = []
  method.impls = []

  methodMap.set(name, method)
  for (const [matcher, impl] of routeData.dynamic) {
    method.matchers.push(matcher)
    method.impls.push(impl)
  }
}

async function handle (event) {
  const method = methodMap.get(event.httpMethod)

  if (method != null) {
    const staticRoute = method.get(event.path)
    if (staticRoute != null) return staticRoute(event)

    for (let i = 0; i < method.matchers.length; i++) {
      const result = method.matchers[i].exec(event.path)
      if (result != null) return method.impls[i](event, ...result.slice(1))
    }
  }

  return util.custom(event, 404, 'Endpoint not found')
}

exports.handler = async (event) => {
  try {
    return util.serializeCustom(event, 200, await handle(event))
  } catch (e) {
    if (e instanceof util.Custom) return e.response
    throw e
  }
}
