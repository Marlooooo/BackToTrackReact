import { Link } from "react-router-dom";
import logo from "../assets/BackToTrack_Logo3.png";
import tesdaLogo from "../assets/Tesda_Logo4.png";
import "./impact.css";

function Impact() {
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

               <Link to="/"> Home</Link>
               <Link to="/login">Login</Link>
               <Link to="/register">Register</Link>
            </nav>
         </div>
         </header>




















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
export default Impact;
