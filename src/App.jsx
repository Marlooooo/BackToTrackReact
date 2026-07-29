import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from './pages/Login';
import BarangayDashboard from "./pages/dashboards/BarangayDashboard";
import MaximaTesdaDashboard from "./pages/dashboards/TesdaDashboard";
import OsyDashboard from './pages/dashboards/OsyDashboard';


function App() {
   return (
      <BrowserRouter>
         <Routes>
         <Route path="/" element={<Home />} />
         <Route path="/Login" element={< Login/>} />
         <Route path="/barangay/dashboard" element={<BarangayDashboard/>} />
         <Route path="/tesda/dashboard" element={<MaximaTesdaDashboard/>}/>
         <Route path="/osy/dashboard" element={<OsyDashboard/>}/>
         </Routes>
      </BrowserRouter>
   );
}

export default App;