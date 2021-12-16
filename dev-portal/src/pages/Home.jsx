// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'

// mobx
import { observer } from 'mobx-react'

// fragments
import { fragments } from 'services/get-fragments'

// semantic-ui
import { Header, Segment, Container, Image } from 'semantic-ui-react'

export const HomePage = observer(() => (
  <>
    <Segment vertical textAlign='center' style={{ color: 'whitesmoke', backgroundColor: 'slategray', padding: '40px 0px', margin: '0px !important' }}>
      <Image centered size='large' src='/custom-content/home-image.png' />
      <Header as='h1' style={{ color: 'whitesmoke' }}>{fragments.Home.header}</Header>
    </Segment>
    <Segment vertical style={{ padding: '40px 0px', margin: '0 !important' }}>
      <Container fluid text textAlign='justified'>
        <fragments.Home.jsx />
      </Container>
    </Segment>
  </>
))

export default HomePage
