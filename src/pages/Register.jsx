   import { Link } from "react-router-dom";
   import logo from "../assets/BackToTrack_Logo3.png";
   import tesdaLogo from "../assets/Tesda_Logo4.png";
   import skLogo2 from "../assets/skLogo2.jpg";
   import "./Register.css";

   function Register() {
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
               <Link to="/login">Login</Link>
               <Link to="/register" className="active">
               Register
               </Link>
            </nav>
         </div>
      </header>













      <main>
         <div>
            <div className="registrationWorks">
               <div className="registrationWorksImage">
                  <img src={skLogo2} alt="" />
               </div>
               <div>
                  <h3>OSY Registration</h3>
                  <h1>How OSY Registration Works</h1>
                  <p>BackToTrack accounts for Out-of-School Youth (OSY) are created by authorized Barangay
                  Officials <br />after verifying the applicant's information. </p>
                  <p>This process helps us maintain accurate records and ensure that every OSY receives the
                  proper <br />support and training opportunities intended for them.</p>
               </div>
               
            </div>
            <div className="howToGetAnAcc">
               <h2>How to Get an Account?</h2>
            </div>
            <div className="threeSteps">
               <div className="stepsBox">
                  <h4><span className="number">1</span>Visit your Barangay Office</h4>
                  <p>Go to your barangay hall and look for the official
                  in charge of OSY registration.</p>
               </div>
               <div className="stepsBox">
                  <h4><span className="number">2</span>Provide your information</h4>
                  <p>The Barangay Official will collect and verify your
                  personal and educational background.</p>
               </div>
               <div className="stepsBox">
                  <h4><span className="number">3</span>Receive your account</h4>
                  <p>Once verified, you'll receive your login credentials
                  to access the BackToTrack platform.</p>
               </div>
            </div>
            <div className="backToLogin">
               <div>
                  <h1>Already registered?</h1>
                  <p>If you already have an account, log in to access your dashboard.</p>
               </div>
               <div>
                  <Link to='/login'>Go to Login.</Link>
               </div>
            </div>
            <div className="needHelp">
               <div className="findBarangayContact">
                  <h4>Need Help?</h4>
                  <p>Contact your Barangay Office for more information about OSY registration and
                  other concerns.</p>
                  <Link to="/contact">Find Your Barangay Contact</Link>
               </div>
               <div className="  officialLogin">
                  <h4>For Barangay Officials</h4>
                  <p>If you're a Barangay Official, log in to your account to register and manage
                  OSY records.</p>
                  <Link to="/login">Official Login</Link>
               </div>
            </div>
         </div>
         
      </main>






















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
                  <Link to="/">Home</Link>
                  <Link to="/about">About</Link>
               </div>
               <div className="footerNavLinks">
                  <h1>Supports</h1>
                  <Link to="/contact">Contact</Link>
                  <Link to="/socials">Socials</Link>
               </div>
               <div className="footerNavLinks">
                  <h1>Partners</h1>
                  <Link to="/tesda">Tesda</Link>
                  <Link to="/pogo-grande">Pogo Grande</Link>
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

   export default Register;
