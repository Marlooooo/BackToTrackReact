import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/BackToTrack_Logo3.png";
import "./VerifyEmail.css";

const redirects = {
   maxima_tesda_school: "/maxima/dashboard",
   sk_officials: "/barangay/dashboard",
   osy: "/osy/dashboard",
};

const NETWORK_MESSAGE =
   "Could not reach the server. Check your internet connection and try again.";

function getCookie(name) {
   const value = `; ${document.cookie}`;
   const parts = value.split(`; ${name}=`);
   if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
}

async function ensureCsrfCookie() {
   await fetch("/sanctum/csrf-cookie", { credentials: "include" });
}

/** Request with Sanctum cookie auth. Throws an Error with a status (0 = network). */
async function apiRequest(path, { method = "GET", body } = {}) {
   const isWrite = method !== "GET";
   let res;

   try {
      if (isWrite) await ensureCsrfCookie();

      res = await fetch(`/api${path}`, {
         method,
         credentials: "include",
         headers: {
            Accept: "application/json",
            ...(body && { "Content-Type": "application/json" }),
            ...(isWrite && { "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") }),
         },
         body: body ? JSON.stringify(body) : undefined,
      });
   } catch {
      const err = new Error(NETWORK_MESSAGE);
      err.status = 0;
      throw err;
   }

   const json = await res.json().catch(() => null);

   if (!res.ok) {
      const err = new Error(json?.message ?? "Something went wrong. Please try again.");
      err.status = res.status;
      throw err;
   }

   return json;
}

function describeError(err) {
   switch (err.status) {
      case 401:
      case 419:
         return "Your session has expired. Please sign in again.";
      case 429:
         return "Too many requests. Wait a moment and try again.";
      default:
         return err.message;
   }
}

function goToDashboard() {
   // A full page load, so the app checks the account again from scratch
   window.location.replace(redirects[localStorage.getItem("userRole")] || "/");
}

function VerifyEmail() {
   const navigate = useNavigate();
   const startedRef = useRef(false);

   const [status, setStatus] = useState("checking"); // checking | ready
   const [email, setEmail] = useState("");
   const [expiresIn, setExpiresIn] = useState(null);
   const [code, setCode] = useState("");
   const [info, setInfo] = useState("");
   const [error, setError] = useState("");
   const [cooldown, setCooldown] = useState(0);
   const [sending, setSending] = useState(false);
   const [verifying, setVerifying] = useState(false);
   const [done, setDone] = useState(false);

   async function requestCode() {
      setSending(true);
      setError("");

      try {
         const data = await apiRequest("/email/verification/send", { method: "POST" });

         if (data?.verified) {
            goToDashboard();
            return;
         }

         setEmail(data.email ?? "");
         setCooldown(data.retry_after ?? 0);
         if (data.expires_in_minutes) setExpiresIn(data.expires_in_minutes);
         setInfo(
            data.sent
               ? "We just sent you a new code."
               : "A code was sent a moment ago. Check your inbox, and your spam folder too.",
         );
      } catch (err) {
         setInfo("");
         setError(describeError(err));
      } finally {
         setStatus("ready");
         setSending(false);
      }
   }

   // On arrival: confirm this account still needs a code, then send one
   useEffect(() => {
      if (startedRef.current) return;
      startedRef.current = true;

      (async () => {
         try {
            const user = await apiRequest("/user");

            if (!user?.must_verify_email) {
               goToDashboard();
               return;
            }
         } catch (err) {
            if (err.status === 401 || err.status === 419) {
               navigate("/login", { replace: true });
               return;
            }
            // Any other problem: still try to send, and show the error there
         }

         await requestCode();
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   // Counts the resend cooldown down once a second
   useEffect(() => {
      if (cooldown <= 0) return undefined;
      const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
   }, [cooldown]);

   function handleCodeChange(e) {
      setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
      setError("");
   }

   async function handleSubmit(e) {
      e.preventDefault();
      if (verifying || done) return;

      if (!/^\d{6}$/.test(code)) {
         setError("Enter the 6-digit code.");
         return;
      }

      setVerifying(true);
      setError("");

      try {
         await apiRequest("/email/verification/verify", {
            method: "POST",
            body: { code },
         });

         setDone(true);
         setTimeout(goToDashboard, 1200);
      } catch (err) {
         setError(describeError(err));
         setCode("");
      } finally {
         setVerifying(false);
      }
   }

   async function handleLogout() {
      try {
         await ensureCsrfCookie();
         await fetch("/api/logout", {
            method: "POST",
            credentials: "include",
            headers: {
               Accept: "application/json",
               "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
            },
         });
      } catch (err) {
         console.error("Logout failed:", err);
      } finally {
         localStorage.removeItem("token");
         localStorage.removeItem("userName");
         localStorage.removeItem("userRole");
         navigate("/login", { replace: true });
      }
   }

   const resendLabel = sending
      ? "Sending..."
      : cooldown > 0
        ? `Send a new code in ${cooldown}s`
        : "Send a new code";

   return (
      <div className="vfemBody">
         <div className="vfemCard">
            <div className="vfemBrand">
               <span className="vfemLogo">
                  <img src={logo} alt="" />
               </span>
               <span className="vfemBrandName">BackToTrack</span>
            </div>

            <h1 className="vfemTitle">Check your email</h1>

            {status === "checking" ? (
               <p className="vfemIntro">Preparing your code...</p>
            ) : done ? (
               <div className="vfemSuccess" role="status">
                  Your email is verified. Taking you to your dashboard...
               </div>
            ) : (
               <>
                  <p className="vfemIntro">
                     To finish setting up your account, enter the 6-digit code we sent
                     to {email ? <strong className="vfemEmail">{email}</strong> : "your email address"}.
                     {expiresIn ? ` The code expires after ${expiresIn} minutes.` : ""}
                  </p>

                  <form onSubmit={handleSubmit} noValidate>
                     {info && !error && (
                        <div className="vfemInfo" role="status">
                           {info}
                        </div>
                     )}

                     {error && (
                        <div className="vfemError" role="alert">
                           {error}
                        </div>
                     )}

                     <div className="vfemField">
                        <label className="vfemLabel" htmlFor="vfem-code">
                           Verification code
                        </label>
                        <input
                           id="vfem-code"
                           className="vfemCodeInput"
                           type="text"
                           inputMode="numeric"
                           autoComplete="one-time-code"
                           maxLength={6}
                           placeholder="000000"
                           value={code}
                           onChange={handleCodeChange}
                           aria-invalid={error ? "true" : undefined}
                           autoFocus
                        />
                     </div>

                     <button
                        type="button"
                        className="vfemLinkBtn"
                        onClick={requestCode}
                        disabled={sending || verifying || cooldown > 0}
                     >
                        {resendLabel}
                     </button>

                     <p className="vfemHelp">
                        Wrong email address? Ask your SK official for help.
                     </p>

                     <div className="vfemActions">
                        <button
                           type="button"
                           className="vfemBtn vfemBtnGhost"
                           onClick={handleLogout}
                           disabled={verifying}
                        >
                           Log out
                        </button>
                        <button
                           type="submit"
                           className="vfemBtn vfemBtnPrimary"
                           disabled={verifying}
                        >
                           {verifying ? "Checking..." : "Verify email"}
                        </button>
                     </div>
                  </form>
               </>
            )}
         </div>
      </div>
   );
}

export default VerifyEmail;