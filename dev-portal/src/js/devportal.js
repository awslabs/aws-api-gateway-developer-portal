/* eslint-disable */
import AWS from 'aws-sdk'
import CognitoIdentity from 'aws-sdk/clients/cognitoidentity'
import {CognitoUserPool, CognitoUser, AuthenticationDetails} from 'amazon-cognito-identity-js'
import $ from 'jquery'
const awsRegion = 'us-east-1'
const cognitoRegion = 'us-east-1'
const cognitoUserPoolId = 'us-east-1_zRDhjEhx6'
const cognitoIdentityPoolId = 'us-east-1:bf6731c5-b58a-4b5c-bdeb-6cd5d373fe14'
const cognitoClientId = '45ad0tnca1830dcgq3d4lbouiv'
// AWSCognito.config.region = awsRegion
AWS.config.region = cognitoRegion
const identityPoolId = cognitoIdentityPoolId
const poolData = {
    UserPoolId: cognitoUserPoolId,
    ClientId: cognitoClientId
}
let apigClient
let userPool
let cognitoUser

export function start() {
    // attempt to refresh credentials from active session
    userPool = new CognitoUserPool(poolData)
    cognitoUser = userPool.getCurrentUser()

    if (cognitoUser != null) {
        // if (/index\.html/.test(window.location.href)) {
        //     window.location = 'dashboard.html'
        //     return
        // }

        try {
            $('#show-api-key-button').popover({trigger: 'manual'}).on('click', showApiKey)
        } catch (e) {}

        cognitoUser.getSession(function(err, session) {
            if (err) {
                showError(err)
                return
            }
            console.log('session validity: ' + session.isValid())
            $('#login-register').hide()
            const cognitoLoginKey = 'cognito-idp.' + cognitoRegion + '.amazonaws.com/' + cognitoUserPoolId
            const Logins = {}
            Logins[cognitoLoginKey] = session.getIdToken().getJwtToken()
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId: identityPoolId, Logins: Logins})

            AWS.config.credentials.refresh(function(error) {
                if (error) {
                    showError(error)
                } else {
                    console.log('Successfully logged in')
                    $('#authenticated-content').show()

                    apigClient = apigClientFactory.newClient({accessKey: AWS.config.credentials.accessKeyId, secretKey: AWS.config.credentials.secretAccessKey, sessionToken: AWS.config.credentials.sessionToken, region: awsRegion})

                    getCatalog()
                }
            })
        })
    } else {
        if (!/index\.html/.test(window.location.href)) {
            // window.location = 'index.html'
            return
        } else {
            window.localStorage.removeItem('aws.cognito.identity-id.' + cognitoIdentityPoolId)
            window.localStorage.removeItem('aws.cognito.identity-providers.' + cognitoIdentityPoolId)
        }
    }
}

function showError(html) {
    const alertContainer = document.getElementById('alert-container')
    alertContainer.innerHTML = '<div class="alert alert-danger alert-dismissible fade in" role="alert">' +
        '   <button type="button" class="close" data-dismiss="alert" aria-label="Close" style="margin-right: 1rem;">' +
        '       <span aria-hidden="true">&times;</span>' +
        '   </button>' + html + '</div>'
}

export function register(email, password) {
    const attributeList = []

    userPool.signUp(email, password, attributeList, null, function(err, result) {
        if (err) {
            showError(err)
        } else {
            const cognitoUser = result.user
            console.log('user name is ' + cognitoUser.getUsername())

            // /register is an unauthenticated resource
            apigClientFactory.newClient({region: awsRegion}).post('/register', {}, {}, {}).then(function(result) {
                login(email, password)
                //                    cognitoUser.confirmRegistration('foo', true, function(err, result) {
                //                        if (err) {
                //                            showError(err)
                //                            return
                //                        }
                //                        console.log('call result: ' + result)
                //                    })

            })
        }

    })

}

export function login(email, password) {
    const authenticationData = {
        Username: email,
        Password: password
    }
    const authenticationDetails = new AuthenticationDetails(authenticationData)
    const userPool = new CognitoUserPool(poolData)
    const userData = {
        Username: email,
        Pool: userPool
    }

    const cognitoUser = new CognitoUser(userData)
    cognitoUser.authenticateUser(authenticationDetails, {
        onSuccess: function(result) {
            console.log('access token + ' + result.getAccessToken().getJwtToken())

            const cognitoLoginKey = 'cognito-idp.' + cognitoRegion + '.amazonaws.com/' + cognitoUserPoolId
            const Logins = {}
            Logins[cognitoLoginKey] = result.getIdToken().getJwtToken()
            AWS.config.credentials = new AWS.CognitoIdentityCredentials({IdentityPoolId: identityPoolId, Logins: Logins})

            AWS.config.credentials.refresh(function(error) {
                if (error) {
                    console.error(error)
                } else {
                    console.log('Successfully logged in')
                    $('#login-register').hide()
                    $('#authenticated-content').show()

                    apigClient = apigClientFactory.newClient({accessKey: AWS.config.credentials.accessKeyId, secretKey: AWS.config.credentials.secretAccessKey, sessionToken: AWS.config.credentials.sessionToken, region: awsRegion})

                    apigClient.post('/signin', {}, {}, {}).then(function(result) {
                        window.location = 'dashboard.html'
                    }).catch(function(err) {
                        showError(JSON.stringify(err.data.message))
                    })
                }
            })

        },

        onFailure: function(err) {
            showError(err)
        }

    })
}

