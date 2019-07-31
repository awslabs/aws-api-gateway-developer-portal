import React, { useState } from 'react'

export const MessageList = ({ messages, dismissMessage, renderers }) => (
  <>
    {messages.map((message, index) => {
      const { type, ...payload } = message
      if (renderers[type]) {
        return (
          <React.Fragment key={index}>
            {renderers[type](payload, () => dismissMessage(message))}
          </React.Fragment>
        )
      }
      throw new Error(`Unknown message type: ${type.toString()}`)
    })}
  </>
)

export const useMessageQueue = initialMessages => {
  const [messages, setMessages] = useState(initialMessages || [])

  const sendMessage = target => setMessages([...messages, target])
  const dismissMessage = target => {
    const deleteIndex = messages.findIndex(message => message === target)
    if (deleteIndex === -1) {
      throw new Error('Message not found')
    }
    setMessages([
      ...messages.slice(0, deleteIndex),
      ...messages.slice(deleteIndex + 1),
    ])
  }

  return [messages, sendMessage, dismissMessage]
}
