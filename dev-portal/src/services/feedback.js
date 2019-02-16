import { apiGatewayClient } from './api'

export const submitFeedback = (message) => {
  return apiGatewayClient()
          .then(client => {
            return client.post('/feedback', {}, { message }, {})
          })
}
