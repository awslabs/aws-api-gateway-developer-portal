import React, { PureComponent } from 'react'
import SwaggerUI from 'swagger-ui'
import 'swagger-ui/dist/swagger-ui.css'
import { getApi } from '../../services/api-catalog'
import Head from '../../components/Head'

export default class ApiDetailsPage extends PureComponent {
  componentDidMount = () => {
    getApi(this.props.match.params.apiId)
    .then(api => {
      SwaggerUI({
        dom_id: '#swagger-ui-container',
        spec: api.swagger
      })
    })
  }

  render() {
    return (
      <div>
        <Head {...this.props} />
        <section className="swagger-section" style={{overflow: 'auto'}}>
          <div className="swagger-ui-wrap" id="swagger-ui-container"></div>
        </section>
      </div>
    )
  }
}
