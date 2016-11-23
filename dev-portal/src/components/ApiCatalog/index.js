import React from 'react'
import { Button, Card, Image } from 'semantic-ui-react'
import logo from '../../logo.svg'

const ApiCard = api => (<Card key={api.id}>
  <Image src={logo} />
  <Card.Content>
    <Card.Header>{api.name}</Card.Header>
    <Card.Meta>
      <span className='date'>Updated 17 Nov '16</span>
    </Card.Meta>
    <Card.Description>{api.description}</Card.Description>
  </Card.Content>
  <Card.Content extra>
    <Button>Subscribe</Button>
  </Card.Content>
</Card>)

export default ({ apis }) => (
  <Card.Group itemsPerRow={3}>
    {apis.map(ApiCard)}
  </Card.Group>)
