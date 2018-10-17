import React from 'react'
import { Link } from 'react-router-dom'

// semantic-ui
import { Menu, Loader } from 'semantic-ui-react'

// store
import { observer } from 'mobx-react'
import { store } from 'services/state'

export default observer(class ApisMenu extends React.Component {
  isActive = (apiId, index) => {
    let apiIdInPath = this.props.path.params.apiId
    return (apiIdInPath) ? apiId === apiIdInPath : (index === 0)
  }

  render() {
    const { path, ...props } = this.props
    return (
      <Menu
        inverted
        vertical
        attached
        style={{ margin: 0, borderRadius: 0 }}
        {...props}
      >
        {!store.apiList ? (
          <Loader active />
        ) : (store.apiList && (
          store.apiList.length ? store.apiList.map((api, index) => (
            <Menu.Item
              key={api.id}
              as={Link}
              to={`/apis/${api.id}`}
              active={this.isActive(api.id, index)}
            >
              {api.swagger.info.title}
            </Menu.Item>
          )) : (
            <p style={{ padding: "13px 16px", color: "whitesmoke" }}>No APIs Published</p>
          )
        ))}
      </Menu>
    )
  }
})
