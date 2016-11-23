import React from 'react'
import SignIn from '../components/SignIn'
import ApiCatalog from '../components/ApiCatalog'
import { isAuthenticated } from '../services/self'

export default () => isAuthenticated() ? <ApiCatalog />  :<SignIn />
