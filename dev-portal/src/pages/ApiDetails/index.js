import React from 'react'
import { loadSwagger } from '../../services/swagger-ui'
import { getApi } from '../../services/api-catalog'
import Head from '../../components/Head'

export default class ApiDetailsPage extends React.Component {
  constructor(props) {
    super(props)
    this.state = {}

    getApi(props.params.apiId)
    .then(api => {
      this.setState({
        api
      })
      loadSwagger(api.swagger)
    })
  }

  render() {
    return (<div>
      <Head {...this.props} />
      <section className="swagger-section" style={{overflow: 'auto'}}>
        <div className="swagger-ui-wrap" id="swagger-ui-container"></div>
      </section>
    </div>)
  }
}
