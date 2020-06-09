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
  id: 'EmailAddress',
  title: 'Email address',
  render: account => account.EmailAddress,
  ordering: {
    iteratee: 'EmailAddress'
  },
  filtering: {
    accessor: 'EmailAddress'
  }
}

export const IsAdmin = {
  id: 'IsAdmin',
  title: 'Administrator',
  render: account => account.IsAdmin ? 'Yes' : 'No',
  ordering: {
    iteratee: 'IsAdmin'
  },
  filtering: {
    accessor: 'IsAdmin'
  }
}

export const DateRegistered = {
  id: 'DateRegistered',
  title: 'Date registered',
  render: account => formatDate(account.DateRegistered),
  ordering: {
    iteratee: 'DateRegistered'
  }
}

export const RegistrationMethod = {
  id: 'RegistrationMethod',
  title: 'Registration method',
  render: account => account.RegistrationMethod
}

export const ApiKeyId = {
  id: 'ApiKeyId',
  title: 'API key ID',
  render: account => account.ApiKeyId,
  filtering: {
    accessor: 'ApiKeyId'
  }
}

export const Promoter = {
  id: 'Promoter',
  title: 'Promoter',
  render: ({ PromoterUserId, PromoterEmailAddress }) =>
    PromoterUserId ? `${PromoterEmailAddress} (${PromoterUserId})` : '',
  filtering: {
    accessor: ({ PromoterUserId, PromoterEmailAddress }) =>
      PromoterUserId ? `${PromoterEmailAddress} ${PromoterUserId}` : ''
  }
}

export const Inviter = {
  id: 'Inviter',
  title: 'Inviter',
  render: ({ InviterUserId, InviterEmailAddress }) =>
    InviterUserId ? `${InviterEmailAddress} (${InviterUserId})` : '',
  filtering: {
    accessor: ({ InviterUserId, InviterEmailAddress }) =>
      InviterUserId ? `${InviterEmailAddress} ${InviterUserId}` : ''
  }
}

export const DatePromoted = {
  id: 'DatePromoted',
  title: 'Date promoted',
  render: ({ DatePromoted }) => (DatePromoted ? formatDate(DatePromoted) : ''),
  ordering: {
    iteratee: 'DatePromoted'
  }
}

export const DateRequested = {
  id: 'DateRequested',
  title: 'Date requested',
  render: account => formatDate(account.DateRequested),
  ordering: {
    iteratee: 'DateRequested'
  }
}

export const DateInvited = {
  id: 'DateInvited',
  title: 'Date invited',
  render: account => formatDate(account.DateInvited),
  ordering: {
    iteratee: 'DateInvited'
  }
}

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat('default', {
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
})

const formatDate = isoDateString =>
  DATE_TIME_FORMATTER.format(new Date(isoDateString))
