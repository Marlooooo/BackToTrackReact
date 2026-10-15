import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import OsySideBar from '../../../components/osySideBar';
import './OsyMyProfile.css';

const BASE_URL = ''; // relative URLs go through the Vite proxy, same as the SK pages
const API_URL = `${BASE_URL}/api`;

const PHOTO_MAX_BYTES = 2 * 1024 * 1024; // must match Laravel's max:2048
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function getCookie(name) {
   const value = `; ${document.cookie}`;
   const parts = value.split(`; ${name}=`);
   if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
}

async function ensureCsrfCookie() {
   await fetch(`${BASE_URL}/sanctum/csrf-cookie`, { credentials: 'include' });
}

/* Write request: CSRF cookie first, then the token header (same as the announcements page) */
async function sendJson(path, method, body) {
   await ensureCsrfCookie();

   const res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: {
         Accept: 'application/json',
         'Content-Type': 'application/json',
         'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
      },
      body: JSON.stringify(body),
   });

   const json = await res.json().catch(() => null);

   if (!res.ok) {
      const err = new Error(json?.message ?? 'Something went wrong. Please try again.');
      err.errors = json?.errors ?? {};
      throw err;
   }

   return json;
}

/* Multipart upload: the browser sets the Content-Type (with boundary) itself */
async function sendForm(path, formData) {
   await ensureCsrfCookie();

   const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
         Accept: 'application/json',
         'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
      },
      body: formData,
   });

   const json = await res.json().catch(() => null);

   if (!res.ok) {
      const message =
         res.status === 413
            ? 'The file is too large for the server. Try a smaller photo.'
            : (json?.message ?? 'Something went wrong. Please try again.');
      const err = new Error(message);
      err.errors = json?.errors ?? {};
      throw err;
   }

   return json;
}

/** Accepts 09171234567, +639171234567, 639171234567, 9171234567 (spaces/dashes ignored). Same as the SK form. */
function normalizePhone(raw) {
   const v = String(raw ?? '').replace(/[\s()-]/g, '');
   if (/^\+639\d{9}$/.test(v)) return `0${v.slice(3)}`;
   if (/^639\d{9}$/.test(v)) return `0${v.slice(2)}`;
   if (/^9\d{9}$/.test(v)) return `0${v}`;
   return v;
}

function validatePhone(value) {
   const raw = String(value ?? '').trim();
   if (!raw) return null; // optional
   const compact = raw.replace(/[\s()-]/g, '');
   if (/[^\d+]/.test(compact)) return 'Use numbers only, with no letters or symbols.';
   const n = normalizePhone(compact);
   if (n.startsWith('+')) return 'Use +63 followed by 10 digits (for example, +63 917 123 4567), or start with 09.';
   if (!n.startsWith('09')) return 'Philippine mobile numbers start with 09 (for example, 09171234567).';
   if (n.length !== 11) return `Mobile numbers have 11 digits. This one has ${n.length}.`;
   return null;
}

function formatDate(value) {
   if (!value) return '—';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '—';
   return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
   });
}

function calcAge(value) {
   if (!value) return null;
   const birth = new Date(value);
   if (Number.isNaN(birth.getTime())) return null;

   const today = new Date();
   let age = today.getFullYear() - birth.getFullYear();
   const m = today.getMonth() - birth.getMonth();
   if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
   return age;
}

function fullName(p) {
   return [p?.first_name, p?.middle_name, p?.last_name].filter(Boolean).join(' ');
}

function initials(p) {
   return (
      [p?.first_name, p?.last_name]
         .filter(Boolean)
         .map((w) => w[0])
         .join('')
         .toUpperCase() || 'U'
   );
}

