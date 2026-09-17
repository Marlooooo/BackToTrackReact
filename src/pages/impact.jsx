import { Link } from "react-router-dom";
import logo from "../assets/BackToTrack_Logo3.png";
import tesdaLogo from "../assets/Tesda_Logo4.png";
import impactImg from "../assets/impactImg.png"
import "./impact.css";

function Impact() {
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
                  <Link to="/impact" className="room activeICA">
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

                  <Link to="/login" className="btn">
                  Login{" "}
                  </Link>
                  
                  <Link to="/register" className="btn">
                  Register
                  </Link>
               </nav>
         
         </header>







         <div className="impactMainContent">

            <div className="impactMainContentTop">
               <div className="impactMainContentTopLeftPart">
                  <h3>Our Impact</h3>
                  <h1>Making an Impact<br />
                  One Opportunity <br />
                  at a Time</h1>
                  <p>BackToTrack helps connect out-of-school youth <br />
                  withs kills training, career opportunities, and <br />
                  support from their community.</p>
               </div>

               <div className="impactMainContentTopRightPart">
                  <img src={impactImg} alt="" />
               </div>
            </div>





            <div className="impactMainContentMid">
               <h1>Our Impact Areas</h1>

               <div className="impactMainContentMidCardsDiv">

                  <div className="impactMainContentMidCards">
                     <span class="material-symbols-outlined">emoji_people</span>
                     <h3>For OSY</h3>
                     <p>We provide easier access <br /> to skills training, resources, <br />
                     and career opportunities <br /> to help youth build their skills <br /> and achieve their dreams.</p>
                  </div>

                  <div className="impactMainContentMidCards">
                     <span class="material-symbols-outlined">school</span>
                     <h3>For Training Providers</h3>
                     <p>We connect training <br /> institutions with motivated <br />
                        youth who are eager to <br /> learn and develop new <br /> skills.</p>
                  </div>   

                  <div className="impactMainContentMidCards">
                     <span class="material-symbols-outlined">account_balance</span>
                     <h3>For SK Officials</h3>
                     <p>We help SK officials <br /> monitor, manage, and <br />
                        refer OSY more efficiently <br /> for appropriate training <br /> and support.</p>
                  </div>

               </div>
            </div>

            <div className="impactMainContentBot">

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
export default Impact;
