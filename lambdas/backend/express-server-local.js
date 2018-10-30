// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

const app = require('./express-server')
const port = 4000

app.listen(port)
console.log(`listening on http://localhost:${port}`)
