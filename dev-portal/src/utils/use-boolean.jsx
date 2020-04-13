import { useState, useCallback } from 'react'

/**
 * A React state hook wrapping a boolean value, returning `setTrue` and
 * `setFalse` functions which do as their names suggest. Returns `[state,
 * setTrue, setFalse, setState]`, in which the first and last functions
 * correspond to those returned by `useState`, and in which all functions (i.e.
 * all but `state`) are stable.
 *
 * This is especially useful for controlled modals, for example, which may
 * close themselves via a callback:
 * ```javascript
 * const [isOpen, open, close] = useBoolean(false)
 * return (<Modal isOpen={isOpen} closeSelf={close}> ... </Modal>)
 * ```
 */
export const useBoolean = initialState => {
  const [state, setState] = useState(initialState)
  const setTrue = useCallback(() => setState(true), [])
  const setFalse = useCallback(() => setState(false), [])
  return [state, setTrue, setFalse, setState]
}
