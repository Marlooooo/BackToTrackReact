import { useState, useEffect, useCallback, useRef } from 'react';
import SkOfficialSideBar from '../../../components/skOfficialSideBar';
import './BarangayReferralManagement.css';


/* -------------------------------------------------------------------------- */
/* API helpers                                                                */
/* -------------------------------------------------------------------------- */

const API = '/api';

function getCookie(name) {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? decodeURIComponent(match[2]) : null;
}

async function ensureCsrfCookie() {
   await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
}

async function apiFetch(url, { method = 'GET', body } = {}) {
   const isWrite = method !== 'GET';

   if (isWrite) {
      await ensureCsrfCookie();
   }

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
      throw new Error(data?.message || `Request failed (${res.status})`);
   }

   return data;
}


/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const REMARKS_LIMIT = 500;
const DEBOUNCE_MS = 300;

// Same colors as the Maxima pages
const BADGE_CLASS = {
   'Registered': 'badgeRegistered',
   'Validated': 'badgeValidated',
   'Referred': 'badgeReferred',
   'Accepted by Maxima': 'badgeAccepted',
   'Training Started': 'badgeEnrolled',
   'Completed': 'badgeCompleted',
   'Rejected': 'badgeRejected',
   'Dropped': 'badgeRejected',
};

// Same wording as the Maxima pages
const STATUS_LABEL = {
   'Accepted by Maxima': 'Accepted',
   'Training Started': 'Enrolled',
};

const BOXES = [
   { key: 'approved', label: 'Approved' },
   { key: 'pending', label: 'Pending' },
   { key: 'rejected', label: 'Rejected' },
];


/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function fullName(p) {
   if (!p) return 'Unknown';

   return [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ') || 'Unknown';
}

function initials(p) {
   if (!p) return '?';

   const letters = `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`;
   return letters.toUpperCase() || '?';
}

const programName = (p) => p?.name ?? `Program #${p?.id ?? '?'}`;

function formatDate(value) {
   const date = value ? new Date(value) : null;
   if (!date || Number.isNaN(date.getTime())) return '—';

   return date.toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
   });
}


/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

