// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Menu } from 'semantic-ui-react'

function Sidebar ({ style, ...props }) {
  return (
    <Menu
      inverted vertical borderless attached
      style={{ flex: '0 0 auto', width: 'auto', ...style }}
      {...props}
    />
  )
}

export default Sidebar
