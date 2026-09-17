import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";
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
   const navigate = useNavigate();

   useEffect(() => {
      const storedName = localStorage.getItem("userName");
      setUserName(storedName || "User");
   }, []);

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
         <div className="sideBarDiv">
            <div className="navBarTitleLogo">   
               <img src={BackToTrack_Logo3} alt="" />
               <h1>BackToTrack</h1>
            </div>

            <div className="linkDiv">
               <h2>OVERVIEW</h2>

               <div>
                  <span>
                  <i className="las la-border-all"></i>
                  </span>
                  <NavLink to="/maxima/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
                  DASHBOARD
                  </NavLink>
               </div>
            </div>

<div className="linkDiv">
            <h2>MY WORKSPACE</h2>

               <div>
                  <span className="material-symbols-outlined">
                  folder_copy
                  </span>
                  <NavLink to="/maxima/management" className={({ isActive }) => isActive ? "active" : ""}>
                  Program Management
                  </NavLink>
               </div>
               <div>
                  <span className="material-symbols-outlined">
                  quick_reference_all
                  </span>
                  <NavLink to="/maxima/referrals" className={({ isActive }) => isActive ? "active" : ""}>
                  Referrals
                  </NavLink>
               </div>
               <div>
                  <span className="material-symbols-outlined">
                  assignment_ind
                  </span>
                  <NavLink to="/maxima/enrollees" className={({ isActive }) => isActive ? "active" : ""}>
                  Enrollees
                  </NavLink>
               </div>
            </div>

            <div className="linkDiv">
               <h2>MONITORING</h2>

               <div>
                  <span className="material-symbols-outlined">
                  monitoring
                  </span>
                  <NavLink to="/maxima/monitoring" className={({ isActive }) => isActive ? "active" : ""}>
                  Progress Monitoring
                  </NavLink>
               </div>
            </div>

            <div className="linkDiv">
               <h2>REPORTS AND UPDATES</h2>

               <div>
                  <span className="material-symbols-outlined">
                  lab_profile
                  </span>
                  <NavLink to="/maxima/reports" className={({ isActive }) => isActive ? "active" : ""}>
                  Reports
                  </NavLink>
               </div>
               <div>
                  <span className="material-symbols-outlined">
                  notifications_active
                  </span>
                  <NavLink to="/maxima/announcements" className={({ isActive }) => isActive ? "active" : ""}>
                  Announcements
                  </NavLink>
               </div>
            </div>

            <div className="linkDivLogOut">
               <h2>ACCOUNT</h2>

               <div className="userInfo">
                  <span className="userName">{userName}</span>
               </div>

               <div>
                  <button onClick={handleLogout}>Log Out
                        <span className="logOutIcon">
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
