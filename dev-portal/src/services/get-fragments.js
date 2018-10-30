// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React from 'react'

// react-router
import { Link } from 'react-router-dom'

// mobx
import { observable } from 'mobx'

// markdown parsing
import frontmatter from 'front-matter'
import Markdown from 'react-markdown/with-html'

export const fragments = observable({})

loadHtml('/custom-content/content-fragments/GettingStarted.md', 'GettingStarted')
loadHtml('/custom-content/content-fragments/Home.md', 'Home')
loadHtml('/custom-content/content-fragments/APIs.md', 'APIs')

/**
 * 
 * Pre-load the custom-content markdown, parses its frontmatter, and renders it as JSX. This method is asynchronous and doesn't actually return anything -- instead, it acts on a MobX Observable -- the fragment. The fragment is an object with a `jsx` property that maps to the rendered component, and any number of other properties collected from the front-matter.
 * 
 * @param {String} path   Path to the file to load in. Should be a markdown file.
 * @param {String} fragment   Name of the fragment. Determines where rendered data gets stored.
 * 
 * @returns {Object} 
 */
function loadHtml(path, fragment) {
  // if we want to display a loading indicator, this would be where
  fragments[fragment] = { jsx: () => null }

  fetch(path).then(response => response.text().then(text => {
    let parsedMarkdown = frontmatter(text)

    fragments[fragment] = {
      jsx: () => (
        <Markdown 
          escapeHtml={false} 
          source={parsedMarkdown.body}
          renderers={renderers}
        />
      ),
      ...parsedMarkdown.attributes
    }
  }))
}

/**
 * Renderers is a map of node type to component. 
 * 
 * In this case, we only override links. Any time react-markdown tries to render a link, it'll render this component. Normal links will work, but the cause a full page reload. We don't want that, so we can replacing them with react-router Links. However, replacing external links with react-router Links causes them to not work at all. We don't want that either, so we attempt to determine if a link is external or not, and use `Link` or `a` appropriately.
 */
const renderers = {
  link: ({ href, ...props }) => {
    // if absolute url, use an `a` tag
    // https://stackoverflow.com/a/19709846/4060061
    if (/^(?:[a-z]+:)?\/\//i.test(href))
      return <a href={href} target="_blank" rel="noopener noreferrer" {...props} />

    // replace links with react-router-dom tags so that they 
    return <Link to={href} {...props} />
  }
}