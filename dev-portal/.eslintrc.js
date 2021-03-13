'use strict'

module.exports = {
  extends: ['react-app', '../.eslintrc.js'],
  overrides: [
    {
      files: ['.eslintrc.js', './*.js'],
      parserOptions: {
        sourceType: 'script'
      },
      rules: {
        strict: ['warn', 'global']
      }
    }
  ]
}
