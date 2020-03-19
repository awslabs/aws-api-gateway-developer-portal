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

app.use(cors())
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))
app.use(awsServerlessExpressMiddleware.eventContext())

function wrapError (func) {
  return async (req, res, callback) => {
    try {
      await func(req, res, callback)
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
app.post('/marketplace-confirm/:usagePlanId', wrapError(require('./routes/marketplace-confirm').post))
app.put('/marketplace-subscriptions/:usagePlanId', wrapError(require('./routes/marketplace-subscription').put))
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
// app.get('/accounts', handlers.getAccounts)
app.get('/accounts', wrapError(require('./routes/accounts').get))
// app.post('/accounts', handlers.createInvite)
app.post('/accounts', wrapError(require('./routes/accounts').post))
// app.put('/accounts/resendInvite', handlers.resendInvite)
app.put('/accounts/resendInvite', wrapError(require('./routes/accounts/resendInvite').put))
// app.put('/accounts/:userId/approveRequest', handlers.approveRequest)
app.put('/accounts/:userId/approveRequest', wrapError(require('./routes/accounts/approveRequest').put))
// app.put('/accounts/:userId/denyRequest', handlers.denyRequest)
app.put('/accounts/:userId/denyRequest', wrapError(require('./routes/accounts/denyRequest').put))
// app.put('/accounts/:userId/promoteToAdmin', handlers.promoteAccount)
app.put('/accounts/:userId/promoteToAdmin', wrapError(require('./routes/accounts/promoteToAdmin').put))
// app.delete('/accounts/:userId', handlers.deleteAccount)
app.delete('/accounts/:userId', wrapError(require('./routes/accounts').delete))

const server = awsServerlessExpress.createServer(app)

exports.handler = (event, context) => awsServerlessExpress.proxy(server, event, context)
