import { useEffect, useState } from 'react';
import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaReferrals.css';


/* -------------------------------------------------------------------------- */
/* API helpers (Sanctum cookie + CSRF, same as BarangayOsyManagement)         */
/* -------------------------------------------------------------------------- */

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
      throw new ApiError(
         data?.message ?? `Request failed (${res.status})`,
         res.status,
         data
      );
   }

   return data;
}


/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

// current status => statuses Maxima can move it to
const NEXT = {
   'Referred': ['Accepted by TESDA', 'Rejected'],
   'Accepted by TESDA': ['Training Started'],
   'Training Started': ['Completed'],
};

// the path a referral follows once it is accepted
const STEPS = [
   'Referred',
   'Accepted by TESDA',
   'Training Started',
   'Completed',
];

const BADGE_CLASS = {
   'Registered': 'referralBadgePending',
   'Validated': 'referralBadgePending',
   'Referred': 'referralBadgePending',
   'Accepted by TESDA': 'referralBadgeAccepted',
   'Training Started': 'referralBadgeTraining',
   'Completed': 'referralBadgeCompleted',
   'Rejected': 'referralBadgeRejected',
};

const FILTERS = [
   { value: '', label: 'All' },
   { value: 'pending', label: 'Pending' },
   { value: 'approved', label: 'Approved' },
   { value: 'rejected', label: 'Rejected' },
];


/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function fullName(osy) {
   if (!osy) return '—';

   return [osy.first_name, osy.middle_name, osy.last_name]
      .filter(Boolean)
      .join(' ');
}

function initials(osy) {
   if (!osy) return '?';

   const letters = `${osy.first_name?.[0] ?? ''}${osy.last_name?.[0] ?? ''}`;
   return letters.toUpperCase() || '?';
}

function programName(program) {
   return program?.title ?? program?.name ?? '—';
}

function formatDate(date) {
   return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
   });
}


/* -------------------------------------------------------------------------- */
/* Small components                                                           */
/* -------------------------------------------------------------------------- */

function StatCard({ variant, number, label, note }) {
   return (
      <div className={`referralStat referralStat${variant}`}>
         <span className='referralStatNumber'>{number}</span>
         <span className='referralStatLabel'>{label}</span>
         <span className='referralStatNote'>{note}</span>
      </div>
   );
}

function StatusBadge({ status }) {
   return (
      <span className={`referralBadge ${BADGE_CLASS[status] ?? ''}`}>
         {status}
      </span>
   );
}

function Detail({ label, value }) {
   return (
      <div className='referralDetailItem'>
         <dt className='referralDetailLabel'>{label}</dt>
         <dd className='referralDetailValue'>{value || '—'}</dd>
      </div>
   );
}

function ReferralRow({ referral, onOpen }) {
   const canReview = Boolean(NEXT[referral.status]);

   return (
      <tr>
         <td>
            <div className='referralOsyCell'>
               <span className='referralAvatar'>
                  {initials(referral.osy_profile)}
               </span>

               <div>
                  <div className='referralOsyName'>
                     {fullName(referral.osy_profile)}
                  </div>
                  <div className='referralOsySub'>
                     {referral.osy_profile?.address ?? ''}
                  </div>
               </div>
            </div>
         </td>

         <td>{programName(referral.training_program)}</td>
         <td>{referral.referrer?.name ?? '—'}</td>
         <td>{formatDate(referral.created_at)}</td>

         <td>
            <StatusBadge status={referral.status} />
         </td>

         <td className='referralActionCell'>
            <button
               type='button'
               className={`referralBtn referralBtnSm ${canReview ? 'referralBtnPrimary' : 'referralBtnGhost'}`}
               onClick={() => onOpen(referral)}
            >
               {canReview ? 'Review' : 'View'}
            </button>
         </td>
      </tr>
   );
}


/* -------------------------------------------------------------------------- */
/* Review modal (does not close when clicking outside)                        */
/* -------------------------------------------------------------------------- */

