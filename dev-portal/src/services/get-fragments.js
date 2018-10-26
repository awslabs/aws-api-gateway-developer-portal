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

const renderers = {
  link: ({ href, ...props }) => {
    // if absolute url, use an `a` tag
    // https://stackoverflow.com/a/19709846/4060061
    if (/^(?:[a-z]+:)?\/\//i.test(href))
      return <a href={href} {...props} />

    // replace links with react-router-dom tags so that they 
    return <Link to={href} {...props} />
  }
}