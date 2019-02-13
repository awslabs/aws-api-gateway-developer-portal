const AWS = require('aws-sdk')

const sns = new AWS.SNS()
const dynamoDb = new AWS.DynamoDB.DocumentClient()

const feedbackTable = process.env.FeedbackTableName || 'DevPortalFeedback'
const feedbackTopicArn = process.env.FeedbackSnsTopicArn || ''

const fetchFeedback = function(error, callback) {
  const scanParams = {
    TableName: feedbackTable
  }

  const items = []
  return dynamoDb.scan(scanParams, function scanUntilDone(err, data) {
    if (err) {
      error(err)
    } else if (data.LastEvaluatedKey) {
        scanParams.ExclusiveStartKey = data.LastEvaluatedKey;
        dynamoDb.scan(scanParams, scanUntilDone);
    } else {
      callback(items)
    }
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

const submitFeedback = function(cognitoIdentityId, message, error, callback) {
  saveToDynamo(cognitoIdentityId, message)
    .then(() => {
      publishToSnsTopic(message)
        .then((response) => {
          callback(response)
        })
    })
    .catch((err) => {
      error(err)
    })
}

module.exports = {
  fetchFeedback,
  submitFeedback
}
