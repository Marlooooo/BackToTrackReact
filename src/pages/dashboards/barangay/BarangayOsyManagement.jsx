   import { useCallback, useEffect, useMemo, useRef, useState } from "react";
   import SkOfficialSideBar from "../../../components/skOfficialSideBar";
   import "./BarangayOsyManagement.css";

   /* -------------------------------------------------------------------------- */
   /* API helpers                                                                */
   /* -------------------------------------------------------------------------- */

   const OSY_ENDPOINT = "/api/osy-profiles";
   const NETWORK_MESSAGE =
   "Could not reach the server. Check your internet connection and try again.";

   class ApiError extends Error {
   constructor(message, status, body) {
      super(message);
      this.status = status;
      this.body = body;
   }
   }

   function getCookie(name) {
   const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
   return match ? decodeURIComponent(match[2]) : null;
   }

   async function ensureCsrfCookie() {
   await fetch("/sanctum/csrf-cookie", { credentials: "include" });
   }

   /** JSON request with Sanctum cookie auth. Throws ApiError on failure (status 0 = network). */
   async function apiFetch(url, { method = "GET", body } = {}) {
   const isWrite = method !== "GET";
   let res;

   try {
      if (isWrite) await ensureCsrfCookie();
      res = await fetch(url, {
         method,
         credentials: "include",
         headers: {
         Accept: "application/json",
         ...(body !== undefined && { "Content-Type": "application/json" }),
         ...(isWrite && { "X-XSRF-TOKEN": getCookie("XSRF-TOKEN") }),
         },
         body: body !== undefined ? JSON.stringify(body) : undefined,
      });
   } catch {
      throw new ApiError(NETWORK_MESSAGE, 0, null);
   }

   const data = await res.json().catch(() => null);
   if (!res.ok) {
      throw new ApiError(
         data?.message ?? `Request failed (${res.status})`,
         res.status,
         data,
      );
   }
   return data;
   }

   /** Turns any failure into a message a staff member can act on. */
   function describeError(err, fallback) {
   if (!(err instanceof ApiError)) return fallback;
   switch (err.status) {
      case 0:
         return err.message;
      case 401:
      case 419:
         return "Your session has expired. Refresh the page and sign in again.";
      case 403:
         return "You do not have permission to do this.";
      case 404:
         return "This record no longer exists. Refresh the list and try again.";
      case 429:
         return "Too many requests. Wait a moment and try again.";
      default:
         return err.status >= 500
         ? "The server ran into a problem. Please try again in a moment."
         : err.message || fallback;
   }
   }

   /* -------------------------------------------------------------------------- */
   /* Constants                                                                  */
   /* -------------------------------------------------------------------------- */

   const STATUS_STEPS = [
   "Registered",
   "Validated",
   "Referred",
   "Accepted by Maxima",
   "Training Started",
   "Completed",
   ];

   const EDUCATIONAL_ATTAINMENTS = [
   "No Grade Completed",
   "Elementary Undergraduate",
   "Elementary Graduate",
   "High School Undergraduate",
   "High School Graduate",
   "Senior High School Undergraduate",
   "Senior High School Graduate",
   "Vocational / Technical Course",
   "College Undergraduate",
   "College Graduate",
   ];

   // The three pages of the Add / Edit modal
   const FORM_STEPS = [
   { key: "personal", label: "Personal info" },
   { key: "interview", label: "Interview details" },
   { key: "account", label: "Account" },
   ];
   const LAST_STEP = FORM_STEPS.length - 1;

   // Which fields live on which page (drives validation, focus and 422 handling)
   const STEP_FIELDS = [
   [
      "first_name",
      "middle_name",
      "last_name",
      "birthdate",
      "sex",
      "address",
      "contact_number",
   ],
   [
      "educational_attainment",
      "preferred_career",
      "available_schedule",
      "background_circumstances",
      "personal_observations",
      "expressed_goals",
   ],
   ["account.email", "account.password", "account.password_confirmation"],
   ];
   const ALL_FIELDS = STEP_FIELDS.flat();
   const ALWAYS_REQUIRED = [
   "first_name",
   "last_name",
   "birthdate",
   "address",
   "educational_attainment",
   ];

   const NOTE_FIELDS = [
   ["background_circumstances", "Background circumstances"],
   ["personal_observations", "Personal observations"],
   ["expressed_goals", "Expressed goals"],
   ];
   const TEXTAREA_FIELDS = NOTE_FIELDS.map(([name]) => name);

   const EMPTY_FORM = {
   first_name: "",
   middle_name: "",
   last_name: "",
   birthdate: "",
   sex: "male",
   address: "",
   contact_number: "",
   educational_attainment: "",
   preferred_career: "",
   available_schedule: "",
   has_transportation: true,
   background_circumstances: "",
   personal_observations: "",
   expressed_goals: "",
   current_status: "Registered",
   };

   const EMPTY_ACCOUNT = {
   email: "",
   password: "",
   password_confirmation: "",
   };

   const MIN_AGE = 15;
   const MAX_AGE = 30;
   const MAX_NOTES = 1000;

   const NAME_RE = /^\p{L}[\p{L}\p{M}\s.'’-]*$/u;
   const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

   const FOCUSABLE =
   'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

   /* -------------------------------------------------------------------------- */
   /* Pure helpers                                                               */
   /* -------------------------------------------------------------------------- */

   /** <input type="date"> only accepts YYYY-MM-DD, but Laravel may send a full timestamp. */
   const toDateInput = (value) => (value ? String(value).slice(0, 10) : "");

   const pad = (n) => String(n).padStart(2, "0");
   const toISO = (d) =>
   `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

   /** Parses YYYY-MM-DD as a local calendar date (no timezone drift). Null if not a real date. */
   function parseISODate(value) {
   const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(toDateInput(value));
   if (!m) return null;
   const [, y, mo, d] = m.map(Number);
   const date = new Date(y, mo - 1, d);
   if (
      date.getFullYear() !== y ||
      date.getMonth() !== mo - 1 ||
      date.getDate() !== d
   )
      return null;
   return { y, mo, d, date };
   }

   function calculateAge(birthdate) {
   const p = parseISODate(birthdate);
   if (!p) return null;
   const today = new Date();
   let age = today.getFullYear() - p.y;
   if (
      today.getMonth() + 1 < p.mo ||
      (today.getMonth() + 1 === p.mo && today.getDate() < p.d)
   ) {
      age -= 1;
   }
   return age;
   }

   /** Earliest / latest birthdate the date picker should offer. */
   function birthdateBounds() {
   const t = new Date();
   return {
      max: toISO(new Date(t.getFullYear() - MIN_AGE, t.getMonth(), t.getDate())),
      min: toISO(
         new Date(t.getFullYear() - MAX_AGE - 1, t.getMonth(), t.getDate() + 1),
      ),
   };
   }

   /** Accepts 09171234567, +639171234567, 639171234567, 9171234567 (spaces/dashes ignored). */
   function normalizePhone(raw) {
   const v = String(raw ?? "").replace(/[\s()-]/g, "");
   if (/^\+639\d{9}$/.test(v)) return `0${v.slice(3)}`;
   if (/^639\d{9}$/.test(v)) return `0${v.slice(2)}`;
   if (/^9\d{9}$/.test(v)) return `0${v}`;
   return v;
   }

   function fullName(osy) {
   return [osy.first_name, osy.middle_name, osy.last_name]
      .filter(Boolean)
      .join(" ");
   }

   const sexLabel = (sex) => (sex === "male" ? "Male" : "Female");
   const norm = (s) =>
   String(s ?? "")
      .trim()
      .toLowerCase();
   const fieldId = (field) => `osy-${field.replace(".", "-")}`;

   function stepForField(field) {
   const i = STEP_FIELDS.findIndex((list) => list.includes(field));
   if (i !== -1) return i;
   return field.startsWith("account") ? 2 : 1;
   }

   /** Cleans a value the way a careful clerk would: trimmed, single spaces, tidy phone/email. */
   function tidyValue(field, value) {
   if (typeof value !== "string" || field.includes("password")) return value;
   if (TEXTAREA_FIELDS.includes(field)) return value.trim();
   if (field === "contact_number") return normalizePhone(value);
   const t = value.replace(/\s+/g, " ").trim();
   return field === "account.email" ? t.toLowerCase() : t;
   }

   /** Maps an API record onto the form's fields. */
   function profileToForm(osy) {
   return {
      first_name: osy.first_name ?? "",
      middle_name: osy.middle_name ?? "",
      last_name: osy.last_name ?? "",
      birthdate: toDateInput(osy.birthdate),
      sex: osy.sex ?? "male",
      address: osy.address ?? "",
      contact_number: osy.contact_number ?? "",
      educational_attainment: osy.educational_attainment ?? "",
      preferred_career: osy.preferred_career ?? "",
      available_schedule: osy.available_schedule ?? "",
      has_transportation: Boolean(osy.has_transportation),
      background_circumstances: osy.background_circumstances ?? "",
      personal_observations: osy.personal_observations ?? "",
      expressed_goals: osy.expressed_goals ?? "",
      current_status: osy.current_status ?? "Registered",
   };
   }

   /* -------------------------------------------------------------------------- */
   /* Validation (mirrors the Laravel rules so users hear about problems early)  */
   /* -------------------------------------------------------------------------- */

   function validateName(value, label, { required, min }) {
   const v = String(value ?? "").trim();
   if (!v) return required ? `${label} is required.` : null;
   if (v.length < min) return `${label} must be at least ${min} characters.`;
   if (v.length > 50) return `${label} must be 50 characters or fewer.`;
   if (!NAME_RE.test(v)) {
      return `${label} can only contain letters, spaces, hyphens, apostrophes and periods.`;
   }
   return null;
   }

   function validateBirthdate(value) {
   if (!toDateInput(value)) return "Birthdate is required.";
   const p = parseISODate(value);
   if (!p || p.y < 1900) return "Enter a valid birthdate.";
   if (p.date > new Date()) return "Birthdate cannot be in the future.";
   const age = calculateAge(value);
   if (age < MIN_AGE || age > MAX_AGE) {
      return `OSY must be between ${MIN_AGE} and ${MAX_AGE} years old (this person is ${age}).`;
   }
   return null;
   }

   function validatePhone(value) {
   const raw = String(value ?? "").trim();
   if (!raw) return null; // optional
   const compact = raw.replace(/[\s()-]/g, "");
   if (/[^\d+]/.test(compact))
      return "Use numbers only, with no letters or symbols.";
   const n = normalizePhone(compact);
   if (n.startsWith("+"))
      return "Use +63 followed by 10 digits (for example, +63 917 123 4567), or start with 09.";
   if (!n.startsWith("09"))
      return "Philippine mobile numbers start with 09 (for example, 09171234567).";
   if (n.length !== 11)
      return `Mobile numbers have 11 digits. This one has ${n.length}.`;
   return null;
   }

   function validatePassword(value) {
   if (!value) return "Password is required.";
   if (value.length < 8) return "Password must be at least 8 characters.";
   if (value.length > 72) return "Password must be 72 characters or fewer.";
   if (!/[A-Za-z]/.test(value) || !/\d/.test(value))
      return "Include at least one letter and one number.";
   return null;
   }

   function validateField(field, { form, account, accountRequired }) {
   switch (field) {
      case "first_name":
         return validateName(form.first_name, "First name", {
         required: true,
         min: 2,
         });
      case "middle_name":
         return validateName(form.middle_name, "Middle name", {
         required: false,
         min: 1,
         });
      case "last_name":
         return validateName(form.last_name, "Last name", {
         required: true,
         min: 2,
         });
      case "birthdate":
         return validateBirthdate(form.birthdate);
      case "address": {
         const v = form.address.trim();
         if (!v) return "Address is required.";
         if (v.length < 5)
         return "Enter a complete address (at least 5 characters).";
         if (v.length > 255) return "Address must be 255 characters or fewer.";
         return null;
      }
      case "contact_number":
         return validatePhone(form.contact_number);
      case "educational_attainment":
         return form.educational_attainment
         ? null
         : "Select the highest level completed.";
      case "preferred_career":
      case "available_schedule":
         return form[field].length > 255
         ? "Keep this under 255 characters."
         : null;
      case "background_circumstances":
      case "personal_observations":
      case "expressed_goals":
         return form[field].length > MAX_NOTES
         ? `Keep this under ${MAX_NOTES} characters.`
         : null;
      case "account.email": {
         if (!accountRequired) return null;
         const v = account.email.trim();
         if (!v) return "Email is required.";
         if (!EMAIL_RE.test(v))
         return "Enter a valid email address (for example, name@example.com).";
         if (v.length > 255) return "Email must be 255 characters or fewer.";
         return null;
      }
      case "account.password":
         return accountRequired ? validatePassword(account.password) : null;
      case "account.password_confirmation":
         if (!accountRequired) return null;
         if (!account.password_confirmation)
         return "Re-enter the password to confirm it.";
         return account.password === account.password_confirmation
         ? null
         : "Passwords do not match.";
      default:
         return null;
   }
   }

   /* -------------------------------------------------------------------------- */
   /* Small presentational components                                            */
   /* -------------------------------------------------------------------------- */

   function Field({ id, label, required, error, hint, counter, extra, children }) {
   return (
      <div className="bosyField">
         <label htmlFor={id}>
         {label}
         {required && (
            <span className="bosyReq" aria-hidden="true">
               {" "}
               *
            </span>
         )}
         </label>
         {children}
         {(error || hint || counter) && (
         <div className="bosyFieldMeta">
            {error ? (
               <span id={`${id}-error`} className="bosyFieldError" role="alert">
               {error}
               </span>
            ) : (
               <span className="bosyHint">{hint}</span>
            )}
            {counter && <span className="bosyCounter">{counter}</span>}
         </div>
         )}
         {extra}
      </div>
   );
   }

   function PasswordStrength({ password }) {
   if (!password) return null;
   const checks = [
      password.length >= 8,
      /[A-Za-z]/.test(password) && /\d/.test(password),
      password.length >= 12,
      (/[a-z]/.test(password) && /[A-Z]/.test(password)) ||
         /[^A-Za-z0-9]/.test(password),
   ];
   const score = checks[0] ? checks.filter(Boolean).length : 0;
   const label = ["Too weak", "Weak", "Fair", "Good", "Strong"][score];

   return (
      <div className="bosyStrength" aria-live="polite">
         <div
         className={`bosyStrength__bar bosyStrength__bar--${score}`}
         aria-hidden="true"
         >
         {[0, 1, 2, 3].map((i) => (
            <span key={i} className={i < score ? "on" : ""} />
         ))}
         </div>
         <span>Strength: {label}</span>
      </div>
   );
   }

   function StatusBadge({ status }) {
   return (
      <span className={`bosyStatus bosyStatus--${status?.replace(/\s+/g, "")}`}>
         {status}
      </span>
   );
   }

   function Modal({ titleId, size = "Large", onClose, children }) {
   const dialogRef = useRef(null);

   // Move focus in on open, give it back on close
   useEffect(() => {
      const previouslyFocused = document.activeElement;
      dialogRef.current?.focus();
      return () => previouslyFocused?.focus?.();
   }, []);

   // Keep Tab / Shift+Tab inside the dialog
   function handleKeyDown(e) {
      if (e.key !== "Tab") return;
      const nodes = dialogRef.current.querySelectorAll(FOCUSABLE);
      if (!nodes.length) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement;

      if (e.shiftKey && (active === first || active === dialogRef.current)) {
         e.preventDefault();
         last.focus();
      } else if (!e.shiftKey && active === last) {
         e.preventDefault();
         first.focus();
      }
   }

   return (
      <div className="bosyModalOverlay" onClick={onClose}>
         <div
         ref={dialogRef}
         tabIndex={-1}
         className={`bosyModal bosyModal${size}`}
         role="dialog"
         aria-modal="true"
         aria-labelledby={titleId}
         onClick={(e) => e.stopPropagation()}
         onKeyDown={handleKeyDown}
         >
         {children}
         </div>
      </div>
   );
   }

   function DetailItem({ label, value }) {
   return (
      <div>
         <dt>{label}</dt>
         <dd>{value || "—"}</dd>
      </div>
   );
   }

   function NotesBlock({ title, text }) {
   return (
      <div className="bosyNotesBlock">
         <h4>{title}</h4>
         <p>{text || "—"}</p>
      </div>
   );
   }

   /* -------------------------------------------------------------------------- */
   /* Course suggestions (keyword matching, runs on your own server)             */
   /* -------------------------------------------------------------------------- */

   function RecommendedCourses({ osyId, draft }) {
   const [items, setItems] = useState([]);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(null);

   // Re-run when the saved record changes, or (debounced) when the draft answers change
   const key = osyId ?? JSON.stringify(draft);

   useEffect(() => {
      let cancelled = false;

      const timer = setTimeout(
         async () => {
         setLoading(true);
         setError(null);
         try {
            const body = osyId
               ? await apiFetch(`${OSY_ENDPOINT}/${osyId}/recommendations`)
               : await apiFetch("/api/osy-recommendations/preview", {
                  method: "POST",
                  body: draft,
               });
            if (!cancelled) setItems(body.data ?? []);
         } catch (err) {
            if (!cancelled) {
               setItems([]);
               setError(describeError(err, "Could not load course suggestions."));
            }
         } finally {
            if (!cancelled) setLoading(false);
         }
         },
         osyId ? 0 : 700,
      );

      return () => {
         cancelled = true;
         clearTimeout(timer);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [key]);

   const basedOn = items[0]?.based_on;
   const note =
      basedOn === "preferred_career"
         ? "Best match for the preferred career entered. This is a suggestion for the SK official to review, not a final placement."
         : basedOn === "interview_notes"
         ? "Matched from the interview notes (goals, observations, background). These are suggestions for the SK official to review, not a final placement."
         : "Matched from the interview answers. These are suggestions for the SK official to review, not a final placement.";

   return (
      <div className="bosyFormSection bosyRecs">
         <h3>Suggested Courses</h3>
         <p className="bosyFormSectionNote">{note}</p>

         {loading ? (
         <div className="bosyEmpty">Finding matches…</div>
         ) : error ? (
         <div className="bosyBanner bosyBannerError" role="alert">
            {error}
         </div>
         ) : items.length === 0 ? (
         <div className="bosyEmpty">
            No related course found. Add a preferred career, or fill in the goals
            and observations, to see suggestions.
         </div>
         ) : (
         <ul className="bosyRecList">
            {items.map((c) => (
               <li key={c.id} className="bosyRecItem">
               {c.based_on === "preferred_career" ? (
                  <span className="bosyRecBest">Best match</span>
               ) : (
                  <span className="bosyRecRank">#{c.rank}</span>
               )}
               <div className="bosyRecInfo">
                  <strong>{c.title}</strong>
                  <span className="bosyRecWhy">
                     Matched: {c.matched.join(", ")}
                  </span>
               </div>
               </li>
            ))}
         </ul>
         )}
      </div>
   );
   }

   /* -------------------------------------------------------------------------- */
   /* Page                                                                       */
   /* -------------------------------------------------------------------------- */

   function BarangayOsyManagement() {
   // List
   const [osyRecords, setOsyRecords] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [notice, setNotice] = useState(null);
   const [search, setSearch] = useState("");
   const [statusFilter, setStatusFilter] = useState("all");

   // Add / Edit wizard
   const [isModalOpen, setIsModalOpen] = useState(false);
   const [editingId, setEditingId] = useState(null);
   const [form, setForm] = useState(EMPTY_FORM);
   const [account, setAccount] = useState(EMPTY_ACCOUNT);
   const [existingAccountEmail, setExistingAccountEmail] = useState(null);
   const [step, setStep] = useState(0);
   const [showPassword, setShowPassword] = useState(false);
   const [saving, setSaving] = useState(false);
   const [formError, setFormError] = useState(null);
   const [touched, setTouched] = useState({});
   const [serverErrors, setServerErrors] = useState({});
   const [discardPrompt, setDiscardPrompt] = useState(false);
   const [focusTarget, setFocusTarget] = useState(null);
   const initialSnapshot = useRef("");
   const formRef = useRef(null);

   // View / Delete
   const [viewTarget, setViewTarget] = useState(null);
   const [deleteTarget, setDeleteTarget] = useState(null);
   const [deleting, setDeleting] = useState(false);

   const bounds = useMemo(birthdateBounds, []);

   /* ---- data loading ---- */

   const fetchOsyRecords = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
         const data = await apiFetch(OSY_ENDPOINT);
         setOsyRecords(data.data ?? data);
      } catch (err) {
         setError(
         err.status === 403
            ? "You do not have permission to view OSY records."
            : describeError(err, "Could not load OSY records."),
         );
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      fetchOsyRecords();
   }, [fetchOsyRecords]);

   // Success messages disappear on their own
   useEffect(() => {
      if (!notice) return undefined;
      const timer = setTimeout(() => setNotice(null), 4000);
      return () => clearTimeout(timer);
   }, [notice]);

   const visibleRecords = useMemo(() => {
      const term = search.trim().toLowerCase();
      return osyRecords.filter((osy) => {
         const matchesSearch =
         !term ||
         fullName(osy).toLowerCase().includes(term) ||
         osy.address?.toLowerCase().includes(term) ||
         osy.educational_attainment?.toLowerCase().includes(term);
         const matchesStatus =
         statusFilter === "all" || osy.current_status === statusFilter;
         return matchesSearch && matchesStatus;
      });
   }, [osyRecords, search, statusFilter]);

   /* ---- validation state ---- */

   // An account is needed for new OSYs, and for existing ones only if the official starts filling it in
   const accountRequired =
      !existingAccountEmail &&
      (!editingId || Object.values(account).some(Boolean));

   const clientErrors = useMemo(() => {
      const ctx = { form, account, accountRequired };
      const out = {};
      ALL_FIELDS.forEach((f) => {
         const msg = validateField(f, ctx);
         if (msg) out[f] = msg;
      });
      return out;
   }, [form, account, accountRequired]);

   const valueOf = (field) =>
      field.startsWith("account.") ? account[field.slice(8)] : form[field];

   // Server errors always show; client errors show once the field has been visited
   const errorFor = (field) =>
      serverErrors[field] ?? (touched[field] ? clientErrors[field] : undefined);

   const isRequired = (field) =>
      field.startsWith("account.")
         ? accountRequired
         : ALWAYS_REQUIRED.includes(field);

   const fieldProps = (field) => ({
      id: fieldId(field),
      required: isRequired(field),
      error: errorFor(field),
   });

   const stepHasError = (i) => STEP_FIELDS[i].some((f) => errorFor(f));

   const duplicate = useMemo(() => {
      if (
         !isModalOpen ||
         !form.first_name.trim() ||
         !form.last_name.trim() ||
         !form.birthdate
      )
         return null;
      return (
         osyRecords.find(
         (o) =>
            o.id !== editingId &&
            norm(o.first_name) === norm(form.first_name) &&
            norm(o.last_name) === norm(form.last_name) &&
            toDateInput(o.birthdate) === form.birthdate,
         ) ?? null
      );
   }, [
      isModalOpen,
      osyRecords,
      editingId,
      form.first_name,
      form.last_name,
      form.birthdate,
   ]);

   /* ---- field handlers ---- */

   function touch(field) {
      setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
   }

   function handleChange(field, value) {
      let next = value;
      if (field === "contact_number")
         next = String(value).replace(/[^\d+\s()-]/g, "");

      if (field.startsWith("account.")) {
         setAccount((prev) => ({ ...prev, [field.slice(8)]: next }));
      } else {
         setForm((prev) => ({ ...prev, [field]: next }));
      }

      // Editing a field clears the server's complaint about it
      setServerErrors((prev) => {
         if (!prev[field]) return prev;
         const rest = { ...prev };
         delete rest[field];
         return rest;
      });
      setFormError(null);

      // Birthdate is checked as soon as a plausible full date is picked
      if (field === "birthdate" && (parseISODate(next)?.y ?? 0) >= 1900)
         touch("birthdate");
      // Keep the confirm-password message in step with the password
      if (field === "account.password" && account.password_confirmation) {
         touch("account.password_confirmation");
      }
   }

   function handleBlur(field) {
      const current = valueOf(field);
      const tidy = tidyValue(field, current);
      if (tidy !== current) handleChange(field, tidy);
      touch(field);
   }

   // Shorthand for inputs: <input {...bind('first_name')} />
   const bind = (field) => {
      const err = errorFor(field);
      return {
         id: fieldId(field),
         value: valueOf(field),
         onChange: (e) => handleChange(field, e.target.value),
         onBlur: () => handleBlur(field),
         "aria-invalid": err ? "true" : undefined,
         "aria-describedby": err ? `${fieldId(field)}-error` : undefined,
         "aria-required": isRequired(field) || undefined,
      };
   };

   /* ---- wizard state ---- */

   function resetWizard() {
      setStep(0);
      setFormError(null);
      setTouched({});
      setServerErrors({});
      setShowPassword(false);
      setDiscardPrompt(false);
      setAccount(EMPTY_ACCOUNT);
      setExistingAccountEmail(null);
   }

   function openAddModal() {
      resetWizard();
      setEditingId(null);
      setForm(EMPTY_FORM);
      initialSnapshot.current = JSON.stringify({
         form: EMPTY_FORM,
         account: EMPTY_ACCOUNT,
      });
      setIsModalOpen(true);
      setFocusTarget({ name: "first_name" });
   }

   function openEditModal(osy) {
      resetWizard();
      const initialForm = profileToForm(osy);
      setEditingId(osy.id);
      setForm(initialForm);
      initialSnapshot.current = JSON.stringify({
         form: initialForm,
         account: EMPTY_ACCOUNT,
      });
      // Assumes the API returns the linked user as `osy.user`
      setExistingAccountEmail(osy.user?.email ?? null);
      setIsModalOpen(true);
      setFocusTarget({ name: "first_name" });
   }

   const isDirty =
      isModalOpen &&
      JSON.stringify({ form, account }) !== initialSnapshot.current;

   function requestClose() {
      if (saving) return;
      if (isDirty) setDiscardPrompt(true);
      else setIsModalOpen(false);
   }

   function discardAndClose() {
      setDiscardPrompt(false);
      setIsModalOpen(false);
   }

   // Browser warning if the tab is closed with unsaved changes
   useEffect(() => {
      if (!isDirty) return undefined;
      const warn = (e) => {
         e.preventDefault();
         e.returnValue = "";
      };
      window.addEventListener("beforeunload", warn);
      return () => window.removeEventListener("beforeunload", warn);
   }, [isDirty]);

   // Escape closes whichever dialog is on top
   useEffect(() => {
      function onKeyDown(e) {
         if (e.key !== "Escape") return;
         if (deleteTarget) setDeleteTarget(null);
         else if (discardPrompt) setDiscardPrompt(false);
         else if (viewTarget) setViewTarget(null);
         else if (isModalOpen) requestClose();
      }
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
   });

   // Moves keyboard focus after a step change or a failed validation
   useEffect(() => {
      if (!focusTarget) return;
      const el =
         document.getElementById(fieldId(focusTarget.name)) ||
         formRef.current?.querySelector(
         'input:not([type="checkbox"]), select, textarea',
         );
      el?.focus();
   }, [focusTarget]);

   /* ---- wizard navigation ---- */

   function gotoStep(next, focusName) {
      setStep(next);
      setFocusTarget({ name: focusName ?? STEP_FIELDS[next][0] });
   }

   const countLabel = (n) =>
      n === 1 ? "the highlighted field" : `${n} highlighted fields`;

   // Marks this page's fields as visited and reports the first problem
   function validateStep(index) {
      const fields = STEP_FIELDS[index];
      setTouched((prev) => ({
         ...prev,
         ...Object.fromEntries(fields.map((f) => [f, true])),
      }));

      const bad = fields.filter((f) => clientErrors[f]);
      if (bad.length) {
         setFormError(`Please fix ${countLabel(bad.length)} before continuing.`);
         setFocusTarget({ name: bad[0] });
         return false;
      }
      setFormError(null);
      return true;
   }

   function goNext() {
      if (!validateStep(step)) return;
      gotoStep(Math.min(step + 1, LAST_STEP));
   }

   function goBack() {
      setFormError(null);
      gotoStep(Math.max(step - 1, 0));
   }

   // Let people click back to a page they've already visited
   function goToStep(target) {
      if (target < step) {
         setFormError(null);
         gotoStep(target);
      }
   }

   /* ---- save / delete ---- */

   async function handleSubmit(e) {
      e.preventDefault();
      if (saving) return;

      // Pressing Enter inside a field should advance, not save early
      if (step < LAST_STEP) {
         goNext();
         return;
      }

      // Final check across every page, in case an earlier page was edited
      setTouched(Object.fromEntries(ALL_FIELDS.map((f) => [f, true])));
      const bad = ALL_FIELDS.filter((f) => clientErrors[f]);
      if (bad.length) {
         gotoStep(stepForField(bad[0]), bad[0]);
         setFormError(`Please fix ${countLabel(bad.length)} before saving.`);
         return;
      }

      setSaving(true);
      setFormError(null);
      setServerErrors({});

      const url = editingId ? `${OSY_ENDPOINT}/${editingId}` : OSY_ENDPOINT;
      const method = editingId ? "PUT" : "POST";

      const payload = Object.fromEntries(
         Object.entries(form).map(([key, value]) => [key, tidyValue(key, value)]),
      );
      // Only send account details when an account is being created
      if (accountRequired) {
         payload.account = {
         email: tidyValue("account.email", account.email),
         password: account.password,
         password_confirmation: account.password_confirmation,
         };
      }

      try {
         await apiFetch(url, { method, body: payload });
         setIsModalOpen(false);
         setNotice(editingId ? "OSY record updated." : "OSY record registered.");
         await fetchOsyRecords();
      } catch (err) {
         // Laravel validation errors: { message, errors: { field: [msg] } }
         if (err instanceof ApiError && err.status === 422 && err.body?.errors) {
         const flat = Object.fromEntries(
            Object.entries(err.body.errors).map(([field, msgs]) => [
               field,
               Array.isArray(msgs) ? msgs[0] : msgs,
            ]),
         );
         const keys = Object.keys(flat);
         setServerErrors(flat);
         gotoStep(stepForField(keys[0]), keys[0]);
         setFormError(
            keys.length > 1
               ? `The server rejected ${keys.length} fields. Fix them and save again.`
               : flat[keys[0]],
         );
         } else {
         setFormError(describeError(err, "Could not save this OSY record."));
         }
      } finally {
         setSaving(false);
      }
   }

   async function confirmDelete() {
      if (!deleteTarget || deleting) return;
      setDeleting(true);
      try {
         await apiFetch(`${OSY_ENDPOINT}/${deleteTarget.id}`, {
         method: "DELETE",
         });
         setOsyRecords((prev) => prev.filter((o) => o.id !== deleteTarget.id));
         setNotice("OSY record removed.");
      } catch (err) {
         setError(describeError(err, "Could not remove this OSY record."));
      } finally {
         setDeleting(false);
         setDeleteTarget(null);
      }
   }

   /* ---- render ---- */

   const age = calculateAge(form.birthdate);

   return (
      <>
         <div className="barangayOsyManagementBody">
         <SkOfficialSideBar />

         <div className="barangayMainContent">
            <div className="barangayMainContentTopPart">
               <h1>OSY Management</h1>
               <p>Manage and view all Out-of-school youth in your barangay</p>
            </div>

            <div className="barangayMainContentBotPart">
               <div className="searchAndAddOsy">
               <input
                  type="text"
                  className="osySearchInput"
                  placeholder="Search by name, address, or education..."
                  aria-label="Search OSY records"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
               />

               <select
                  className="osyStatusFilter"
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
               >
                  <option value="all">All Statuses</option>
                  {STATUS_STEPS.map((s) => (
                     <option key={s} value={s}>
                     {s}
                     </option>
                  ))}
               </select>

               <button
                  type="button"
                  className="osyAddBtn"
                  onClick={openAddModal}
               >
                  + Add OSY
               </button>
               </div>

               <div className="osyList">
               {notice && (
                  <div className="bosyBanner bosyBannerInfo" role="status">
                     {notice}
                  </div>
               )}
               {error && (
                  <div className="bosyBanner bosyBannerError" role="alert">
                     {error}
                  </div>
               )}

               {loading ? (
                  <div className="bosyEmpty">Loading OSY records…</div>
               ) : visibleRecords.length === 0 ? (
                  <div className="bosyEmpty">
                     <p>No OSY records found.</p>
                     <span>
                     Try a different search term or status, or register a new
                     OSY.
                     </span>
                  </div>
               ) : (
                  <>
                     <p className="osyCount">
                     Showing {visibleRecords.length} of {osyRecords.length}{" "}
                     records
                     </p>
                     <table className="osyTable">
                     <thead>
                        <tr>
                           <th scope="col">Name</th>
                           <th scope="col">Age / Sex</th>
                           <th scope="col">Address</th>
                           <th scope="col">Educational Attainment</th>
                           <th scope="col">Status</th>
                           <th scope="col" aria-label="Actions"></th>
                        </tr>
                     </thead>
                     <tbody>
                        {visibleRecords.map((osy) => (
                           <tr key={osy.id}>
                           <td className="osyTable__name">{fullName(osy)}</td>
                           <td>
                              {calculateAge(osy.birthdate) ?? "—"} /{" "}
                              {sexLabel(osy.sex)}
                           </td>
                           <td className="osyTable__address">{osy.address}</td>
                           <td>{osy.educational_attainment || "—"}</td>
                           <td>
                              <StatusBadge status={osy.current_status} />
                           </td>
                           <td className="osyTable__actions">
                              <button
                                 type="button"
                                 className="osyViewBtn"
                                 onClick={() => setViewTarget(osy)}
                              >
                                 View
                              </button>
                              <button
                                 type="button"
                                 className="osyEditBtn"
                                 onClick={() => openEditModal(osy)}
                              >
                                 Edit
                              </button>
                              <button
                                 type="button"
                                 className="osyDeleteBtn"
                                 onClick={() => setDeleteTarget(osy)}
                              >
                                 Remove
                              </button>
                           </td>
                           </tr>
                        ))}
                     </tbody>
                     </table>
                  </>
               )}
               </div>
            </div>
         </div>
         </div>

         {/* Add / Edit modal (3 pages). Clicking outside does not close it, so a
               misclick can't discard a half-filled form. */}
         {isModalOpen && (
         <Modal titleId="osyFormTitle">
            <h2 id="osyFormTitle">
               {editingId ? "Edit OSY Record" : "Register New OSY"}
            </h2>
            <p className="bosyModalHint">Fields marked * are required.</p>

            <ol className="bosyStepper" aria-label="Form progress">
               {FORM_STEPS.map((s, i) => {
               const state = i === step ? "active" : i < step ? "done" : "todo";
               const invalid = stepHasError(i);
               return (
                  <li
                     key={s.key}
                     className={`bosyStepper__item bosyStepper__item--${state}${invalid ? " bosyStepper__item--error" : ""}`}
                  >
                     <button
                     type="button"
                     className="bosyStepper__btn"
                     onClick={() => goToStep(i)}
                     disabled={i >= step}
                     aria-current={i === step ? "step" : undefined}
                     >
                     <span className="bosyStepper__dot">
                        {invalid ? "!" : i < step ? "✓" : i + 1}
                     </span>
                     <span className="bosyStepper__label">{s.label}</span>
                     </button>
                  </li>
               );
               })}
            </ol>

            <form
               ref={formRef}
               onSubmit={handleSubmit}
               className="bosyForm"
               noValidate
            >
               {/* Page 1: Personal info */}
               {step === 0 && (
               <div className="bosyFormSection">
                  <h3>Personal Information</h3>

                  <div className="bosyFormRow bosyFormRow--3">
                     <Field label="First name" {...fieldProps("first_name")}>
                     <input
                        type="text"
                        autoComplete="off"
                        maxLength={50}
                        {...bind("first_name")}
                     />
                     </Field>
                     <Field label="Middle name" {...fieldProps("middle_name")}>
                     <input
                        type="text"
                        autoComplete="off"
                        maxLength={50}
                        {...bind("middle_name")}
                     />
                     </Field>
                     <Field label="Last name" {...fieldProps("last_name")}>
                     <input
                        type="text"
                        autoComplete="off"
                        maxLength={50}
                        {...bind("last_name")}
                     />
                     </Field>
                  </div>

                  <div className="bosyFormRow">
                     <Field
                     label="Birthdate"
                     {...fieldProps("birthdate")}
                     hint={
                        age !== null && !errorFor("birthdate")
                           ? `Age: ${age}`
                           : `Must be ${MIN_AGE} to ${MAX_AGE} years old.`
                     }
                     >
                     <input
                        type="date"
                        min={bounds.min}
                        max={bounds.max}
                        {...bind("birthdate")}
                     />
                     </Field>
                     <Field label="Sex" id={fieldId("sex")}>
                     <select
                        id={fieldId("sex")}
                        value={form.sex}
                        onChange={(e) => handleChange("sex", e.target.value)}
                     >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                     </select>
                     </Field>
                  </div>

                  {duplicate && (
                     <div className="bosyBanner bosyBannerWarn" role="status">
                     A record for {fullName(duplicate)} with this birthdate
                     already exists. Check the list first to avoid registering
                     the same person twice.
                     </div>
                  )}

                  <Field
                     label="Address"
                     {...fieldProps("address")}
                     hint="Purok / street, barangay, municipality."
                  >
                     <input
                     type="text"
                     autoComplete="off"
                     maxLength={255}
                     {...bind("address")}
                     />
                  </Field>

                  <Field
                     label="Contact number"
                     {...fieldProps("contact_number")}
                     hint="Mobile number, for example 09171234567."
                  >
                     <input
                     type="tel"
                     inputMode="tel"
                     autoComplete="off"
                     maxLength={16}
                     placeholder="09XXXXXXXXX"
                     {...bind("contact_number")}
                     />
                  </Field>
               </div>
               )}

               {/* Page 2: Interview details */}
               {step === 1 && (
               <>
                  <div className="bosyFormSection">
                     <h3>Background &amp; Interests</h3>

                     <Field
                     label="Educational attainment"
                     {...fieldProps("educational_attainment")}
                     >
                     <select {...bind("educational_attainment")}>
                        <option value="">Select educational attainment</option>
                        {/* Keeps old free-text values visible when editing existing records */}
                        {form.educational_attainment &&
                           !EDUCATIONAL_ATTAINMENTS.includes(
                           form.educational_attainment,
                           ) && (
                           <option value={form.educational_attainment}>
                              {form.educational_attainment}
                           </option>
                           )}
                        {EDUCATIONAL_ATTAINMENTS.map((level) => (
                           <option key={level} value={level}>
                           {level}
                           </option>
                        ))}
                     </select>
                     </Field>

                     <div className="bosyFormRow">
                     <Field
                        label="Preferred career"
                        {...fieldProps("preferred_career")}
                     >
                        <input
                           type="text"
                           maxLength={255}
                           {...bind("preferred_career")}
                        />
                     </Field>
                     <Field
                        label="Available schedule"
                        {...fieldProps("available_schedule")}
                     >
                        <input
                           type="text"
                           maxLength={255}
                           placeholder="e.g. Weekdays, mornings"
                           {...bind("available_schedule")}
                        />
                     </Field>
                     </div>

                     <label className="bosyCheckboxLabel">
                     <input
                        type="checkbox"
                        checked={form.has_transportation}
                        onChange={(e) =>
                           handleChange("has_transportation", e.target.checked)
                        }
                     />
                     Has access to transportation
                     </label>
                  </div>

                  <div className="bosyFormSection">
                     <h3>Interview Notes</h3>
                     <p className="bosyFormSectionNote">
                     Gathered directly from the OSY during registration.
                     </p>

                     {NOTE_FIELDS.map(([name, label]) => (
                     <Field
                        key={name}
                        label={label}
                        {...fieldProps(name)}
                        counter={`${form[name].length}/${MAX_NOTES}`}
                     >
                        <textarea
                           rows={3}
                           maxLength={MAX_NOTES}
                           {...bind(name)}
                        />
                     </Field>
                     ))}
                  </div>

                  <RecommendedCourses
                     draft={{
                     preferred_career: form.preferred_career,
                     expressed_goals: form.expressed_goals,
                     personal_observations: form.personal_observations,
                     background_circumstances: form.background_circumstances,
                     }}
                  />

                  <div className="bosyFormSection">
                     <h3>Status</h3>
                     <Field label="Current status" id={fieldId("current_status")}>
                     <select
                        id={fieldId("current_status")}
                        value={form.current_status}
                        onChange={(e) =>
                           handleChange("current_status", e.target.value)
                        }
                     >
                        {STATUS_STEPS.map((s) => (
                           <option key={s} value={s}>
                           {s}
                           </option>
                        ))}
                     </select>
                     </Field>
                  </div>
               </>
               )}

               {/* Page 3: Review + Account */}
               {step === 2 && (
               <>
                  <div className="bosyFormSection">
                     <h3>Review</h3>
                     <dl className="bosyDetailGrid bosyReview">
                     <DetailItem label="Name" value={fullName(form)} />
                     <DetailItem
                        label="Age / sex"
                        value={`${age ?? "—"} / ${sexLabel(form.sex)}`}
                     />
                     <DetailItem
                        label="Contact number"
                        value={normalizePhone(form.contact_number)}
                     />
                     <DetailItem
                        label="Educational attainment"
                        value={form.educational_attainment}
                     />
                     </dl>
                  </div>

                  <div className="bosyFormSection">
                     <h3>OSY Account</h3>

                     {existingAccountEmail ? (
                     <div className="bosyBanner bosyBannerInfo">
                        {fullName(form)} already has an account (
                        {existingAccountEmail}).
                     </div>
                     ) : (
                     <>
                        <p className="bosyFormSectionNote">
                           {editingId
                           ? "This OSY has no account yet. Leave these blank to skip, or fill them in to create one."
                           : "This lets the OSY sign in to the system. Share the email and password with them after saving."}
                        </p>

                        <Field label="Email" {...fieldProps("account.email")}>
                           <input
                           type="email"
                           autoComplete="off"
                           maxLength={255}
                           {...bind("account.email")}
                           />
                        </Field>

                        <div className="bosyFormRow">
                           <Field
                           label="Password"
                           {...fieldProps("account.password")}
                           hint="At least 8 characters, with letters and numbers."
                           extra={
                              <PasswordStrength password={account.password} />
                           }
                           >
                           <input
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              maxLength={72}
                              {...bind("account.password")}
                           />
                           </Field>
                           <Field
                           label="Confirm password"
                           {...fieldProps("account.password_confirmation")}
                           hint={
                              account.password_confirmation &&
                              account.password === account.password_confirmation
                                 ? "Passwords match."
                                 : undefined
                           }
                           >
                           <input
                              type={showPassword ? "text" : "password"}
                              autoComplete="new-password"
                              maxLength={72}
                              {...bind("account.password_confirmation")}
                           />
                           </Field>
                        </div>

                        <label className="bosyCheckboxLabel">
                           <input
                           type="checkbox"
                           checked={showPassword}
                           onChange={(e) => setShowPassword(e.target.checked)}
                           />
                           Show password
                        </label>
                     </>
                     )}
                  </div>
               </>
               )}

               {formError && (
               <div className="bosyBanner bosyBannerError" role="alert">
                  {formError}
               </div>
               )}

               <div className="bosyModalActions">
               <button
                  type="button"
                  className="bosyBtn bosyBtnGhost"
                  onClick={requestClose}
                  disabled={saving}
               >
                  Cancel
               </button>

               {step > 0 && (
                  <button
                     key="back"
                     type="button"
                     className="bosyBtn bosyBtnGhost"
                     onClick={goBack}
                     disabled={saving}
                  >
                     Back
                  </button>
               )}

               {step < LAST_STEP ? (
                  <button
                     key="next"
                     type="button"
                     className="bosyBtn bosyBtnPrimary"
                     onClick={goNext}
                  >
                     Next
                  </button>
               ) : (
                  <button
                     key="submit"
                     type="submit"
                     className="bosyBtn bosyBtnPrimary"
                     disabled={saving}
                  >
                     {saving
                     ? "Saving…"
                     : editingId
                        ? "Save changes"
                        : "Register OSY"}
                  </button>
               )}
               </div>
            </form>
         </Modal>
         )}

         {/* Unsaved-changes confirmation (sits above the form modal) */}
         {discardPrompt && (
         <Modal titleId="osyDiscardTitle" size="Small">
            <h2 id="osyDiscardTitle">Discard your changes?</h2>
            <p>
               You have unsaved information in this form. If you close it now, that
               information will be lost.
            </p>
            <div className="bosyModalActions">
               <button
               type="button"
               className="bosyBtn bosyBtnGhost"
               onClick={() => setDiscardPrompt(false)}
               autoFocus
               >
               Keep editing
               </button>
               <button
               type="button"
               className="bosyBtn bosyBtnDanger"
               onClick={discardAndClose}
               >
               Discard changes
               </button>
            </div>
         </Modal>
         )}

         {/* View profile modal */}
         {viewTarget && (
         <Modal titleId="osyViewTitle" onClose={() => setViewTarget(null)}>
            <div className="bosyViewHeader">
               <div>
               <h2 id="osyViewTitle">{fullName(viewTarget)}</h2>
               <span className="bosyViewSubline">
                  {calculateAge(viewTarget.birthdate) ?? "—"} years old ·{" "}
                  {sexLabel(viewTarget.sex)}
               </span>
               </div>
               <StatusBadge status={viewTarget.current_status} />
            </div>

            <dl className="bosyDetailGrid">
               <DetailItem label="Address" value={viewTarget.address} />
               <DetailItem
               label="Contact number"
               value={viewTarget.contact_number}
               />
               <DetailItem
               label="Educational attainment"
               value={viewTarget.educational_attainment}
               />
               <DetailItem
               label="Preferred career"
               value={viewTarget.preferred_career}
               />
               <DetailItem
               label="Available schedule"
               value={viewTarget.available_schedule}
               />
               <DetailItem
               label="Transportation"
               value={viewTarget.has_transportation ? "Has access" : "No access"}
               />
               <DetailItem
               label="Account"
               value={viewTarget.user?.email || "No account yet"}
               />
            </dl>

            <NotesBlock
               title="Background circumstances"
               text={viewTarget.background_circumstances}
            />
            <NotesBlock
               title="Personal observations"
               text={viewTarget.personal_observations}
            />
            <NotesBlock
               title="Expressed goals"
               text={viewTarget.expressed_goals}
            />

            <RecommendedCourses osyId={viewTarget.id} />

            <div className="bosyModalActions">
               <button
               type="button"
               className="bosyBtn bosyBtnGhost"
               onClick={() => setViewTarget(null)}
               >
               Close
               </button>
               <button
               type="button"
               className="bosyBtn bosyBtnPrimary"
               onClick={() => {
                  openEditModal(viewTarget);
                  setViewTarget(null);
               }}
               >
               Edit record
               </button>
            </div>
         </Modal>
         )}

         {/* Delete confirmation */}
         {deleteTarget && (
         <Modal
            titleId="osyDeleteTitle"
            size="Small"
            onClose={() => setDeleteTarget(null)}
         >
            <h2 id="osyDeleteTitle">Remove this OSY record?</h2>
            <p>
               This will permanently remove{" "}
               <strong>{fullName(deleteTarget)}</strong> and any referrals linked
               to their profile. This cannot be undone.
            </p>
            <div className="bosyModalActions">
               <button
               type="button"
               className="bosyBtn bosyBtnGhost"
               onClick={() => setDeleteTarget(null)}
               disabled={deleting}
               >
               Cancel
               </button>
               <button
               type="button"
               className="bosyBtn bosyBtnDanger"
               onClick={confirmDelete}
               disabled={deleting}
               >
               {deleting ? "Removing…" : "Remove record"}
               </button>
            </div>
         </Modal>
         )}
      </>
   );
   }

   export default BarangayOsyManagement;
