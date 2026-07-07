import { Routes, Route } from "react-router-dom"
import Navbar from "./components/Navbar"
import Home from "./pages/Home"
import Create from "./pages/Create"
import MarketplacePage from "./pages/MarketplacePage"
import ActivityPage from "./pages/Activity"
import { ActivityProvider } from "./context/ActivityContext"
import { ToastProvider } from "./context/ToastContext"

function App() {
  return (
    <ToastProvider>
      <ActivityProvider>
        <Navbar />

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
          <Route path="/create" element={<Create />} />
          <Route path="/activity" element={<ActivityPage />} />
        </Routes>
      </ActivityProvider>
    </ToastProvider>
  )
}

export default App
