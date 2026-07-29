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
               <button>Impact</button>
               <button>Contact</button>
               <button>About Us</button>

               <Link to="/" className="active"> Home</Link>
               <Link to="/login" className="btn">Login </Link>
               <Link to="/register" className="btn">Register</Link>
            </nav>
         </div>

         <div className="headerBottomPart">
            <div className="leftSide">
               <h1>
               Bridging Skills, Training,
               <br />
               and Opportunities.
               </h1>
               <p>
               BackToTrack is a centralized platform <br /> that connects
               out-of-school youth, TESDA,
               <br />
               employers, and business for a stronger <br />
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
         </header>

         <div className="midPart">
         <div className="socialImp">
            <h1>
               <span className="socialSpan">Social</span> Impact
            </h1>
            <p>
               BackToTrack creates positve change for the Community, Local
               Business, <br />
               TESDA, and Baranggay Pogo Grande
            </p>
         </div>

         <div className="threeCards">
            <div className="cards">
               <span className="material-symbols-outlined famGroup">
               family_group
               </span>
               <h2>
               Community <br /> Development
               </h2>
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
               <h2>
               Tesda <br /> Integration
               </h2>
               <p>
               Supports skills training referrals, <br />
               application tracking, and monitoring <br />
               of TESDA graduates and programs.
               </p>
            </div>

            <div className="cards">
               <span className="material-symbols-outlined groups">groups</span>
               <h2>
               Economic <br /> Growth
               </h2>
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
               <h1>Our Goal</h1>
               <p>
               To build a digital ecosystem that bridges training and employment,{" "}
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
               <p>Let's Build Opportunities.</p>
               </div>
            </div>

            <div className="footerNav">
               <div className="footerNavLinks">
               <h1>Quick Links</h1>
               <Link to="/" className="active"> Home</Link>
               <a href="#">About</a>
               </div>
               <div className="footerNavLinks">
               <h1>Supports</h1>
               <a href="#">Contact</a>
               <a href="#">Socials</a>
               </div>
               <div className="footerNavLinks">
               <h1>Partners</h1>
               <a href="#">Tesda</a>
               <a href="#">Pogo Grande</a>
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
