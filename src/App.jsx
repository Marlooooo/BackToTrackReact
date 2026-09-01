import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from './pages/Login';
import Register from './pages/register';
import About from './pages/about';
import Contact from './pages/contact';
import Impact from './pages/impact';






import BarangayDashboard from "./pages/dashboards/BarangayDashboard";
import MaximaTesdaDashboard from "./pages/dashboards/TesdaDashboard";
import OsyDashboard from './pages/dashboards/OsyDashboard';



function App() {
   return (
      <BrowserRouter>
         <Routes>
         <Route path="/" element={<Home />} />
         <Route path="/Login" element={<Login/>} />
         <Route path="/Register" element={<Register/>} />
         <Route path="/about" element={<About/>}/>
         <Route path="/contact" element={<Contact/>}/>
         <Route path="/impact" element={<Impact/>}/>





         <Route path="/barangay/dashboard" element={<BarangayDashboard/>} />
         <Route path="/tesda/dashboard" element={<MaximaTesdaDashboard/>} />
         <Route path="/osy/dashboard" element={<OsyDashboard/>} />
         </Routes>
      </BrowserRouter>
   );
}

export default App;