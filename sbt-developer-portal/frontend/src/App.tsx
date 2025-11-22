import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Authenticator } from '@aws-amplify/ui-react'
import '@aws-amplify/ui-react/styles.css'
import { Layout } from './components/Layout'
import { Dashboard } from './pages/Dashboard'
import { APIs } from './pages/APIs'
import { APIDetail } from './pages/APIDetail'
import { Admin } from './pages/Admin'
import { useAuthUser } from './hooks/useAuthUser'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthUser()

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={
          <Authenticator>
            {({ signOut, user }) => (
              <Navigate to="/dashboard" replace />
            )}
          </Authenticator>
        } />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="apis" element={<APIs />} />
          <Route path="apis/:apiId" element={<APIDetail />} />
          <Route path="admin/*" element={<Admin />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
