import logo from "../assets/BackToTrack_Logo3.png";
import bigHeaderImg from "../assets/big_header_img.png";
import dartGoalImg from "../assets/dart_goal2.png";
import tesdaLogo from "../assets/Tesda_Logo4.png";
import { Link } from "react-router-dom";
import "./Home.css";

function Home() {
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

                  <Link to="/" className="active">
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
         
         <div className="headerBottomPart">
            <div className="leftSide">
               <h1>
                  Bridging Skills, Training,
                  <br />
                  and Opportunities.
               </h1>
               <p>
                  BackToTrack is a centralized platform that connects
                  <br />
                  Out-Of-School Youth, Maxima Technical & Skills Training
                  <br />
                  Institute, employers, and business for a stronger <br />
                  workforce and a better community.
               </p>

               <div className="twoStartBtn">
                  <button className="get">Get Started</button>
                  <button className="learn">Learn More</button>
               </div>
            </div>
            <div>
               <img src={bigHeaderImg} alt="" />
            </div>
         </div>

         <div className="midPart">
            <div className="socialImp">
               <h2>
                  <span className="socialSpan">Social</span> Impact
               </h2>
               <p>
                  BackToTrack creates positve change for the Community, Local
                  Business, <br />
                  Maxima Technical & Skills Training Institute , and Baranggay Pogo
                  Grande
               </p>
            </div>

            <div className="threeCards">
               <div className="cards">
                  <span className="material-symbols-outlined famGroup">
                  family_group
                  </span>
                  <h3>
                  Community <br /> Development
                  </h3>
                  <p>
                  Connects out-of-school youth <br />
                  with training opportunities and <br />
                  employment pathways to reduce <br />
                  unemployment and build a better future
                  </p>
               </div>

               <div className="cards">
                  <span className="material-symbols-outlined integration">
                  integration_instructions
                  </span>
                  <h3>
                  Tesda <br /> Integration
                  </h3>
                  <p>
                  Supports skills training referrals, <br />
                  application tracking, and monitoring <br />
                  of TESDA graduates and programs.
                  </p>
               </div>

               <div className="cards">
                  <span className="material-symbols-outlined groups">groups</span>
                  <h3>
                  Economic <br /> Growth
                  </h3>
                  <p>
                  Creates opportunities for <br />
                  MSMEs, encourages entrepreneurship, <br />
                  and strengthens the local economy.
                  </p>
               </div>
            </div>

            <div className="midPartFooter">
               <div className="dartGoalImg">
                  <img src={dartGoalImg} alt="" />
               </div>

               <div className="ourGoal">
                  <h4>Our Goal</h4>
                  <p>
                  To build a digital ecosystem that bridges training and employment,
                  <br /> empowers the youth, and drives socio-economic growth,
                  </p>
               </div>

               <div className="targetMarketGoal">
                  <div className="youth">
                  <span className="material-symbols-outlined person">person</span>
                  <h4>
                     Youth <br /> Empowered
                  </h4>
                  </div>

                  <div className="business">
                  <span className="material-symbols-outlined cases">cases</span>
                  <h4>
                     Businesses <br /> Supported
                  </h4>
                  </div>

                  <div className="community">
                  <span className="material-symbols-outlined footerGroupsIcon">
                     groups
                  </span>
                  <h4>
                     Stronger <br /> Community
                  </h4>
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

export default Home;
