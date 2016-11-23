import React from 'react'
import ApiCatalog from '../../components/ApiCatalog'

const apis = [{
  id: '123',
  name: 'Foo',
  description: 'lorem ipsum'
}, {
  id: '234',
  name: 'Bar',
  description: 'dolor olat'
}]

export default () => <ApiCatalog apis={apis} />
