import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./OsyPasswordReset.css";

const NETWORK_MESSAGE =
   "Could not reach the server. Check your internet connection and try again.";

const FOCUSABLE =
   'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getCookie(name) {
   const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
   return match ? decodeURIComponent(match[2]) : null;
}

/** Asks the server for a new temporary password. Throws an Error with a message an SK official can act on. */
async function requestReset(osyId) {
   let res;

   try {
      await fetch("/sanctum/csrf-cookie", { credentials: "include" });
      res = await fetch(`/api/osy-profiles/${osyId}/reset-password`, {
         method: "POST",
         credentials: "include",
         headers: {
            Accept: "application/json",
            "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
         },
      });
   } catch {
      throw new Error(NETWORK_MESSAGE);
   }

   const data = await res.json().catch(() => null);

   if (!res.ok) {
      switch (res.status) {
         case 401:
         case 419:
            throw new Error("Your session has expired. Refresh the page and sign in again.");
         case 403:
            throw new Error("You do not have permission to reset this password.");
         case 404:
            throw new Error("This record no longer exists. Refresh the list and try again.");
         case 429:
            throw new Error("Too many requests. Wait a moment and try again.");
         default:
            throw new Error(
               res.status >= 500
                  ? "The server ran into a problem. Please try again in a moment."
                  : (data?.message ?? "Could not reset this password."),
            );
      }
   }

   return data;
}

/** Small dialog rendered on top of everything, with focus kept inside it. */
function Dialog({ titleId, onEscape, children }) {
   const ref = useRef(null);

   useEffect(() => {
      const previouslyFocused = document.activeElement;
      ref.current?.focus();
      return () => previouslyFocused?.focus?.();
   }, []);

   function handleKeyDown(e) {
      if (e.key === "Escape") {
         // Stop here so the profile dialog underneath does not close too
         e.stopPropagation();
         onEscape?.();
         return;
      }

      if (e.key !== "Tab") return;

      const nodes = ref.current.querySelectorAll(FOCUSABLE);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === ref.current)) {
         e.preventDefault();
         last.focus();
      } else if (!e.shiftKey && active === last) {
         e.preventDefault();
         first.focus();
      }
   }

   return createPortal(
      <div className="osyPwReset__overlay">
         <div
            ref={ref}
            tabIndex={-1}
            className="osyPwReset__dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            onKeyDown={handleKeyDown}
         >
            {children}
         </div>
      </div>,
      document.body,
   );
}

function OsyPasswordReset({ osy }) {
   const [step, setStep] = useState("idle"); // idle | confirm | result
   const [working, setWorking] = useState(false);
   const [error, setError] = useState(null);
   const [result, setResult] = useState(null);
   const [copied, setCopied] = useState(false);

   // No account yet, so there is nothing to reset
   if (!osy?.user) return null;

   const name = [osy.first_name, osy.middle_name, osy.last_name].filter(Boolean).join(" ");

   function close() {
      setStep("idle");
      setResult(null);
      setError(null);
      setCopied(false);
   }

   async function handleConfirm() {
      if (working) return;
      setWorking(true);
      setError(null);

      try {
         const data = await requestReset(osy.id);
         setResult({
            email: data?.email ?? osy.user.email,
            password: data?.temporary_password ?? "",
         });
         setStep("result");
      } catch (err) {
         setError(err.message);
      } finally {
         setWorking(false);
      }
   }

   async function copyPassword() {
      try {
         await navigator.clipboard.writeText(result.password);
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
      } catch {
         setCopied(false);
      }
   }

   return (
      <>
         <button
            type="button"
            className="osyPwReset__btn osyPwReset__btnGhost"
            onClick={() => setStep("confirm")}
         >
            Reset password
         </button>

         {step === "confirm" && (
            <Dialog
               titleId="osyPwResetConfirmTitle"
               onEscape={working ? undefined : close}
            >
               <h2 id="osyPwResetConfirmTitle" className="osyPwReset__title">
                  Reset this password?
               </h2>
               <p className="osyPwReset__text">
                  This creates a new temporary password for <strong>{name}</strong> (
                  {osy.user.email}). Their old password will stop working, and they
                  will be asked to choose a new one the next time they sign in.
               </p>

               {error && (
                  <div className="osyPwReset__error" role="alert">
                     {error}
                  </div>
               )}

               <div className="osyPwReset__actions">
                  <button
                     type="button"
                     className="osyPwReset__btn osyPwReset__btnGhost"
                     onClick={close}
                     disabled={working}
                  >
                     Cancel
                  </button>
                  <button
                     type="button"
                     className="osyPwReset__btn osyPwReset__btnPrimary"
                     onClick={handleConfirm}
                     disabled={working}
                  >
                     {working ? "Resetting…" : "Reset password"}
                  </button>
               </div>
            </Dialog>
         )}

         {step === "result" && result && (
            <Dialog titleId="osyPwResetResultTitle">
               <h2 id="osyPwResetResultTitle" className="osyPwReset__title">
                  Temporary password ready
               </h2>
               <p className="osyPwReset__text">
                  Give this to <strong>{name}</strong>. It is shown only once, so copy it
                  before you close this window.
               </p>

               <dl className="osyPwReset__credentials">
                  <div>
                     <dt>Email</dt>
                     <dd>{result.email}</dd>
                  </div>
                  <div>
                     <dt>Temporary password</dt>
                     <dd className="osyPwReset__password">{result.password}</dd>
                  </div>
               </dl>

               <p className="osyPwReset__note">
                  They will be asked to choose their own password the first time they
                  sign in with it.
               </p>

               <div className="osyPwReset__actions">
                  <button
                     type="button"
                     className="osyPwReset__btn osyPwReset__btnGhost"
                     onClick={copyPassword}
                  >
                     {copied ? "Copied" : "Copy password"}
                  </button>
                  <button
                     type="button"
                     className="osyPwReset__btn osyPwReset__btnPrimary"
                     onClick={close}
                  >
                     Done
                  </button>
               </div>
            </Dialog>
         )}
      </>
   );
}

export default OsyPasswordReset;