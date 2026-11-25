import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import logo from "../assets/BackToTrack_Logo3.png";
import tesdaLogo from "../assets/Tesda_Logo4.png";
import "./contact.css"

/* ------------------------------------------------------------------ */
/* Edit your contact details here. Leave facebook empty to hide it.   */
/* ------------------------------------------------------------------ */
const CONTACT = {
   address: "Malanay, Santa Barbara, Pangasinan",
   mapQuery: "Malanay, Santa Barbara, Pangasinan",
   email: "marlonavarro012345@gmail.com",
   phone: "09774353687",
   hours: "Monday to Friday, 8:00 AM - 5:00 PM",
   replyTime: "We usually reply within 1-2 working days.",
   facebook: "",
};

// "value" must match INQUIRY_TYPES in ContactController.php
const INQUIRY_TYPES = [
   { value: "register", label: "I want to register as an OSY" },
   { value: "training", label: "Question about training programs" },
   { value: "account", label: "Problem with my account" },
   { value: "partnership", label: "Partnership or collaboration" },
   { value: "other", label: "Other" },
];

const FAQS = [
   {
      q: "How do I register as an OSY?",
      a: "Registration is done in person. Visit your barangay hall, where an SK official will record your details and interview you. After that, your account is created for you.",
   },
   {
      q: "Who is an Out-of-School Youth (OSY)?",
      a: "OSYs are young people who are not currently studying or working. If you are unsure whether you qualify, ask your barangay SK officials.",
   },
   {
      q: "What happens after I register?",
      a: "Based on your interview, the system recommends courses that fit you. Once your account is ready, you verify your email, and if you want to join a training program, your SK official can refer you to Maxima for review.",
   },
   {
      q: "I did not receive my verification code.",
      a: "Check your spam folder first, then request a new code after the waiting time ends. If it still does not arrive, ask your SK official to confirm that your email address was entered correctly.",
   },
   {
      q: "I forgot my password.",
      a: "Visit your barangay SK official. They can give you a temporary password, and you will be asked to choose a new one when you log in.",
   },
];

function getCookie(name) {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? decodeURIComponent(match[2]) : null;
}

async function ensureCsrfCookie() {
   await fetch('/sanctum/csrf-cookie', {
      credentials: 'include',
   });
}

const EMPTY_FORM = {
   full_name: "",
   email: "",
   inquiry_type: "",
   subject: "",
   message: "",
   website: "", // hidden spam trap, must stay empty
};