function logout() {
    cognitoUser.signOut()
    window.location = 'index.html'
}

function testMarketplaceSubscription(apiId, stage) {
    apigClient.get('/apikey', {}, {}, {}).then(function(result) {
        const apiKey = result.data.value
        const url = 'https://' + apiId + '.execute-api.' + awsRegion + '.amazonaws.com/' + stage
        $('#curl-command .api-endpoint').text(url)
        $('#curl-command .api-key').text(apiKey)
        $('#test-modal').modal('show')
        $.ajax({
            url: url,
            headers: {
                'X-API-KEY': apiKey
            }
        }).done(function(data) {
            $('#test-response').text(JSON.stringify(data))
        }).fail(function(jqXHR, textStatus, error) {
            error = error || 'Error making request to API. Verify CORS is enabled on the API.'
            $('#test-response').text(JSON.stringify(error))
        })
    })
}

function showApiKey() {
    const currentButtonText = $('#show-api-key-button').text()

    if (currentButtonText === 'Show API Key') {
        $('#show-api-key-button').text('Loading API Key...')

        apigClient.get('/apikey', {}, {}, {}).then(function(result) {
            $('#show-api-key-button').attr('data-content', result.data.value)
            $('#show-api-key-button').popover('show')
            $('#show-api-key-button').text('Hide API Key')
        }).catch(function(err) {
            showError(JSON.stringify(err))
        })
    } else {
        $('#show-api-key-button').text('Show API Key')
        $('#show-api-key-button').popover('hide')
    }
}

function getCatalog() {
    // get subscribed usage plans
    apigClient.get('/subscriptions', {}, {}, {}).then(function(subscriptionsResult) {
        apigClient.get('/catalog', {}, {}, {}).then(function(result) {
            const catalog = result.data.map(c => {
                const subscribedUsagePlan = subscriptionsResult.data.find(s => s.id === c.usagePlanId)
                c.isSubscribed = !!subscribedUsagePlan
                c.apiStages = subscribedUsagePlan && subscribedUsagePlan.apiStages || []

                return c
            })

            if (/dashboard\.html/.test(window.location.href)) {
                generateCatalogCardList(catalog)
            } else if (/api\.html/.test(window.location.href)) {
                const queryStringParts = window.location.search.replace('?', '').split('&').map(e => e.split('='))
                const queryStringParams = {}
                queryStringParts.forEach(q => {
                    queryStringParams[q[0]] = q[1]
                })

                const currentApi = catalog.find(c => c.apiId === queryStringParams.apiId)

                loadSwagger(currentApi.swagger)
            }
        })
    }).catch(function(err) {
        showError(JSON.stringify(err.data.message))
    })
}

function generateCatalogCardList(catalog) {
    const catalogContainer = document.getElementById('catalog')
    if (catalogContainer === null) {
        return
    }
    const cardsMarkup = catalog.map(getCatalogCardMarkup).join('')
    catalogContainer.innerHTML = cardsMarkup
}

function getCatalogCardMarkup(api) {
    return '<div class="col-xs-12 col-md-6 col-lg-4">' + '    <div class="card card-block">' + '        <h4 class="card-title"><a href="api.html?apiId=' + api.apiId + '">' + api.title + '</a></h4>' + '        <p class="card-text">' + api.description + '</p>' + '        ' + getCatalogCardActionButtonsMarkup(api) + '    </div>' + '</div>'
}

function getCatalogCardActionButtonsMarkup(api) {
    if (!api.isSubscribed) {
        return '<button class="btn btn-primary pull-xs-right" onclick="addSubscription(\'' + api.usagePlanId + '\')">Subscribe</button>'
    }

    return '<div class="btn-group pull-xs-right">' + '    <button type="button" class="btn btn-secondary dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Action</button>' + '    <div class="dropdown-menu">' + '        <button class="dropdown-item" onclick="showUsage(\'' + api.usagePlanId + '\')">Show Usage</button>' + '        <button class="dropdown-item" onclick="testMarketplaceSubscription(\'' + api.apiStages[0].apiId + '\', \'' + api.apiStages[0].stage + '\')">Test Marketplace Subscription</button>' + '        <button class="dropdown-item" onclick="removeSubscription(\'' + api.usagePlanId + '\')">Unsubscribe</button>' + '    </div>' + '</div>'
}

function addSubscription(usagePlanId) {
    apigClient.put('/subscriptions/' + usagePlanId, {}, {}).then(function(result) {
        getCatalog()
    }).catch(function(err) {
        showError(JSON.stringify(err.data.message))
    })
}

