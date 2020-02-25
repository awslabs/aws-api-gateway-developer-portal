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
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
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

const server = awsServerlessExpress.createServer(app)

exports.handler = (event, context) => awsServerlessExpress.proxy(server, event, context)
