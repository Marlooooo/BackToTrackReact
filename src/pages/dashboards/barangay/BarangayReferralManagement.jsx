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
const PAGE_SIZE = 10;
const NOTICE_MS = 4000;

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

const statusLabel = (status) => STATUS_LABEL[status] ?? status;

function formatDate(value, withTime = false) {
   const date = value ? new Date(value) : null;
   if (!date || Number.isNaN(date.getTime())) return '-';

   return date.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...(withTime && { hour: 'numeric', minute: '2-digit' }),
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
   const [page, setPage] = useState(1);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [notice, setNotice] = useState('');

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

   // Delete-referral modal
   const [deleteTarget, setDeleteTarget] = useState(null);
   const [deleting, setDeleting] = useState(false);
   const [deleteError, setDeleteError] = useState('');

   // Referral-details modal
   const [detailTarget, setDetailTarget] = useState(null);
   const [detail, setDetail] = useState(null);
   const [detailLoading, setDetailLoading] = useState(false);
   const [detailError, setDetailError] = useState('');

   // Only the newest list request may update the page
   const latestRequest = useRef(0);
   const noticeTimer = useRef(null);

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

   // OSY options while the create modal is open (older responses are ignored)
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

   // Training programs, loaded once each time the create modal opens
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

   // Status history for the details modal
   useEffect(() => {
      if (!detailTarget) return undefined;

      let cancelled = false;

      (async () => {
         try {
            const data = await apiFetch(`${API}/notifications/referrals/${detailTarget.id}`);
            if (!cancelled) setDetail(data);
         } catch (err) {
            if (!cancelled) setDetailError(err.message);
         } finally {
            if (!cancelled) setDetailLoading(false);
         }
      })();

      return () => {
         cancelled = true;
      };
   }, [detailTarget]);

   // Clear the success message timer when leaving the page
   useEffect(() => () => clearTimeout(noticeTimer.current), []);

   /* ---- notice ---- */

   const showNotice = useCallback((text) => {
      setNotice(text);
      clearTimeout(noticeTimer.current);
      noticeTimer.current = setTimeout(() => setNotice(''), NOTICE_MS);
   }, []);

   /* ---- modals ---- */

   const closeModal = useCallback(() => {
      setShowModal(false);
      setOsySearch('');
      setOsyOptions([]);
      setSelectedOsy(null);
      setProgramId('');
      setRemarks('');
      setFormError('');
   }, []);

   const closeDeleteModal = useCallback(() => {
      setDeleteTarget(null);
      setDeleteError('');
   }, []);

   const closeDetailModal = useCallback(() => {
      setDetailTarget(null);
      setDetail(null);
      setDetailError('');
      setDetailLoading(false);
   }, []);

   const openDetail = (referral) => {
      setDetail(null);
      setDetailError('');
      setDetailLoading(true);
      setDetailTarget(referral);
   };

   const openDeleteFromDetail = () => {
      const target = detailTarget;
      closeDetailModal();
      setDeleteTarget(target);
   };

   // While any modal is open: lock the page behind it, and let Escape close it
   // (but never while a save or delete is running)
   const anyModalOpen = showModal || Boolean(deleteTarget) || Boolean(detailTarget);
   const busy = saving || deleting;

   useEffect(() => {
      if (!anyModalOpen) return undefined;

      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const onKeyDown = (e) => {
         if (e.key !== 'Escape' || busy) return;

         if (deleteTarget) closeDeleteModal();
         else if (detailTarget) closeDetailModal();
         else closeModal();
      };
      document.addEventListener('keydown', onKeyDown);

      return () => {
         document.body.style.overflow = previousOverflow;
         document.removeEventListener('keydown', onKeyDown);
      };
   }, [anyModalOpen, busy, deleteTarget, detailTarget, closeDeleteModal, closeDetailModal, closeModal]);

   /* ---- actions ---- */

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

         const name = fullName(selectedOsy);

         closeModal();
         setPage(1);
         loadReferrals();
         showNotice(`Referral for ${name} was created.`);
      } catch (err) {
         setFormError(err.message);
      } finally {
         setSaving(false);
      }
   }

   async function confirmDelete() {
      if (!deleteTarget || deleting) return;

      setDeleting(true);
      setDeleteError('');

      try {
         await apiFetch(`${API}/referrals/${deleteTarget.id}`, { method: 'DELETE' });

         const name = fullName(deleteTarget.osy_profile);

         closeDeleteModal();
         loadReferrals();
         showNotice(`Referral for ${name} was deleted.`);
      } catch (err) {
         setDeleteError(err.message);
         loadReferrals(); // the status may have changed, so refresh the list
      } finally {
         setDeleting(false);
      }
   }

   /* ---- filters and paging ---- */

   const changeSearch = (value) => {
      setSearch(value);
      setPage(1);
   };

   const toggleFilter = (key) => {
      setStatusFilter((cur) => (cur === key ? '' : key));
      setPage(1);
   };

   const clearFilters = () => {
      setSearch('');
      setStatusFilter('');
      setPage(1);
   };

   const hasFilters = Boolean(search.trim() || statusFilter);

   const totalPages = Math.max(1, Math.ceil(referrals.length / PAGE_SIZE));
   const currentPage = Math.min(page, totalPages);
   const pageStart = (currentPage - 1) * PAGE_SIZE;
   const visibleReferrals = referrals.slice(pageStart, pageStart + PAGE_SIZE);

   /* ---- details modal values ---- */

   const history = detail?.history ? [...detail.history].reverse() : [];
   const detailProfile = detail?.referral?.osy_profile ?? detailTarget?.osy_profile;

   const detailFields = detailTarget
      ? [
           ['Training program', detailTarget.training_program ? programName(detailTarget.training_program) : '-'],
           ['Date referred', formatDate(detailTarget.created_at, true)],
           ['Reviewed by', detail?.referral?.reviewer?.name ?? (detailLoading ? 'Loading...' : '-')],
           ['Address', detailProfile?.address],
           ['Preferred career', detailProfile?.preferred_career],
        ].filter(([, value]) => value)
      : [];

   /* ---- render ---- */

   return (
      <>
         <div className='barangayReferralManagementBody'>
            <SkOfficialSideBar />

            <div className='barangayMainContent'>

               <div className='referralManagementTopPart'>
                  <h1>Referral Management</h1>
                  <p>Refer out-of-school youth to MAXIMA training programs and follow each referral.</p>
               </div>

               {notice && <p className='referralNotice' role='status'>{notice}</p>}

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
                     <div className='referralToolbarLeft'>
                        <div className='referralSearchBox'>
                           <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' aria-hidden='true'>
                              <circle cx='11' cy='11' r='7' />
                              <line x1='21' y1='21' x2='16.65' y2='16.65' />
                           </svg>
                           <input
                              type='search'
                              placeholder='Search referrals by OSY name'
                              value={search}
                              onChange={(e) => changeSearch(e.target.value)}
                              aria-label='Search referrals by OSY name'
                           />
                        </div>

                        {hasFilters && (
                           <button type='button' className='referralLinkBtn' onClick={clearFilters}>
                              Clear filters
                           </button>
                        )}
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
                                 ? 'No referrals match your search or filter.'
                                 : 'Select "Create referral" to refer an OSY to MAXIMA.'}
                           </p>
                        </div>
                     )}

                     {referrals.length > 0 && (
                        <>
                           <div className='referralTableWrap'>
                              <table className='referralTable'>
                                 <thead>
                                    <tr>
                                       <th>OSY</th>
                                       <th>Program</th>
                                       <th>Remarks</th>
                                       <th>Date referred</th>
                                       <th>Status</th>
                                       <th>Actions</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {visibleReferrals.map((r) => (
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
                                                {statusLabel(r.status)}
                                             </span>
                                          </td>
                                          <td>
                                             <div className='referralActions'>
                                                <button
                                                   type='button'
                                                   className='referralRowBtn'
                                                   onClick={() => openDetail(r)}
                                                >
                                                   View
                                                </button>
                                                {r.status === 'Referred' && (
                                                   <button
                                                      type='button'
                                                      className='referralRowDeleteBtn'
                                                      onClick={() => setDeleteTarget(r)}
                                                   >
                                                      Delete
                                                   </button>
                                                )}
                                             </div>
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>

                           {referrals.length > PAGE_SIZE && (
                              <div className='referralPager'>
                                 <span className='referralPagerInfo'>
                                    Showing {pageStart + 1}-{pageStart + visibleReferrals.length} of {referrals.length}
                                 </span>
                                 <div className='referralPagerBtns'>
                                    <button
                                       type='button'
                                       className='referralSecondaryBtn referralPagerBtn'
                                       onClick={() => setPage(currentPage - 1)}
                                       disabled={currentPage === 1}
                                    >
                                       Previous
                                    </button>
                                    <span className='referralPagerInfo'>Page {currentPage} of {totalPages}</span>
                                    <button
                                       type='button'
                                       className='referralSecondaryBtn referralPagerBtn'
                                       onClick={() => setPage(currentPage + 1)}
                                       disabled={currentPage === totalPages}
                                    >
                                       Next
                                    </button>
                                 </div>
                              </div>
                           )}
                        </>
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
                                 <div className='referralSelectedText'>
                                    <span className='referralPersonName'>{fullName(selectedOsy)}</span>
                                    {(selectedOsy.address || selectedOsy.preferred_career) && (
                                       <span className='referralOptionMeta'>
                                          {[selectedOsy.address, selectedOsy.preferred_career].filter(Boolean).join(' · ')}
                                       </span>
                                    )}
                                 </div>
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
                                          {(o.address || o.preferred_career) && (
                                             <span className='referralOptionMeta'>
                                                {[o.address, o.preferred_career].filter(Boolean).join(' · ')}
                                             </span>
                                          )}
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

         {/* Referral details modal (clicking outside does not close it) */}
         {detailTarget && (
            <div className='referralModalOverlay'>
               <div
                  className='referralModal referralDetailModal'
                  role='dialog'
                  aria-modal='true'
                  aria-labelledby='referralDetailTitle'
               >
                  <div className='referralModalHeader'>
                     <div>
                        <h2 id='referralDetailTitle'>Referral details</h2>
                        <p>Review this referral and its status history.</p>
                     </div>
                     <button
                        type='button'
                        className='referralIconBtn'
                        onClick={closeDetailModal}
                        aria-label='Close'
                     >
                        <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
                           <line x1='18' y1='6' x2='6' y2='18' />
                           <line x1='6' y1='6' x2='18' y2='18' />
                        </svg>
                     </button>
                  </div>

                  <div className='referralModalBody'>
                     <div className='referralDetailTop'>
                        <span className='referralAvatar referralAvatarLg'>{initials(detailTarget.osy_profile)}</span>
                        <div className='referralDetailTopText'>
                           <div className='referralDetailName'>{fullName(detailTarget.osy_profile)}</div>
                           <span className={`referralStatusBadge ${BADGE_CLASS[detailTarget.status] ?? ''}`}>
                              {statusLabel(detailTarget.status)}
                           </span>
                        </div>
                     </div>

                     <div className='referralDetailGrid'>
                        {detailFields.map(([label, value]) => (
                           <div key={label} className='referralDetailItem'>
                              <div className='referralDetailLabel'>{label}</div>
                              <div className='referralDetailValue'>{value}</div>
                           </div>
                        ))}
                     </div>

                     <div className='referralDetailItem'>
                        <div className='referralDetailLabel'>
                           {detailTarget.status === 'Rejected' ? 'Reason for rejection' : 'Remarks'}
                        </div>
                        <div className='referralDetailValue referralDetailRemarks'>
                           {detailTarget.remarks || '-'}
                        </div>
                     </div>

                     <div className='referralHistory'>
                        <div className='referralHistoryTitle'>Status history</div>

                        {detailLoading && <p className='referralOptionEmpty'>Loading history...</p>}

                        {detailError && <p className='referralFormError' role='alert'>{detailError}</p>}

                        {!detailLoading && !detailError && history.length === 0 && (
                           <p className='referralOptionEmpty'>No history recorded yet.</p>
                        )}

                        {history.length > 0 && (
                           <ol className='referralTimeline'>
                              {history.map((h, i) => (
                                 <li key={`${h.status}-${h.created_at}-${i}`} className='referralTimelineItem'>
                                    <span className='referralTimelineDot' />
                                    <div className='referralTimelineBody'>
                                       <div className='referralTimelineStatus'>{statusLabel(h.status)}</div>
                                       <div className='referralTimelineMeta'>
                                          {formatDate(h.created_at, true)}
                                          {h.changed_by ? ` · ${h.changed_by}` : ''}
                                       </div>
                                       {h.remarks && <div className='referralTimelineRemarks'>{h.remarks}</div>}
                                    </div>
                                 </li>
                              ))}
                           </ol>
                        )}
                     </div>
                  </div>

                  <div className='referralModalFooter'>
                     <button type='button' className='referralSecondaryBtn' onClick={closeDetailModal}>
                        Close
                     </button>
                     {detailTarget.status === 'Referred' && (
                        <button type='button' className='referralDangerBtn' onClick={openDeleteFromDetail}>
                           Delete referral
                        </button>
                     )}
                  </div>
               </div>
            </div>
         )}

         {/* Delete referral modal (clicking outside does not close it) */}
         {deleteTarget && (
            <div className='referralModalOverlay'>
               <div
                  className='referralModal referralConfirmModal'
                  role='alertdialog'
                  aria-modal='true'
                  aria-labelledby='referralDeleteTitle'
               >
                  <div className='referralModalHeader'>
                     <div>
                        <h2 id='referralDeleteTitle'>Delete referral</h2>
                        <p>This cannot be undone.</p>
                     </div>
                     <button
                        type='button'
                        className='referralIconBtn'
                        onClick={closeDeleteModal}
                        disabled={deleting}
                        aria-label='Close'
                     >
                        <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
                           <line x1='18' y1='6' x2='6' y2='18' />
                           <line x1='6' y1='6' x2='18' y2='18' />
                        </svg>
                     </button>
                  </div>

                  <div className='referralModalBody'>
                     <p className='referralConfirmText'>
                        Delete the referral of <strong>{fullName(deleteTarget.osy_profile)}</strong> to{' '}
                        <strong>{programName(deleteTarget.training_program)}</strong>? The OSY will be
                        notified if they have an account.
                     </p>

                     {deleteError && <p className='referralFormError' role='alert'>{deleteError}</p>}
                  </div>

                  <div className='referralModalFooter'>
                     <button type='button' className='referralSecondaryBtn' onClick={closeDeleteModal} disabled={deleting}>
                        Cancel
                     </button>
                     <button type='button' className='referralDangerBtn' onClick={confirmDelete} disabled={deleting}>
                        {deleting ? 'Deleting...' : 'Delete referral'}
                     </button>
                  </div>
               </div>
            </div>
         )}
      </>
   );
}

export default BarangayReferralManagement;