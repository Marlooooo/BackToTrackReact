import ProtectedRoute from "./components/ProtectedRoute";



import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from './pages/Login';
import Register from './pages/register';
import About from './pages/about';
import Contact from './pages/contact';
import Impact from './pages/impact';






import OsyDashboard from './pages/dashboards/osy/OsyDashboard';
import OsyMyProfile from './pages/dashboards/osy/OsyMyProfile';
import OsyAvailCourses from './pages/dashboards/osy/OsyAvailCourses';
import OsyApplicationDets from './pages/dashboards/osy/OsyApplicationDets';
import OsyTrainingProg from './pages/dashboards/osy/OsyTrainingProg';
import OsyNotif from './pages/dashboards/osy/OsyNotif';





import MaximaTesdaDashboard from "./pages/dashboards/maxima/MaximaDashboard";
import MaximaProgramManagement from "./pages/dashboards/maxima/MaximaProgramManagement"
import MaximaReferrals from './pages/dashboards/maxima/MaximaReferrals';
import MaximaEnrollees from './pages/dashboards/maxima/MaximaEnrollees';
import MaximaProgressMonitoring from './pages/dashboards/maxima/MaximaProgressMonitoring';
import MaximaReports from './pages/dashboards/maxima/MaximaReports';
import MaximaAnnouncement from './pages/dashboards/maxima/MaximaAnnouncement';





import BarangayDashboard from "./pages/dashboards/barangay/BarangayDashboard";
import BarangayOsyManagement from "./pages/dashboards/barangay/BarangayOsyManagement";
import BarangayReferralManagement from "./pages/dashboards/barangay/BarangayReferralManagement";





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
         <Route path="/maxima/enrollees" element={<ProtectedRoute> <MaximaEnrollees/> </ProtectedRoute>}/>
         <Route path="/maxima/monitoring" element={<ProtectedRoute> <MaximaProgressMonitoring/> </ProtectedRoute>}/>
         <Route path="/maxima/reports" element={<ProtectedRoute> <MaximaReports/> </ProtectedRoute>}/>
         <Route path="/maxima/announcements" element={<ProtectedRoute> <MaximaAnnouncement/> </ProtectedRoute>}/>



         <Route path="/barangay/dashboard" element={<ProtectedRoute> <BarangayDashboard/> </ProtectedRoute>} />
         <Route path="/barangay/management" element={<ProtectedRoute> <BarangayOsyManagement/> </ProtectedRoute>} />
         <Route path="/barangay/referrals" element={<ProtectedRoute> <BarangayReferralManagement/> </ProtectedRoute>} />

         </Routes>
      </BrowserRouter>
   );
}

export default App;