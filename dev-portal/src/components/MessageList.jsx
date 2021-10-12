import React, { useState } from 'react'

export const MessageList = ({ messages }) =>
  messages.map(({ render, id }) => (
    <React.Fragment key={id}>{render()}</React.Fragment>
  ))

/**
 * A Hook for operating a list of "messages" which should be self-dismissable.
 * Returns `[messages, sendMessage]`, where:
 *    - `messages` is an array of messages, which should be provided as a prop
 *      to `MessageList` to be rendered
 *    - `sendMessage` is a function which accepts a renderer callback, and
 *      calls the callback to obtain a renderable message to append to
 *      `messages`. The renderer callback should accept a `dismiss` function as
 *      its sole argument, which removes the renderable message from `messages`
 *      when called.
 */
export const useMessages = () => {
  const [state, setState] = useState({
    messages: [],
    nextId: 0
  })

  const sendMessage = renderWithDismiss => {
    const id = state.nextId
    const dismiss = () => {
      setState(state => ({
        ...state,
        messages: state.messages.filter(message => message.id !== id)
      }))
    }
    const newMessage = {
      render: () => renderWithDismiss(dismiss),
      id: state.nextId
    }
    setState(state => ({
      messages: [...state.messages, newMessage],
      nextId: state.nextId + 1
    }))
  }

  const clearMessages = () => {
    setState(state => ({ ...state, messages: [] }))
  }

  return [state.messages, sendMessage, clearMessages]
}
