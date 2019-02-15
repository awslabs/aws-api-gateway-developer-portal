const AWS = require('aws-sdk')

const sns = new AWS.SNS()
const dynamoDb = new AWS.DynamoDB.DocumentClient()

const feedbackTable = process.env.FeedbackTableName || 'DevPortalFeedback'
const feedbackTopicArn = process.env.FeedbackSnsTopicArn || ''

const fetchFeedback = function() {
  return new Promise(async (resolve, reject) => {
    const scanParams = {
      TableName: feedbackTable
    }

    const items = []
    let continueScanning = false
    do {
      try {
        const data = await dynamoDb.scan(scanParams).promise()
        items.push(...data.Items)
        continueScanning = !!data.LastEvaluatedKey
        scanParams.ExclusiveStartKey = data.LastEvaluatedKey
      } catch (err) {
        reject(err)
      }
    } while (continueScanning)

    resolve(items)
  })
}

const publishToSnsTopic = function (message) {
  const params = {
    Subject: `Received customer feedback on your developer portal`,
    Message: message,
    TopicArn: feedbackTopicArn
  }

  return sns.publish(params).promise()
}

const saveToDynamo = function(cognitoIdentityId, message) {
  const time = new Date().toUTCString()

  // primary key
  const key = `${cognitoIdentityId}-${time}`

  const putParams = {
    TableName: feedbackTable,
    Item: {
      // structure of ddb record
      Id: key,
      UserId: cognitoIdentityId,
      Message: message,
      Time: time,
      Status: 'RECEIVED'
    }
  }

  return dynamoDb.put(putParams).promise()
}

const submitFeedback = function(cognitoIdentityId, message) {
  return new Promise(async (resolve, reject) => {
    try {
      await saveToDynamo(cognitoIdentityId, message)
      await publishToSnsTopic(message)
      resolve()
    } catch (err) {
      reject(err)
    }
  })
}

module.exports = {
  fetchFeedback,
  submitFeedback,

  // Visible for testing
  dynamoDb,
  sns
}
