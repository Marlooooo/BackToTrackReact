import { useEffect, useMemo, useRef, useState } from 'react';
import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaCompletedTrainings.css';

/* API helper */
async function apiGet(url) {
   const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      credentials: 'include',
   });
   const data = await res.json().catch(() => null);
   if (!res.ok) throw new Error(data?.message ?? 'Could not load the data.');
   return data;
}

/* Constants */
const AFTER_TRAINING = [
   ['employed', 'Employed'],
   ['self_employed', 'Self-employed'],
   ['further_training', 'Continuing to further training'],
   ['looking_for_work', 'Looking for work'],
   ['other', 'Other'],
];

const CONDUCT = [
   ['excellent', 'Excellent'],
   ['good', 'Good'],
   ['fair', 'Fair'],
   ['needs_improvement', 'Needs improvement'],
];

const CONDUCT_CLASS = {
   excellent: 'ctBadgeGood',
   good: 'ctBadgeGood',
   fair: 'ctBadgeWarn',
   needs_improvement: 'ctBadgeBad',
};

const EMPTY_STATS = {
   total: 0,
   this_month: 0,
   average_attendance: null,
   average_assessment: null,
   employed: 0,
};

/* Helpers */
function labelOf(list, value) {
   return list.find(([key]) => key === value)?.[1] ?? '—';
}

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

function formatPercent(value) {
   if (value === null || value === undefined || value === '') return '—';
   return `${Math.round(Number(value) * 10) / 10}%`;
}

function scorePercent(a) {
   return a.max_score > 0 ? Math.round((a.score / a.max_score) * 1000) / 10 : null;
}

function fullName(profile) {
   if (!profile) return 'N/A';
   return [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ');
}

function initials(profile) {
   if (!profile) return '?';
   return `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '?';
}

function rateClass(rate) {
   if (rate === null || rate === undefined) return 'ctMuted';
   if (rate >= 90) return 'ctRateGood';
   if (rate >= 75) return 'ctRateWarn';
   return 'ctRateLow';
}

function durationLabel(start, end) {
   if (!start || !end) return '—';
   const from = new Date(start);
   const to = new Date(end);
   if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return '—';
   const days = Math.max(1, Math.round((to - from) / 86400000) + 1);
   return `${days} ${days === 1 ? 'day' : 'days'}`;
}

function outcomeLabel(row) {
   return row.after_training_status ? labelOf(AFTER_TRAINING, row.after_training_status) : 'Not recorded';
}

/* CSV export */
function csvCell(value) {
   const text = value === null || value === undefined ? '' : String(value);
   return `"${text.replace(/"/g, '""')}"`;
}

function exportCsv(rows) {
   const header = [
      'Name',
      'Program',
      'Batch',
      'Trainer',
      'Start date',
      'Date completed',
      'Duration',
      'Attendance rate',
      'Assessment average',
      'Conduct',
      'After training',
      'Details',
   ];

   const lines = rows.map((t) =>
      [
         fullName(t.osy_profile),
         t.training_program?.name ?? '',
         t.batch_name ?? '',
         t.trainer_name ?? '',
         formatDate(t.started_on),
         formatDate(t.completed_on),
         durationLabel(t.started_on, t.completed_on),
         formatPercent(t.summary.attendance_rate),
         formatPercent(t.summary.assessment_average),
         t.summary.conduct_rating ? labelOf(CONDUCT, t.summary.conduct_rating) : '',
         outcomeLabel(t),
         t.after_training_note ?? '',
      ]
         .map(csvCell)
         .join(',')
   );

   const csv = [header.map(csvCell).join(','), ...lines].join('\r\n');
   const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
   const url = URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.download = `completed-trainings-${new Date().toISOString().slice(0, 10)}.csv`;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   URL.revokeObjectURL(url);
}

