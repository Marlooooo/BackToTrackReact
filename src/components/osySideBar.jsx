import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import "./osySideBar.css";
import BackToTrack_Logo3 from "../assets/BackToTrack_Logo3.png";
import { useNavigate } from "react-router-dom";

// ADD THIS — same helper as in Login.jsx
function getCookie(name) {
   const value = `; ${document.cookie}`;
   const parts = value.split(`; ${name}=`);
   if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
}

function OsySideBar() {
      
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
         <button className="osyBurgerBtn" onClick={() => setIsOpen(true)}>
            <i className="las la-bars"></i>
         </button>

         <div className={`osySideBarOverlay ${isOpen ? "osyShow" : ""}`} onClick={() => setIsOpen(false)}></div>

         <div className={`osySideBarDiv ${isOpen ? "osyOpen" : ""}`}>
            <div className="osyNavBarTitleLogo">   
               <img src={BackToTrack_Logo3} alt="" />
               <h1>BackToTrack</h1>
            </div>

            <div className="osyLinkDiv">
               <h2>OVERVIEW</h2>

               <div>
                  <span>
                  <i className="las la-border-all"></i>
                  </span>
                  <NavLink to="/osy/dashboard" className={({ isActive }) => isActive ? "osyActive" : ""}>
                  DASHBOARD
                  </NavLink>
               </div>
            </div>

            <div className="osyLinkDiv">
               <h2>MY WORKSPACE</h2>

               {/* <div>
                  <span>
                  <i className="las la-user"></i>
                  </span>
                  <NavLink to="/osy/profile" className={({ isActive }) => isActive ? "osyActive" : ""}>
                     My Profile
                  </NavLink>
               </div>  */}
               <div>
                  <span>
                  <i className="las la-graduation-cap"></i>
                  </span>
                  <NavLink to="/osy/courses" className={({ isActive }) => isActive ? "osyActive" : ""}>
                  Available Courses
                  </NavLink>
               </div>
               {/* <div>
                  <span>
                  <i className="las la-clipboard-list"></i>
                  </span>
                  <NavLink to="/osy/applications" className={({ isActive }) => isActive ? "osyActive" : ""}>
                  Application Details
                  </NavLink>
               </div> */}
               <div>
                  <span>
                  <i className="las la-chart-line"></i>
                  </span>
                  <NavLink to="/osy/training" className={({ isActive }) => isActive ? "osyActive" : ""}>
                  Training Progress
                  </NavLink>
               </div>
               {/* <div>
                  <span>
                  <i className="las la-briefcase"></i>
                  </span>
                  <NavLink to="/osy/jobs" className={({ isActive }) => isActive ? "osyActive" : ""}>
                  Job Opportunities
                  </NavLink>
               </div> */}
            </div>

            <div className="osyLinkDiv">
               <h2>UPDATES</h2>

               <div>
                  <span>
                  <i className="las la-bell"></i>
                  </span>
                  <NavLink to="/osy/notifications" className={({ isActive }) => isActive ? "osyActive" : ""}>
                  Notifications
                  </NavLink>
               </div>
               {/* NEW: Announcements */}
               <div>
                  <span>
                  <i className="las la-bullhorn"></i>
                  </span>
                  <NavLink to="/osy/announcements" className={({ isActive }) => isActive ? "osyActive" : ""}>
                  Announcements
                  </NavLink>
               </div>
            </div>

            <div className="osyLinkDivLogOut">
               <h2>ACCOUNT</h2>

               <div className="osyUserInfo">
                  <span className="osyUserName">{userName}</span>
               </div>

               <div>
                  <button onClick={handleLogout}>Log Out
                        <span className="osyLogOutIcon">
                        <i className="las la-sign-out-alt"></i>
                     </span>
                  </button>
               </div>
            </div>
         </div>
      </>
   );
}
export default OsySideBar;