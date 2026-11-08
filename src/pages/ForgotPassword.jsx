import { Link } from "react-router-dom";
import logo from "../assets/BackToTrack_Logo3.png";
import tesdaLogo from "../assets/Tesda_Logo4.png";
import "./ForgotPassword.css";

const STEPS = [
   {
      title: "Tell your SK official",
      text: "Visit your barangay SK office, or reach your SK official directly, and tell them you forgot your password. Give them your full name and the email you use to sign in.",
   },
   {
      title: "They reset it in the system",
      text: "Your SK official creates a temporary password for your account. Your old password stops working right away.",
   },
   {
      title: "Sign in with the temporary password",
      text: "Go to the login page and use your usual email with the temporary password. Type it exactly as given, including capital letters.",
   },
   {
      title: "Choose your own password",
      text: "The system asks you to create a new password before you can continue. Use at least 8 characters, with letters and numbers. From then on, sign in with the new one.",
   },
];

const TIPS = [
   "Only your SK official can reset your password. You cannot do it from this page.",
   "The temporary password is shown to your SK official only once. If it gets lost, ask them to reset it again.",
   "Keep the temporary password private. It stops working as soon as you choose your own.",
];

function ForgotPassword() {
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
                  Impact
               </Link>

               <Link to="/contact" className="room">
                  Contact
               </Link>

               <Link to="/about" className="room">
                  About Us
               </Link>

               <Link to="/" className="btn">
                  Home
               </Link>

               <Link to="/login" className="active">
                  Login
               </Link>

               <Link to="/register" className="btn">
                  Register
               </Link>
            </nav>
         </header>

         <main className="fpwMain">
            <section className="fpwIntro">
               <h1 className="fpwTitle">
                  Forgot your <span className="fpwTitleAccent">password?</span>
               </h1>
               <p className="fpwLead">
                  BackToTrack does not send password reset emails. Your SK official
                  resets your password for you inside the system. Here is how it works.
               </p>
            </section>

            <ol className="fpwSteps">
               {STEPS.map((step, i) => (
                  <li className="fpwStep" key={step.title}>
                     <span className="fpwStepNum">{i + 1}</span>
                     <h2 className="fpwStepTitle">{step.title}</h2>
                     <p className="fpwStepText">{step.text}</p>
                  </li>
               ))}
            </ol>

            <section className="fpwTips">
               <h2 className="fpwTipsTitle">Good to know</h2>
               <ul className="fpwTipsList">
                  {TIPS.map((tip) => (
                     <li key={tip}>{tip}</li>
                  ))}
               </ul>
            </section>

            <div className="fpwActions">
               <Link to="/login" className="fpwBtn fpwBtnPrimary">
                  Back to Login
               </Link>
               <Link to="/contact" className="fpwBtn fpwBtnGhost">
                  Can't reach your SK official?
               </Link>
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
                     <h6>
                        SK Federation Out-of-School Youth Profiling,
                        <br />
                        Referral, and Training Monitoring System.
                     </h6>
                     <p>Let's Build Opportunities.</p>
                  </div>
               </div>

               <div className="footerNav">
                  <div className="footerNavLinks">
                     <h1>Quick Links</h1>
                     <Link to="/" className="active">
                        Home
                     </Link>
                     <Link to="/about">About</Link>
                  </div>
                  <div className="footerNavLinks">
                     <h1>Supports</h1>
                     <Link to="/contact">Contact</Link>
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

export default ForgotPassword;