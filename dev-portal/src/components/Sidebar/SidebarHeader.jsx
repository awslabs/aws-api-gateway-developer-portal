// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'
import { Menu } from 'semantic-ui-react'

function SidebarHeader ({ style, ...props }) {
  return (
    <Menu.Header
      style={{ padding: '13px 5px 13px 16px', color: 'lightsteelblue', ...style }}
      {...props}
    />
  )
}

export default SidebarHeader
