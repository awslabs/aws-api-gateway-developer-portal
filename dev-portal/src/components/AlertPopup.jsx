// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Segment, Message } from 'semantic-ui-react'

import { observer } from 'mobx-react'

import { store } from 'services/state'

export default observer(() => {
  return (
    <Segment basic style={{ position: "absolute", right: 0, margin: 0, top: "56px", display: "flex", flexDirection: "column" }}>
      {store.notifications.map(notify => {
        return <Message
          {...notify}
          onDismiss={() => clearNofication(notify)}
          style={{ margin: 0, marginBottom: "15px" }} />
      })}
    </Segment>
  )
})

export function addNotification({ compact=true, negative=true, floating=true, icon="warning sign", header="Error", content="An unknown error has occurred." }) {
  store.notifications.push({
    compact, negative, floating, icon, header, content
  })
}

function clearNofication(notification) {
  store.notifications = store.notifications.filter(notify => notify !== notification)
}