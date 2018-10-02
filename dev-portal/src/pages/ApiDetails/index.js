import React, { PureComponent } from 'react'
import SwaggerUI from 'swagger-ui'

import SwaggerUIStandalonePreset from 'swagger-ui/dist/swagger-ui-standalone-preset'
import 'swagger-ui/dist/swagger-ui.css'

import { getApi } from '../../services/api-catalog'
import Head from '../../components/Head'

export default class ApiDetailsPage extends PureComponent {
  componentDidMount = () => {
    getApi(this.props.match.params.apiId)
    .then(api => {
      console.log(api)
      SwaggerUI({

        dom_id: '#swagger-ui-container',
        spec: api.swagger,

        // old config
        // validatorUrl: null,
        // highlightSizeThreshold: 5000,
        // supportedSubmitMethods: [
        //     'get', 'post', 'put', 'delete', 'patch'
        // ],
        // onFailure: function(data) {
            // console.error('Unable to Load SwaggerUI')
        // },
        // jsonEditor: false,
        // defaultModelRendering: 'schema',
        // docExpansion: 'list',
        // showRequestHeaders: false
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
