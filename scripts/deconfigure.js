#!/usr/bin/env node --harmony
/*
* Convenience script to scrub templates.
* Especially useful during development of reference implementation.
*/
'use strict'

const {Swizzle} = require('swizzle-params')

module.exports = function () {
	const swizzle = new Swizzle()
	swizzle.swizzleStack('default')
}
