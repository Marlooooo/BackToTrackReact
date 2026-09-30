import { useState, useEffect, useCallback } from 'react';
import SkOfficialSideBar from '../../../components/skOfficialSideBar';
import './BarangayReferralManagement.css';

const API = '/api';

function getCookie(name) {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? decodeURIComponent(match[2]) : null;
}

async function ensureCsrfCookie() {
   await fetch('/sanctum/csrf-cookie', {
      credentials: 'include',
   });
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

         ...(body !== undefined && {
            'Content-Type': 'application/json',
         }),

         ...(isWrite && {
            'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
         }),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
   });

   const data = await res.json().catch(() => null);

   if (!res.ok) {
      throw new Error(
         data?.message || `Request failed (${res.status})`
      );
   }

   return data;
}

const fullName = (p) => (p ? `${p.first_name ?? ''} ${p.last_name ?? ''}`.trim() : 'Unknown');

const initials = (p) =>
   p ? `${(p.first_name ?? '').charAt(0)}${(p.last_name ?? '').charAt(0)}`.toUpperCase() || '?' : '?';

const programName = (p) => p?.name ?? `Program #${p?.id ?? '?'}`;

// Maps the referrals.status enum to the three summary boxes.
const APPROVED = ['Accepted by TESDA', 'Training Started', 'Completed'];
const REJECTED = ['Rejected'];
const groupOf = (status) => (APPROVED.includes(status) ? 'approved' : REJECTED.includes(status) ? 'rejected' : 'pending');