function BarangayReferralManagement() {
   // List
   const [referrals, setReferrals] = useState([]);
   const [counts, setCounts] = useState({ approved: 0, pending: 0, rejected: 0 });
   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState('');
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');

   // Create-referral modal
   const [showModal, setShowModal] = useState(false);
   const [osySearch, setOsySearch] = useState('');
   const [osyOptions, setOsyOptions] = useState([]);
   const [selectedOsy, setSelectedOsy] = useState(null);
   const [programs, setPrograms] = useState([]);
   const [programId, setProgramId] = useState('');
   const [remarks, setRemarks] = useState('');
   const [formError, setFormError] = useState('');
   const [saving, setSaving] = useState(false);

   // Only the newest list request may update the page
   const latestRequest = useRef(0);

   /* ---- data loading ---- */

   const loadReferrals = useCallback(async () => {
      const requestId = ++latestRequest.current;

      try {
         const params = new URLSearchParams();
         const term = search.trim();
         if (term) params.set('search', term);
         if (statusFilter) params.set('status', statusFilter);

         const data = await apiFetch(`${API}/referrals?${params}`);
         if (requestId !== latestRequest.current) return;

         setReferrals(data.referrals);
         setCounts(data.counts);
         setError('');
      } catch (e) {
         if (requestId !== latestRequest.current) return;
         setError(e.message);
      } finally {
         if (requestId === latestRequest.current) setLoading(false);
      }
   }, [search, statusFilter]);

   // Reload when the filter changes, and (debounced) while typing in search
   useEffect(() => {
      const timer = setTimeout(loadReferrals, DEBOUNCE_MS);
      return () => clearTimeout(timer);
   }, [loadReferrals]);

   // OSY options while the modal is open (older responses are ignored)
   useEffect(() => {
      if (!showModal) return undefined;

      let cancelled = false;

      const timer = setTimeout(async () => {
         try {
            const data = await apiFetch(
               `${API}/referrals/osy-options?search=${encodeURIComponent(osySearch.trim())}`
            );
            if (!cancelled) setOsyOptions(data);
         } catch (err) {
            if (!cancelled) setFormError(err.message);
         }
      }, DEBOUNCE_MS);

      return () => {
         cancelled = true;
         clearTimeout(timer);
      };
   }, [osySearch, showModal]);

   // Training programs, loaded once each time the modal opens
   useEffect(() => {
      if (!showModal) return undefined;

      let cancelled = false;

      (async () => {
         try {
            const data = await apiFetch(`${API}/referrals/program-options`);
            if (!cancelled) setPrograms(data);
         } catch (err) {
            if (!cancelled) setFormError(err.message);
         }
      })();

      return () => {
         cancelled = true;
      };
   }, [showModal]);

   /* ---- modal ---- */

   const closeModal = useCallback(() => {
      setShowModal(false);
      setOsySearch('');
      setOsyOptions([]);
      setSelectedOsy(null);
      setProgramId('');
      setRemarks('');
      setFormError('');
   }, []);

   // While the modal is open: lock the page behind it, and let Escape close it
   // (but never while a save is running)
   useEffect(() => {
      if (!showModal) return undefined;

      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const onKeyDown = (e) => {
         if (e.key === 'Escape' && !saving) closeModal();
      };
      document.addEventListener('keydown', onKeyDown);

      return () => {
         document.body.style.overflow = previousOverflow;
         document.removeEventListener('keydown', onKeyDown);
      };
   }, [showModal, saving, closeModal]);

   async function submitReferral(e) {
      e.preventDefault();
      if (saving) return;

      if (!selectedOsy) {
         setFormError('Select an OSY to refer.');
         return;
      }

      if (!programId) {
         setFormError('Select a training program.');
         return;
      }

      setSaving(true);
      setFormError('');

      try {
         await apiFetch(`${API}/referrals`, {
            method: 'POST',
            body: {
               osy_profile_id: selectedOsy.id,
               training_program_id: programId,
               remarks: remarks.trim(),
            },
         });

         closeModal();
         loadReferrals();
      } catch (err) {
         setFormError(err.message);
      } finally {
         setSaving(false);
      }
   }

   /* ---- derived values ---- */

   const toggleFilter = (key) => setStatusFilter((cur) => (cur === key ? '' : key));
   const hasFilters = Boolean(search.trim() || statusFilter);

   /* ---- render ---- */

   return (
      <>
         <div className='barangayReferralManagementBody'>
            <SkOfficialSideBar />

            <div className='barangayMainContent'>

               <div className='referralManagementTopPart'>
                  <h1>Referral Management</h1>
                  <p>Manage referrals to MAXIMA</p>
               </div>

               {/* Summary cards (also act as filters) */}
               <div className='referralManagementMidPart'>
                  {BOXES.map((b) => (
                     <button
                        key={b.key}
                        type='button'
                        className={`referralStatCard ${b.key} ${statusFilter === b.key ? 'active' : ''}`}
                        onClick={() => toggleFilter(b.key)}
                        aria-pressed={statusFilter === b.key}
                     >
                        <span className='referralStatLabel'>{b.label}</span>
                        <span className='referralStatCount'>{counts[b.key]}</span>
                        <span className='referralStatHint'>
                           {statusFilter === b.key ? 'Filter on - click to clear' : 'Click to filter'}
                        </span>
                     </button>
                  ))}
               </div>

               <div className='referralManagementBotPart'>
                  <div className='referralSearchAndAddReferral'>
                     <div className='referralSearchBox'>
                        <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                           <circle cx='11' cy='11' r='7' />
                           <line x1='21' y1='21' x2='16.65' y2='16.65' />
                        </svg>
                        <input
                           type='search'
                           placeholder='Search referrals by OSY name'
                           value={search}
                           onChange={(e) => setSearch(e.target.value)}
                           aria-label='Search referrals by OSY name'
                        />
                     </div>
                     <button type='button' className='referralPrimaryBtn' onClick={() => setShowModal(true)}>
                        Create referral
                     </button>
                  </div>

                  <div className='referralList'>
                     <div className='referralListHeader'>
                        <h2 className='referralListTitle'>
                           Referrals
                           <span className='referralListCount'>{referrals.length}</span>
                        </h2>
                     </div>

                     {error && <p className='referralErrorBox' role='alert'>{error}</p>}

                     {loading && (
                        <div className='referralEmptyState'>
                           <p>Loading referrals...</p>
                        </div>
                     )}

                     {!loading && !error && referrals.length === 0 && (
                        <div className='referralEmptyState'>
                           <strong>{hasFilters ? 'No matching referrals' : 'No referrals yet'}</strong>
                           <p>
                              {hasFilters
                                 ? 'No referrals match your filters.'
                                 : 'Select "Create referral" to refer an OSY to MAXIMA.'}
                           </p>
                        </div>
                     )}

                     {referrals.length > 0 && (
                        <div className='referralTableWrap'>
                           <table className='referralTable'>
                              <thead>
                                 <tr>
                                    <th>OSY</th>
                                    <th>Program</th>
                                    <th>Remarks</th>
                                    <th>Date referred</th>
                                    <th>Status</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {referrals.map((r) => (
                                    <tr key={r.id}>
                                       <td>
                                          <div className='referralPerson'>
                                             <span className='referralAvatar'>{initials(r.osy_profile)}</span>
                                             <span className='referralPersonName'>{fullName(r.osy_profile)}</span>
                                          </div>
                                       </td>
                                       <td>{r.training_program ? programName(r.training_program) : '-'}</td>
                                       <td>
                                          <div className='referralRemarks' title={r.remarks || ''}>
                                             {r.remarks || '-'}
                                          </div>
                                       </td>
                                       <td className='referralDate'>{formatDate(r.created_at)}</td>
                                       <td>
                                          <span className={`referralStatusBadge ${BADGE_CLASS[r.status] ?? ''}`}>
                                             {STATUS_LABEL[r.status] ?? r.status}
                                          </span>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </div>
               </div>

            </div>
         </div>

         {/* Create referral modal (clicking outside does not close it) */}
         {showModal && (
            <div className='referralModalOverlay'>
               <form
                  className='referralModal'
                  role='dialog'
                  aria-modal='true'
                  aria-labelledby='referralModalTitle'
                  onSubmit={submitReferral}
                  noValidate
               >
                  <div className='referralModalHeader'>
                     <div>
                        <h2 id='referralModalTitle'>Create referral</h2>
                        <p>Refer an OSY to a MAXIMA training program.</p>
                     </div>
                     <button
                        type='button'
                        className='referralIconBtn'
                        onClick={closeModal}
                        disabled={saving}
                        aria-label='Close'
                     >
                        <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
                           <line x1='18' y1='6' x2='6' y2='18' />
                           <line x1='6' y1='6' x2='18' y2='18' />
                        </svg>
                     </button>
                  </div>

                  <div className='referralModalBody'>
                     <div className='referralField'>
                        {selectedOsy ? (
                           <>
                              <span className='referralLabel'>
                                 OSY profile<span className='referralRequired'>*</span>
                              </span>
                              <div className='referralSelectedOsy'>
                                 <span className='referralAvatar'>{initials(selectedOsy)}</span>
                                 <span className='referralPersonName'>{fullName(selectedOsy)}</span>
                                 <button
                                    type='button'
                                    className='referralLinkBtn'
                                    onClick={() => setSelectedOsy(null)}
                                    disabled={saving}
                                 >
                                    Change
                                 </button>
                              </div>
                           </>
                        ) : (
                           <>
                              <label htmlFor='osySearch'>
                                 OSY profile<span className='referralRequired'>*</span>
                              </label>
                              <input
                                 id='osySearch'
                                 className='referralInput'
                                 type='search'
                                 placeholder='Search OSY by name'
                                 value={osySearch}
                                 onChange={(e) => setOsySearch(e.target.value)}
                                 onKeyDown={(e) => {
                                    // Enter here must not submit the form
                                    if (e.key === 'Enter') e.preventDefault();
                                 }}
                                 autoFocus
                              />
                              <ul className='referralOptionList'>
                                 {osyOptions.length === 0 && (
                                    <li className='referralOptionEmpty'>No OSY profiles found.</li>
                                 )}
                                 {osyOptions.map((o) => (
                                    <li key={o.id}>
                                       <button
                                          type='button'
                                          className='referralOption'
                                          onClick={() => setSelectedOsy(o)}
                                       >
                                          <span className='referralOptionName'>{fullName(o)}</span>
                                       </button>
                                    </li>
                                 ))}
                              </ul>
                           </>
                        )}
                     </div>

                     <div className='referralField'>
                        <span className='referralLabel' id='referralProgramLabel'>
                           Training program<span className='referralRequired'>*</span>
                        </span>
                        <div
                           className='referralChoiceList'
                           role='radiogroup'
                           aria-labelledby='referralProgramLabel'
                        >
                           {programs.length === 0 && (
                              <p className='referralOptionEmpty'>No training programs available.</p>
                           )}
                           {programs.map((pr) => (
                              <label key={pr.id} className='referralChoice'>
                                 <input
                                    type='radio'
                                    name='referralProgram'
                                    value={pr.id}
                                    checked={String(programId) === String(pr.id)}
                                    onChange={() => setProgramId(pr.id)}
                                 />
                                 <span className='referralChoiceBody'>{programName(pr)}</span>
                              </label>
                           ))}
                        </div>
                     </div>

                     <div className='referralField'>
                        <label htmlFor='referralRemarks'>Remarks (optional)</label>
                        <textarea
                           id='referralRemarks'
                           className='referralInput'
                           rows={3}
                           maxLength={REMARKS_LIMIT}
                           value={remarks}
                           onChange={(e) => setRemarks(e.target.value)}
                           placeholder='Why is this OSY a good fit for the program?'
                        />
                        <span className='referralFieldHint'>{remarks.length}/{REMARKS_LIMIT}</span>
                     </div>

                     {formError && <p className='referralFormError' role='alert'>{formError}</p>}
                  </div>

                  <div className='referralModalFooter'>
                     <button type='button' className='referralSecondaryBtn' onClick={closeModal} disabled={saving}>
                        Cancel
                     </button>
                     <button type='submit' className='referralPrimaryBtn' disabled={saving}>
                        {saving ? 'Saving...' : 'Submit referral'}
                     </button>
                  </div>
               </form>
            </div>
         )}
      </>
   );
}

export default BarangayReferralManagement;