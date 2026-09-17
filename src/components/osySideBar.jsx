import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";
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
                  <NavLink to="/osy/dashboard" className={({ isActive }) => isActive ? "active" : ""}>
                  DASHBOARD
                  </NavLink>
               </div>
            </div>

            <div className="linkDiv">
               <h2>MY WORKSPACE</h2>

               <div>
                  <span>
                  <i className="las la-user"></i>
                  </span>
                  <Link to="/osy/profile">
                  My Profile
                  </Link>
               </div>
               <div>
                  <span>
                  <i className="las la-graduation-cap"></i>
                  </span>
                  <Link to="/osy/courses">
                  Available Courses
                  </Link>
               </div>
               <div>
                  <span>
                  <i className="las la-clipboard-list"></i>
                  </span>
                  <Link to="/osy/applications">
                  Application Details
                  </Link>
               </div>
               <div>
                  <span>
                  <i className="las la-chart-line"></i>
                  </span>
                  <Link to="/osy/training">
                  Training Progress
                  </Link>
               </div>
               <div>
                  <span>
                  <i className="las la-briefcase"></i>
                  </span>
                  <Link to="/osy/jobs">
                  Job Opportunities
                  </Link>
               </div>
            </div>

            <div className="linkDiv">
               <h2>UPDATES</h2>

               <div>
                  <span>
                  <i className="las la-bell"></i>
                  </span>
                  <Link to="/osy/notifications">
                  Notifications
                  </Link>
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
export default OsySideBar;
