// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const awsServerlessExpress = require('aws-serverless-express')
const util = require('./util')

const signinRoute = require('./routes/signin')
const catalogRoute = require('./routes/catalog')
const apikeyRoute = require('./routes/apikey')
const subscriptionsRoute = require('./routes/subscriptions')
const subscriptionsUsageRoute = require('./routes/subscriptions/usage')
// Marketplace support is currently broken
// const marketplaceConfirmRoute = require('./routes/marketplace-confirm')
// const marketplaceSubscriptionRoute = require('./routes/marketplace-subscriptions')
const feedbackRoute = require('./routes/feedback')
const catalogSdkRoute = require('./routes/catalog/sdk')
const catalogExportRoute = require('./routes/catalog/export')
const adminCatalogVisibilityRoute = require('./routes/admin/catalog/visibility')
const adminCatalogSdkGenerationRoute = require('./routes/admin/catalog/sdkGeneration')
const adminAccountsRoute = require('./routes/admin/accounts')
const adminAccountsResendInviteRoute = require('./routes/admin/accounts/resendInvite')
// Not ready for prime time just yet.
// const adminAccountsApproveRequestRoute = require('./routes/admin/accounts/approveRequest')
// const adminAccountsDenyRequestRoute = require('./routes/admin/accounts/denyRequest')
const adminAccountsPromoteToAdminRoute = require('./routes/admin/accounts/promoteToAdmin')

const app = express()

app.set('case sensitive routing', true)
app.set('strict routing', true)

app.use(cors())
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))
app.use(awsServerlessExpressMiddleware.eventContext())

function wrapError (func) {
  return async (req, res) => {
    try {
      await func(req, res)
    } catch (e) {
      console.error(`Error: ${e.stack}`)
      res.status(500).json(util.makeErrorResponse(e))
    }
  }
}

// user APIs
app.post('/signin', wrapError(signinRoute.post))
app.get('/catalog', wrapError(catalogRoute.get))
app.get('/apikey', wrapError(apikeyRoute.get))
app.get('/subscriptions', wrapError(subscriptionsRoute.get))
app.put('/subscriptions/:usagePlanId', wrapError(subscriptionsRoute.put))
app.get('/subscriptions/:usagePlanId/usage', wrapError(subscriptionsUsageRoute.get))
app.delete('/subscriptions/:usagePlanId', wrapError(subscriptionsRoute.delete))
// Marketplace support is currently broken
// app.post('/marketplace-confirm/:usagePlanId', wrapError(marketplaceConfirmRoute.post))
// app.put('/marketplace-subscriptions/:usagePlanId', wrapError(marketplaceSubscriptions.put))
app.get('/feedback', wrapError(feedbackRoute.get))
app.post('/feedback', wrapError(feedbackRoute.post))
app.get('/catalog/:id/sdk', wrapError(catalogSdkRoute.get))
app.get('/catalog/:id/export', wrapError(catalogExportRoute.get))

// admin APIs
app.get('/admin/catalog/visibility', wrapError(adminCatalogVisibilityRoute.get))
app.post('/admin/catalog/visibility', wrapError(adminCatalogVisibilityRoute.post))
app.delete('/admin/catalog/visibility/:id', wrapError(adminCatalogVisibilityRoute.delete))
app.delete('/admin/catalog/visibility/generic/:genericId', wrapError(adminCatalogVisibilityRoute.delete))
app.put('/admin/catalog/:id/sdkGeneration', wrapError(adminCatalogSdkGenerationRoute.put))
app.delete('/admin/catalog/:id/sdkGeneration', wrapError(adminCatalogSdkGenerationRoute.delete))

// Account management APIs
app.get('/admin/accounts', wrapError(adminAccountsRoute.get))
app.post('/admin/accounts', wrapError(adminAccountsRoute.post))
app.put('/admin/accounts/resendInvite', wrapError(adminAccountsResendInviteRoute.put))
// Not ready for prime time just yet.
// app.put('/admin/accounts/:userId/approveRequest', wrapError(adminAccountsApproveRequestRoute.put))
// app.put('/admin/accounts/:userId/denyRequest', wrapError(adminAccountsDenyRequestRoute.put))
app.put('/admin/accounts/:userId/promoteToAdmin', wrapError(adminAccountsPromoteToAdminRoute.put))
app.delete('/admin/accounts/:userId', wrapError(adminAccountsRoute.delete))

const server = awsServerlessExpress.createServer(app)

exports.handler = (event, context) => awsServerlessExpress.proxy(server, event, context)
