export function loadSwagger(spec) {
    window.swaggerUi = new window.SwaggerUi({
        url: 'http://petstore.swagger.io/v2/swagger.json', // BUG: url is necessary, but is not parsed if `spec` is provided https://github.com/swagger-api/swagger-ui/issues/1758
        validatorUrl: null,
        spec: spec,
        dom_id: 'swagger-ui-container',
        highlightSizeThreshold: 5000,
        supportedSubmitMethods: [
            'get', 'post', 'put', 'delete', 'patch'
        ],
        onFailure: function(data) {
            console.error('Unable to Load SwaggerUI')
        },
        jsonEditor: false,
        defaultModelRendering: 'schema',
        docExpansion: 'list',
        showRequestHeaders: false
    })

    window.swaggerUi.load()
}
