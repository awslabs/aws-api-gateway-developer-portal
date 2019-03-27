// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict';

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const handlers = require('./express-route-handlers.js')

const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(awsServerlessExpressMiddleware.eventContext())

// user APIs
app.post('/signin', handlers.postSignIn)
app.get('/catalog', handlers.getCatalog)
app.get('/apikey', handlers.getApiKey)
app.get('/subscriptions', handlers.getSubscriptions)
app.put('/subscriptions/:usagePlanId', handlers.putSubscription)
app.get('/subscriptions/:usagePlanId/usage', handlers.getUsage)
app.delete('/subscriptions/:usagePlanId', handlers.deleteSubscription)
app.post('/marketplace-confirm/:usagePlanId', handlers.postMarketplaceConfirm)
app.put('/marketplace-subscriptions/:usagePlanId', handlers.putMarketplaceSubscription)
app.get('/feedback', handlers.getFeedback)
app.post('/feedback', handlers.postFeedback)
app.get('/catalog/:id/sdk', handlers.getSdk)


// admin APIs
app.get('/admin/catalog/visibility', handlers.getAdminCatalogVisibility)
app.post('/admin/catalog/visibility', handlers.postAdminCatalogVisibility)
app.delete('/admin/catalog/visibility/:id', handlers.deleteAdminCatalogVisibility)
app.delete('/admin/catalog/visibility/generic/:genericId', handlers.deleteAdminCatalogVisibility)
app.put('/admin/catalog/:id/sdkGeneration', handlers.putAdminCatalogSdkGeneration)
app.delete('/admin/catalog/:id/sdkGeneration', handlers.deleteAdminCatalogSdkGeneration)

// The aws-serverless-express library creates a server and listens on a Unix
// Domain Socket for you, so you can remove the usual call to app.listen.
// app.listen(3000)

// Export your express server so you can import it in the lambda function.
module.exports = app
