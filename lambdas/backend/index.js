// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const awsServerlessExpress = require('aws-serverless-express')
const util = require('./util')

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
app.post('/signin', wrapError(require('./routes/signin').post))
app.get('/catalog', wrapError(require('./routes/catalog').get))
app.get('/apikey', wrapError(require('./routes/apikey').get))
app.get('/subscriptions', wrapError(require('./routes/subscriptions').get))
app.put('/subscriptions/:usagePlanId', wrapError(require('./routes/subscriptions').put))
app.get('/subscriptions/:usagePlanId/usage', wrapError(require('./routes/subscriptions/usage').get))
app.delete('/subscriptions/:usagePlanId', wrapError(require('./routes/subscriptions').delete))
// Marketplace support is currently broken
// app.post('/marketplace-confirm/:usagePlanId', wrapError(require('./routes/marketplace-confirm').post))
// app.put('/marketplace-subscriptions/:usagePlanId', wrapError(require('./routes/marketplace-subscription').put))
app.get('/feedback', wrapError(require('./routes/feedback').get))
app.post('/feedback', wrapError(require('./routes/feedback').post))
app.get('/catalog/:id/sdk', wrapError(require('./routes/catalog/sdk').get))
app.get('/catalog/:id/export', wrapError(require('./routes/catalog/export').get))

// admin APIs
app.get('/admin/catalog/visibility', wrapError(require('./routes/admin/catalog/visibility').get))
app.post('/admin/catalog/visibility', wrapError(require('./routes/admin/catalog/visibility').post))
app.delete('/admin/catalog/visibility/:id', wrapError(require('./routes/admin/catalog/visibility').delete))
app.delete('/admin/catalog/visibility/generic/:genericId', wrapError(require('./routes/admin/catalog/visibility').delete))
app.put('/admin/catalog/:id/sdkGeneration', wrapError(require('./routes/admin/catalog/sdkGeneration').put))
app.delete('/admin/catalog/:id/sdkGeneration', wrapError(require('./routes/admin/catalog/sdkGeneration').delete))

// Account management APIs
app.get('/admin/accounts', wrapError(require('./routes/admin/accounts').get))
app.post('/admin/accounts', wrapError(require('./routes/admin/accounts').post))
app.put('/admin/accounts/resendInvite', wrapError(require('./routes/accounts/resendInvite').put))
// Not ready for prime time just yet.
// app.put('/admin/accounts/:userId/approveRequest', wrapError(require('./routes/accounts/approveRequest').put))
// app.put('/admin/accounts/:userId/denyRequest', wrapError(require('./routes/accounts/denyRequest').put))
app.put('/admin/accounts/:userId/promoteToAdmin', wrapError(require('./routes/accounts/promoteToAdmin').put))
app.delete('/admin/accounts/:userId', wrapError(require('./routes/admin/accounts').delete))

const server = awsServerlessExpress.createServer(app)

exports.handler = (event, context) => awsServerlessExpress.proxy(server, event, context)
