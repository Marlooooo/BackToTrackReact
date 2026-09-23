import ProtectedRoute from "./components/ProtectedRoute";



import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from './pages/Login';
import Register from './pages/register';
import About from './pages/about';
import Contact from './pages/contact';
import Impact from './pages/impact';






import OsyDashboard from './pages/dashboards/OsyDashboard';
import OsyMyProfile from './pages/dashboards/OsyMyProfile';
import OsyAvailCourses from './pages/dashboards/OsyAvailCourses';
import OsyApplicationDets from './pages/dashboards/OsyApplicationDets';
import OsyTrainingProg from './pages/dashboards/OsyTrainingProg';
import OsyNotif from './pages/dashboards/OsyNotif';





import MaximaTesdaDashboard from "./pages/dashboards/MaximaDashboard";
import MaximaProgramManagement from "./pages/dashboards/MaximaProgramManagement"
import MaximaReferrals from './pages/dashboards/MaximaReferrals';






import BarangayDashboard from "./pages/dashboards/BarangayDashboard";






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




         <Route path="/osy/dashboard" element={<ProtectedRoute> <OsyDashboard /> </ProtectedRoute>} />
         <Route path="/osy/profile" element={<ProtectedRoute> <OsyMyProfile /> </ProtectedRoute>} />
         <Route path="/osy/courses" element={<ProtectedRoute> <OsyAvailCourses /> </ProtectedRoute>} />
         <Route path="/osy/applications" element={<ProtectedRoute> <OsyApplicationDets /> </ProtectedRoute>} />
         <Route path="/osy/training" element={<ProtectedRoute> <OsyTrainingProg /> </ProtectedRoute>} />
         <Route path="/osy/notifications" element={<ProtectedRoute> <OsyNotif /> </ProtectedRoute>} />




         <Route path="/maxima/dashboard" element={ <ProtectedRoute> <MaximaTesdaDashboard/> </ProtectedRoute>} />
         <Route path="/maxima/management" element={<ProtectedRoute> <MaximaProgramManagement> </MaximaProgramManagement> </ProtectedRoute>}/>
         <Route path="/maxima/referrals" element={<ProtectedRoute> <MaximaReferrals> </MaximaReferrals> </ProtectedRoute>}/>



         <Route path="/barangay/dashboard" element={<ProtectedRoute> <BarangayDashboard/> </ProtectedRoute> } />


         </Routes>
      </BrowserRouter>
   );
}

export default App;