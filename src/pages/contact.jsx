import { Link } from "react-router-dom";
import logo from "../assets/BackToTrack_Logo3.png";
import tesdaLogo from "../assets/Tesda_Logo4.png";
import "./contact.css"

function Contact() {
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

                  <Link to="/contact" className="room activeICA">
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




         <div className="mainContentContactUs">

            <div className="mainContentContactUsLeft">

               <div>
                  <h1>Contact Us</h1>
                  <h4>We’d Love to Hear From You!</h4>
                  <p>Have questions about BackToTrack? We're here to help. <br />
                     Send us a message or reach out through the contact information <br />
                     below.
                  </p>
               </div>

               
               <div className="contactsDetailsDiv">

                  <div className="contactsDetails">
                     <span class="material-symbols-outlined location_on">
                     location_on
                     </span>                     
                     <div>
                        <h3>Location</h3>
                        <p>Malanay, Santa Barbara, Pangasinan</p>
                     </div>
                  </div>


                  <div className="contactsDetails">
                     <span class="material-symbols-outlined attach_email">
                     attach_email
                     </span>
                     <div>
                        <h3>Email</h3>
                        <p>marlonavarro012345@gmail.com</p>
                     </div>
                  </div>


                  <div className="contactsDetails">
                     <span class="material-symbols-outlined call">
                     call
                     </span>                     
                     <div>
                        <h3>Contact Number</h3>
                        <p>09774353687</p>
                     </div>
                  </div>

               </div>

            </div>




            <div className="mainContentContactUsRight">
               <h1>
                  Send Us a Message
               </h1>

               <div className="nameAndEmailDiv">
                  <div>
                     <h6>Full Name</h6>
                     <input type="text" name="fullName" id="fullName" placeholder="Enter Your Full Name" />
                  </div>
                  <div>
                     <h6>Email Address</h6>
                     <input type="text" name="emailAddress" id="emailAddress" placeholder="Enter Your Email" />
                  </div>
               </div>

               <div className="subjectDiv">
                  <h6>Subject</h6>
                  <input type="text" name="subject" id="subject" placeholder="Query" />
               </div>

               <div className="messageDiv">
                  <h6>Message</h6>
                  <input type="text" name="message" id="message" placeholder="Type your message here ..." />
               </div>
               
               
               <div className="submitBtn">
                  <button>
                     Submit
                     <span class="material-symbols-outlined">
                     send
                     </span>
                  </button>
                  
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
export default Contact;
