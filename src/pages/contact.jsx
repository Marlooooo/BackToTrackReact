import { useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/BackToTrack_Logo3.png";
import tesdaLogo from "../assets/Tesda_Logo4.png";
import "./contact.css"

function getCookie(name) {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? decodeURIComponent(match[2]) : null;
}

async function ensureCsrfCookie() {
   await fetch('/sanctum/csrf-cookie', {
      credentials: 'include',
   });
}

function Contact() {
   const [form, setForm] = useState({ full_name: "", subject: "", message: "" });
   const [status, setStatus] = useState("");
   const [isError, setIsError] = useState(false);
   const [sending, setSending] = useState(false);

   const handleChange = (e) => {
      setForm({ ...form, [e.target.name]: e.target.value });
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      setSending(true);
      setStatus("");
      setIsError(false);
      try {
         await ensureCsrfCookie();

         const res = await fetch("/api/contact", {
            method: "POST",
            credentials: "include",
            headers: {
               "Content-Type": "application/json",
               Accept: "application/json",
               "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
            },
            body: JSON.stringify(form),
         });
         if (res.ok) {
            setStatus("Message sent! Thank you for reaching out.");
            setForm({ full_name: "", subject: "", message: "" });
         } else if (res.status === 422) {
            setIsError(true);
            setStatus("Please fill in all fields.");
         } else {
            setIsError(true);
            setStatus("Something went wrong. Please try again later.");
         }
      } catch {
         setIsError(true);
         setStatus("Network error. Please try again later.");
      }
      setSending(false);
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




         <section className="contactSection">

            <div className="contactIntro">
               <span className="contactBadge">Contact Us</span>
               <h1>We’d Love to Hear From You!</h1>
               <p>
                  Have questions about BackToTrack? We're here to help.
                  Send us a message or reach out through the contact information below.
               </p>
            </div>

            <div className="contactWrapper">

               <div className="contactInfoPanel">
                  <div className="contactInfoHead">
                     <h2>Get in Touch</h2>
                     <p>Reach out to us anytime. Your message goes straight to our inbox.</p>
                  </div>

                  <div className="contactInfoList">

                     <div className="contactInfoItem">
                        <div className="contactInfoIcon">
                           <span className="material-symbols-outlined">location_on</span>
                        </div>
                        <div className="contactInfoText">
                           <h3>Location</h3>
                           <p>Malanay, Santa Barbara, Pangasinan</p>
                        </div>
                     </div>

                     <div className="contactInfoItem">
                        <div className="contactInfoIcon">
                           <span className="material-symbols-outlined">attach_email</span>
                        </div>
                        <div className="contactInfoText">
                           <h3>Email</h3>
                           <p>marlonavarro012345@gmail.com</p>
                        </div>
                     </div>

                     <div className="contactInfoItem">
                        <div className="contactInfoIcon">
                           <span className="material-symbols-outlined">call</span>
                        </div>
                        <div className="contactInfoText">
                           <h3>Contact Number</h3>
                           <p>09774353687</p>
                        </div>
                     </div>

                  </div>
               </div>




               <div className="contactFormPanel">
                  <h2>Send Us a Message</h2>
                  <p className="contactFormSub">Fill out the form below and we'll get your message right away.</p>

                  <form className="contactForm" onSubmit={handleSubmit}>

                     <div className="contactFormRow">
                        <div className="contactField">
                           <label htmlFor="fullName">Full Name</label>
                           <input type="text" name="full_name" id="fullName" placeholder="Enter your full name"
                              value={form.full_name} onChange={handleChange} maxLength={100} required />
                        </div>
                        <div className="contactField">
                           <label htmlFor="subject">Subject</label>
                           <input type="text" name="subject" id="subject" placeholder="What is this about?"
                              value={form.subject} onChange={handleChange} maxLength={150} required />
                        </div>
                     </div>

                     <div className="contactField">
                        <label htmlFor="message">Message</label>
                        <textarea name="message" id="message" placeholder="Type your message here..."
                           value={form.message} onChange={handleChange} maxLength={3000} required />
                        <span className="contactCounter">{form.message.length} / 3000</span>
                     </div>

                     {status && (
                        <p className={isError ? "contactStatus error" : "contactStatus success"}>
                           <span className="material-symbols-outlined">
                              {isError ? "error" : "check_circle"}
                           </span>
                           {status}
                        </p>
                     )}

                     <button type="submit" className="contactSubmitBtn" disabled={sending}>
                        {sending ? "Sending..." : "Send Message"}
                        <span className="material-symbols-outlined">send</span>
                     </button>

                  </form>
               </div>

            </div>

         </section>










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