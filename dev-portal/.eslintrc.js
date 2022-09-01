'use strict'

module.exports = {
  extends: ['react-app'],
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