function ReferralModal({
   referral,
   remarks,
   onRemarksChange,
   saving,
   pendingStatus,
   error,
   onClose,
   onAction,
}) {
   // "Rejected" goes first so the main (primary) action sits on the far right
   const actions = [...(NEXT[referral.status] ?? [])].sort(
      (a, b) => (b === 'Rejected' ? 1 : 0) - (a === 'Rejected' ? 1 : 0)
   );
   const stepIndex = STEPS.indexOf(referral.status);
   const osy = referral.osy_profile;

   // Escape closes the modal (onClose is ignored while saving).
   // Remove this effect if you don't want Escape to close it either.
   useEffect(() => {
      function handleKeyDown(e) {
         if (e.key === 'Escape') onClose();
      }

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
   }, [onClose]);

   return (
      <div className='referralModalOverlay'>
         <div
            className='referralModal'
            role='dialog'
            aria-modal='true'
            aria-labelledby='referralModalTitle'
         >

            {/* Header */}
            <div className='referralModalHeader'>
               <div className='referralOsyCell'>
                  <span className='referralAvatar referralAvatarLarge'>
                     {initials(osy)}
                  </span>

                  <div>
                     <h2 id='referralModalTitle' className='referralModalTitle'>
                        {fullName(osy)}
                     </h2>
                     <p className='referralModalSub'>
                        Referred {formatDate(referral.created_at)}
                     </p>
                  </div>
               </div>

               <div className='referralModalHeaderRight'>
                  <StatusBadge status={referral.status} />

                  <button
                     type='button'
                     className='referralModalClose'
                     onClick={onClose}
                     disabled={saving}
                     aria-label='Close'
                  >
                     ✕
                  </button>
               </div>
            </div>

            {/* Body */}
            <div className='referralModalBody'>

               {/* Progress */}
               <div className='referralSection'>
                  <span className='referralSectionTitle'>Referral progress</span>

                  {referral.status === 'Rejected' ? (
                     <div className='referralRejectedNote'>
                        This referral was rejected.
                     </div>
                  ) : (
                     <ol className='referralSteps' aria-label='Referral progress'>
                        {STEPS.map((step, index) => {
                           let state = 'Todo';
                           if (index < stepIndex) state = 'Done';
                           if (index === stepIndex) state = 'Active';

                           return (
                              <li
                                 key={step}
                                 className={`referralStep referralStep${state}`}
                              >
                                 <span className='referralStepDot'>
                                    {index < stepIndex ? '✓' : index + 1}
                                 </span>
                                 <span className='referralStepLabel'>{step}</span>
                              </li>
                           );
                        })}
                     </ol>
                  )}
               </div>

               {/* Details */}
               <div className='referralSection'>
                  <span className='referralSectionTitle'>Referral details</span>

                  <dl className='referralDetailGrid'>
                     <Detail
                        label='Program'
                        value={programName(referral.training_program)}
                     />
                     <Detail
                        label='Referred by'
                        value={referral.referrer?.name}
                     />
                     <Detail
                        label='Address'
                        value={osy?.address}
                     />
                     <Detail
                        label='Contact number'
                        value={osy?.contact_number}
                     />
                     <Detail
                        label='Preferred career'
                        value={osy?.preferred_career}
                     />
                     <Detail
                        label='Reviewed by'
                        value={referral.reviewer?.name}
                     />
                  </dl>
               </div>

               {/* Previous remarks */}
               {referral.remarks && (
                  <div className='referralSection'>
                     <span className='referralSectionTitle'>Previous remarks</span>

                     <div className='referralRemarksBox'>
                        <p>{referral.remarks}</p>
                     </div>
                  </div>
               )}

               {/* Review decision */}
               {actions.length > 0 && (
                  <div className='referralSection'>
                     <span className='referralSectionTitle'>Your review</span>

                     <div className='referralField'>
                        <label className='referralLabel' htmlFor='referralRemarks'>
                           Remarks{' '}
                           {actions.includes('Rejected') ? (
                              <span className='referralHint'>(required if rejecting)</span>
                           ) : (
                              <span className='referralHint'>(optional)</span>
                           )}
                        </label>

                        <textarea
                           id='referralRemarks'
                           className='referralTextarea'
                           rows={3}
                           placeholder='Add a note about your decision'
                           value={remarks}
                           onChange={(e) => onRemarksChange(e.target.value)}
                           disabled={saving}
                        />
                     </div>
                  </div>
               )}

               {error && (
                  <div className='referralFormError' role='alert'>
                     {error}
                  </div>
               )}

            </div>

            {/* Footer */}
            <div className='referralModalFooter'>
               <button
                  type='button'
                  className='referralBtn referralBtnGhost'
                  onClick={onClose}
                  disabled={saving}
               >
                  Close
               </button>

               {actions.map((status) => (
                  <button
                     key={status}
                     type='button'
                     className={`referralBtn ${status === 'Rejected' ? 'referralBtnDanger' : 'referralBtnPrimary'}`}
                     onClick={() => onAction(status)}
                     disabled={saving}
                  >
                     {saving && pendingStatus === status
                        ? 'Saving…'
                        : status === 'Rejected'
                           ? 'Reject'
                           : `Mark as ${status}`}
                  </button>
               ))}
            </div>

         </div>
      </div>
   );
}


