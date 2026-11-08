import { useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/BackToTrack_Logo3.png";
import "./ChangePassword.css";

const redirects = {
   maxima_tesda_school: "/maxima/dashboard",
   sk_officials: "/barangay/dashboard",
   osy: "/osy/dashboard",
};

const EMPTY_FORM = { current_password: "", password: "", password_confirmation: "" };

function getCookie(name) {
   const value = `; ${document.cookie}`;
   const parts = value.split(`; ${name}=`);
   if (parts.length === 2) return decodeURIComponent(parts.pop().split(";").shift());
}

async function ensureCsrfCookie() {
   await fetch("/sanctum/csrf-cookie", { credentials: "include" });
}

async function sendRequest(path, method, body) {
   await ensureCsrfCookie();

   const res = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: {
         Accept: "application/json",
         "Content-Type": "application/json",
         "X-XSRF-TOKEN": getCookie("XSRF-TOKEN"),
      },
      body: body ? JSON.stringify(body) : undefined,
   });

   const json = await res.json().catch(() => null);

   if (!res.ok) {
      const err = new Error(json?.message ?? "Something went wrong. Please try again.");
      err.status = res.status;
      err.errors = json?.errors ?? {};
      throw err;
   }

   return json;
}

/** Same rules as the server, so mistakes are caught before the request. */
function validate(form) {
   const problems = {};

   if (!form.current_password) {
      problems.current_password = "Enter your current or temporary password.";
   }

   if (!form.password) {
      problems.password = "Enter a new password.";
   } else if (form.password.length < 8) {
      problems.password = "Password must be at least 8 characters.";
   } else if (form.password.length > 72) {
      problems.password = "Password must be 72 characters or fewer.";
   } else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
      problems.password = "Include at least one letter and one number.";
   } else if (form.password === form.current_password) {
      problems.password = "Your new password must be different from your current password.";
   }

   if (!form.password_confirmation) {
      problems.password_confirmation = "Re-enter the new password to confirm it.";
   } else if (form.password !== form.password_confirmation) {
      problems.password_confirmation = "Passwords do not match.";
   }

   return problems;
}

function ChangePassword() {
   const navigate = useNavigate();
   const [form, setForm] = useState(EMPTY_FORM);
   const [showPasswords, setShowPasswords] = useState(false);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState("");
   const [fieldErrors, setFieldErrors] = useState({});
   const [done, setDone] = useState(false);

   function handleChange(e) {
      const { name, value } = e.target;
      setForm((prev) => ({ ...prev, [name]: value }));
      setFieldErrors((prev) => {
         if (!prev[name]) return prev;
         const rest = { ...prev };
         delete rest[name];
         return rest;
      });
      setError("");
   }

   async function handleSubmit(e) {
      e.preventDefault();
      if (saving || done) return;

      const problems = validate(form);
      if (Object.keys(problems).length > 0) {
         setFieldErrors(problems);
         setError("Please fix the highlighted fields before continuing.");
         return;
      }

      setSaving(true);
      setError("");
      setFieldErrors({});

      try {
         await sendRequest("/osy/password", "PUT", form);
         setDone(true);

         // A full page load, so the app checks the account again from scratch
         const role = localStorage.getItem("userRole");
         setTimeout(() => window.location.assign(redirects[role] || "/"), 1200);
      } catch (err) {
         if (err.status === 401 || err.status === 419) {
            setError("Your session has expired. Please sign in again.");
         } else if (!err.status) {
            setError("Could not reach the server. Check your internet connection and try again.");
         } else {
            setError(err.message);
            // Laravel validation errors: { field: [message] }
            const flat = Object.fromEntries(
               Object.entries(err.errors || {}).map(([field, msgs]) => [
                  field,
                  Array.isArray(msgs) ? msgs[0] : msgs,
               ]),
            );
            setFieldErrors(flat);
         }
      } finally {
         setSaving(false);
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

   const inputType = showPasswords ? "text" : "password";

   return (
      <div className="chpwBody">
         <div className="chpwCard">
            <div className="chpwBrand">
               <span className="chpwLogo">
                  <img src={logo} alt="" />
               </span>
               <span className="chpwBrandName">BackToTrack</span>
            </div>

            <h1 className="chpwTitle">Create a new password</h1>
            <p className="chpwIntro">
               If your SK official gave you a temporary password, enter it as your
               current password, then choose a new one that only you know.
            </p>

            {done ? (
               <div className="chpwSuccess" role="status">
                  Your password has been changed. Taking you to your dashboard...
               </div>
            ) : (
               <form onSubmit={handleSubmit} noValidate>
                  {error && (
                     <div className="chpwError" role="alert">
                        {error}
                     </div>
                  )}

                  <div className="chpwField">
                     <label htmlFor="chpw-current">Current (temporary) password</label>
                     <input
                        id="chpw-current"
                        name="current_password"
                        type={inputType}
                        autoComplete="current-password"
                        value={form.current_password}
                        onChange={handleChange}
                        aria-invalid={fieldErrors.current_password ? "true" : undefined}
                     />
                     {fieldErrors.current_password && (
                        <span className="chpwFieldError">{fieldErrors.current_password}</span>
                     )}
                  </div>

                  <div className="chpwField">
                     <label htmlFor="chpw-new">New password</label>
                     <input
                        id="chpw-new"
                        name="password"
                        type={inputType}
                        autoComplete="new-password"
                        maxLength={72}
                        value={form.password}
                        onChange={handleChange}
                        aria-invalid={fieldErrors.password ? "true" : undefined}
                     />
                     {fieldErrors.password ? (
                        <span className="chpwFieldError">{fieldErrors.password}</span>
                     ) : (
                        <span className="chpwHint">At least 8 characters, with letters and numbers.</span>
                     )}
                  </div>

                  <div className="chpwField">
                     <label htmlFor="chpw-confirm">Confirm new password</label>
                     <input
                        id="chpw-confirm"
                        name="password_confirmation"
                        type={inputType}
                        autoComplete="new-password"
                        maxLength={72}
                        value={form.password_confirmation}
                        onChange={handleChange}
                        aria-invalid={fieldErrors.password_confirmation ? "true" : undefined}
                     />
                     {fieldErrors.password_confirmation && (
                        <span className="chpwFieldError">{fieldErrors.password_confirmation}</span>
                     )}
                  </div>

                  <label className="chpwCheck">
                     <input
                        type="checkbox"
                        checked={showPasswords}
                        onChange={(e) => setShowPasswords(e.target.checked)}
                     />
                     Show passwords
                  </label>

                  <div className="chpwActions">
                     <button
                        type="button"
                        className="chpwBtn chpwBtnGhost"
                        onClick={handleLogout}
                        disabled={saving}
                     >
                        Log out
                     </button>
                     <button type="submit" className="chpwBtn chpwBtnPrimary" disabled={saving}>
                        {saving ? "Updating..." : "Update password"}
                     </button>
                  </div>
               </form>
            )}
         </div>
      </div>
   );
}

export default ChangePassword;