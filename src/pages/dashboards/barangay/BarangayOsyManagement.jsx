   import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
   import SkOfficialSideBar from '../../../components/skOfficialSideBar';
   import './BarangayOsyManagement.css';

   /* -------------------------------------------------------------------------- */
   /* API helpers                                                                */
   /* -------------------------------------------------------------------------- */

   const OSY_ENDPOINT = '/api/osy-profiles';

   class ApiError extends Error {
   constructor(message, status, body) {
      super(message);
      this.status = status;
      this.body = body;
   }
   }

   function getCookie(name) {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? decodeURIComponent(match[2]) : null;
   }

   async function ensureCsrfCookie() {
   await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
   }

   /** JSON request with Sanctum cookie auth. Throws ApiError on non-2xx responses. */
   async function apiFetch(url, { method = 'GET', body } = {}) {
   const isWrite = method !== 'GET';
   if (isWrite) await ensureCsrfCookie();

   const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
         Accept: 'application/json',
         ...(body !== undefined && { 'Content-Type': 'application/json' }),
         ...(isWrite && { 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
   });

   const data = await res.json().catch(() => null);
   if (!res.ok) {
      throw new ApiError(data?.message ?? `Request failed (${res.status})`, res.status, data);
   }
   return data;
   }

   /* -------------------------------------------------------------------------- */
   /* Constants                                                                  */
   /* -------------------------------------------------------------------------- */

   const STATUS_STEPS = [
   'Registered',
   'Validated',
   'Referred',
   'Accepted by TESDA',
   'Training Started',
   'Completed',
   ];

   // The three pages of the Add / Edit modal
   const FORM_STEPS = [
   { key: 'personal', label: 'Personal info' },
   { key: 'interview', label: 'Interview details' },
   { key: 'account', label: 'Account' },
   ];
   const LAST_STEP = FORM_STEPS.length - 1;

   // Used to jump back to the right page when Laravel returns a 422
   const PERSONAL_FIELDS = [
   'first_name', 'middle_name', 'last_name', 'birthdate', 'sex', 'address', 'contact_number',
   ];

   const EMPTY_FORM = {
   first_name: '',
   middle_name: '',
   last_name: '',
   birthdate: '',
   sex: 'male',
   address: '',
   contact_number: '',
   educational_attainment: '',
   preferred_career: '',
   available_schedule: '',
   has_transportation: true,
   background_circumstances: '',
   personal_observations: '',
   expressed_goals: '',
   current_status: 'Registered',
   };

   const EMPTY_ACCOUNT = {
   email: '',
   password: '',
   password_confirmation: '',
   };

   /* -------------------------------------------------------------------------- */
   /* Pure helpers                                                               */
   /* -------------------------------------------------------------------------- */

   /** <input type="date"> only accepts YYYY-MM-DD, but Laravel may send a full timestamp. */
   const toDateInput = (value) => (value ? String(value).slice(0, 10) : '');

   function calculateAge(birthdate) {
   const iso = toDateInput(birthdate);
   if (!iso) return null;

   const dob = new Date(iso); // parsed as UTC midnight
   if (Number.isNaN(dob.getTime())) return null;

   const today = new Date();
   const hadBirthday =
      today.getMonth() > dob.getUTCMonth() ||
      (today.getMonth() === dob.getUTCMonth() && today.getDate() >= dob.getUTCDate());

   return today.getFullYear() - dob.getUTCFullYear() - (hadBirthday ? 0 : 1);
   }

   function fullName(osy) {
   return [osy.first_name, osy.middle_name, osy.last_name].filter(Boolean).join(' ');
   }

   const sexLabel = (sex) => (sex === 'male' ? 'Male' : 'Female');

   function stepForField(field) {
   if (field.startsWith('account.')) return 2;
   return PERSONAL_FIELDS.includes(field) ? 0 : 1;
   }

   /** Maps an API record onto the form's fields. */
   function profileToForm(osy) {
   return {
      first_name: osy.first_name ?? '',
      middle_name: osy.middle_name ?? '',
      last_name: osy.last_name ?? '',
      birthdate: toDateInput(osy.birthdate),
      sex: osy.sex ?? 'male',
      address: osy.address ?? '',
      contact_number: osy.contact_number ?? '',
      educational_attainment: osy.educational_attainment ?? '',
      preferred_career: osy.preferred_career ?? '',
      available_schedule: osy.available_schedule ?? '',
      has_transportation: Boolean(osy.has_transportation),
      background_circumstances: osy.background_circumstances ?? '',
      personal_observations: osy.personal_observations ?? '',
      expressed_goals: osy.expressed_goals ?? '',
      current_status: osy.current_status ?? 'Registered',
   };
   }

   /* -------------------------------------------------------------------------- */
   /* Small presentational components                                            */
   /* -------------------------------------------------------------------------- */

   function Field({ label, error, children }) {
   return (
      <label>
         {label}
         {children}
         {error && <span className="bosyFieldError">{error}</span>}
      </label>
   );
   }

   function StatusBadge({ status }) {
   return (
      <span className={`bosyStatus bosyStatus--${status?.replace(/\s+/g, '')}`}>
         {status}
      </span>
   );
   }

   function Modal({ titleId, size = 'Large', onClose, children }) {
   return (
      <div className="bosyModalOverlay" onClick={onClose}>
         <div
         className={`bosyModal bosyModal${size}`}
         role="dialog"
         aria-modal="true"
         aria-labelledby={titleId}
         onClick={(e) => e.stopPropagation()}
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
         <dd>{value || '—'}</dd>
      </div>
   );
   }

   function NotesBlock({ title, text }) {
   return (
      <div className="bosyNotesBlock">
         <h4>{title}</h4>
         <p>{text || '—'}</p>
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

      const timer = setTimeout(async () => {
         setLoading(true);
         setError(null);
         try {
         const body = osyId
            ? await apiFetch(`${OSY_ENDPOINT}/${osyId}/recommendations`)
            : await apiFetch('/api/osy-recommendations/preview', { method: 'POST', body: draft });
         if (!cancelled) setItems(body.data ?? []);
         } catch (err) {
         if (!cancelled) {
            setItems([]);
            setError(err.message);
         }
         } finally {
         if (!cancelled) setLoading(false);
         }
      }, osyId ? 0 : 700);

      return () => {
         cancelled = true;
         clearTimeout(timer);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [key]);

   return (
      <div className="bosyFormSection bosyRecs">
         <h3>Suggested Courses</h3>
         <p className="bosyFormSectionNote">
         Matched from the interview answers. These are suggestions for the SK official to review, not a final placement.
         </p>

         {loading ? (
         <div className="bosyEmpty">Finding matches…</div>
         ) : error ? (
         <div className="bosyBanner bosyBannerError" role="alert">{error}</div>
         ) : items.length === 0 ? (
         <div className="bosyEmpty">
            No matches yet. Add a preferred career or goals to see suggestions.
         </div>
         ) : (
         <ul className="bosyRecList">
            {items.map((c) => (
               <li key={c.id} className="bosyRecItem">
               <strong>{c.title}</strong>
               <span className="bosyRecWhy">Matched: {c.matched.join(', ')}</span>
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
   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState('all');

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
   const [fieldErrors, setFieldErrors] = useState({});
   const formRef = useRef(null);

   // View / Delete
   const [viewTarget, setViewTarget] = useState(null);
   const [deleteTarget, setDeleteTarget] = useState(null);
   const [deleting, setDeleting] = useState(false);

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
            ? 'You do not have permission to view OSY records.'
            : 'Could not load OSY records.'
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
         const matchesStatus = statusFilter === 'all' || osy.current_status === statusFilter;
         return matchesSearch && matchesStatus;
      });
   }, [osyRecords, search, statusFilter]);

   /* ---- wizard state ---- */

   function resetWizard() {
      setStep(0);
      setFormError(null);
      setFieldErrors({});
      setShowPassword(false);
      setAccount(EMPTY_ACCOUNT);
      setExistingAccountEmail(null);
   }

   function openAddModal() {
      resetWizard();
      setEditingId(null);
      setForm(EMPTY_FORM);
      setIsModalOpen(true);
   }

   function openEditModal(osy) {
      resetWizard();
      setEditingId(osy.id);
      setForm(profileToForm(osy));
      // Assumes the API returns the linked user as `osy.user`
      setExistingAccountEmail(osy.user?.email ?? null);
      setIsModalOpen(true);
   }

   function closeModal() {
      if (saving) return;
      setIsModalOpen(false);
   }

   function handleChange(field, value) {
      setForm((prev) => ({ ...prev, [field]: value }));
   }

   function handleAccountChange(field, value) {
      setAccount((prev) => ({ ...prev, [field]: value }));
   }

   // Shorthand for text-like inputs: <input {...bind('first_name')} />
   const bind = (field) => ({
      value: form[field],
      onChange: (e) => handleChange(field, e.target.value),
   });

   const bindAccount = (field) => ({
      value: account[field],
      onChange: (e) => handleAccountChange(field, e.target.value),
   });

   // Escape closes whichever dialog is on top
   useEffect(() => {
      function onKeyDown(e) {
         if (e.key !== 'Escape') return;
         if (deleteTarget) setDeleteTarget(null);
         else if (viewTarget) setViewTarget(null);
         else if (isModalOpen) closeModal();
      }
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
   });

   /* ---- wizard navigation ---- */

   // Only the current step's inputs are in the DOM, so this validates just this page.
   function currentStepIsValid() {
      if (!formRef.current?.reportValidity()) return false;

      if (step === LAST_STEP && !existingAccountEmail) {
         if (account.password && account.password.length < 8) {
         setFormError('Password must be at least 8 characters.');
         return false;
         }
         if (account.password !== account.password_confirmation) {
         setFormError('Passwords do not match.');
         return false;
         }
      }
      setFormError(null);
      return true;
   }

   function goNext() {
      if (!currentStepIsValid()) return;
      setStep((s) => Math.min(s + 1, LAST_STEP));
   }

   function goBack() {
      setFormError(null);
      setStep((s) => Math.max(s - 1, 0));
   }

   // Let people click back to a page they've already visited
   function goToStep(target) {
      if (target < step) {
         setFormError(null);
         setStep(target);
      }
   }

   /* ---- save / delete ---- */

   async function handleSubmit(e) {
      e.preventDefault();

      // Pressing Enter inside a field should advance, not save early
      if (step < LAST_STEP) {
         goNext();
         return;
      }
      if (!currentStepIsValid()) return;

      setSaving(true);
      setFormError(null);
      setFieldErrors({});

      const url = editingId ? `${OSY_ENDPOINT}/${editingId}` : OSY_ENDPOINT;
      const method = editingId ? 'PUT' : 'POST';

      const payload = { ...form };
      // Only send account details if the SK official filled them in
      if (!existingAccountEmail && account.email) {
         payload.account = account;
      }

      try {
         await apiFetch(url, { method, body: payload });
         setIsModalOpen(false);
         setNotice(editingId ? 'OSY record updated.' : 'OSY record registered.');
         await fetchOsyRecords();
      } catch (err) {
         // Laravel validation errors: { message, errors: { field: [msg] } }
         if (err.status === 422 && err.body?.errors) {
         const flat = Object.fromEntries(
            Object.entries(err.body.errors).map(([field, msgs]) => [field, msgs[0]])
         );
         setFieldErrors(flat);
         const firstField = Object.keys(flat)[0];
         setStep(stepForField(firstField));
         setFormError(flat[firstField]);
         } else {
         setFormError(err.message || 'Could not save this OSY record.');
         }
      } finally {
         setSaving(false);
      }
   }

   async function confirmDelete() {
      if (!deleteTarget || deleting) return;
      setDeleting(true);
      try {
         await apiFetch(`${OSY_ENDPOINT}/${deleteTarget.id}`, { method: 'DELETE' });
         setOsyRecords((prev) => prev.filter((o) => o.id !== deleteTarget.id));
         setNotice('OSY record removed.');
      } catch {
         setError('Could not remove this OSY record.');
      } finally {
         setDeleting(false);
         setDeleteTarget(null);
      }
   }

   /* ---- render ---- */

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
                     <option key={s} value={s}>{s}</option>
                  ))}
               </select>

               <button type="button" className="osyAddBtn" onClick={openAddModal}>
                  + Add OSY
               </button>
               </div>

               <div className="osyList">
               {notice && <div className="bosyBanner bosyBannerInfo" role="status">{notice}</div>}
               {error && <div className="bosyBanner bosyBannerError" role="alert">{error}</div>}

               {loading ? (
                  <div className="bosyEmpty">Loading OSY records…</div>
               ) : visibleRecords.length === 0 ? (
                  <div className="bosyEmpty">
                     <p>No OSY records found.</p>
                     <span>Try a different search term or status, or register a new OSY.</span>
                  </div>
               ) : (
                  <>
                     <p className="osyCount">
                     Showing {visibleRecords.length} of {osyRecords.length} records
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
                           <td>{calculateAge(osy.birthdate) ?? '—'} / {sexLabel(osy.sex)}</td>
                           <td className="osyTable__address">{osy.address}</td>
                           <td>{osy.educational_attainment || '—'}</td>
                           <td><StatusBadge status={osy.current_status} /></td>
                           <td className="osyTable__actions">
                              <button type="button" className="osyViewBtn" onClick={() => setViewTarget(osy)}>View</button>
                              <button type="button" className="osyEditBtn" onClick={() => openEditModal(osy)}>Edit</button>
                              <button type="button" className="osyDeleteBtn" onClick={() => setDeleteTarget(osy)}>Remove</button>
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
            <h2 id="osyFormTitle">{editingId ? 'Edit OSY Record' : 'Register New OSY'}</h2>

            <ol className="bosyStepper" aria-label="Form progress">
               {FORM_STEPS.map((s, i) => {
               const state = i === step ? 'active' : i < step ? 'done' : 'todo';
               return (
                  <li key={s.key} className={`bosyStepper__item bosyStepper__item--${state}`}>
                     <button
                     type="button"
                     className="bosyStepper__btn"
                     onClick={() => goToStep(i)}
                     disabled={i >= step}
                     aria-current={i === step ? 'step' : undefined}
                     >
                     <span className="bosyStepper__dot">{i < step ? '✓' : i + 1}</span>
                     <span className="bosyStepper__label">{s.label}</span>
                     </button>
                  </li>
               );
               })}
            </ol>

            <form ref={formRef} onSubmit={handleSubmit} className="bosyForm">
               {/* Page 1: Personal info */}
               {step === 0 && (
               <div className="bosyFormSection">
                  <h3>Personal Information</h3>

                  <div className="bosyFormRow bosyFormRow--3">
                     <Field label="First name" error={fieldErrors.first_name}>
                     <input type="text" {...bind('first_name')} required />
                     </Field>
                     <Field label="Middle name" error={fieldErrors.middle_name}>
                     <input type="text" {...bind('middle_name')} />
                     </Field>
                     <Field label="Last name" error={fieldErrors.last_name}>
                     <input type="text" {...bind('last_name')} required />
                     </Field>
                  </div>

                  <div className="bosyFormRow">
                     <Field label="Birthdate" error={fieldErrors.birthdate}>
                     <input type="date" {...bind('birthdate')} required />
                     </Field>
                     <Field label="Sex">
                     <select {...bind('sex')}>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                     </select>
                     </Field>
                  </div>

                  <Field label="Address" error={fieldErrors.address}>
                     <input type="text" {...bind('address')} required />
                  </Field>

                  <Field label="Contact number" error={fieldErrors.contact_number}>
                     <input type="text" {...bind('contact_number')} placeholder="e.g. 09XXXXXXXXX" />
                  </Field>
               </div>
               )}

               {/* Page 2: Interview details */}
               {step === 1 && (
               <>
                  <div className="bosyFormSection">
                     <h3>Background &amp; Interests</h3>

                     <Field label="Educational attainment" error={fieldErrors.educational_attainment}>
                     <input
                        type="text"
                        {...bind('educational_attainment')}
                        placeholder="e.g. High School Graduate"
                        required
                     />
                     </Field>

                     <div className="bosyFormRow">
                     <Field label="Preferred career">
                        <input type="text" {...bind('preferred_career')} />
                     </Field>
                     <Field label="Available schedule">
                        <input type="text" {...bind('available_schedule')} placeholder="e.g. Weekdays, mornings" />
                     </Field>
                     </div>

                     <label className="bosyCheckboxLabel">
                     <input
                        type="checkbox"
                        checked={form.has_transportation}
                        onChange={(e) => handleChange('has_transportation', e.target.checked)}
                     />
                     Has access to transportation
                     </label>
                  </div>

                  <div className="bosyFormSection">
                     <h3>Interview Notes</h3>
                     <p className="bosyFormSectionNote">Gathered directly from the OSY during registration.</p>

                     <Field label="Background circumstances">
                     <textarea rows={3} {...bind('background_circumstances')} />
                     </Field>
                     <Field label="Personal observations">
                     <textarea rows={3} {...bind('personal_observations')} />
                     </Field>
                     <Field label="Expressed goals">
                     <textarea rows={3} {...bind('expressed_goals')} />
                     </Field>
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
                     <Field label="Current status">
                     <select {...bind('current_status')}>
                        {STATUS_STEPS.map((s) => (
                           <option key={s} value={s}>{s}</option>
                        ))}
                     </select>
                     </Field>
                  </div>
               </>
               )}

               {/* Page 3: Account */}
               {step === 2 && (
               <div className="bosyFormSection">
                  <h3>OSY Account</h3>

                  {existingAccountEmail ? (
                     <div className="bosyBanner bosyBannerInfo">
                     {fullName(form)} already has an account ({existingAccountEmail}).
                     </div>
                  ) : (
                     <>
                     <p className="bosyFormSectionNote">
                        {editingId
                           ? 'This OSY has no account yet. Leave these blank to skip, or fill them in to create one.'
                           : 'This lets the OSY sign in to the system. Share the email and password with them after saving.'}
                     </p>

                     <Field label="Email" error={fieldErrors['account.email']}>
                        <input
                           type="email"
                           {...bindAccount('email')}
                           autoComplete="off"
                           required={!editingId}
                        />
                     </Field>

                     <div className="bosyFormRow">
                        <Field label="Password" error={fieldErrors['account.password']}>
                           <input
                           type={showPassword ? 'text' : 'password'}
                           {...bindAccount('password')}
                           minLength={8}
                           autoComplete="new-password"
                           required={!editingId || Boolean(account.email)}
                           />
                        </Field>
                        <Field label="Confirm password">
                           <input
                           type={showPassword ? 'text' : 'password'}
                           {...bindAccount('password_confirmation')}
                           autoComplete="new-password"
                           required={!editingId || Boolean(account.email)}
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
               )}

               {formError && <div className="bosyBanner bosyBannerError" role="alert">{formError}</div>}

               <div className="bosyModalActions">
               <button type="button" className="bosyBtn bosyBtnGhost" onClick={closeModal} disabled={saving}>
                  Cancel
               </button>

               {step > 0 && (
                  <button key="back" type="button" className="bosyBtn bosyBtnGhost" onClick={goBack} disabled={saving}>
                     Back
                  </button>
               )}

               {step < LAST_STEP ? (
                  <button key="next" type="button" className="bosyBtn bosyBtnPrimary" onClick={goNext}>
                     Next
                  </button>
               ) : (
                  <button key="submit" type="submit" className="bosyBtn bosyBtnPrimary" disabled={saving}>
                     {saving ? 'Saving…' : editingId ? 'Save changes' : 'Register OSY'}
                  </button>
               )}
               </div>
            </form>
         </Modal>
         )}

         {/* View profile modal */}
         {viewTarget && (
         <Modal titleId="osyViewTitle" onClose={() => setViewTarget(null)}>
            <div className="bosyViewHeader">
               <div>
               <h2 id="osyViewTitle">{fullName(viewTarget)}</h2>
               <span className="bosyViewSubline">
                  {calculateAge(viewTarget.birthdate) ?? '—'} years old · {sexLabel(viewTarget.sex)}
               </span>
               </div>
               <StatusBadge status={viewTarget.current_status} />
            </div>

            <dl className="bosyDetailGrid">
               <DetailItem label="Address" value={viewTarget.address} />
               <DetailItem label="Contact number" value={viewTarget.contact_number} />
               <DetailItem label="Educational attainment" value={viewTarget.educational_attainment} />
               <DetailItem label="Preferred career" value={viewTarget.preferred_career} />
               <DetailItem label="Available schedule" value={viewTarget.available_schedule} />
               <DetailItem
               label="Transportation"
               value={viewTarget.has_transportation ? 'Has access' : 'No access'}
               />
               <DetailItem label="Account" value={viewTarget.user?.email || 'No account yet'} />
            </dl>

            <NotesBlock title="Background circumstances" text={viewTarget.background_circumstances} />
            <NotesBlock title="Personal observations" text={viewTarget.personal_observations} />
            <NotesBlock title="Expressed goals" text={viewTarget.expressed_goals} />

            <RecommendedCourses osyId={viewTarget.id} />

            <div className="bosyModalActions">
               <button type="button" className="bosyBtn bosyBtnGhost" onClick={() => setViewTarget(null)}>
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
         <Modal titleId="osyDeleteTitle" size="Small" onClose={() => setDeleteTarget(null)}>
            <h2 id="osyDeleteTitle">Remove this OSY record?</h2>
            <p>
               This will permanently remove <strong>{fullName(deleteTarget)}</strong> and any referrals
               linked to their profile. This cannot be undone.
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
               {deleting ? 'Removing…' : 'Remove record'}
               </button>
            </div>
         </Modal>
         )}
      </>
   );
   }

   export default BarangayOsyManagement;