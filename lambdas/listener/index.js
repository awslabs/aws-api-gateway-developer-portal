'use strict';
const controller = require('./_common/customers-controller.js')

console.log("starting listener function")

exports.handler = (event, context, callback) => {
    console.log('Received event:', JSON.stringify(event, null, 2))

    const message = JSON.parse(event.Records[0].Sns.Message);

    const action = message.action
    const customerId = message['customer-identifier']
    const productCode = message['product-code']

    switch (action) {
        case 'subscribe-success':
            subscribe(customerId, productCode, callback);
            break;
        case 'subscribe-fail':
            callback("not implemented");
            break;
        case 'unsubscribe-pending':
            callback("not implemented");
            break;
        case 'unsubscribe-complete':
            unsubscribe(customerId, productCode, callback);
            break;
        default:
            console.log("Unknown action type " + action)
            callback("Invalid action: " + action)
            break;
    }
};

function subscribe(customerId, productCode, callback) {
    console.log(`Subscribing customer ${customerId} to product code ${productCode}`);

    function err(err)  {
        console.log("error: " + err);
        callback(err);
    }

    // get identity id for marketplace customer id
    controller.getCognitoIdentityId(customerId, err, identityId => {
        console.log("Got cognito identity : " + identityId);

        controller.getUsagePlanForProductCode(productCode, err, usagePlan => {
            controller.subscribe(identityId, usagePlan.id, err, result => {
                callback(null, result)
            })
        })
    })
}

function unsubscribe(customerId, productCode, callback) {
    console.log(`Unsubscribing customer ${customerId} from product code ${productCode}`);

    function err(err)  {
        console.log("error: " + err);
        callback(err);
    }

    // get identity id for marketplace customer id
    controller.getCognitoIdentityId(customerId, err, identityId => {
        console.log("Got cognito identity : " + identityId);

        controller.getUsagePlanForProductCode(productCode, err, usagePlan => {
            controller.unsubscribe(identityId, usagePlan.id, err, result => {
                callback(null, result)
            })
        })
    })
}
