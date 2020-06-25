// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

'use strict'

// FIXME: Marketplace support is currently broken

const controller = require('dev-portal-common/customers-controller')

console.log('starting listener function')

exports.handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2))

  const message = JSON.parse(event.Records[0].Sns.Message)

  const action = message.action
  const customerId = message['customer-identifier']
  const productCode = message['product-code']

  switch (action) {
    case 'subscribe-success': return subscribe(customerId, productCode)
    case 'subscribe-fail': throw new Error('not implemented')
    case 'unsubscribe-pending': throw new Error('not implemented')
    case 'unsubscribe-complete': return unsubscribe(customerId, productCode)
    default:
      console.log('Unknown action type ' + action)
      throw new Error('Invalid action: ' + action)
  }
}

async function subscribe (customerId, productCode) {
  console.log(`Subscribing customer ${customerId} to product code ${productCode}`)

  try {
    // get identity id for marketplace customer id
    const identityId = await new Promise((resolve, reject) => {
      controller.getCognitoIdentityId(customerId, reject, resolve)
    })
    console.log('Got cognito identity : ' + identityId)

    const usagePlan = await new Promise((resolve, reject) => {
      controller.getUsagePlanForProductCode(customerId, reject, resolve)
    })

    return await new Promise((resolve, reject) => {
      controller.subscribe(identityId, usagePlan.id, reject, resolve)
    })
  } catch (err) {
    console.log('error: ' + err)
    throw err
  }
}

async function unsubscribe (customerId, productCode) {
  console.log(`Unsubscribing customer ${customerId} from product code ${productCode}`)

  try {
    // get identity id for marketplace customer id
    const identityId = await new Promise((resolve, reject) => {
      controller.getCognitoIdentityId(customerId, reject, resolve)
    })
    console.log('Got cognito identity : ' + identityId)

    const usagePlan = await new Promise((resolve, reject) => {
      controller.getUsagePlanForProductCode(customerId, reject, resolve)
    })

    return await new Promise((resolve, reject) => {
      controller.unsubscribe(identityId, usagePlan.id, reject, resolve)
    })
  } catch (err) {
    console.log('error: ' + err)
    throw err
  }
}
