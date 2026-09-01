   import { useState } from "react";
   import { Link, useNavigate } from "react-router-dom";
   import logo from "../assets/BackToTrack_Logo3.png";
   import tesdaLogo from "../assets/Tesda_Logo4.png";
   import "./Login.css";

   function Login() {
   const [email, setEmail] = useState("");
   const [password, setPassword] = useState("");
   const [keepMeLogin, setKeepMeLogin] = useState(false);
   const [error, setError] = useState("");
   const navigate = useNavigate();

   const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");

      try {
         const res = await fetch("http://127.0.0.1:8000/api/login", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({ email, password, keepMeLogin }),
         });

         const data = await res.json();

         if (data.success) {
         if (data.role === "maxima_tesda_school") navigate("/tesda/dashboard");
         else if (data.role === "barangay_officials")
            navigate("/barangay/dashboard");
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
         <div className="headerTopPart">
            <div className="leftSideHeader">
               <div id="logo">
               <img src={logo} alt="" />
               </div>
               <div id="webTitle">
               <h1 className="webTitleText">BackToTrack</h1>
               </div>
            </div>

            <nav>
               <Link to="/impact" className="room"> Impact</Link>
               <Link to="/contact" className="room">Contact </Link>
               <Link to="/about" className="room">About Us</Link>

               <Link to="/"> Home</Link>
               <Link to="/login" className="active">
               Login
               </Link>
               <Link to="/register">Register</Link>
            </nav>
         </div>
         </header>

         <div className="midpartLogin">
         <div className="loginBox">
            <div className="loginBoxLogoTitle">
               <div className="loginBoxLogoTitleBackToTrack">
               <img src={logo} alt="" />
               <h1 className="webTitleText">BackToTrack</h1>
               </div>
               <img src={tesdaLogo} alt="" />
            </div>

            <div className="loginText">
               <h1>Log In</h1>
               <p>Please fill up the following to log in your account</p>
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

               <div className="keepLogIn">
               <input
                  type="checkbox"
                  name="keepMeLogin"
                  checked={keepMeLogin}
                  onChange={(e) => setKeepMeLogin(e.target.checked)}
               />
               <p>Keep Me Log In</p>
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
               <p>Let's Build Opportunities.</p>
               </div>
            </div>

            <div className="footerNav">
               <div className="footerNavLinks">
               <h1>Quick Links</h1>
               <Link to="/" className="active"> Home</Link>
               <Link to="about">About</Link>
               </div>
               <div className="footerNavLinks">
               <h1>Supports</h1>
               <Link to="contact">Contact</Link>
               <Link to="">Socials</Link>
               </div>
               <div className="footerNavLinks">
               <h1>Partners</h1>
               <Link to="">Tesda</Link>
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
