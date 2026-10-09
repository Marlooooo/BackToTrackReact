import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./maximaSideBar.css";
import BackToTrack_Logo3 from "../assets/BackToTrack_Logo3.png";
import { useNavigate } from "react-router-dom";

// ADD THIS — same helper as in Login.jsx
function getCookie(name) {
   const value = `; ${document.cookie}`;
   const parts = value.split(`; ${name}=`);
   if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
}

function MaximaSideBar() {
      
   const [userName, setUserName] = useState("");
   const [isOpen, setIsOpen] = useState(false);
   const navigate = useNavigate();
   const location = useLocation();

   useEffect(() => {
      const storedName = localStorage.getItem("userName");
      setUserName(storedName || "User");
   }, []);

   useEffect(() => {
      setIsOpen(false);
   }, [location.pathname]);

   const handleLogout = async () => {
      try {
         const xsrfToken = getCookie("XSRF-TOKEN");

         await fetch("http://localhost:8000/api/logout", {
            method: "POST",
            headers: {
               "X-XSRF-TOKEN": xsrfToken,
            },
            credentials: "include",
         });
      } catch (err) {
         console.error("Logout failed:", err);
      } finally {
         localStorage.removeItem("userName");
         localStorage.removeItem("userRole");
         navigate("/login", { replace: true });
      }
   };


   return (
      <>
         <button className="maximaBurgerBtn" onClick={() => setIsOpen(true)}>
            <i className="las la-bars"></i>
         </button>

         <div className={`maximaSideBarOverlay ${isOpen ? "maximaShow" : ""}`} onClick={() => setIsOpen(false)}></div>

         <div className={`maximaSideBarDiv ${isOpen ? "maximaOpen" : ""}`}>
            <div className="maximaNavBarTitleLogo">   
               <img src={BackToTrack_Logo3} alt="" />
               <h1>BackToTrack</h1>
            </div>

            <div className="maximaLinkDiv">
               <h2>OVERVIEW</h2>

               <div>
                  <span>
                  <i className="las la-border-all"></i>
                  </span>
                  <NavLink to="/maxima/dashboard" className={({ isActive }) => isActive ? "maximaActive" : ""}>
                  DASHBOARD
                  </NavLink>
               </div>
            </div>

<div className="maximaLinkDiv">
            <h2>MY WORKSPACE</h2>

               <div>
                  <span className="material-symbols-outlined">
                  folder_copy
                  </span>
                  <NavLink to="/maxima/management" className={({ isActive }) => isActive ? "maximaActive" : ""}>
                  Program Management
                  </NavLink>
               </div>
               <div>
                  <span className="material-symbols-outlined">
                  quick_reference_all
                  </span>
                  <NavLink to="/maxima/referrals" className={({ isActive }) => isActive ? "maximaActive" : ""}>
                  Referrals
                  </NavLink>
               </div>
               <div>
                  <span className="material-symbols-outlined">
                  assignment_ind
                  </span>
                  <NavLink to="/maxima/enrollees" className={({ isActive }) => isActive ? "maximaActive" : ""}>
                  Enrollees
                  </NavLink>
               </div>
            </div>

            <div className="maximaLinkDiv">
               <h2>MONITORING</h2>

               <div>
                  <span className="material-symbols-outlined">
                  monitoring
                  </span>
                  <NavLink to="/maxima/monitoring" className={({ isActive }) => isActive ? "maximaActive" : ""}>
                  Progress Monitoring
                  </NavLink>
               </div>
            </div>

            <div className="maximaLinkDiv">
               <h2>REPORTS AND UPDATES</h2>

               <div>
                  <span className="material-symbols-outlined">
                  lab_profile
                  </span>
                  <NavLink to="/maxima/reports" className={({ isActive }) => isActive ? "maximaActive" : ""}>
                  Reports
                  </NavLink>
               </div>
               <div>
                  <span className="material-symbols-outlined">
                  notifications_active
                  </span>
                  <NavLink to="/maxima/notifications" className={({ isActive }) => isActive ? "maximaActive" : ""}>
                  Notifications
                  </NavLink>
               </div>
               {/* NEW: Announcements */}
               <div>
                  <span className="material-symbols-outlined">
                  campaign
                  </span>
                  <NavLink to="/maxima/announcements" className={({ isActive }) => isActive ? "maximaActive" : ""}>
                  Announcements
                  </NavLink>
               </div>
            </div>

            <div className="maximaLinkDivLogOut">
               <h2>ACCOUNT</h2>

               <div className="maximaUserInfo">
                  <span className="maximaUserName">{userName}</span>
               </div>

               <div>
                  <button onClick={handleLogout}>Log Out
                        <span className="maximaLogOutIcon">
                        <i className="las la-sign-out-alt"></i>
                     </span>
                  </button>
               </div>
            </div>
         </div>
      </>
   );
}
export default MaximaSideBar;