function BarangayReferralManagement() {
   const [referrals, setReferrals] = useState([]);
   const [counts, setCounts] = useState({ approved: 0, pending: 0, rejected: 0 });
   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState('');
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');

   // create-referral modal
   const [showModal, setShowModal] = useState(false);
   const [osySearch, setOsySearch] = useState('');
   const [osyOptions, setOsyOptions] = useState([]);
   const [selectedOsy, setSelectedOsy] = useState(null);
   const [programs, setPrograms] = useState([]);
   const [programId, setProgramId] = useState('');
   const [remarks, setRemarks] = useState('');
   const [formError, setFormError] = useState('');
   const [saving, setSaving] = useState(false);

   const loadReferrals = useCallback(async () => {
      try {
         const params = new URLSearchParams();
         if (search) params.set('search', search);
         if (statusFilter) params.set('status', statusFilter);

         const data = await apiFetch(`${API}/referrals?${params}`);

         setReferrals(data.referrals);
         setCounts(data.counts);
         setError('');
      } catch (e) {
         setError(e.message);
      } finally {
         setLoading(false);
      }
   }, [search, statusFilter]);

   // debounce the search box
   useEffect(() => {
      const t = setTimeout(loadReferrals, 300);
      return () => clearTimeout(t);
   }, [loadReferrals]);

   // load OSY options while the modal is open
   useEffect(() => {
      if (!showModal) return;
      const t = setTimeout(async () => {
         const data = await apiFetch(
            `${API}/referrals/osy-options?search=${encodeURIComponent(osySearch)}`
         );

         setOsyOptions(data);

      }, 300);
      return () => clearTimeout(t);
   }, [osySearch, showModal]);

   // load training programs once when the modal opens
   useEffect(() => {
      if (!showModal) return;
      (async () => {
         const data = await apiFetch(`${API}/referrals/program-options`);

         setPrograms(data);
      })();
   }, [showModal]);

   const closeModal = () => {
      setShowModal(false);
      setOsySearch('');
      setSelectedOsy(null);
      setProgramId('');
      setRemarks('');
      setFormError('');
   };

   const submitReferral = async (e) => {
      e.preventDefault();

      if (!selectedOsy) {
         return setFormError('Select an OSY to refer.');
      }

      if (!programId) {
         return setFormError('Select a training program.');
      }

      setSaving(true);
      setFormError('');

      try {
         const data = await apiFetch(`${API}/referrals`, {
            method: 'POST',
            body: {
               osy_profile_id: selectedOsy.id,
               training_program_id: programId,
               remarks,
            },
         });

         closeModal();
         loadReferrals();

      } catch (err) {
         setFormError(err.message);

      } finally {
         setSaving(false);
      }
   };

   const toggleFilter = (status) => setStatusFilter((cur) => (cur === status ? '' : status));

   const boxes = [
      { key: 'approved', label: 'Approved' },
      { key: 'pending', label: 'Pending' },
      { key: 'rejected', label: 'Rejected' },
   ];

   const hasFilters = Boolean(search || statusFilter);

   return (
      <>
         <div className='barangayReferralManagementBody'>
            <SkOfficialSideBar />

            <div className='barangayMainContent'>

               <div className='referralManagementTopPart'>
                  <h1>REFERRAL MANAGEMENT</h1>
                  <p>Manage referrals to MAXIMA</p>
               </div>

               <div className='referralManagementMidPart'>
                  {boxes.map((b) => (
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

                     {error && <p className='referralErrorBox'>{error}</p>}

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
                                       <td className='referralDate'>{new Date(r.created_at).toLocaleDateString()}</td>
                                       <td>
                                          <span className={`referralStatusBadge ${groupOf(r.status)}`}>{r.status}</span>
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

         {showModal && (
            <div className='referralModalOverlay' onClick={closeModal}>
               <form className='referralModal' onClick={(e) => e.stopPropagation()} onSubmit={submitReferral}>
                  <div className='referralModalHeader'>
                     <div>
                        <h2>Create referral</h2>
                        <p>Refer an OSY to a MAXIMA training program.</p>
                     </div>
                     <button type='button' className='referralIconBtn' onClick={closeModal} aria-label='Close'>
                        <svg width='18' height='18' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
                           <line x1='18' y1='6' x2='6' y2='18' />
                           <line x1='6' y1='6' x2='18' y2='18' />
                        </svg>
                     </button>
                  </div>

                  <div className='referralModalBody'>
                     <div className='referralField'>
                        <label htmlFor='osySearch'>OSY profile</label>
                        {selectedOsy ? (
                           <div className='referralSelectedOsy'>
                              <span className='referralAvatar'>{initials(selectedOsy)}</span>
                              <span className='referralPersonName'>{fullName(selectedOsy)}</span>
                              <button type='button' className='referralLinkBtn' onClick={() => setSelectedOsy(null)}>
                                 Change
                              </button>
                           </div>
                        ) : (
                           <>
                              <input
                                 id='osySearch'
                                 className='referralInput'
                                 type='search'
                                 placeholder='Search OSY by name'
                                 value={osySearch}
                                 onChange={(e) => setOsySearch(e.target.value)}
                                 autoFocus
                              />
                              <ul className='referralOptionList'>
                                 {osyOptions.length === 0 && (
                                    <li className='referralOptionEmpty'>No OSY profiles found.</li>
                                 )}
                                 {osyOptions.map((o) => (
                                    <li key={o.id}>
                                       <button type='button' className='referralOption' onClick={() => setSelectedOsy(o)}>
                                          <span className='referralOptionName'>{fullName(o)}</span>
                                       </button>
                                    </li>
                                 ))}
                              </ul>
                           </>
                        )}
                     </div>

                     <div className='referralField'>
                        <label htmlFor='referralProgram'>Training program</label>
                        <select
                           id='referralProgram'
                           className='referralInput'
                           value={programId}
                           onChange={(e) => setProgramId(e.target.value)}
                        >
                           <option value=''>Select a program</option>
                           {programs.map((pr) => (
                              <option key={pr.id} value={pr.id}>{programName(pr)}</option>
                           ))}
                        </select>
                     </div>

                     <div className='referralField'>
                        <label htmlFor='referralRemarks'>Remarks (optional)</label>
                        <textarea
                           id='referralRemarks'
                           className='referralInput'
                           rows={3}
                           value={remarks}
                           onChange={(e) => setRemarks(e.target.value)}
                           placeholder='Why is this OSY a good fit for the program?'
                        />
                     </div>

                     {formError && <p className='referralFormError'>{formError}</p>}
                  </div>

                  <div className='referralModalFooter'>
                     <button type='button' className='referralSecondaryBtn' onClick={closeModal}>Cancel</button>
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