import { observable, computed } from 'mobx'
import { isSubscribed } from 'services/api-catalog'
import _ from 'lodash'

export const store = observable({
  api: undefined,
  apiList: undefined,
  catalog: [],
  subscriptions: []
})

export default store
