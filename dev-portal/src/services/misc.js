// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

export function getQueryString () {
  const { search: q } = window.location

  if (!q) return {}

  return (/^[?#]/.test(q) ? q.slice(1) : q)
    .split('&')
    .reduce((params, param) => {
      const [key, value] = param.split('=')
      params[key] = value ? decodeURIComponent(value) : ''
      return params
    }, {})
}

export function toTitleCase (string) {
  const firstLetter = string[0]
  const allOtherLetters = string.slice(1)

  return firstLetter.toUpperCase() + allOtherLetters.toLowerCase()
}
