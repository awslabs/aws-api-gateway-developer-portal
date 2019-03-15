// // Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// // SPDX-License-Identifier: Apache-2.0
//
// import React from 'react'
// import { Button, Popup } from 'semantic-ui-react'
// import { Redirect } from 'react-router-dom'
//
//     import { cognitoDomain, cognitoClientId } from '../services/api'
//
// export default class SignIn extends React.Component {
//   redirectUri = `${window.location.protocol}//${window.location.host}/login`
//
//   userSignIn = () => {
//     window.location = `${cognitoDomain}/login?response_type=token&client_id=${cognitoClientId}&redirect_uri=${this.redirectUri}`
//   }
//
//   render() {
//     return this.props.signedIn ? <Redirect to='/apis' /> : (
//       <Popup
//         inverted
//         wide
//         trigger={ this.props.trigger }
//         content={
//             <Link onClick={this.userSignIn}>User</Link>
//         }
//         on='click'
//         position='bottom right'
//       />)
//   }
// }