function Contact() {
   const [menuOpen, setMenuOpen] = useState(false);
   const [form, setForm] = useState(EMPTY_FORM);
   const [errors, setErrors] = useState({});
   const [status, setStatus] = useState("");
   const [isError, setIsError] = useState(false);
   const [sending, setSending] = useState(false);

   useEffect(() => {
      const previous = document.title;
      document.title = "Contact Us | BackToTrack";

      return () => {
         document.title = previous;
      };
   }, []);

   const handleChange = (e) => {
      const { name, value } = e.target;

      setForm({ ...form, [name]: value });

      // Clear the red error on a field as soon as the person edits it
      if (errors[name]) {
         setErrors({ ...errors, [name]: undefined });
      }
   };

   const handleSubmit = async (e) => {
      e.preventDefault();
      setSending(true);
      setStatus("");
      setIsError(false);
      setErrors({});

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
            setStatus("Message sent! Thank you for reaching out. We will reply to the email address you provided.");
            setForm(EMPTY_FORM);
         } else if (res.status === 422) {
            const body = await res.json().catch(() => null);

            setErrors(body?.errors ?? {});
            setIsError(true);
            setStatus("Please check the highlighted fields.");
         } else if (res.status === 429) {
            setIsError(true);
            setStatus("You have sent several messages already. Please try again later.");
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

   const fieldClass = (name) => `contactField${errors[name] ? " hasError" : ""}`;

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

            <button
               type="button"
               className="burger"
               aria-label="Toggle menu"
               onClick={() => setMenuOpen(!menuOpen)}
            >
               <span className="material-symbols-outlined">
                  {menuOpen ? "close" : "menu"}
               </span>
            </button>

            <nav className={menuOpen ? "open" : ""} onClick={() => setMenuOpen(false)}>
               <Link to="/" className="room">Home</Link>
               <Link to="/impact" className="room">Impact</Link>
               <Link to="/contact" className="room active">Contact</Link>
               <Link to="/about" className="room">About Us</Link>
               <Link to="/login" className="btn">Login</Link>
               <Link to="/register" className="btn">Register</Link>
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
                     <p>{CONTACT.replyTime}</p>
                  </div>

                  <div className="contactInfoList">

                     <div className="contactInfoItem">
                        <div className="contactInfoIcon">
                           <span className="material-symbols-outlined">location_on</span>
                        </div>
                        <div className="contactInfoText">
                           <h3>Location</h3>
                           <p>{CONTACT.address}</p>
                        </div>
                     </div>

                     <div className="contactInfoItem">
                        <div className="contactInfoIcon">
                           <span className="material-symbols-outlined">attach_email</span>
                        </div>
                        <div className="contactInfoText">
                           <h3>Email</h3>
                           <p><a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a></p>
                        </div>
                     </div>

                     <div className="contactInfoItem">
                        <div className="contactInfoIcon">
                           <span className="material-symbols-outlined">call</span>
                        </div>
                        <div className="contactInfoText">
                           <h3>Contact Number</h3>
                           <p><a href={`tel:${CONTACT.phone.replace(/[^0-9+]/g, "")}`}>{CONTACT.phone}</a></p>
                        </div>
                     </div>

                     <div className="contactInfoItem">
                        <div className="contactInfoIcon">
                           <span className="material-symbols-outlined">schedule</span>
                        </div>
                        <div className="contactInfoText">
                           <h3>Office Hours</h3>
                           <p>{CONTACT.hours}</p>
                        </div>
                     </div>

                     {CONTACT.facebook && (
                        <div className="contactInfoItem">
                           <div className="contactInfoIcon">
                              <span className="material-symbols-outlined">public</span>
                           </div>
                           <div className="contactInfoText">
                              <h3>Facebook</h3>
                              <p>
                                 <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer">
                                    Visit our page
                                 </a>
                              </p>
                           </div>
                        </div>
                     )}

                  </div>
               </div>




               <div className="contactFormPanel">
                  <h2>Send Us a Message</h2>
                  <p className="contactFormSub">Fill out the form below and we'll get back to you.</p>

                  <form className="contactForm" onSubmit={handleSubmit} noValidate>

                     <div className="contactFormRow">
                        <div className={fieldClass("full_name")}>
                           <label htmlFor="fullName">Full Name</label>
                           <input type="text" name="full_name" id="fullName" placeholder="Enter your full name"
                              value={form.full_name} onChange={handleChange} maxLength={100} />
                           {errors.full_name && <p className="contactFieldError">{errors.full_name[0]}</p>}
                        </div>
                        <div className={fieldClass("email")}>
                           <label htmlFor="email">Email Address</label>
                           <input type="email" name="email" id="email" placeholder="you@example.com"
                              value={form.email} onChange={handleChange} maxLength={150} />
                           {errors.email && <p className="contactFieldError">{errors.email[0]}</p>}
                        </div>
                     </div>

                     <div className="contactFormRow">
                        <div className={fieldClass("inquiry_type")}>
                           <label htmlFor="inquiryType">What is this about?</label>
                           <select name="inquiry_type" id="inquiryType"
                              value={form.inquiry_type} onChange={handleChange}>
                              <option value="">Select a topic</option>
                              {INQUIRY_TYPES.map((type) => (
                                 <option key={type.value} value={type.value}>{type.label}</option>
                              ))}
                           </select>
                           {errors.inquiry_type && <p className="contactFieldError">{errors.inquiry_type[0]}</p>}
                        </div>
                        <div className={fieldClass("subject")}>
                           <label htmlFor="subject">Subject</label>
                           <input type="text" name="subject" id="subject" placeholder="Short summary"
                              value={form.subject} onChange={handleChange} maxLength={150} />
                           {errors.subject && <p className="contactFieldError">{errors.subject[0]}</p>}
                        </div>
                     </div>

                     <div className={fieldClass("message")}>
                        <label htmlFor="message">Message</label>
                        <textarea name="message" id="message" placeholder="Type your message here..."
                           value={form.message} onChange={handleChange} maxLength={3000} />
                        <span className="contactCounter">{form.message.length} / 3000</span>
                        {errors.message && <p className="contactFieldError">{errors.message[0]}</p>}
                     </div>

                     {/* Hidden spam trap: people never see it, bots often fill it in */}
                     <div className="contactHp" aria-hidden="true">
                        <label htmlFor="website">Leave this field empty</label>
                        <input type="text" name="website" id="website" tabIndex={-1}
                           autoComplete="off" value={form.website} onChange={handleChange} />
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

                     <p className="contactPrivacy">
                        Your details are used only to reply to your message.
                     </p>

                  </form>
               </div>

            </div>

            <div className="contactBlock">
               <div className="contactBlockHead">
                  <span className="contactBadge">Find Us</span>
                  <h2>Visit Our Office</h2>
                  <p>{CONTACT.address} · {CONTACT.hours}</p>
               </div>
               <iframe
                  className="contactMapFrame"
                  title="Office location map"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(CONTACT.mapQuery)}&output=embed`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
               />
            </div>

            <div className="contactBlock">
               <div className="contactBlockHead">
                  <span className="contactBadge">FAQ</span>
                  <h2>Frequently Asked Questions</h2>
                  <p>Quick answers to common questions.</p>
               </div>
               <div className="faqList">
                  {FAQS.map((item) => (
                     <details className="faqItem" key={item.q}>
                        <summary>{item.q}</summary>
                        <p>{item.a}</p>
                     </details>
                  ))}
               </div>
            </div>

            <div className="contactBlock contactCta">
               <h2>Not registered yet?</h2>
               <p>See how to get started with BackToTrack and what to bring to your barangay hall.</p>
               <Link to="/register" className="contactCtaBtn">How to Register</Link>
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
               <Link to="/">Home</Link>
               <Link to="/about">About</Link>
               </div>
               <div className="footerNavLinks">
               <h1>Supports</h1>
               <Link to="/contact" className="active">Contact</Link>
               {CONTACT.facebook && (
                  <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
               )}
               </div>
               <div className="footerNavLinks">
               <h1>Partners</h1>
               <a>Maxima</a>
               <a>Pogo Grande</a>
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