/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

function MaximaReferrals() {
   // List
   const [referrals, setReferrals] = useState([]);
   const [counts, setCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
   const [filter, setFilter] = useState('');
   const [search, setSearch] = useState('');
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');

   // Review modal
   const [selected, setSelected] = useState(null);
   const [remarks, setRemarks] = useState('');
   const [saving, setSaving] = useState(false);
   const [pendingStatus, setPendingStatus] = useState(null);
   const [actionError, setActionError] = useState('');

   const total = counts.pending + counts.approved + counts.rejected;
   const filterCounts = { '': total, ...counts };

   /* ---- data loading ---- */

   async function loadReferrals() {
      try {
         setLoading(true);

         const params = new URLSearchParams();
         if (filter) params.append('status', filter);
         if (search) params.append('search', search);

         const data = await apiFetch(`/api/maxima/referrals?${params}`);

         setReferrals(data.referrals);
         setCounts(data.counts);
         setError('');
      } catch (err) {
         setError(
            err.status === 403
               ? 'You do not have permission to view referrals.'
               : 'Could not load referrals.'
         );
      } finally {
         setLoading(false);
      }
   }

   // Reload when the filter changes, and (debounced) while typing in search
   useEffect(() => {
      const timer = setTimeout(loadReferrals, 300);
      return () => clearTimeout(timer);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [filter, search]);

   /* ---- modal actions ---- */

   function openReferral(referral) {
      setSelected(referral);
      setRemarks('');
      setActionError('');
      setPendingStatus(null);
   }

   function closeReferral() {
      if (saving) return;

      setSelected(null);
      setRemarks('');
      setActionError('');
      setPendingStatus(null);
   }

   async function updateStatus(status) {
      if (status === 'Rejected' && !remarks.trim()) {
         setActionError('Enter a reason before rejecting this referral.');
         return;
      }

      try {
         setSaving(true);
         setPendingStatus(status);
         setActionError('');

         await apiFetch(`/api/maxima/referrals/${selected.id}/status`, {
            method: 'PATCH',
            body: { status, remarks },
         });

         setSelected(null);
         setRemarks('');
         await loadReferrals();
      } catch (err) {
         setActionError(err.message || 'Could not update this referral.');
      } finally {
         setSaving(false);
         setPendingStatus(null);
      }
   }

   /* ---- render ---- */

   return (
      <>
         <div className='maximaDashboardBody'>

            <MaximaSideBar />

            <div className='maximaReferralMainDiv'>

               <div className='maximaReferralMainDivTop'>
                  <h1>REFERRAL REQUEST</h1>
                  <p>Review and manage OSY referral requests from barangay.</p>
               </div>

               <div className='maximaReferralMainDivBot'>
                  <div className='referralContent'>

                     {/* Summary cards */}
                     <div className='referralStats'>
                        <StatCard
                           variant='Pending'
                           number={counts.pending}
                           label='Pending'
                           note='Waiting for a decision'
                        />
                        <StatCard
                           variant='Approved'
                           number={counts.approved}
                           label='Approved'
                           note='Accepted, in training, or done'
                        />
                        <StatCard
                           variant='Rejected'
                           number={counts.rejected}
                           label='Rejected'
                           note='Declined referrals'
                        />
                     </div>

                     {/* Search, filters, and table */}
                     <div className='referralPanel'>

                        <div className='referralToolbar'>
                           <div className='referralSearch'>
                              <svg
                                 className='referralSearchIcon'
                                 viewBox='0 0 20 20'
                                 width='16'
                                 height='16'
                                 aria-hidden='true'
                              >
                                 <circle
                                    cx='9'
                                    cy='9'
                                    r='6'
                                    fill='none'
                                    stroke='currentColor'
                                    strokeWidth='1.8'
                                 />
                                 <path
                                    d='M14 14l4 4'
                                    stroke='currentColor'
                                    strokeWidth='1.8'
                                    strokeLinecap='round'
                                 />
                              </svg>

                              <input
                                 type='text'
                                 className='referralSearchInput'
                                 placeholder='Search by OSY name'
                                 aria-label='Search referrals by OSY name'
                                 value={search}
                                 onChange={(e) => setSearch(e.target.value)}
                              />
                           </div>

                           <div
                              className='referralFilters'
                              role='group'
                              aria-label='Filter by status'
                           >
                              {FILTERS.map(({ value, label }) => (
                                 <button
                                    key={label}
                                    type='button'
                                    className={`referralFilterBtn ${filter === value ? 'referralFilterBtnActive' : ''}`}
                                    aria-pressed={filter === value}
                                    onClick={() => setFilter(value)}
                                 >
                                    {label}
                                    <span className='referralFilterCount'>
                                       {filterCounts[value]}
                                    </span>
                                 </button>
                              ))}
                           </div>
                        </div>

                        {loading && (
                           <div className='referralState'>Loading referrals…</div>
                        )}

                        {error && (
                           <div className='referralState referralStateError' role='alert'>
                              {error}
                           </div>
                        )}

                        {!loading && !error && referrals.length === 0 && (
                           <div className='referralState'>
                              <strong>No referrals found</strong>
                              <span>Try a different name or status filter.</span>
                           </div>
                        )}

                        {!loading && referrals.length > 0 && (
                           <div className='referralTableWrap'>
                              <table className='referralTable'>
                                 <thead>
                                    <tr>
                                       <th scope='col'>OSY</th>
                                       <th scope='col'>Program</th>
                                       <th scope='col'>Referred by</th>
                                       <th scope='col'>Date</th>
                                       <th scope='col'>Status</th>
                                       <th scope='col' aria-label='Actions'></th>
                                    </tr>
                                 </thead>

                                 <tbody>
                                    {referrals.map((referral) => (
                                       <ReferralRow
                                          key={referral.id}
                                          referral={referral}
                                          onOpen={openReferral}
                                       />
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        )}

                     </div>
                  </div>
               </div>

            </div>

            {selected && (
               <ReferralModal
                  referral={selected}
                  remarks={remarks}
                  onRemarksChange={setRemarks}
                  saving={saving}
                  pendingStatus={pendingStatus}
                  error={actionError}
                  onClose={closeReferral}
                  onAction={updateStatus}
               />
            )}

         </div>
      </>
   );
}

export default MaximaReferrals;