/* Page */
function MaximaCompletedTrainings() {
   const [trainings, setTrainings] = useState([]);
   const [stats, setStats] = useState(EMPTY_STATS);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   const [search, setSearch] = useState('');
   const [programFilter, setProgramFilter] = useState('');
   const [outcomeFilter, setOutcomeFilter] = useState('');

   const [selectedRow, setSelectedRow] = useState(null);
   const [detail, setDetail] = useState(null);
   const [detailLoading, setDetailLoading] = useState(false);
   const [detailError, setDetailError] = useState(null);

   // Only the newest details request may update the modal
   const latestDetail = useRef(0);

   useEffect(() => {
      loadTrainings();
   }, []);

   // Escape closes the modal and the page behind it is locked
   useEffect(() => {
      if (!selectedRow) return undefined;

      function onKeyDown(e) {
         if (e.key === 'Escape') closeDetail();
      }

      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKeyDown);

      return () => {
         window.removeEventListener('keydown', onKeyDown);
         document.body.style.overflow = previousOverflow;
      };
   }, [selectedRow]);

   async function loadTrainings() {
      setError(null);
      try {
         const data = await apiGet('/api/maxima/completed-trainings');
         setTrainings(data.trainings ?? []);
         setStats(data.stats ?? EMPTY_STATS);
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   }

   async function openDetail(row) {
      const requestId = ++latestDetail.current;
      setSelectedRow(row);
      setDetail(null);
      setDetailError(null);
      setDetailLoading(true);

      try {
         const data = await apiGet(`/api/maxima/progress/${row.id}`);
         if (requestId !== latestDetail.current) return;
         setDetail(data);
      } catch (err) {
         if (requestId !== latestDetail.current) return;
         setDetailError(err.message);
      } finally {
         if (requestId === latestDetail.current) setDetailLoading(false);
      }
   }

   function closeDetail() {
      latestDetail.current += 1;
      setSelectedRow(null);
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
   }

   const programs = useMemo(() => {
      const names = trainings.map((t) => t.training_program?.name).filter(Boolean);
      return [...new Set(names)].sort((a, b) => a.localeCompare(b));
   }, [trainings]);

   const rows = useMemo(() => {
      const term = search.trim().toLowerCase();

      return trainings.filter((t) => {
         if (term && !fullName(t.osy_profile).toLowerCase().includes(term)) return false;
         if (programFilter && t.training_program?.name !== programFilter) return false;
         if (outcomeFilter === 'none') return !t.after_training_status;
         if (outcomeFilter && t.after_training_status !== outcomeFilter) return false;
         return true;
      });
   }, [trainings, search, programFilter, outcomeFilter]);

   const summary = detail?.summary ?? null;
   const filtersActive = Boolean(search.trim() || programFilter || outcomeFilter);

   return (
      <>
         <div className='maximaDashboardBody'>
            <MaximaSideBar/>

            <div className='maximaCompletedMainContent'>
               <div className='ctPage'>
                  <div className='ctHeader'>
                     <div>
                        <h1 className='ctTitle'>Completed Trainings</h1>
                        <p className='ctSubtitle'>
                           Records of out-of-school youth who finished their training programs.
                        </p>
                     </div>

                     <button
                        type='button'
                        className='ctBtnPrimary'
                        onClick={() => exportCsv(rows)}
                        disabled={rows.length === 0}
                     >
                        <span className='material-symbols-outlined'>download</span>
                        Export CSV
                     </button>
                  </div>

                  <div className='ctStats'>
                     <div className='ctStatCard ctStatMain'>
                        <span className='ctStatLabel'>Total completed</span>
                        <span className='ctStatValue'>{stats.total}</span>
                     </div>
                     <div className='ctStatCard ctStatBlue'>
                        <span className='ctStatLabel'>Completed this month</span>
                        <span className='ctStatValue'>{stats.this_month}</span>
                     </div>
                     <div className='ctStatCard ctStatGold'>
                        <span className='ctStatLabel'>Average attendance</span>
                        <span className='ctStatValue'>{formatPercent(stats.average_attendance)}</span>
                     </div>
                     <div className='ctStatCard ctStatLight'>
                        <span className='ctStatLabel'>Average assessment</span>
                        <span className='ctStatValue'>{formatPercent(stats.average_assessment)}</span>
                     </div>
                     <div className='ctStatCard ctStatTeal'>
                        <span className='ctStatLabel'>Employed or self-employed</span>
                        <span className='ctStatValue'>{stats.employed}</span>
                     </div>
                  </div>

                  <div className='ctPanel'>
                     <div className='ctToolbar'>
                        <input
                           className='ctSearch'
                           type='text'
                           placeholder='Search by name...'
                           aria-label='Search completed trainings by name'
                           value={search}
                           onChange={(e) => setSearch(e.target.value)}
                        />
                        <select
                           className='ctFilter'
                           aria-label='Filter by program'
                           value={programFilter}
                           onChange={(e) => setProgramFilter(e.target.value)}
                        >
                           <option value=''>All programs</option>
                           {programs.map((name) => (
                              <option key={name} value={name}>{name}</option>
                           ))}
                        </select>
                        <select
                           className='ctFilter'
                           aria-label='Filter by outcome'
                           value={outcomeFilter}
                           onChange={(e) => setOutcomeFilter(e.target.value)}
                        >
                           <option value=''>All outcomes</option>
                           {AFTER_TRAINING.map(([key, label]) => (
                              <option key={key} value={key}>{label}</option>
                           ))}
                           <option value='none'>Not recorded</option>
                        </select>
                     </div>

                     {error && <p className='ctError' role='alert'>{error}</p>}

                     {loading ? (
                        <p className='ctEmpty'>Loading completed trainings...</p>
                     ) : rows.length === 0 ? (
                        <p className='ctEmpty'>
                           {trainings.length === 0 || !filtersActive
                              ? 'No completed trainings yet. They appear here once an enrolled OSY is marked as completed in Progress Management.'
                              : 'No results match your search or filters.'}
                        </p>
                     ) : (
                        <div className='ctTableWrap'>
                           <table className='ctTable'>
                              <thead>
                                 <tr>
                                    <th>Graduate</th>
                                    <th>Program</th>
                                    <th>Completed</th>
                                    <th>Duration</th>
                                    <th>Attendance</th>
                                    <th>Assessments</th>
                                    <th>Conduct</th>
                                    <th>After training</th>
                                    <th className='ctActionsHead'>Actions</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {rows.map((t) => (
                                    <tr key={t.id}>
                                       <td>
                                          <div className='ctPerson'>
                                             <span className='ctAvatar'>{initials(t.osy_profile)}</span>
                                             <span className='ctPersonName'>{fullName(t.osy_profile)}</span>
                                          </div>
                                       </td>
                                       <td>
                                          <span className='ctCellMain'>{t.training_program?.name ?? '—'}</span>
                                          {t.batch_name && <span className='ctCellSub'>{t.batch_name}</span>}
                                       </td>
                                       <td>{formatDate(t.completed_on)}</td>
                                       <td>{durationLabel(t.started_on, t.completed_on)}</td>
                                       <td>
                                          <span className={rateClass(t.summary.attendance_rate)}>
                                             {formatPercent(t.summary.attendance_rate)}
                                          </span>
                                       </td>
                                       <td>{formatPercent(t.summary.assessment_average)}</td>
                                       <td>
                                          {t.summary.conduct_rating ? (
                                             <span className={`ctBadge ${CONDUCT_CLASS[t.summary.conduct_rating] ?? ''}`}>
                                                {labelOf(CONDUCT, t.summary.conduct_rating)}
                                             </span>
                                          ) : (
                                             <span className='ctMuted'>—</span>
                                          )}
                                       </td>
                                       <td>
                                          <span className={t.after_training_status ? 'ctCellMain' : 'ctMuted'}>
                                             {outcomeLabel(t)}
                                          </span>
                                          {t.after_training_note && (
                                             <span className='ctCellSub'>{t.after_training_note}</span>
                                          )}
                                       </td>
                                       <td>
                                          <div className='ctActions'>
                                             <button
                                                type='button'
                                                className='ctBtnGhost'
                                                onClick={() => openDetail(t)}
                                             >
                                                View details
                                             </button>
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

         {selectedRow && (
            <div className='ctOverlay'>
               <div className='ctModal' role='dialog' aria-modal='true' aria-labelledby='ctModalTitle'>
                  <div className='ctModalHeader'>
                     <div className='ctPerson'>
                        <span className='ctAvatar ctAvatarLarge'>{initials(selectedRow.osy_profile)}</span>
                        <div>
                           <h2 id='ctModalTitle' className='ctModalName'>
                              {fullName(selectedRow.osy_profile)}
                           </h2>
                           <p className='ctModalSub'>{selectedRow.training_program?.name ?? '—'}</p>
                           <span className='ctBadge ctBadgeDone'>
                              Completed {formatDate(selectedRow.completed_on)}
                           </span>
                        </div>
                     </div>
                     <button type='button' className='ctModalClose' onClick={closeDetail} aria-label='Close'>
                        &times;
                     </button>
                  </div>

                  <div className='ctModalBody'>
                     <section className='ctSection'>
                        <h3 className='ctSectionTitle'>Training information</h3>
                        <div className='ctInfoGrid'>
                           <div className='ctInfoItem'>
                              <span>Program</span>
                              <strong>{selectedRow.training_program?.name ?? '—'}</strong>
                           </div>
                           <div className='ctInfoItem'>
                              <span>Batch / class</span>
                              <strong>{selectedRow.batch_name || '—'}</strong>
                           </div>
                           <div className='ctInfoItem'>
                              <span>Venue</span>
                              <strong>{selectedRow.venue || '—'}</strong>
                           </div>
                           <div className='ctInfoItem'>
                              <span>Trainer</span>
                              <strong>{selectedRow.trainer_name || '—'}</strong>
                           </div>
                           <div className='ctInfoItem'>
                              <span>Start date</span>
                              <strong>{formatDate(selectedRow.started_on)}</strong>
                           </div>
                           <div className='ctInfoItem'>
                              <span>Date completed</span>
                              <strong>{formatDate(selectedRow.completed_on)}</strong>
                           </div>
                           <div className='ctInfoItem'>
                              <span>Duration</span>
                              <strong>{durationLabel(selectedRow.started_on, selectedRow.completed_on)}</strong>
                           </div>
                           <div className='ctInfoItem'>
                              <span>Referred by</span>
                              <strong>{selectedRow.referrer?.name ?? '—'}</strong>
                           </div>
                        </div>
                     </section>

                     <section className='ctSection'>
                        <h3 className='ctSectionTitle'>Outcome</h3>
                        <div className='ctInfoGrid'>
                           <div className='ctInfoItem'>
                              <span>After training</span>
                              <strong>{outcomeLabel(selectedRow)}</strong>
                           </div>
                           <div className='ctInfoItem'>
                              <span>Where / details</span>
                              <strong>{selectedRow.after_training_note || '—'}</strong>
                           </div>
                           <div className='ctInfoItem ctInfoWide'>
                              <span>Remarks</span>
                              <strong>{selectedRow.outcome_remarks || '—'}</strong>
                           </div>
                        </div>
                     </section>

                     {detailLoading && <p className='ctEmpty'>Loading performance records...</p>}
                     {detailError && <p className='ctError ctErrorInline' role='alert'>{detailError}</p>}

                     {detail && summary && (
                        <>
                           <section className='ctSection'>
                              <h3 className='ctSectionTitle'>Performance</h3>
                              <div className='ctMetrics'>
                                 <div className='ctMetric'>
                                    <span className='ctMetricLabel'>Attendance rate</span>
                                    <span className='ctMetricValue'>{formatPercent(summary.attendance_rate)}</span>
                                 </div>
                                 <div className='ctMetric'>
                                    <span className='ctMetricLabel'>Days recorded</span>
                                    <span className='ctMetricValue'>{summary.attendance_days}</span>
                                 </div>
                                 <div className='ctMetric'>
                                    <span className='ctMetricLabel'>Assessment average</span>
                                    <span className='ctMetricValue'>{formatPercent(summary.assessment_average)}</span>
                                 </div>
                                 <div className='ctMetric'>
                                    <span className='ctMetricLabel'>Latest conduct</span>
                                    <span className='ctMetricValue ctMetricSmall'>
                                       {summary.conduct_rating ? labelOf(CONDUCT, summary.conduct_rating) : '—'}
                                    </span>
                                 </div>
                              </div>
                              <p className='ctMuted ctMetricNote'>
                                 {summary.present} present · {summary.late} late · {summary.absent} absent · {summary.excused} excused
                              </p>
                           </section>

                           <section className='ctSection'>
                              <h3 className='ctSectionTitle'>Assessments</h3>
                              {(detail.assessments ?? []).length === 0 ? (
                                 <p className='ctMuted'>No assessments recorded.</p>
                              ) : (
                                 <div className='ctMiniWrap'>
                                    <table className='ctMiniTable'>
                                       <thead>
                                          <tr><th>Date</th><th>Assessment</th><th>Score</th><th>Remarks</th></tr>
                                       </thead>
                                       <tbody>
                                          {detail.assessments.map((a) => (
                                             <tr key={a.id}>
                                                <td>{formatDate(a.assessed_on)}</td>
                                                <td>{a.title}</td>
                                                <td>{a.score}/{a.max_score} ({formatPercent(scorePercent(a))})</td>
                                                <td>{a.remarks || '—'}</td>
                                             </tr>
                                          ))}
                                       </tbody>
                                    </table>
                                 </div>
                              )}
                           </section>

                           <section className='ctSection'>
                              <h3 className='ctSectionTitle'>Conduct</h3>
                              {(detail.conduct ?? []).length === 0 ? (
                                 <p className='ctMuted'>No conduct remarks recorded.</p>
                              ) : (
                                 <div className='ctMiniWrap'>
                                    <table className='ctMiniTable'>
                                       <thead>
                                          <tr><th>Date</th><th>Rating</th><th>Remarks</th></tr>
                                       </thead>
                                       <tbody>
                                          {detail.conduct.map((c) => (
                                             <tr key={c.id}>
                                                <td>{formatDate(c.recorded_on)}</td>
                                                <td>
                                                   <span className={`ctBadge ${CONDUCT_CLASS[c.rating] ?? ''}`}>
                                                      {labelOf(CONDUCT, c.rating)}
                                                   </span>
                                                </td>
                                                <td>{c.remarks || '—'}</td>
                                             </tr>
                                          ))}
                                       </tbody>
                                    </table>
                                 </div>
                              )}
                           </section>

                           <section className='ctSection'>
                              <h3 className='ctSectionTitle'>Status history</h3>
                              {(detail.history ?? []).length === 0 ? (
                                 <p className='ctMuted'>No status history recorded.</p>
                              ) : (
                                 <ul className='ctTimeline'>
                                    {[...detail.history].reverse().map((h, index) => (
                                       <li className='ctTimelineItem' key={`${h.status}-${index}`}>
                                          <span className='ctTimelineDot'></span>
                                          <div className='ctTimelineContent'>
                                             <span className='ctTimelineStatus'>{h.status}</span>
                                             <span className='ctTimelineMeta'>
                                                {formatDateTime(h.created_at)}
                                                {h.changed_by ? ` · ${h.changed_by}` : ''}
                                             </span>
                                             {h.remarks && <span className='ctTimelineRemarks'>{h.remarks}</span>}
                                          </div>
                                       </li>
                                    ))}
                                 </ul>
                              )}
                           </section>
                        </>
                     )}
                  </div>

                  <div className='ctModalFooter'>
                     <button type='button' className='ctBtnGhost' onClick={closeDetail}>
                        Close
                     </button>
                  </div>
               </div>
            </div>
         )}
      </>
   );
}

export default MaximaCompletedTrainings;