import { Routes, Route, Navigate } from 'react-router-dom'
import { useApp } from './context/AppContext'
import ProfileSelect from './pages/ProfileSelect'
import Home from './pages/Home'
import Browse from './pages/Browse'
import Watchlist from './pages/Watchlist'
import Account from './pages/Account'
import TraktCallback from './pages/TraktCallback'
import Layout from './components/Layout'

export default function App() {
  const { activeProfile } = useApp()

  return (
    <Routes>
      <Route path="/profiles" element={<ProfileSelect />} />
      <Route path="/trakt/callback" element={<TraktCallback />} />
      <Route
        path="/"
        element={activeProfile ? <Layout /> : <Navigate to="/profiles" replace />}
      >
        <Route index element={<Home />} />
        <Route path="browse" element={<Browse />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="account" element={<Account />} />
      </Route>
      <Route path="*" element={<Navigate to="/profiles" replace />} />
    </Routes>
  )
}
