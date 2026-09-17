import { Link } from "react-router-dom";
import logo from "../assets/BackToTrack_Logo3.png";
import tesdaLogo from "../assets/Tesda_Logo4.png";
import aboutImg from "../assets/aboutImg.png"
import "./about.css";

function aboutUs() {
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

                  <Link to="/about" className="room activeICA">
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






         <div className="mainContentAboutUs">


            <div className="mainContentAboutUsTop">

               <div className="mainContentAboutUsTopLeft">
                  <h1>About BackToTrack</h1>
                  <p>BackToTrack is a platform designed to help  <br/> Out-of-School Youth (OSY)
                  discover skills training <br/> and career opportunities. It connects 
                  OSY with <br/> barangay officials and training  providers to make <br/> the
                  process of finding, referring, and monitoring <br/> training opportunities
                  easier and more organized.</p>
               </div>
                  
               <div className="mainContentAboutUsTopRight">
                  <img src={aboutImg} alt="" />
               </div>

            </div>





            <div className="mainContentAboutUsBottom">

               <div className="mainContentAboutUsBottomLeft">
                  <div className="aboutUsCards">
                     <span class="material-symbols-outlined school">
                     school
                     </span>
                     <h2>Skills Training</h2>
                     <p>Find available training programs that match the interests and skills of OSY.</p>
                  </div>

                  <div className="aboutUsCards">
                     <span class="material-symbols-outlined diversity_3">
                     diversity_3
                     </span>
                     <h2>Youth Referral</h2>
                     <p>Help barangay officials identify and refer OSY to suitable training opportunities.</p>
                  </div>

                  <div className="aboutUsCards">
                     <span class="material-symbols-outlined tools_ladder">
                     tools_ladder
                     </span>
                     <h2>Opportunities</h2>
                     <p>Connect trained youth with possible employment opportunities.</p>
                  </div>
               </div>

               <div className="mainContentAboutUsBottomRight">
                  <div>
                     <h1>Who We Serve?</h1>
                  </div>

                  <div>
                        <div className="stakeHolders">
                           <span class="material-symbols-outlined diversity_4">
                              diversity_4
                           </span>
                           <div>
                              <h4>Out-Of-School Youth (OSY)</h4>
                              <p>Find training and carreer opportunities <br /> that help build a better future.</p>
                           </div>
                        </div>


         
                        <div className="stakeHolders">
                           <span class="material-symbols-outlined house">
                              house
                           </span>
                           <div>
                              <h4>Barangay Officials</h4>
                              <p>Manage OSY records, referrals, and monitor the <br /> progress of youth in training programs.</p>
                           </div>
                        </div>
            

               
                        <div className="stakeHolders">
                           <span class="material-symbols-outlined book_ribbon">
                              book_ribbon
                           </span>
                           <div>
                              <h4>Training Providers</h4>
                              <p>Manage training programs and monitor referred <br /> participants.</p>
                           </div>
                        </div>
                  </div>

               </div>

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
export default aboutUs;
