import { useEffect, useRef, useState } from 'react'
import SwaggerUIReact from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'
import { Download, FileJson } from 'lucide-react'
import { apiClient } from '@/services/api'

interface SwaggerUIProps {
  apiId: string
  spec: any
  apiKey?: string
}

export function SwaggerUI({ apiId, spec, apiKey }: SwaggerUIProps) {
  const [showSdkModal, setShowSdkModal] = useState(false)

  // Inject API key into Swagger UI requests
  const requestInterceptor = (req: any) => {
    if (apiKey) {
      req.headers['x-api-key'] = apiKey
    }
    return req
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
      <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            API Documentation
          </h2>
          <div className="flex items-center space-x-2">
            <SDKDownloadButton apiId={apiId} />
            <ExportButton apiId={apiId} />
          </div>
        </div>
      </div>

      <div className="swagger-ui-container">
        <SwaggerUIReact
          spec={spec}
          requestInterceptor={requestInterceptor}
          docExpansion="list"
          defaultModelsExpandDepth={1}
          displayRequestDuration={true}
        />
      </div>
    </div>
  )
}

function SDKDownloadButton({ apiId }: { apiId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  const sdkTypes = [
    { id: 'javascript', name: 'JavaScript' },
    { id: 'java', name: 'Java' },
    { id: 'python', name: 'Python' },
    { id: 'ruby', name: 'Ruby' },
    { id: 'android', name: 'Android' },
    { id: 'ios-swift', name: 'iOS (Swift)' },
  ]

  const handleDownload = async (sdkType: string) => {
    try {
      await apiClient.downloadSdk(apiId, sdkType)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to download SDK:', error)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <Download className="h-4 w-4 mr-2" />
        Download SDK
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              {sdkTypes.map((sdk) => (
                <button
                  key={sdk.id}
                  onClick={() => handleDownload(sdk.id)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {sdk.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ExportButton({ apiId }: { apiId: string }) {
  const [isOpen, setIsOpen] = useState(false)

  const exportTypes = [
    { id: 'oas30', name: 'OpenAPI 3.0 (JSON)' },
    { id: 'swagger', name: 'Swagger 2.0 (JSON)' },
  ]

  const handleExport = async (exportType: string) => {
    try {
      await apiClient.exportApi(apiId, exportType)
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to export API:', error)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <FileJson className="h-4 w-4 mr-2" />
        Export
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-20">
            <div className="py-1">
              {exportTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => handleExport(type.id)}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {type.name}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
