import { useQuery } from '@tanstack/react-query'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Activity, TrendingUp } from 'lucide-react'
import { apiClient } from '@/services/api'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface UsageDashboardProps {
  usagePlanId: string
  apiName: string
}

export function UsageDashboard({ usagePlanId, apiName }: UsageDashboardProps) {
  const { data: usage, isLoading } = useQuery({
    queryKey: ['usage', usagePlanId],
    queryFn: () => apiClient.getUsage(usagePlanId),
    refetchInterval: 60000, // Refetch every minute
  })

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-gray-400 animate-pulse" />
          <span className="text-sm text-gray-500">Loading usage data...</span>
        </div>
      </div>
    )
  }

  if (!usage) {
    return null
  }

  const chartData = {
    labels: usage.dates.map((date) =>
      new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    ),
    datasets: [
      {
        label: 'Requests Used',
        data: usage.used,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.1,
        fill: true,
      },
      {
        label: 'Remaining Requests',
        data: usage.remaining,
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.1,
        fill: true,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  }

  const currentUsage = usage.used[usage.used.length - 1] || 0
  const quota = usage.quota || 0
  const usagePercentage = quota > 0 ? (currentUsage / quota) * 100 : 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Usage for {apiName}
          </h3>
        </div>
        <div className="flex items-center space-x-2 text-sm">
          <TrendingUp className="h-4 w-4 text-green-600" />
          <span className="text-gray-600 dark:text-gray-400">
            {currentUsage.toLocaleString()} / {quota.toLocaleString()} requests
          </span>
        </div>
      </div>

      {usage.throttle && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-300">
            Rate limit: <strong>{usage.throttle.rateLimit}</strong> requests/sec
            • Burst limit: <strong>{usage.throttle.burstLimit}</strong>
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Usage</span>
          <span>{usagePercentage.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              usagePercentage > 90
                ? 'bg-red-600'
                : usagePercentage > 70
                ? 'bg-yellow-600'
                : 'bg-green-600'
            }`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
      </div>

      <div className="h-64">
        <Line data={chartData} options={options} />
      </div>
    </div>
  )
}