function mapUsageByDate(usage, usedOrRemaining) {
    const apiKeyDates = {}
    Object.keys(usage.items).forEach(apiKeyId => {
        apiKeyDates[apiKeyId] = mapApiKeyUsageByDate(usage.items[apiKeyId], usage.startDate, usedOrRemaining)
    })

    const dates = {}
    Object.keys(apiKeyDates).forEach((apiKeyId, index) => {
        const apiKeyUsage = apiKeyDates[apiKeyId]
        apiKeyUsage.forEach(dailyUsage => {
            const date = dailyUsage[0]
            const value = dailyUsage[1]

            if (!dates[date])
                dates[date] = 0
            dates[date] += value
        })
    })

    const usageByDate = Object.keys(dates).sort().map(date => [date, dates[date]])

    return usageByDate
}

function mapApiKeyUsageByDate(apiKeyUsage, startDate, usedOrRemaining) {
    const dateParts = startDate.split('-')
    const year = dateParts[0]
    const month = dateParts[1]
    const day = dateParts[2]
    const apiKeyDate = new Date(year, month - 1, day)
    apiKeyDate.setHours(0, 0, 0, 0)
    const usedOrRemainingIndex = usedOrRemaining === 'used'
        ? 0
        : 1

    if (apiKeyUsage && !Array.isArray(apiKeyUsage[0]))
        apiKeyUsage = [apiKeyUsage]

    return apiKeyUsage.map((usage) => {
        const date = apiKeyDate.setDate(apiKeyDate.getDate())
        const item = [date, usage[usedOrRemainingIndex]]
        apiKeyDate.setDate(apiKeyDate.getDate() + 1)
        return item
    })
}

function showUsage(usagePlanId) {
    const date = new Date()
    const start = new Date(date.getFullYear(), date.getMonth(), 1).toJSON().split('T')[0]
    const end = new Date().toJSON().split('T')[0]
    apigClient.get('/subscriptions/' + usagePlanId + '/usage', {
        start,
        end
    }, {}).then(function(result) {
        $('#usage-modal').modal('show')
        const data = mapUsageByDate(result.data, 'used')
        const ctx = document.getElementById('myChart')
        const myChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(d => new Date(parseInt(d[0])).toLocaleDateString()),
                datasets: [
                    {
                        label: 'Usage',
                        data: data.map(d => d[1]),
                        backgroundColor: 'rgba(255, 99, 132, 0.2)',
                        borderColor: 'rgba(255,99,132,1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                scales: {
                    yAxes: [
                        {
                            ticks: {
                                beginAtZero: true
                            }
                        }
                    ]
                }
            }
        })
    }).catch(function(err) {
        console.log(err)
        showError(JSON.stringify(err))
    })
}

function removeSubscription(usagePlanId) {
    apigClient.delete('/subscriptions/' + usagePlanId, {}, {}).then(function(result) {
        getCatalog()
    }).catch(function(err) {
        showError(JSON.stringify(err.data.message))
    })
}

function confirmSubscription() {
    const apigClient = apigClientFactory.newClient({accessKey: AWS.config.credentials.accessKeyId, secretKey: AWS.config.credentials.secretAccessKey, sessionToken: AWS.config.credentials.sessionToken, region: awsRegion})

    const usagePlanId = getParameterByName('usagePlanId')
    const token = getParameterByName('token')

    apigClient.put("/marketplace-subscriptions/" + usagePlanId, {}, {token: token}).then(function(result) {
        window.location = "index.html"
    }).catch(function(err) {
        showError(JSON.stringify(err))
    })
}

function getParameterByName(name, url) {
    if (!url) {
        url = window.location.href
    }
    name = name.replace(/[\[\]]/g, "\\$&")
    const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url)
    if (!results)
        return null
    if (!results[2])
        return ''
    return decodeURIComponent(results[2].replace(/\+/g, " "))
}

function loadSwagger(spec) {
    console.log(spec)
    hljs.configure({highlightSizeThreshold: 5000})

    // Pre load translate...
    if (window.SwaggerTranslator) {
        window.SwaggerTranslator.translate()
    }
    window.swaggerUi = new SwaggerUi({
        url: 'http://petstore.swagger.io/v2/swagger.json', // BUG: url is necessary, but is not parsed if `spec` is provided https://github.com/swagger-api/swagger-ui/issues/1758
        validatorUrl: null,
        spec: spec,
        dom_id: "swagger-ui-container",
        supportedSubmitMethods: [
            'get', 'post', 'put', 'delete', 'patch'
        ],
        onComplete: function(swaggerApi, swaggerUi) {
            if (typeof initOAuth == "function") {
                initOAuth({
                    clientId: "your-client-id",
                    clientSecret: "your-client-secret-if-required",
                    realm: "your-realms",
                    appName: "your-app-name",
                    scopeSeparator: " ",
                    additionalQueryStringParams: {}
                })
            }

            if (window.SwaggerTranslator) {
                window.SwaggerTranslator.translate()
            }
        },
        onFailure: function(data) {
            log("Unable to Load SwaggerUI")
        },
        docExpansion: "none",
        jsonEditor: false,
        defaultModelRendering: 'schema',
        showRequestHeaders: false
    })

    window.swaggerUi.load()

    function log() {
        if ('console' in window) {
            console.log.apply(console, arguments)
        }
    }
}
