import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Disruptions } from "./pages/Disruptions";
import { Cargo } from "./pages/Cargo";
import { RevenueAnalysis } from "./pages/RevenueAnalysis";
import { AIRecommendationsPage } from "./pages/AIRecommendationsPage";
import { CargoIntake } from "./pages/CargoIntake";

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/cargo-intake" element={<CargoIntake />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="/flight-capacity" element={<Cargo />} />
        <Route path="/revenue" element={<RevenueAnalysis />} />
        <Route path="/revenue-recovery" element={<AIRecommendationsPage />} />
        <Route path="/disruptions" element={<Disruptions />} />
      </Routes>
    </Router>
  );
}

export default App;
