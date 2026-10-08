import { useEffect, useState } from 'react';
import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaEnrollees.css';

function getCookie(name) {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? decodeURIComponent(match[2]) : null;
}

async function ensureCsrfCookie() {
   await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
}

const NEXT_STATUS = {
   'Accepted by Maxima': 'Training Started',
   'Training Started': 'Completed',
};

const NEXT_LABEL = {
   'Accepted by Maxima': 'Start Training',
   'Training Started': 'Mark Completed',
};

const STATUS_CLASS = {
   'Accepted by Maxima': 'enrolleesBadgeAccepted',
   'Training Started': 'enrolleesBadgeOngoing',
   Completed: 'enrolleesBadgeCompleted',
};

const STATUS_LABEL = {
   'Accepted by Maxima': 'Accepted',
   'Training Started': 'Ongoing',
   Completed: 'Completed',
};

// profile fields that are internal or already shown in the modal header
const HIDDEN_PROFILE_FIELDS = [
   'id',
   'user_id',
   'first_name',
   'middle_name',
   'last_name',
   'created_at',
   'updated_at',
   'deleted_at',
   'password',
];

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T.*)?$/;

function formatDate(value) {
   if (!value) return '—';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '—';
   return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value) {
   if (!value) return '—';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '—';
   return date.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
   });
}

function formatLabel(key) {
   return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value) {
   if (value === null || value === undefined || value === '') return '—';
   if (typeof value === 'boolean') return value ? 'Yes' : 'No';
   if (Array.isArray(value)) {
      if (value.length === 0) return '—';
      return value
         .map((item) =>
            typeof item === 'object' && item !== null
               ? item.name ?? item.title ?? JSON.stringify(item)
               : String(item)
         )
         .join(', ');
   }
   if (typeof value === 'object') return value.name ?? value.title ?? JSON.stringify(value);
   if (typeof value === 'string' && ISO_DATE.test(value)) return formatDate(value);
   return String(value);
}

function fullName(profile) {
   if (!profile) return 'N/A';
   return [profile.first_name, profile.middle_name, profile.last_name]
      .filter(Boolean)
      .join(' ');
}

