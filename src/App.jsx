import FitKidHooperApp from './FitKidHooperApp.jsx'
import UpdateBanner from './UpdateBanner'
import InstallBanner from './InstallBanner'
import AdminDashboard from './components/AdminDashboard.jsx'
import { isAdminDashboardEnabled } from './lib/adminAccess.js'

export default function App() {
  if (isAdminDashboardEnabled()) {
    return <AdminDashboard />
  }

  return (
    <>
      <UpdateBanner />
      <InstallBanner />
      <FitKidHooperApp />
    </>
  )
}
