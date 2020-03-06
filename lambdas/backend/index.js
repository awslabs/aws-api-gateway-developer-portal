// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const awsServerlessExpressMiddleware = require('aws-serverless-express/middleware')
const awsServerlessExpress = require('aws-serverless-express')

const app = express()

app.use(cors())
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }))
app.use(awsServerlessExpressMiddleware.eventContext())

// user APIs
app.post('/signin', require('./routes/signin').post)
app.get('/catalog', require('./routes/catalog').get)
app.get('/apikey', require('./routes/apikey').get)
app.get('/subscriptions', require('./routes/subscriptions').get)
app.put('/subscriptions/:usagePlanId', require('./routes/subscriptions').put)
app.get('/subscriptions/:usagePlanId/usage', require('./routes/subscriptions/usage').get)
app.delete('/subscriptions/:usagePlanId', require('./routes/subscriptions').delete)
app.post('/marketplace-confirm/:usagePlanId', require('./routes/marketplace-confirm').post)
app.put('/marketplace-subscriptions/:usagePlanId', require('./routes/marketplace-subscription').put)
app.get('/feedback', require('./routes/feedback').get)
app.post('/feedback', require('./routes/feedback').post)
app.get('/catalog/:id/sdk', require('./routes/catalog/sdk').get)
app.get('/catalog/:id/export', require('./routes/catalog/export').get)

// admin APIs
app.get('/admin/catalog/visibility', require('./routes/admin/catalog/visibility').get)
app.post('/admin/catalog/visibility', require('./routes/admin/catalog/visibility').post)
app.delete('/admin/catalog/visibility/:id', require('./routes/admin/catalog/visibility').delete)
app.delete('/admin/catalog/visibility/generic/:genericId', require('./routes/admin/catalog/visibility').delete)
app.put('/admin/catalog/:id/sdkGeneration', require('./routes/admin/catalog/sdkGeneration').put)
app.delete('/admin/catalog/:id/sdkGeneration', require('./routes/admin/catalog/sdkGeneration').delete)

// Account management APIs
// app.get('/accounts', handlers.getAccounts)
app.get('/accounts', require('./routes/accounts').get)
// app.post('/accounts', handlers.createInvite)
app.post('/accounts', require('./routes/accounts').post)
// app.put('/accounts/resendInvite', handlers.resendInvite)
app.put('/accounts/resendInvite', require('./routes/accounts/resendInvite').put)
// app.put('/accounts/:userId/approveRequest', handlers.approveRequest)
app.put('/accounts/:userId/approveRequest', require('./routes/accounts/approveRequest').put)
// app.put('/accounts/:userId/denyRequest', handlers.denyRequest)
app.put('/accounts/:userId/denyRequest', require('./routes/accounts/denyRequest').put)
// app.put('/accounts/:userId/promoteToAdmin', handlers.promoteAccount)
app.put('/accounts/:userId/promoteToAdmin', require('./routes/accounts/promoteToAdmin').put)
// app.delete('/accounts/:userId', handlers.deleteAccount)
app.delete('/accounts/:userId', require('./routes/accounts').delete)

const server = awsServerlessExpress.createServer(app)

exports.handler = (event, context) => awsServerlessExpress.proxy(server, event, context)
