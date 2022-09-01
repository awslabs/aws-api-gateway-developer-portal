// Copyright 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import React, { useLayoutEffect, useRef } from 'react'
import ReactDOM from 'react-dom'

// react-router
import { Link } from 'react-router-dom'

// mobx
import { observable } from 'mobx'

// markdown parsing
import frontmatter from 'front-matter'
import { marked } from 'marked'

export const fragments = observable({})

export const loadFragments = () => {
  loadHtml('/custom-content/content-fragments/GettingStarted.md', 'GettingStarted')
  loadHtml('/custom-content/content-fragments/Home.md', 'Home')
  loadHtml('/custom-content/content-fragments/APIs.md', 'APIs')
}

/**
 * Pre-load the custom-content markdown, parses its frontmatter, and renders it as JSX. This method
 * is asynchronous and doesn't actually return anything -- instead, it acts on a MobX Observable --
 * the fragment. The fragment is an object with a `jsx` property that maps to the rendered
 * component, and any number of other properties collected from the front-matter.
 *
 * @param {String} path   Path to the file to load in. Should be a markdown file.
 * @param {String} fragment   Name of the fragment. Determines where rendered data gets stored.
 *
 * @returns {Object}
 */
function loadHtml (path, fragment) {
  // if we want to display a loading indicator, this would be where
  fragments[fragment] = { jsx: () => null }

  window.fetch(path).then(response => response.text().then(text => {
    const parsedMarkdown = frontmatter(text)
    const html = marked(parsedMarkdown.body, {
      headerPrefix: 'header-',
      silent: true
    })

    fragments[fragment] = {
      jsx: () => <ShowHTML html={html} />,
      ...parsedMarkdown.attributes
    }
  }))
}

function ShowHTML ({ html }) {
  /** @type {import("react").MutableRefObject<HTMLDivElement>} */
  const ref = useRef()

  // Easier to do it here than to use a separate `useMemo` hook.
  useLayoutEffect(() => {
    // Normal links will work, but the cause a full page reload. We don't want that, so we replace
    // them with react-router Links. However, replacing external links with react-router Links
    // causes them to not work at all. We don't want that either, so we attempt to determine if a
    // link is external or not, and replace them as appropriate.

    const mountPoints = []
    const links = ref.current.getElementsByTagName('a')

    for (let i = 0; i < links.length; i++) {
      const link = links[i]
      // if absolute url, use an `a` tag
      // https://stackoverflow.com/a/19709846/4060061
      if (/^(?:[a-z]+:)?\/\//i.test(link.href)) {
        link.target = '_blank'
        link.rel = 'noopener noreferrer'
      } else {
        // Replace links with react-router-dom tags so that they route correctly
        const span = document.createElement('span')
        // If there's CSS, don't listen to it.
        span.style.setProperty('display', 'inline', 'important')
        ReactDOM.render(<Link
          to={link.href}
          target={link.target}
          dangerouslySetInnerHTML={{ __html: link.innerHTML }}
        />, span)
        link.replaceWith(span)
        mountPoints.push(span)
      }
    }

    // Gracefully unmount any mount points that were added
    return () => {
      mountPoints.forEach(elem => {
        ReactDOM.render(null, elem)
      })
    }
  }, [])

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
}
