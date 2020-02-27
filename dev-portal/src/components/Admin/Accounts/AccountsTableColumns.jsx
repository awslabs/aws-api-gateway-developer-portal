/**
 * An AccountsTable column descriptor.
 *
 * @typedef {Object} AccountsTableColumns~Descriptor
 * @property {string} id
 *    a unique ID to distinguish this column from others
 * @property {string} title
 *    column title to show in the header row
 * @property {Function} render
 *    accepts an Account object, and returns content to be placed in the table
 *    cell in this column
 * @property {(Object|undefined)} ordering
 *    ordering descriptor for this column. If absent, the user cannot order on
 *    this column.
 * @property ordering.iteratee
 *    a lodash iteratee, used with `lodash.orderBy`
 * @property {(Object|undefined)} filtering
 *    filtering descriptor for this column. If absent, the user cannot filter
 *    on this column.
 * @property {string} filtering.accessor
 *    either an Account object property name, or a function which takes an
 *    Account object and returns a string, on which to filter
 */

export const EmailAddress = {
  id: 'emailAddress',
  title: 'Email address',
  render: account => account.emailAddress,
  ordering: {
    iteratee: 'emailAddress',
  },
  filtering: {
    accessor: 'emailAddress',
  },
}

export const DateRegistered = {
  id: 'dateRegistered',
  title: 'Date registered',
  render: account => formatDate(account.dateRegistered),
  ordering: {
    iteratee: 'dateRegistered',
  },
}

export const RegistrationMethod = {
  id: 'registrationMethod',
  title: 'Registration method',
  render: account => account.registrationMethod,
}

export const ApiKeyId = {
  id: 'apiKeyId',
  title: 'API key ID',
  render: account => account.apiKeyId,
  filtering: {
    accessor: 'apiKeyId',
  },
}

export const Promoter = {
  id: 'promoter',
  title: 'Promoter',
  render: ({ promoterIdentityPoolId, promoterEmailAddress }) =>
    promoterIdentityPoolId
      ? `${promoterEmailAddress} (${promoterIdentityPoolId})`
      : '',
  filtering: {
    accessor: ({ promoterIdentityPoolId, promoterEmailAddress }) =>
      promoterIdentityPoolId
        ? `${promoterEmailAddress} ${promoterIdentityPoolId}`
        : '',
  },
}

export const DatePromoted = {
  id: 'datePromoted',
  title: 'Date promoted',
  render: ({ datePromoted }) => (datePromoted ? formatDate(datePromoted) : ''),
  ordering: {
    iteratee: 'datePromoted',
  },
}

export const DateRequested = {
  id: 'dateRequested',
  title: 'Date requested',
  render: account => formatDate(account.dateRequested),
  ordering: {
    iteratee: 'dateRequested',
  },
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('default', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
})

const formatDate = isoDateString =>
  DATE_TIME_FORMATTER.format(new Date(isoDateString))
