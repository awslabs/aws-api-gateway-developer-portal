'use strict'

const headersToAdd = {
  // Don't include subdomains - the user might have a subdomain hosted on something else and not
  // support it.
  'strict-transport-security': [{ value: 'max-age=63072000' }],
  'content-security-policy': [{
    value: [
      "default-src 'none'",
      'connect-src *',
      "prefetch-src 'self'",
      "font-src 'self' data: fonts.gstatic.com",
      "img-src 'self' data:",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' fonts.googleapis.com"
    ].join(';')
  }],
  'x-content-type-options': [{ value: 'nosniff' }],
  'x-frame-options': [{ value: 'DENY' }],
  'x-xss-protection': [{ value: '0' }],
  'referrer-policy': [{ value: 'same-origin' }]
}

exports.handler = (event, context, callback) => {
  const response = event.Records[0].cf.response
  console.log('Response headers:', response.headers)
  Object.assign(response.headers, headersToAdd)
  callback(null, response)
}
