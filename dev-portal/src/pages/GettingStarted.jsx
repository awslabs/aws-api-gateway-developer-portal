// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'

// mobx
import { observer } from 'mobx-react'

// fragments
import { fragments } from 'services/get-fragments'

// semantic-ui
import { Container } from 'semantic-ui-react'

export default observer(() => (
  <Container style={{ padding: "40px" }}>
    <fragments.GettingStarted.jsx />
  </Container>
))