function capitalize(word) {
   return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

function toForm(p) {
   return {
      contact_number: p?.contact_number ?? '',
      address: p?.address ?? '',
      available_schedule: p?.available_schedule ?? '',
      has_transportation: p?.has_transportation ? 'true' : 'false',
   };
}

const EMPTY_PASSWORD = { current_password: '', password: '', password_confirmation: '' };

function OsyMyProfile() {
   const [profile, setProfile] = useState(null);
   const [loading, setLoading] = useState(true);
   const [loadError, setLoadError] = useState('');
   const [notLinked, setNotLinked] = useState(false);

   const [editing, setEditing] = useState(false);
   const [form, setForm] = useState(toForm(null));
   const [saving, setSaving] = useState(false);
   const [saveError, setSaveError] = useState('');
   const [fieldErrors, setFieldErrors] = useState({});
   const [success, setSuccess] = useState('');

   const [photoUploading, setPhotoUploading] = useState(false);
   const [photoError, setPhotoError] = useState('');
   const [avatarFailed, setAvatarFailed] = useState(false);

   const [pwOpen, setPwOpen] = useState(false);
   const [pwForm, setPwForm] = useState(EMPTY_PASSWORD);
   const [pwSaving, setPwSaving] = useState(false);
   const [pwError, setPwError] = useState('');
   const [pwErrors, setPwErrors] = useState({});

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         try {
            const res = await fetch(`${API_URL}/osy/profile`, {
               headers: { Accept: 'application/json' },
               credentials: 'include',
            });

            if (res.status === 404) {
               if (!cancelled) setNotLinked(true);
               return;
            }

            if (!res.ok) throw new Error('Could not load your profile.');

            const json = await res.json();
            if (!cancelled) {
               setProfile(json.data);
               setForm(toForm(json.data));
            }
         } catch (err) {
            console.error(err);
            if (!cancelled) setLoadError('We could not load your profile right now. Please try again later.');
         } finally {
            if (!cancelled) setLoading(false);
         }
      };

      load();

      return () => {
         cancelled = true;
      };
   }, []);

   function handleChange(e) {
      const { name, value } = e.target;
      const next = name === 'contact_number' ? value.replace(/[^\d+\s()-]/g, '') : value;
      setForm((prev) => ({ ...prev, [name]: next }));
   }

   function handleEdit() {
      setForm(toForm(profile));
      setSaveError('');
      setFieldErrors({});
      setSuccess('');
      setEditing(true);
   }

   function handleCancel() {
      setForm(toForm(profile));
      setSaveError('');
      setFieldErrors({});
      setEditing(false);
   }

   async function handleSave(e) {
      e.preventDefault();
      if (saving) return;

      setSaveError('');
      setFieldErrors({});
      setSuccess('');

      // Same checks as the SK form, so mistakes are caught before the request
      const address = form.address.replace(/\s+/g, ' ').trim();
      const problems = {};

      const phoneMessage = validatePhone(form.contact_number);
      if (phoneMessage) problems.contact_number = [phoneMessage];

      if (!address) problems.address = ['Address is required.'];
      else if (address.length < 5) problems.address = ['Enter a complete address (at least 5 characters).'];

      if (Object.keys(problems).length > 0) {
         setFieldErrors(problems);
         setSaveError('Please fix the highlighted fields before saving.');
         return;
      }

      setSaving(true);

      try {
         const json = await sendJson('/osy/profile', 'PUT', {
            contact_number: normalizePhone(form.contact_number),
            address,
            available_schedule: form.available_schedule.replace(/\s+/g, ' ').trim(),
            has_transportation: form.has_transportation === 'true',
         });

         setProfile(json.data);
         setForm(toForm(json.data));
         setEditing(false);
         setSuccess('Your profile has been updated.');
      } catch (err) {
         setSaveError(err.message);
         setFieldErrors(err.errors || {});
      } finally {
         setSaving(false);
      }
   }

   /* The photo uploads as soon as a file is picked */
   async function handlePhotoPick(e) {
      const file = e.target.files?.[0];
      e.target.value = ''; // lets the same file be picked again later
      if (!file || photoUploading) return;

      setSuccess('');
      setPhotoError('');

      if (!PHOTO_TYPES.includes(file.type)) {
         setPhotoError('Photo must be a JPG, PNG or WEBP file.');
         return;
      }
      if (file.size > PHOTO_MAX_BYTES) {
         setPhotoError('Photo must not be larger than 2 MB.');
         return;
      }

      setPhotoUploading(true);

      try {
         const body = new FormData();
         body.append('profile_photo', file);

         const json = await sendForm('/osy/profile/photo', body);

         setProfile(json.data);
         setAvatarFailed(false);
         setSuccess('Your profile photo has been updated.');
      } catch (err) {
         setPhotoError(err.errors?.profile_photo?.[0] ?? err.message);
      } finally {
         setPhotoUploading(false);
      }
   }

   function handlePwChange(e) {
      setPwForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
   }

   function handlePwCancel() {
      setPwForm(EMPTY_PASSWORD);
      setPwError('');
      setPwErrors({});
      setPwOpen(false);
   }

   async function handlePwSave(e) {
      e.preventDefault();
      setPwSaving(true);
      setPwError('');
      setPwErrors({});
      setSuccess('');

      try {
         await sendJson('/osy/password', 'PUT', pwForm);

         setPwForm(EMPTY_PASSWORD);
         setPwOpen(false);
         setSuccess('Your password has been changed.');
      } catch (err) {
         setPwError(err.message);
         setPwErrors(err.errors || {});
      } finally {
         setPwSaving(false);
      }
   }

   const age = calcAge(profile?.birthdate);

   return (
      <>
         <div className="oProf-layout">
            <OsySideBar />

            <main className="oProf-main">
               {loading && (
                  <div aria-busy="true" aria-label="Loading profile">
                     <div className="oProf-skeleton hero"></div>
                     <div className="oProf-skeleton panel"></div>
                  </div>
               )}

               {!loading && loadError && (
                  <div className="oProf-error" role="alert">{loadError}</div>
               )}

               {!loading && notLinked && (
                  <div className="oProf-panel">
                     <div className="oProf-empty">
                        <div className="oProf-emptyIcon"><i className="las la-user-slash"></i></div>
                        <strong>No profile found</strong>
                        <p>
                           Your account is not linked to an OSY profile yet.
                           Please ask your SK official to check your registration.
                        </p>
                        <Link to="/osy/dashboard" className="oProf-btn primary">Back to dashboard</Link>
                     </div>
                  </div>
               )}

               {!loading && profile && (
                  <>
                     <header className="oProf-header">
                        <div className="oProf-avatarWrap">
                           <div className={`oProf-avatar${photoUploading ? ' uploading' : ''}`}>
                              {profile.profile_photo_url && !avatarFailed ? (
                                 <img
                                    src={profile.profile_photo_url}
                                    alt="Your profile"
                                    onError={() => setAvatarFailed(true)}
                                 />
                              ) : (
                                 initials(profile)
                              )}
                           </div>

                           <label className="oProf-avatarBtn" title="Change profile photo">
                              <i className="las la-camera"></i>
                              <span className="oProf-srOnly">Change profile photo</span>
                              <input
                                 type="file"
                                 accept="image/jpeg,image/png,image/webp"
                                 onChange={handlePhotoPick}
                                 disabled={photoUploading}
                              />
                           </label>
                        </div>

                        <div>
                           <h1>{fullName(profile)}</h1>
                           <p className="oProf-sub">{profile.email || 'No email on file'}</p>
                           {photoUploading && <p className="oProf-hint">Uploading photo...</p>}
                           {photoError && <p className="oProf-fieldError" role="alert">{photoError}</p>}
                        </div>
                     </header>

                     {success && <div className="oProf-success" role="status">{success}</div>}

                     <div className="oProf-stats">
                        <div className="oProf-stat">
                           <div className="oProf-statIcon status"><i className="las la-flag"></i></div>
                           <div>
                              <strong>{profile.current_status}</strong>
                              <span>Current status</span>
                           </div>
                        </div>

                        <div className="oProf-stat">
                           <div className="oProf-statIcon age"><i className="las la-birthday-cake"></i></div>
                           <div>
                              <strong>{age !== null ? `${age} years old` : '—'}</strong>
                              <span>Age</span>
                           </div>
                        </div>

                        <div className="oProf-stat">
                           <div className="oProf-statIcon since"><i className="las la-calendar-check"></i></div>
                           <div>
                              <strong>{formatDate(profile.created_at)}</strong>
                              <span>Registered on</span>
                           </div>
                        </div>
                     </div>

                     {/* ---------- Personal information (read-only) ---------- */}
                     <section className="oProf-panel">
                        <div className="oProf-panelHead">
                           <h2>Personal Information</h2>
                           <span className="oProf-hint"><i className="las la-lock"></i> Managed by your SK official</span>
                        </div>

                        <div className="oProf-panelBody">
                           <div className="oProf-grid">
                              <div className="oProf-field">
                                 <span className="oProf-label">First name</span>
                                 <p className="oProf-value">{profile.first_name || '—'}</p>
                              </div>
                              <div className="oProf-field">
                                 <span className="oProf-label">Middle name</span>
                                 <p className="oProf-value">{profile.middle_name || '—'}</p>
                              </div>
                              <div className="oProf-field">
                                 <span className="oProf-label">Last name</span>
                                 <p className="oProf-value">{profile.last_name || '—'}</p>
                              </div>
                              <div className="oProf-field">
                                 <span className="oProf-label">Sex</span>
                                 <p className="oProf-value">{capitalize(profile.sex) || '—'}</p>
                              </div>
                              <div className="oProf-field">
                                 <span className="oProf-label">Birthdate</span>
                                 <p className="oProf-value">{formatDate(profile.birthdate)}</p>
                              </div>
                           </div>
                        </div>
                     </section>

                     {/* ---------- Contact & availability (editable) ---------- */}
                     <section className="oProf-panel">
                        <div className="oProf-panelHead">
                           <h2>Contact &amp; Availability</h2>

                           {!editing && (
                              <button type="button" className="oProf-btn ghost" onClick={handleEdit}>
                                 <i className="las la-pen"></i> Edit
                              </button>
                           )}
                        </div>

                        <div className="oProf-panelBody">
                           {!editing && (
                              <div className="oProf-grid">
                                 <div className="oProf-field">
                                    <span className="oProf-label">Contact number</span>
                                    <p className="oProf-value">{profile.contact_number || '—'}</p>
                                 </div>
                                 <div className="oProf-field">
                                    <span className="oProf-label">Address</span>
                                    <p className="oProf-value">{profile.address || '—'}</p>
                                 </div>
                                 <div className="oProf-field">
                                    <span className="oProf-label">Available schedule</span>
                                    <p className="oProf-value">{profile.available_schedule || '—'}</p>
                                 </div>
                                 <div className="oProf-field">
                                    <span className="oProf-label">Transportation</span>
                                    <p className="oProf-value">{profile.has_transportation ? 'Has access' : 'No access'}</p>
                                 </div>
                              </div>
                           )}

                           {editing && (
                              <form onSubmit={handleSave} noValidate>
                                 {saveError && <div className="oProf-error" role="alert">{saveError}</div>}

                                 <div className="oProf-grid">
                                    <div className="oProf-field">
                                       <label className="oProf-label" htmlFor="oProf-contact">Contact number</label>
                                       <input
                                          id="oProf-contact"
                                          name="contact_number"
                                          type="text"
                                          placeholder="09171234567"
                                          value={form.contact_number}
                                          onChange={handleChange}
                                       />
                                       {fieldErrors.contact_number && (
                                          <span className="oProf-fieldError">{fieldErrors.contact_number[0]}</span>
                                       )}
                                    </div>

                                    <div className="oProf-field">
                                       <label className="oProf-label" htmlFor="oProf-address">Address</label>
                                       <input
                                          id="oProf-address"
                                          name="address"
                                          type="text"
                                          value={form.address}
                                          onChange={handleChange}
                                       />
                                       {fieldErrors.address && (
                                          <span className="oProf-fieldError">{fieldErrors.address[0]}</span>
                                       )}
                                    </div>

                                    <div className="oProf-field">
                                       <label className="oProf-label" htmlFor="oProf-schedule">Available schedule</label>
                                       <input
                                          id="oProf-schedule"
                                          name="available_schedule"
                                          type="text"
                                          placeholder="e.g. Weekdays, 8 AM to 5 PM"
                                          value={form.available_schedule}
                                          onChange={handleChange}
                                       />
                                       {fieldErrors.available_schedule && (
                                          <span className="oProf-fieldError">{fieldErrors.available_schedule[0]}</span>
                                       )}
                                    </div>

                                    <div className="oProf-field">
                                       <label className="oProf-label" htmlFor="oProf-transport">Transportation</label>
                                       <select
                                          id="oProf-transport"
                                          name="has_transportation"
                                          value={form.has_transportation}
                                          onChange={handleChange}
                                       >
                                          <option value="true">Has access</option>
                                          <option value="false">No access</option>
                                       </select>
                                    </div>
                                 </div>

                                 <div className="oProf-actions">
                                    <button type="button" className="oProf-btn ghost" onClick={handleCancel} disabled={saving}>
                                       Cancel
                                    </button>
                                    <button type="submit" className="oProf-btn primary" disabled={saving}>
                                       {saving ? 'Saving...' : 'Save changes'}
                                    </button>
                                 </div>
                              </form>
                           )}
                        </div>
                     </section>

                     {/* ---------- Education & career (read-only) ---------- */}
                     <section className="oProf-panel">
                        <div className="oProf-panelHead">
                           <h2>Education &amp; Career</h2>
                           <span className="oProf-hint"><i className="las la-lock"></i> Managed by your SK official</span>
                        </div>

                        <div className="oProf-panelBody">
                           <div className="oProf-grid">
                              <div className="oProf-field">
                                 <span className="oProf-label">Educational attainment</span>
                                 <p className="oProf-value">{profile.educational_attainment || '—'}</p>
                              </div>
                              <div className="oProf-field">
                                 <span className="oProf-label">Preferred career</span>
                                 <p className="oProf-value">{profile.preferred_career || '—'}</p>
                              </div>
                              <div className="oProf-field full">
                                 <span className="oProf-label">Your goals</span>
                                 <p className="oProf-value">{profile.expressed_goals || '—'}</p>
                              </div>
                           </div>

                           <p className="oProf-note">
                              Want to change these? Tell your SK official and they will update them.
                              Your course recommendations will refresh automatically.
                           </p>
                        </div>
                     </section>

                     {/* ---------- Account ---------- */}
                     <section className="oProf-panel">
                        <div className="oProf-panelHead">
                           <h2>Account</h2>

                           {!pwOpen && (
                              <button
                                 type="button"
                                 className="oProf-btn ghost"
                                 onClick={() => { setSuccess(''); setPwOpen(true); }}
                              >
                                 <i className="las la-key"></i> Change password
                              </button>
                           )}
                        </div>

                        <div className="oProf-panelBody">
                           <div className="oProf-grid">
                              <div className="oProf-field">
                                 <span className="oProf-label">Email</span>
                                 <p className="oProf-value">{profile.email || '—'}</p>
                              </div>
                              <div className="oProf-field">
                                 <span className="oProf-label">Password</span>
                                 <p className="oProf-value">••••••••</p>
                              </div>
                           </div>

                           {pwOpen && (
                              <form className="oProf-pwForm" onSubmit={handlePwSave} noValidate>
                                 {pwError && <div className="oProf-error" role="alert">{pwError}</div>}

                                 <div className="oProf-grid">
                                    <div className="oProf-field full">
                                       <label className="oProf-label" htmlFor="oProf-current">Current password</label>
                                       <input
                                          id="oProf-current"
                                          name="current_password"
                                          type="password"
                                          autoComplete="current-password"
                                          value={pwForm.current_password}
                                          onChange={handlePwChange}
                                       />
                                       {pwErrors.current_password && (
                                          <span className="oProf-fieldError">{pwErrors.current_password[0]}</span>
                                       )}
                                    </div>

                                    <div className="oProf-field">
                                       <label className="oProf-label" htmlFor="oProf-new">New password</label>
                                       <input
                                          id="oProf-new"
                                          name="password"
                                          type="password"
                                          autoComplete="new-password"
                                          value={pwForm.password}
                                          onChange={handlePwChange}
                                       />
                                       {pwErrors.password && (
                                          <span className="oProf-fieldError">{pwErrors.password[0]}</span>
                                       )}
                                    </div>

                                    <div className="oProf-field">
                                       <label className="oProf-label" htmlFor="oProf-confirm">Confirm new password</label>
                                       <input
                                          id="oProf-confirm"
                                          name="password_confirmation"
                                          type="password"
                                          autoComplete="new-password"
                                          value={pwForm.password_confirmation}
                                          onChange={handlePwChange}
                                       />
                                    </div>
                                 </div>

                                 <p className="oProf-note">Use at least 8 characters, with letters and numbers.</p>

                                 <div className="oProf-actions">
                                    <button type="button" className="oProf-btn ghost" onClick={handlePwCancel} disabled={pwSaving}>
                                       Cancel
                                    </button>
                                    <button type="submit" className="oProf-btn primary" disabled={pwSaving}>
                                       {pwSaving ? 'Updating...' : 'Update password'}
                                    </button>
                                 </div>
                              </form>
                           )}
                        </div>
                     </section>
                  </>
               )}
            </main>
         </div>
      </>
   );
}

export default OsyMyProfile;
