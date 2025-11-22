import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Copy, Eye, EyeOff, Key } from 'lucide-react'
import { apiClient } from '@/services/api'

export function APIKeyDisplay() {
  const [isVisible, setIsVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const { data: apiKey, isLoading, error } = useQuery({
    queryKey: ['apiKey'],
    queryFn: () => apiClient.getApiKey(),
  })

  const handleCopy = async () => {
    if (apiKey?.value) {
      await navigator.clipboard.writeText(apiKey.value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const toggleVisibility = () => {
    setIsVisible(!isVisible)
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-2">
          <Key className="h-5 w-5 text-gray-400 animate-pulse" />
          <span className="text-sm text-gray-500">Loading API Key...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 rounded-lg shadow p-6">
        <div className="flex items-center space-x-2">
          <Key className="h-5 w-5 text-red-600" />
          <span className="text-sm text-red-600">Failed to load API Key</span>
        </div>
      </div>
    )
  }

  if (!apiKey) {
    return null
  }

  const displayValue = isVisible
    ? apiKey.value
    : `${apiKey.value.substring(0, 8)}${'*'.repeat(apiKey.value.length - 8)}`

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Key className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Your API Key
          </h3>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="flex-1 bg-gray-900 dark:bg-gray-950 rounded-md px-4 py-3 font-mono text-sm text-gray-100 border border-gray-700">
          {displayValue}
        </div>

        <button
          onClick={toggleVisibility}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          title={isVisible ? 'Hide' : 'Show'}
        >
          {isVisible ? (
            <EyeOff className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          ) : (
            <Eye className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        <button
          onClick={handleCopy}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          title="Copy to clipboard"
        >
          <Copy
            className={`h-5 w-5 ${
              copied
                ? 'text-green-600'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          />
        </button>
      </div>

      {copied && (
        <p className="mt-2 text-sm text-green-600 dark:text-green-400">
          Copied to clipboard!
        </p>
      )}

      <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        Use this API key to authenticate your requests. Include it in the{' '}
        <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-xs">
          x-api-key
        </code>{' '}
        header.
      </p>
    </div>
  )
}
