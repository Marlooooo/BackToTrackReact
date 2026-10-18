import { useCallback, useEffect, useRef, useState } from 'react';
import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaEnrollees.css';

/* -------------------------------------------------------------------------- */
/* API helpers                                                                */
/* -------------------------------------------------------------------------- */

function getCookie(name) {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? decodeURIComponent(match[2]) : null;
}

async function ensureCsrfCookie() {
   await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
}

async function api(url, method = 'GET', body) {
   if (method !== 'GET') await ensureCsrfCookie();

   const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
         Accept: 'application/json',
         ...(body !== undefined && { 'Content-Type': 'application/json' }),
         ...(method !== 'GET' && { 'X-XSRF-TOKEN': getCookie('XSRF-TOKEN') }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
   });

   const data = await res.json().catch(() => null);
   if (!res.ok) throw new Error(data?.message ?? 'Request failed.');
   return data;
}


/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const NEXT_STATUS = {
   'Accepted by Maxima': 'start',
};

const NEXT_LABEL = {
   'Accepted by Maxima': 'Enroll',
};

const STATUS_LABEL = {
   'Accepted by Maxima': 'Accepted',
   'Training Started': 'Enrolled',
   Completed: 'Completed',
};

const STATUS_CLASS = {
   'Accepted by Maxima': 'enrolleesBadgeAccepted',
   'Training Started': 'enrolleesBadgeOngoing',
   Completed: 'enrolleesBadgeCompleted',
};

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
   'registered_by',
   'profile_photo',
   'profile_photo_url',
];

const EMPTY_COUNTS = { accepted: 0, ongoing: 0, completed: 0 };
const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T.*)?$/;
const SEARCH_DEBOUNCE_MS = 300;


/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

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

function requirementsMet(enrollee) {
   return (enrollee.documents ?? []).every((d) => d.status !== 'pending');
}


/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

