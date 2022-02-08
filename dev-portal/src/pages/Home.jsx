// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'

// mobx
import { observer } from 'mobx-react'

// fragments
import { fragments } from 'services/get-fragments'

// react-router
import { Link } from 'react-router-dom'

// semantic-ui
import { Header, Segment, Container, Image, Button } from 'semantic-ui-react'

export const HomePage = observer(() => (
  <>
    <Segment vertical textAlign='center' style={{ color: 'whitesmoke', backgroundColor: 'slategray', padding: '40px 0px', margin: '0px !important' }}>
      <Image centered src='/custom-content/home-image.png' />
      <Header as='h1' style={{ color: 'whitesmoke' }}>{fragments.Home.header}</Header>
      <p>{fragments.Home.tagline}</p>
      <Link to='/getting-started' data-testid='gettingStartedLink'>
        <Button positive>{fragments.Home.gettingStartedButton}</Button>
      </Link>
      <Link to='/apis' style={{ padding: '0.78571429em 1.5em 0.78571429em', color: 'white' }} data-testid='apiListLink'>
        {fragments.Home.apiListButton}
      </Link>
    </Segment>
    <Segment vertical style={{ padding: '40px 0px', margin: '0 !important' }}>
      <Container fluid text textAlign='justified'>
        <fragments.Home.jsx />
      </Container>
    </Segment>
  </>
))

export default HomePage