function initials(profile) {
   if (!profile) return '?';
   return `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '?';
}

function MaximaEnrollees() {
   const [enrollees, setEnrollees] = useState([]);
   const [counts, setCounts] = useState({ accepted: 0, ongoing: 0, completed: 0 });
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState('');
   const [updatingId, setUpdatingId] = useState(null);
   const [selected, setSelected] = useState(null);

   useEffect(() => {
      fetchEnrollees();
   }, [search, statusFilter]);

   // Close the details modal with the Escape key (never by clicking outside)
   useEffect(() => {
      if (!selected) return;
      function onKeyDown(e) {
         if (e.key === 'Escape') setSelected(null);
      }
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
   }, [selected]);

   async function fetchEnrollees() {
      setError(null);
      try {
         const params = new URLSearchParams();
         if (search.trim()) params.append('search', search.trim());
         if (statusFilter) params.append('status', statusFilter);

         const res = await fetch(`/api/maxima/enrollees?${params.toString()}`, {
            headers: { Accept: 'application/json' },
            credentials: 'include',
         });
         if (!res.ok) throw new Error('Could not load enrollees.');
         const data = await res.json();
         setEnrollees(data.enrollees ?? []);
         setCounts(data.counts ?? { accepted: 0, ongoing: 0, completed: 0 });
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   }

   async function advanceStatus(enrollee) {
      const next = NEXT_STATUS[enrollee.status];
      if (!next) return;

      setUpdatingId(enrollee.id);
      setError(null);
      try {
         await ensureCsrfCookie();

         const res = await fetch(`/api/maxima/referrals/${enrollee.id}/status`, {
            method: 'PATCH',
            credentials: 'include',
            headers: {
               Accept: 'application/json',
               'Content-Type': 'application/json',
               'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
            },
            body: JSON.stringify({ status: next }),
         });

         if (!res.ok) {
            const responseBody = await res.json().catch(() => null);
            throw new Error(responseBody?.message ?? 'Could not update the status.');
         }

         setSelected(null);
         await fetchEnrollees();
      } catch (err) {
         setError(err.message);
      } finally {
         setUpdatingId(null);
      }
   }

   const total = counts.accepted + counts.ongoing + counts.completed;

   const profileEntries = selected?.osy_profile
      ? Object.entries(selected.osy_profile).filter(
            ([key, value]) =>
               !HIDDEN_PROFILE_FIELDS.includes(key) && !(key.endsWith('_id') && typeof value !== 'object')
         )
      : [];

   return (
      <>
         <div className='maximaDashboardBody'>
            <MaximaSideBar/>

            <div className='maximaEnrolleesMainContent'>
               <div className='enrolleesPage'>
                  <div className='enrolleesHeader'>
                     <div>
                        <h1 className='enrolleesTitle'>Enrollees</h1>
                        <p className='enrolleesSubtitle'>
                           Out-of-school youth accepted into your training programs.
                        </p>
                     </div>
                  </div>

                  <div className='enrolleesSummary'>
                     <div className='enrolleesSummaryCard enrolleesSummaryTotal'>
                        <span className='enrolleesSummaryLabel'>Total enrollees</span>
                        <span className='enrolleesSummaryValue'>{total}</span>
                     </div>
                     <div className='enrolleesSummaryCard enrolleesSummaryAccepted'>
                        <span className='enrolleesSummaryLabel'>Accepted</span>
                        <span className='enrolleesSummaryValue'>{counts.accepted}</span>
                     </div>
                     <div className='enrolleesSummaryCard enrolleesSummaryOngoing'>
                        <span className='enrolleesSummaryLabel'>Ongoing training</span>
                        <span className='enrolleesSummaryValue'>{counts.ongoing}</span>
                     </div>
                     <div className='enrolleesSummaryCard enrolleesSummaryCompleted'>
                        <span className='enrolleesSummaryLabel'>Completed</span>
                        <span className='enrolleesSummaryValue'>{counts.completed}</span>
                     </div>
                  </div>

                  <div className='enrolleesPanel'>
                     <div className='enrolleesToolbar'>
                        <input
                           className='enrolleesSearch'
                           type='text'
                           placeholder='Search by enrollee name...'
                           value={search}
                           onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                           className='enrolleesFilter'
                           value={statusFilter}
                           onChange={(e) => setStatusFilter(e.target.value)}
                        >
                           <option value=''>All statuses</option>
                           <option value='Accepted by Maxima'>Accepted</option>
                           <option value='Training Started'>Ongoing</option>
                           <option value='Completed'>Completed</option>
                        </select>
                     </div>

                     {error && <p className='enrolleesError'>{error}</p>}

                     {loading ? (
                        <p className='enrolleesEmpty'>Loading enrollees...</p>
                     ) : enrollees.length === 0 ? (
                        <p className='enrolleesEmpty'>No enrollees found.</p>
                     ) : (
                        <div className='enrolleesTableWrap'>
                           <table className='enrolleesTable'>
                              <thead>
                                 <tr>
                                    <th>Enrollee</th>
                                    <th>Program</th>
                                    <th>Referred by</th>
                                    <th>Date accepted</th>
                                    <th>Status</th>
                                    <th className='enrolleesActionsHead'>Actions</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {enrollees.map((e) => (
                                    <tr key={e.id}>
                                       <td>
                                          <div className='enrolleesPerson'>
                                             <span className='enrolleesAvatar'>{initials(e.osy_profile)}</span>
                                             <span className='enrolleesPersonName'>{fullName(e.osy_profile)}</span>
                                          </div>
                                       </td>
                                       <td>{e.training_program?.name ?? 'N/A'}</td>
                                       <td>{e.referrer?.name ?? 'N/A'}</td>
                                       <td>{formatDate(e.accepted_at)}</td>
                                       <td>
                                          <span className={`enrolleesBadge ${STATUS_CLASS[e.status] ?? ''}`}>
                                             {STATUS_LABEL[e.status] ?? e.status}
                                          </span>
                                       </td>
                                       <td>
                                          <div className='enrolleesActions'>
                                             <button
                                                className='enrolleesViewBtn'
                                                onClick={() => setSelected(e)}
                                             >
                                                View details
                                             </button>
                                             {NEXT_STATUS[e.status] && (
                                                <button
                                                   className='enrolleesActionBtn'
                                                   onClick={() => advanceStatus(e)}
                                                   disabled={updatingId === e.id}
                                                >
                                                   {updatingId === e.id ? 'Saving...' : NEXT_LABEL[e.status]}
                                                </button>
                                             )}
                                          </div>
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

         {selected && (
            <div className='enrolleesModalOverlay'>
               <div className='enrolleesModal' role='dialog' aria-modal='true'>
                  <div className='enrolleesModalHeader'>
                     <div className='enrolleesModalIdentity'>
                        <span className='enrolleesAvatar enrolleesAvatarLarge'>
                           {initials(selected.osy_profile)}
                        </span>
                        <div>
                           <h2 className='enrolleesModalName'>{fullName(selected.osy_profile)}</h2>
                           <span className={`enrolleesBadge ${STATUS_CLASS[selected.status] ?? ''}`}>
                              {STATUS_LABEL[selected.status] ?? selected.status}
                           </span>
                        </div>
                     </div>
                     <button
                        className='enrolleesModalClose'
                        onClick={() => setSelected(null)}
                        aria-label='Close'
                     >
                        &times;
                     </button>
                  </div>

                  <div className='enrolleesModalBody'>
                     <section className='enrolleesSection'>
                        <h3 className='enrolleesSectionTitle'>Personal information</h3>
                        {profileEntries.length === 0 ? (
                           <p className='enrolleesMuted'>No profile details available.</p>
                        ) : (
                           <div className='enrolleesDetailGrid'>
                              {profileEntries.map(([key, value]) => (
                                 <div className='enrolleesDetailItem' key={key}>
                                    <span className='enrolleesDetailLabel'>{formatLabel(key)}</span>
                                    <span className='enrolleesDetailValue'>{formatValue(value)}</span>
                                 </div>
                              ))}
                           </div>
                        )}
                     </section>

                     <section className='enrolleesSection'>
                        <h3 className='enrolleesSectionTitle'>Training program</h3>
                        <div className='enrolleesDetailGrid'>
                           <div className='enrolleesDetailItem'>
                              <span className='enrolleesDetailLabel'>Program</span>
                              <span className='enrolleesDetailValue'>
                                 {formatValue(selected.training_program?.name)}
                              </span>
                           </div>
                           <div className='enrolleesDetailItem'>
                              <span className='enrolleesDetailLabel'>Schedule</span>
                              <span className='enrolleesDetailValue'>
                                 {formatValue(selected.training_program?.schedule)}
                              </span>
                           </div>
                           <div className='enrolleesDetailItem enrolleesDetailWide'>
                              <span className='enrolleesDetailLabel'>Requirements</span>
                              <span className='enrolleesDetailValue'>
                                 {formatValue(selected.training_program?.requirements)}
                              </span>
                           </div>
                        </div>
                     </section>

                     <section className='enrolleesSection'>
                        <h3 className='enrolleesSectionTitle'>Referral information</h3>
                        <div className='enrolleesDetailGrid'>
                           <div className='enrolleesDetailItem'>
                              <span className='enrolleesDetailLabel'>Referred by</span>
                              <span className='enrolleesDetailValue'>{formatValue(selected.referrer?.name)}</span>
                           </div>
                           <div className='enrolleesDetailItem'>
                              <span className='enrolleesDetailLabel'>Reviewed by</span>
                              <span className='enrolleesDetailValue'>{formatValue(selected.reviewer?.name)}</span>
                           </div>
                           <div className='enrolleesDetailItem'>
                              <span className='enrolleesDetailLabel'>Date referred</span>
                              <span className='enrolleesDetailValue'>{formatDate(selected.created_at)}</span>
                           </div>
                           <div className='enrolleesDetailItem'>
                              <span className='enrolleesDetailLabel'>Date accepted</span>
                              <span className='enrolleesDetailValue'>{formatDate(selected.accepted_at)}</span>
                           </div>
                           <div className='enrolleesDetailItem enrolleesDetailWide'>
                              <span className='enrolleesDetailLabel'>Remarks</span>
                              <span className='enrolleesDetailValue'>{formatValue(selected.remarks)}</span>
                           </div>
                        </div>
                     </section>

                     <section className='enrolleesSection'>
                        <h3 className='enrolleesSectionTitle'>Status history</h3>
                        {(selected.history ?? []).length === 0 ? (
                           <p className='enrolleesMuted'>No status history recorded.</p>
                        ) : (
                           <ul className='enrolleesTimeline'>
                              {selected.history.map((h, index) => (
                                 <li className='enrolleesTimelineItem' key={index}>
                                    <span className='enrolleesTimelineDot'></span>
                                    <div className='enrolleesTimelineContent'>
                                       <span className='enrolleesTimelineStatus'>{h.status}</span>
                                       <span className='enrolleesTimelineMeta'>
                                          {formatDateTime(h.created_at)}
                                          {h.changed_by ? ` · ${h.changed_by}` : ''}
                                       </span>
                                       {h.remarks && (
                                          <span className='enrolleesTimelineRemarks'>{h.remarks}</span>
                                       )}
                                    </div>
                                 </li>
                              ))}
                           </ul>
                        )}
                     </section>
                  </div>

                  <div className='enrolleesModalFooter'>
                     <button className='enrolleesViewBtn' onClick={() => setSelected(null)}>
                        Close
                     </button>
                     {NEXT_STATUS[selected.status] && (
                        <button
                           className='enrolleesActionBtn'
                           onClick={() => advanceStatus(selected)}
                           disabled={updatingId === selected.id}
                        >
                           {updatingId === selected.id ? 'Saving...' : NEXT_LABEL[selected.status]}
                        </button>
                     )}
                  </div>
               </div>
            </div>
         )}
      </>
   );
}

export default MaximaEnrollees;