function MaximaEnrollees() {
   const [enrollees, setEnrollees] = useState([]);
   const [counts, setCounts] = useState(EMPTY_COUNTS);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState('');
   const [updatingId, setUpdatingId] = useState(null);
   const [updatingDocId, setUpdatingDocId] = useState(null);

   // The open modal is looked up from the list by id, so it always shows fresh
   // data and closes by itself if the enrollee leaves the list.
   const [selectedId, setSelectedId] = useState(null);
   const selected = enrollees.find((e) => e.id === selectedId) ?? null;

   // Extra requirement for one OSY (inside the details modal)
   const [newDoc, setNewDoc] = useState('');
   const [docBusy, setDocBusy] = useState(false);

   // Default requirements modal
   const [showDefaults, setShowDefaults] = useState(false);
   const [defaults, setDefaults] = useState([]);
   const [newDefault, setNewDefault] = useState('');
   const [defaultsBusy, setDefaultsBusy] = useState(false);
   const [defaultsError, setDefaultsError] = useState('');

   // Only the newest request may update the page (older responses are ignored)
   const latestRequest = useRef(0);

   // Start with an empty box whenever a different enrollee is opened or closed
   useEffect(() => {
      setNewDoc('');
   }, [selectedId]);

   /* ---- data loading ---- */

   const fetchEnrollees = useCallback(async () => {
      const requestId = ++latestRequest.current;

      try {
         const params = new URLSearchParams();
         if (search.trim()) params.append('search', search.trim());
         if (statusFilter) params.append('status', statusFilter);

         const data = await api(`/api/maxima/enrollees?${params}`);
         if (requestId !== latestRequest.current) return;

         setEnrollees(data.enrollees ?? []);
         setCounts(data.counts ?? EMPTY_COUNTS);
         setError(null);
      } catch (err) {
         if (requestId !== latestRequest.current) return;
         setError(err.message);
      } finally {
         if (requestId === latestRequest.current) setLoading(false);
      }
   }, [search, statusFilter]);

   // Reload when the filter changes, and (debounced) while typing in search
   useEffect(() => {
      const timer = setTimeout(fetchEnrollees, SEARCH_DEBOUNCE_MS);
      return () => clearTimeout(timer);
   }, [fetchEnrollees]);

   // Escape closes whichever modal is open (never by clicking outside),
   // and the page behind it is locked while a modal is open
   const modalOpen = Boolean(selected) || showDefaults;

   useEffect(() => {
      if (!modalOpen) return undefined;

      function onKeyDown(e) {
         if (e.key !== 'Escape') return;
         if (showDefaults) {
            setShowDefaults(false);
         } else {
            setSelectedId(null);
            setError(null);
         }
      }

      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeyDown);

      return () => {
         window.removeEventListener('keydown', onKeyDown);
         document.body.style.overflow = previousOverflow;
      };
   }, [modalOpen, showDefaults]);

   /* ---- enrollee actions ---- */

   function closeDetails() {
      setSelectedId(null);
      setError(null);
   }

   async function advanceStatus(enrollee) {
      const next = NEXT_STATUS[enrollee.status];
      if (!next) return;

      setUpdatingId(enrollee.id);
      setError(null);
      try {
         await api(`/api/maxima/progress/${enrollee.id}/${next}`, 'POST', {});
         await fetchEnrollees();
      } catch (err) {
         setError(err.message);
      } finally {
         setUpdatingId(null);
      }
   }

   async function updateDocument(doc, status) {
      setUpdatingDocId(doc.id);
      setError(null);
      try {
         await api(`/api/maxima/progress/documents/${doc.id}`, 'PUT', {
            status,
            remarks: doc.remarks ?? null,
         });
         await fetchEnrollees();
      } catch (err) {
         setError(err.message);
      } finally {
         setUpdatingDocId(null);
      }
   }

   async function addRequirement() {
      const name = newDoc.trim();
      if (!name || !selected) return;

      setDocBusy(true);
      setError(null);
      try {
         await api(`/api/maxima/progress/${selected.id}/documents`, 'POST', { name });
         setNewDoc('');
         await fetchEnrollees();
      } catch (err) {
         setError(err.message);
      } finally {
         setDocBusy(false);
      }
   }

   async function removeRequirement(doc) {
      if (!window.confirm(`Remove "${doc.name}" from this OSY's requirements?`)) return;

      setUpdatingDocId(doc.id);
      setError(null);
      try {
         await api(`/api/maxima/progress/documents/${doc.id}`, 'DELETE');
         await fetchEnrollees();
      } catch (err) {
         setError(err.message);
      } finally {
         setUpdatingDocId(null);
      }
   }

   /* ---- default requirements ---- */

   async function openDefaults() {
      setShowDefaults(true);
      setDefaultsError('');
      setNewDefault('');
      try {
         setDefaults(await api('/api/maxima/default-requirements'));
      } catch (err) {
         setDefaultsError(err.message);
      }
   }

   async function addDefault() {
      const name = newDefault.trim();
      if (!name) return;

      setDefaultsBusy(true);
      setDefaultsError('');
      try {
         await api('/api/maxima/default-requirements', 'POST', { name });
         setNewDefault('');
         setDefaults(await api('/api/maxima/default-requirements'));
         await fetchEnrollees();
      } catch (err) {
         setDefaultsError(err.message);
      } finally {
         setDefaultsBusy(false);
      }
   }

   async function removeDefault(item) {
      if (!window.confirm(`Remove "${item.name}" from the default requirements? It will be removed from Accepted OSY who haven't submitted it yet.`)) {
         return;
      }

      setDefaultsBusy(true);
      setDefaultsError('');
      try {
         await api(`/api/maxima/default-requirements/${item.id}`, 'DELETE');
         setDefaults(await api('/api/maxima/default-requirements'));
         await fetchEnrollees();
      } catch (err) {
         setDefaultsError(err.message);
      } finally {
         setDefaultsBusy(false);
      }
   }

   /* ---- derived values ---- */

   const total = counts.accepted + counts.ongoing + counts.completed;

   const profileEntries = selected?.osy_profile
      ? Object.entries(selected.osy_profile).filter(
            ([key, value]) =>
               !HIDDEN_PROFILE_FIELDS.includes(key) && !(key.endsWith('_id') && typeof value !== 'object')
         )
      : [];

   /* ---- render ---- */

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

                     <button type='button' className='enrolleesActionBtn' onClick={openDefaults}>
                        Default requirements
                     </button>
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
                        <span className='enrolleesSummaryLabel'>Enrolled</span>
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
                           aria-label='Search enrollees by name'
                           value={search}
                           onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                           className='enrolleesFilter'
                           aria-label='Filter by status'
                           value={statusFilter}
                           onChange={(e) => setStatusFilter(e.target.value)}
                        >
                           <option value=''>All statuses</option>
                           <option value='Accepted by Maxima'>Accepted</option>
                           <option value='Training Started'>Enrolled</option>
                           <option value='Completed'>Completed</option>
                        </select>
                     </div>

                     {error && !selected && !showDefaults && (
                        <p className='enrolleesError' role='alert'>{error}</p>
                     )}

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
                                    <th>Requirements</th>
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
                                       <td>{e.docs_received}/{e.docs_required}</td>
                                       <td>
                                          <span className={`enrolleesBadge ${STATUS_CLASS[e.status] ?? ''}`}>
                                             {STATUS_LABEL[e.status] ?? e.status}
                                          </span>
                                       </td>
                                       <td>
                                          <div className='enrolleesActions'>
                                             <button
                                                type='button'
                                                className='enrolleesViewBtn'
                                                onClick={() => setSelectedId(e.id)}
                                             >
                                                View details
                                             </button>
                                             {NEXT_STATUS[e.status] && (
                                                <button
                                                   type='button'
                                                   className='enrolleesActionBtn'
                                                   onClick={() => advanceStatus(e)}
                                                   disabled={updatingId === e.id || !requirementsMet(e)}
                                                   title={!requirementsMet(e) ? 'Complete all requirements first' : ''}
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

         {/* Default requirements modal */}
         {showDefaults && (
            <div className='enrolleesModalOverlay'>
               <div
                  className='enrolleesModal'
                  role='dialog'
                  aria-modal='true'
                  aria-labelledby='enrolleesDefaultsTitle'
               >
                  <div className='enrolleesModalHeader'>
                     <div>
                        <h2 id='enrolleesDefaultsTitle' className='enrolleesModalName'>
                           Default requirements
                        </h2>
                        <p className='enrolleesMuted'>
                           Every OSY must complete this list before training can start.
                        </p>
                     </div>
                     <button
                        type='button'
                        className='enrolleesModalClose'
                        onClick={() => setShowDefaults(false)}
                        aria-label='Close'
                     >
                        &times;
                     </button>
                  </div>

                  <div className='enrolleesModalBody'>
                     {defaultsError && <p className='enrolleesError' role='alert'>{defaultsError}</p>}

                     <section className='enrolleesSection'>
                        <h3 className='enrolleesSectionTitle'>Current list</h3>

                        {defaults.length === 0 ? (
                           <p className='enrolleesMuted'>No default requirements yet.</p>
                        ) : (
                           <div className='enrolleesDocList'>
                              {defaults.map((item) => (
                                 <div className='enrolleesDocItem' key={item.id}>
                                    <span className='enrolleesDetailValue'>{item.name}</span>
                                    <button
                                       type='button'
                                       className='enrolleesViewBtn'
                                       onClick={() => removeDefault(item)}
                                       disabled={defaultsBusy}
                                    >
                                       Remove
                                    </button>
                                 </div>
                              ))}
                           </div>
                        )}
                     </section>

                     <section className='enrolleesSection'>
                        <h3 className='enrolleesSectionTitle'>Add a requirement</h3>
                        <div className='enrolleesActions'>
                           <input
                              className='enrolleesSearch'
                              type='text'
                              placeholder='e.g. Safety waiver'
                              aria-label='New requirement name'
                              maxLength={100}
                              value={newDefault}
                              onChange={(e) => setNewDefault(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && addDefault()}
                              disabled={defaultsBusy}
                           />
                           <button
                              type='button'
                              className='enrolleesActionBtn'
                              onClick={addDefault}
                              disabled={defaultsBusy || !newDefault.trim()}
                           >
                              Add
                           </button>
                        </div>
                        <p className='enrolleesMuted'>
                           New requirements are added as pending to every OSY who is still Accepted.
                           OSY who already started training are not affected.
                        </p>
                     </section>
                  </div>

                  <div className='enrolleesModalFooter'>
                     <button type='button' className='enrolleesViewBtn' onClick={() => setShowDefaults(false)}>
                        Close
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Enrollee details modal */}
         {selected && (
            <div className='enrolleesModalOverlay'>
               <div
                  className='enrolleesModal'
                  role='dialog'
                  aria-modal='true'
                  aria-labelledby='enrolleesDetailsTitle'
               >
                  <div className='enrolleesModalHeader'>
                     <div className='enrolleesModalIdentity'>
                        <span className='enrolleesAvatar enrolleesAvatarLarge'>
                           {initials(selected.osy_profile)}
                        </span>
                        <div>
                           <h2 id='enrolleesDetailsTitle' className='enrolleesModalName'>
                              {fullName(selected.osy_profile)}
                           </h2>
                           <span className={`enrolleesBadge ${STATUS_CLASS[selected.status] ?? ''}`}>
                              {STATUS_LABEL[selected.status] ?? selected.status}
                           </span>
                        </div>
                     </div>
                     <button
                        type='button'
                        className='enrolleesModalClose'
                        onClick={closeDetails}
                        aria-label='Close'
                     >
                        &times;
                     </button>
                  </div>

                  <div className='enrolleesModalBody'>
                     {error && <p className='enrolleesError' role='alert'>{error}</p>}

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
                        </div>
                     </section>

                     <section className='enrolleesSection'>
                        <h3 className='enrolleesSectionTitle'>
                           Requirements ({selected.docs_received}/{selected.docs_required})
                        </h3>

                        {(selected.documents ?? []).length === 0 ? (
                           <p className='enrolleesMuted'>No requirements listed.</p>
                        ) : (
                           <div className='enrolleesDocList'>
                              {selected.documents.map((d) => (
                                 <div className='enrolleesDocItem' key={d.id}>
                                    <span className='enrolleesDetailValue'>{d.name}</span>
                                    <div className='enrolleesDocControls'>
                                       <select
                                          className='enrolleesDocSelect'
                                          aria-label={`Status of ${d.name}`}
                                          value={d.status}
                                          disabled={updatingDocId === d.id || selected.status !== 'Accepted by Maxima'}
                                          onChange={(e) => updateDocument(d, e.target.value)}
                                       >
                                          <option value='pending'>Pending</option>
                                          <option value='received'>Received</option>
                                          <option value='not_applicable'>Not applicable</option>
                                       </select>

                                       {!d.is_default && selected.status === 'Accepted by Maxima' && (
                                          <button
                                             type='button'
                                             className='enrolleesViewBtn'
                                             onClick={() => removeRequirement(d)}
                                             disabled={updatingDocId === d.id}
                                          >
                                             Remove
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              ))}
                           </div>
                        )}

                        {selected.status === 'Accepted by Maxima' && (
                           <>
                              <div className='enrolleesDocAdd'>
                                 <input
                                    className='enrolleesSearch'
                                    type='text'
                                    placeholder='Add a requirement for this OSY'
                                    aria-label='Add a requirement for this OSY'
                                    maxLength={100}
                                    value={newDoc}
                                    onChange={(e) => setNewDoc(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addRequirement()}
                                    disabled={docBusy}
                                 />
                                 <button
                                    type='button'
                                    className='enrolleesActionBtn'
                                    onClick={addRequirement}
                                    disabled={docBusy || !newDoc.trim()}
                                 >
                                    {docBusy ? 'Adding...' : 'Add'}
                                 </button>
                              </div>
                              <p className='enrolleesMuted'>
                                 Added only for this OSY, as Pending. To add one for everyone, use Default requirements.
                              </p>
                           </>
                        )}

                        {selected.status === 'Accepted by Maxima' && !requirementsMet(selected) && (
                           <p className='enrolleesMuted'>
                              Stays as Accepted until every requirement is received or marked not applicable.
                           </p>
                        )}

                        {selected.status === 'Training Started' && (
                           <p className='enrolleesMuted'>
                              Training progress and completion are managed in Progress Monitoring.
                           </p>
                        )}
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
                     <button type='button' className='enrolleesViewBtn' onClick={closeDetails}>
                        Close
                     </button>
                     {NEXT_STATUS[selected.status] && (
                        <button
                           type='button'
                           className='enrolleesActionBtn'
                           onClick={() => advanceStatus(selected)}
                           disabled={updatingId === selected.id || !requirementsMet(selected)}
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