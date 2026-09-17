   import { useState } from "react";
   import { Link, useNavigate } from "react-router-dom";
   import logo from "../assets/BackToTrack_Logo3.png";
   import tesdaLogo from "../assets/Tesda_Logo4.png";
   import "./Login.css";
   


   function getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
   }

   function Login() {

   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [error, setError] = useState("");
   const navigate = useNavigate();

   const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");

      try { 
         // get CSRF cookie first — required by Sanctum
         await fetch("http://localhost:8000/sanctum/csrf-cookie", {
            credentials: "include",
         });

         const xsrfToken = getCookie("XSRF-TOKEN"); // ADD THIS


         const res = await fetch("http://localhost:8000/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json",                
               "X-XSRF-TOKEN": xsrfToken, // ADD THIS  
               },
            credentials: "include", // <-- add this
            body: JSON.stringify({ email, password }),
         });

         const data = await res.json();

         if (data.success) {

         localStorage.setItem("userName", data.name);
         localStorage.setItem("userRole", data.role);

         if (data.role === "maxima_tesda_school") navigate("/maxima/dashboard");
         else if (data.role === "sk_officials") navigate("/barangay/dashboard");
         else if (data.role === "osy") navigate("/osy/dashboard");
         } else {
         setError(data.message || "Invalid email or password.");
         }
      } catch (err) {
         setError("Something went wrong. Please try again.");
         console.error(err);
      }
   };

   return (
      <>
         <header>
            
               <div className="leftSideHeader">
                  <div id="logo">
                     <img src={logo} alt="" />
                  </div>
                  <div id="webTitle">
                     <h1>BackToTrack</h1>
                  </div>
               </div>

               <nav>
                  <Link to="/impact" className="room">
                  {" "}
                  Impact
                  </Link>

                  <Link to="/contact" className="room">
                  Contact{" "}
                  </Link>

                  <Link to="/about" className="room">
                  About Us
                  </Link>

                  <Link to="/" className="btn">
                  {" "}
                  Home
                  </Link>

                  <Link to="/login" className="active">
                  Login{" "}
                  </Link>
                  
                  <Link to="/register" className="btn">
                  Register
                  </Link>
               </nav>
         
         </header>













      <div className="midpartLogin">
         <div className="loginBox">
            
            <div className="loginBoxLogoTitle">
            
               <img src={logo} alt="" />
               <h1 className="webTitleText">WELCOME BACK</h1>
               <p>Login To BackToTrack</p>
               
            </div>


            <form onSubmit={handleSubmit}>
               <div className="inputPart">
               <p>Email</p>
               <input
                  type="text"
                  name="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
               />
               </div>

               <div className="inputPart">
               <p>Password</p>
               <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
               />
               </div>

               <div className="forgotPassword">
                  <Link to="/forgot-password">Forgot Password?</Link>
               </div>

               {error && <p className="errorText">{error}</p>}

               <div className="signInBtn">
               <button type="submit">Sign In</button>
               </div>
            </form>
         </div>
      </div>










         <footer>
         <div className="footerTopPart">
            <div className="footerLogoTitle">
               <div>
               <img src={logo} alt="" />
               </div>
               <div>
               <h1>BackToTrack</h1>
               <h6>SK Federation Out-of-School Youth Profiling,<br />
                  Referral, and Training Monitoring System.
               </h6>
               <p>
                  Let's Build Opportunities.
               </p>
               </div>
            </div>

            <div className="footerNav">
               <div className="footerNavLinks">
               <h1>Quick Links</h1>
               <Link to="/" className="active">
                  {" "}
                  Home
               </Link>
               <Link to="about">About</Link>
               </div>
               <div className="footerNavLinks">
               <h1>Supports</h1>
               <Link to="contact">Contact</Link>
               <Link to="">Socials</Link>
               </div>
               <div className="footerNavLinks">
               <h1>Partners</h1>
               <Link to="">Maxima</Link>
               <Link to="">Pogo Grande</Link>
               </div>
            </div>

            <div className="footerBigLogo">
               <img src={tesdaLogo} alt="" />
            </div>
         </div>

         <div className="footerBottomPart">
            <p>© 2026 BackToTrack.</p>
         </div>
         </footer>
      </>
   );
   }

   export default Login;
