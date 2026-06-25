import FitKidHooperApp from './FitKidHooperApp.jsx'
import UpdateBanner from './UpdateBanner'
import InstallBanner from './InstallBanner'
import AdminDashboard from './components/AdminDashboard.jsx'
import ViewErrorBoundary from './components/ViewErrorBoundary.jsx'
import { isAdminDashboardEnabled } from './lib/adminAccess.js'

export default function App() {
  if (isAdminDashboardEnabled()) {
    return <AdminDashboard />
  }

  return (
    <>
      <UpdateBanner />
      <InstallBanner />
      <ViewErrorBoundary
        label="App"
        title="Fit Kid Hooper hit a snag"
        message="The app couldn't start. Try again, or refresh the page. Your progress is saved on this device."
        onRetry={() => window.location.reload()}
      >
        <FitKidHooperApp />
      </ViewErrorBoundary>
    </>
  )
}
