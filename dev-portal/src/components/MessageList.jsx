import React, { useState } from 'react'

export const MessageList = ({ messages }) =>
  messages.map((message, index) => (
    <React.Fragment key={index}>{message}</React.Fragment>
  ))

/**
 * A Hook for operating a list of "messages" which should be self-dismissable.
 * Returns `[messages, sendMessage]`, where:
 *    - `messages` is an array of renderable messages (of type `React.ReactNode`)
 *    - `sendMessage` is a function which accepts a renderer callback, and
 *      calls the callback to obtain a renderable message to append to
 *      `messages`. The renderer callback should accept a `dismiss` function as
 *      its sole argument, which removes the renderable message from `messages`
 *      when called.
 */
export const useMessages = () => {
  const [messages, setMessages] = useState([])

  const sendMessage = renderWithDismiss => {
    const target = renderWithDismiss(() => {
      setMessages(messages => messages.filter(message => message !== target))
    })
    setMessages(messages => [...messages, target])
  }

  return [messages, sendMessage]
}
