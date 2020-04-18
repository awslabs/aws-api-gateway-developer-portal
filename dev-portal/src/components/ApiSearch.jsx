import React, { useState, useMemo } from 'react'

import { Link } from 'react-router-dom'
import { Menu, Search, Grid } from 'semantic-ui-react'

import { useObserver } from 'mobx-react'
import { store } from 'services/state'

import _ from 'lodash'

import ApisMenu from './ApisMenu'
import PageWithSidebar from 'components/PageWithSidebar'
import './ApiSearch.css'
import searchTermRegexp from 'utils/search-term-regexp'

function prepareSearch (searchString) {
  return Array.from(new Set(searchString.toLowerCase().match(searchTermRegexp)))
}

export default function ApiSearch (props) {
  const [value, setValue] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

  const isLoaded = useObserver(() => store.apiList != null && store.apiList.loaded)

  // Easier than building an actual search index. (And client-side text search *sucks* massively.)
  // TODO: replace this with a customized search eventually. At the very least, the Swagger API
  // fields shouldn't be here, and
  const dataSet = useMemo(() => !store.apiList ? [] : [
    ...store.apiList.apiGateway.map(({ id, apiStage: stage, swagger, usagePlan }) => ({
      url: `/apis/${id}/${stage}`,
      title: `${swagger.info.title} - ${stage}`,
      stage: `${stage}`,
      searchable: prepareSearch(`${JSON.stringify(swagger)} ${JSON.stringify(usagePlan)} ${stage}`).join(' ')
    })),
    ...store.apiList.generic.map(({ id, swagger, apiStage: stage }) => {
      const api = {
        url: `/apis/${id}`,
        title: stage ? `${swagger.info.title} - ${stage}` : `${swagger.info.title}`,
        searchable: prepareSearch(`${JSON.stringify(swagger)} ${stage || ''}`).join(' ')
      }
      if (stage) api.stage = stage
      return api
    })
  ], [isLoaded]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateSearch = useMemo(() => _.debounce(setSearchQuery, 100, { leading: true }), [])

  const results = useMemo(() => {
    if (!searchQuery) return []
    const prepared = prepareSearch(searchQuery)
    if (!prepared.length) return prepared
    return dataSet.filter(result => prepared.every(term => result.searchable.includes(term)))
  }, [searchQuery, dataSet])

  function handleSearchChange (e, { value }) {
    setValue(value)
    updateSearch(value)
  }

  return (
    <PageWithSidebar
      sidebarContent={<ApisMenu path={props.match} activateFirst={false} />}
      SidebarPusherProps={{ className: 'swagger-section' }}
    >
      <Grid style={{ padding: '2em' }}>
        <Grid.Column id='api-search'>
          <Search
            placeholder="Search for an API, stage, or any content in an API's definition."
            onSearchChange={handleSearchChange}
            results={results}
            resultRenderer={(result) => (
              <Menu.Item
                as={Link}
                to={result.url}
                style={{ display: 'inline-block', width: '100%', height: '100%' }}
              >
                {result.title}
              </Menu.Item>
            )}
            value={value}
            {...props}
          />
        </Grid.Column>
      </Grid>
    </PageWithSidebar>
  )
}
