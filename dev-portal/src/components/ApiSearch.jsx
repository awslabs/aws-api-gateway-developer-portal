import React, { Component } from 'react';

import { Link } from 'react-router-dom'
import { Menu, Search, Grid } from 'semantic-ui-react'

import { observer } from 'mobx-react'
import { store } from 'services/state'

import _ from 'lodash'

import ApisMenu from './ApisMenu'
import './ApiSearch.css'

const resultRenderer = (result) => (
  <Menu.Item
    key={result.title}
    as={Link}
    to={result.url}
    style={{display: 'inline-block', width: '100%', height: '100%'}}
  >
    {result.title}
  </Menu.Item>
)

export default observer(class ApiSearch extends Component {
  constructor(props) {
    super(props)

    this.state = {
      search: {
        isLoading: false,
        value: ''
      },
      results: [],
      loaded: store.apiList.loaded,
      categories: {}
    }
  }

  componentDidMount() {
    this.createSearchCategories(store.apiList.apiGateway, store.apiList.generic)
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.loading !== store.apiList.loaded) {
      this.createSearchCategories(store.apiList.apiGateway, store.apiList.generic)
      this.setState((prev) => ({ ...prev, loading: store.apiList.loaded }))
    }
  }

  createSearchCategories = (apiGateway, generic) => {

    let categories = {
      "Subscribable": {
        "name": "Subscribable",
        "results": []
      },
      "Not Subscribable": {
        "name": "Not Subscribable",
        "results": []
      }
    }

    apiGateway.forEach(({ id, stage, swagger, subscribed, usagePlan }) => {
      categories.Subscribable.results.push({
        url: `/apis/${id}/${stage}`,
        title: `${swagger.info.title} - ${stage}`,
        stage: `${stage}`,
        searchable: `{${JSON.stringify(swagger)} ${JSON.stringify(usagePlan)} ${stage}}`
      })
    })

    generic.forEach(({ id, swagger, stage = false, ...rest }) => {
      let api = {
        url: `/apis/${id}`,
        title: `${swagger.info.title}`,
        searchable: `${JSON.stringify(swagger)}${stage || ''}`
      }
      if (stage) api.stage = stage
      categories["Not Subscribable"].results.push(api)
    })

    this.setState((prev) => ({ ...prev, categories }), () => { console.log(this.state.categories) })
  }

  
  handleResultSelect = (e, { result }) => {
    console.log(result)
  }
  
  handleSearchChange = (e, { value }) => {
    this.setState(({ search: { isLoading, ...searchRest }, ...rest }) => ({
      ...rest,
      search: {
        ...searchRest,
        isLoading: true,
        value
      }}))
    
    setTimeout(() => {
      if (this.state.search.value.length < 1) return this.resetComponent()
      
      const re = new RegExp(_.escapeRegExp(this.state.search.value), 'i')
      const isMatch = result => re.test(result.title) || re.test(result.searchable)
      
      const filteredResults = _.reduce(
        this.state.categories,
        (memo, data, name) => {
          const results = _.filter(data.results, isMatch)
          if (results.length) memo[name] = { name, results } // eslint-disable-line no-param-reassign
          
          return memo
        }, {})
        
        this.setState(({ search: { value }, ...rest }) => ({
          ...rest,
          search: { isLoading: false, value },
          results: filteredResults
        }))
      }, 300)
    }

    resetComponent = () => this.setState((prev) => ({ ...prev, search: { isLoading: false, value: '' }, results: [] }))

    render() {
      const { isLoading, value } = this.state.search
      const { results } = this.state

      return (
        <div style={{ display: "flex", flex: "1 1 auto", overflow: "hidden" }}>
        <ApisMenu path={this.props.match} />
        <Grid style={{padding: '2em'}}>
          <Grid.Column>
            <Search
              category
              loading={isLoading}
              onResultSelect={this.handleResultSelect}
              showNoResults={!isLoading}
              onSearchChange={_.debounce(this.handleSearchChange, 500, { leading: true })}
              results={results}
              resultRenderer={resultRenderer}
              value={value}
              {...this.props}
              />
          </Grid.Column>
        </Grid>
      </div>
    );
  }
})