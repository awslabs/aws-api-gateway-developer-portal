// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useEffect, useState } from 'react'

import {
  Grid,
  Header,
  Button,
  Divider,
  TableRow,
  TableHeaderCell,
  TableHeader,
  TableFooter,
  TableCell,
  TableBody,
  MenuItem,
  Icon,
  Label,
  Menu,
  Table
 } from 'semantic-ui-react'

import Chart from 'chart.js'
import { fetchUsage, mapUsageByDate } from 'services/api-catalog'
import { toTitleCase } from 'services/misc'

import { observer } from 'mobx-react'

import { Link } from 'react-router-dom'


import _ from 'lodash'

export default observer(() => {
  const [rowData, setRowData] = useState(null);

  useEffect(() => {
    // Call buildRows when the component mounts
    loadCredentials();
  }, [])

  const getCredentialsHtml = () => {
    return rowData.map(item => {
        return <TableRow key={item.id}>
        <TableCell>{ item.name }</TableCell>
        <TableCell>{ item.description }</TableCell>
        <TableCell>{ item.creation_date }</TableCell>
      </TableRow>
    })
  }

  const loadCredentials = async() => {
    const apiUrl = "http://localhost:44341/api/v2/accounts/2CKqo5BE/credentials"
    try {
      const response = await fetch(apiUrl);

      if (response.ok) {
        const data = await response.json();

        setRowData(data.data);
      } else {
        console.error('Error fetching records:', response.status, response.statusText);
        throw new Error('Failed to fetch records');
      }
    } catch (error) {
      console.error('Error:', error.message);
      throw error;
    }
  }

  return (
    <Grid container>
      <Grid.Row>
        <Grid.Column style={{ paddingTop: '40px' }}>
          <Header size='medium'>Credential List</Header>

        </Grid.Column>
      </Grid.Row>
      <Divider />
      <Grid.Row>
        <Link to='/getting-started' data-testid='gettingStartedLink'>
          <Button positive>Add Credential</Button>
        </Link>
      </Grid.Row>
      <Grid.Row>
      <Table celled>
    <TableHeader>
      <TableRow>
        <TableHeaderCell>Header</TableHeaderCell>
        <TableHeaderCell>Header</TableHeaderCell>
        <TableHeaderCell>Header</TableHeaderCell>
      </TableRow>
    </TableHeader>

    <TableBody>
      { rowData ? getCredentialsHtml() : <TableRow><TableCell colSpan="3">Loading...</TableCell></TableRow>}
    </TableBody>

    <TableFooter>
      <TableRow>
        <TableHeaderCell colSpan='3'>
          <Menu floated='right' pagination>
            <MenuItem as='a' icon>
              <Icon name='chevron left' />
            </MenuItem>
            <MenuItem as='a'>1</MenuItem>
            <MenuItem as='a'>2</MenuItem>
            <MenuItem as='a'>3</MenuItem>
            <MenuItem as='a'>4</MenuItem>
            <MenuItem as='a' icon>
              <Icon name='chevron right' />
            </MenuItem>
          </Menu>
        </TableHeaderCell>
      </TableRow>
    </TableFooter>
  </Table>
      </Grid.Row>
    </Grid>
  )
})