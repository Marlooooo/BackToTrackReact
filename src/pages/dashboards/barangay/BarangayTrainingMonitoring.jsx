import { useEffect, useMemo, useState } from 'react';
import BarangaySideBar from '../../../components/skOfficialSideBar';
import './BarangayTrainingMonitoring.css';

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */
async function apiGet(url) {
   const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'include' });
   const data = await res.json().catch(() => null);
   if (!res.ok) throw new Error(data?.message ?? 'Could not load the data.');
   return data;
}

/* ------------------------------------------------------------------ */
/* Constants + formatting                                              */
/* ------------------------------------------------------------------ */
const STATUS_LABEL = { 'Training Started': 'Ongoing', Completed: 'Completed', Dropped: 'Dropped' };
const STATUS_DOT = { 'Training Started': 'brgyDotOngoing', Completed: 'brgyDotCompleted', Dropped: 'brgyDotDropped' };
const ATTENDANCE_BADGE = { present: 'brgyBadgeGood', late: 'brgyBadgeWarn', absent: 'brgyBadgeBad', excused: '' };
const CONCERN_BADGE = { pending: 'brgyBadgeWarn', reviewed: 'brgyBadgeGood', resolved: '' };

const DROP_REASONS = {
   transport: 'Transportation problem',
   work: 'Needs to work',
   family: 'Family reasons',
   health: 'Health reasons',
   lost_interest: 'Lost interest',
   other: 'Other',
};

const AFTER_TRAINING = {
   employed: 'Employed',
   self_employed: 'Self-employed',
   further_training: 'Continuing to further training',
   looking_for_work: 'Looking for work',
   other: 'Other',
};

const EMPTY_COUNTS = { ongoing: 0, completed: 0, dropped: 0, needs_attention: 0 };

function formatDate(value) {
   if (!value) return '—';
   const d = new Date(value);
   return Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value) {
   if (!value) return '—';
   const d = new Date(value);
   return Number.isNaN(d.getTime())
      ? '—'
      : d.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatPercent(v) {
   return v === null || v === undefined || v === '' ? '—' : `${Math.round(Number(v) * 10) / 10}%`;
}

function fullName(p) {
   return p ? [p.first_name, p.middle_name, p.last_name].filter(Boolean).join(' ') : 'N/A';
}

function initials(p) {
   return p ? `${p.first_name?.[0] ?? ''}${p.last_name?.[0] ?? ''}`.toUpperCase() || '?' : '?';
}

function rateClass(rate) {
   if (rate === null || rate === undefined) return 'brgyMuted';
   if (rate >= 90) return 'brgyRateGood';
   if (rate >= 75) return 'brgyRateWarn';
   return 'brgyRateLow';
}

function trainingDayLabel(row) {
   const s = row.summary;
   if (row.status === 'Training Started' && s.training_day) {
      return s.training_length ? `Day ${s.training_day} of ${s.training_length}` : `Day ${s.training_day}`;
   }
   if (row.status === 'Completed' || row.status === 'Dropped') return `Ended ${formatDate(row.training_end_date)}`;
   return '—';
}

function progressPercent(row) {
   if (row.status === 'Completed') return 100;
   const s = row.summary;
   if (row.status === 'Training Started' && s.training_day && s.training_length) {
      return Math.min(100, Math.round((s.training_day / s.training_length) * 100));
   }
   return 0;
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */
function StatusTag({ status }) {
   return (
      <span className="brgyStatusTag">
         <i className={`brgyStatusDot ${STATUS_DOT[status] ?? ''}`} />
         {STATUS_LABEL[status] ?? status}
      </span>
   );
}

function ProgressBar({ row }) {
   if (row.status === 'Dropped') return <span className="brgyMuted">Dropped {formatDate(row.training_end_date)}</span>;
   return (
      <div className="brgyProgress">
         <div className="brgyProgressTrack">
            <div className={`brgyProgressFill ${row.status === 'Completed' ? 'brgyProgressFillDone' : ''}`} style={{ width: `${progressPercent(row)}%` }} />
         </div>
         <span className="brgyProgressLabel">{trainingDayLabel(row)}</span>
      </div>
   );
}

function Info({ label, value }) {
   return (
      <div className="brgyInfoItem">
         <span>{label}</span>
         <strong>{value || '—'}</strong>
      </div>
   );
}

function EmptyBlock({ children }) {
   return <div className="brgyEmptyBlock">{children}</div>;
}

function Section({ icon, title, count, alert, children }) {
   return (
      <section className="brgyDetailSection">
         <div className="brgyDetailHead">
            <span className="material-symbols-outlined brgyDetailIcon">{icon}</span>
            <h3 className="brgySectionTitle">{title}</h3>
            {count !== null && count !== undefined && (
               <span className={`brgyTabCount ${alert ? 'brgyTabCountAlert' : ''}`}>{count}</span>
            )}
         </div>
         {children}
      </section>
   );
}

/* ------------------------------------------------------------------ */
/* Record sections (all read-only, shown in one scrolling view)        */
/* ------------------------------------------------------------------ */
function OverviewSection({ detail }) {
   const s = detail.summary;
   return (
      <>
         {s.alerts?.length > 0 && (
            <div className="brgyNoticeList">
               {s.alerts.map((alert) => (
                  <div className="brgyNotice brgyNoticeWarn" key={alert}>
                     <span className="material-symbols-outlined">flag</span>
                     {alert}
                  </div>
               ))}
            </div>
         )}

         <div className="brgyMetricGrid">
            <div className="brgyMetric">
               <span className="brgyMetricLabel">Training day</span>
               <span className="brgyMetricValue brgyMetricSmall">{trainingDayLabel(detail)}</span>
            </div>
            <div className="brgyMetric">
               <span className="brgyMetricLabel">Attendance rate</span>
               <span className="brgyMetricValue">{formatPercent(s.attendance_rate)}</span>
            </div>
            <div className="brgyMetric">
               <span className="brgyMetricLabel">Absences</span>
               <span className="brgyMetricValue">{s.absent}</span>
            </div>
            <div className="brgyMetric">
               <span className="brgyMetricLabel">Days recorded</span>
               <span className="brgyMetricValue">{s.attendance_days}</span>
            </div>
         </div>

         <Section icon="school" title="Training details">
            <div className="brgyInfoGrid">
               <Info label="Program" value={detail.training_program?.name} />
               <Info label="Batch / class" value={detail.batch_name} />
               <Info label="Venue" value={detail.venue} />
               <Info label="Trainer" value={detail.trainer_name} />
               <Info label="Start date" value={formatDate(detail.started_on)} />
               <Info label="Expected end" value={formatDate(detail.expected_end_date)} />
               <Info label="Referred by" value={detail.referrer?.name} />
               <Info label="Last update" value={formatDate(s.last_activity)} />
            </div>
         </Section>

         {detail.status === 'Completed' && (
            <Section icon="task_alt" title="Outcome">
               <div className="brgyInfoGrid brgyInfoGridTwo">
                  <Info label="Date completed" value={formatDate(detail.training_end_date)} />
                  <Info
                     label="After training"
                     value={
                        detail.after_training_status
                           ? AFTER_TRAINING[detail.after_training_status] +
                             (detail.after_training_note ? ` · ${detail.after_training_note}` : '')
                           : null
                     }
                  />
               </div>
               {detail.outcome_remarks && <p className="brgyCardText">{detail.outcome_remarks}</p>}
            </Section>
         )}

         {detail.status === 'Dropped' && (
            <Section icon="person_off" title="Outcome">
               <div className="brgyInfoGrid brgyInfoGridTwo">
                  <Info label="Date dropped" value={formatDate(detail.training_end_date)} />
                  <Info label="Reason" value={DROP_REASONS[detail.drop_reason]} />
               </div>
               {detail.outcome_remarks && <p className="brgyCardText">{detail.outcome_remarks}</p>}
            </Section>
         )}
      </>
   );
}

function AttendanceSection({ detail }) {
   const s = detail.summary;
   const records = detail.attendance ?? [];

   return (
      <section className="brgyAttendance">
         <div className="brgyAttendanceHead">
            <h3 className="brgyAttendanceTitle">Attendance</h3>
            <span className="brgyAttendanceSummary">
               {s.present} present · {s.late} late · {s.absent} absent · {s.excused} excused
            </span>
         </div>

         {records.length === 0 ? (
            <EmptyBlock>No attendance has been recorded yet.</EmptyBlock>
         ) : (
            <div className="brgyAttendanceWrap">
               <table className="brgyTable brgyAttendanceTable">
                  <thead><tr><th>Date</th><th>Status</th><th>Remarks</th></tr></thead>
                  <tbody>
                     {records.map((r) => (
                        <tr key={r.id}>
                           <td>{formatDate(r.attendance_date)}</td>
                           <td><span className={`brgyBadge ${ATTENDANCE_BADGE[r.status]}`}>{r.status}</span></td>
                           <td>{r.remarks || '—'}</td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </section>
   );
}

function ConcernsSection({ detail }) {
   const concerns = detail.concerns ?? [];
   const pending = concerns.filter((c) => c.status === 'pending').length;

   return (
      <Section icon="report" title="Concerns" count={pending || concerns.length || null} alert={pending > 0}>
         {concerns.length === 0 ? (
            <EmptyBlock>No concerns have been raised for this OSY.</EmptyBlock>
         ) : (
            <div className="brgyCardList">
               {concerns.map((c) => (
                  <div className="brgyCard" key={c.id}>
                     <div className="brgyCardTop">
                        <div>
                           <span className="brgyCardTitle brgyCapital">{c.type}</span>
                           <span className="brgyCardMeta">by {c.submitter?.name ?? 'Unknown'} on {formatDate(c.created_at)}</span>
                        </div>
                        <span className={`brgyBadge ${CONCERN_BADGE[c.status] ?? ''}`}>{c.status}</span>
                     </div>
                     <p className="brgyCardText">{c.description}</p>
                     {c.review_remarks && (
                        <p className="brgyReview">
                           <strong>Maxima's review{c.reviewer?.name ? ` (${c.reviewer.name})` : ''}:</strong> {c.review_remarks}
                        </p>
                     )}
                  </div>
               ))}
            </div>
         )}
      </Section>
   );
}

function NotesSection({ detail }) {
   const notes = detail.notes ?? [];

   return (
      <Section icon="sticky_note_2" title="Notes" count={notes.length || null}>
         {notes.length === 0 ? (
            <EmptyBlock>Maxima hasn't added any notes yet.</EmptyBlock>
         ) : (
            <div className="brgyCardList">
               {notes.map((n) => (
                  <div className="brgyCard" key={n.id}>
                     <span className="brgyCardMeta brgyCardMetaTop">{n.user?.name ?? 'Unknown'} on {formatDateTime(n.created_at)}</span>
                     <p className="brgyCardText">{n.note}</p>
                  </div>
               ))}
            </div>
         )}
      </Section>
   );
}

function HistorySection({ detail }) {
   return (
      <Section icon="history" title="Status history">
         {!detail.history?.length ? (
            <EmptyBlock>No status history yet.</EmptyBlock>
         ) : (
            <div className="brgyTimeline">
               {[...detail.history].reverse().map((item, i) => (
                  <div className="brgyTimelineItem" key={`${item.status}-${i}`}>
                     <span className="brgyTimelineDot" />
                     <div>
                        <span className="brgyTimelineStatus">{item.status}</span>
                        <span className="brgyTimelineMeta">
                           {formatDateTime(item.created_at)}{item.changed_by ? ` by ${item.changed_by}` : ''}
                        </span>
                        {item.remarks && <span className="brgyTimelineRemarks">{item.remarks}</span>}
                     </div>
                  </div>
               ))}
            </div>
         )}
      </Section>
   );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
function BarangayTrainingMonitoring() {
   const [enrollees, setEnrollees] = useState([]);
   const [counts, setCounts] = useState(EMPTY_COUNTS);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   const [search, setSearch] = useState('');
   const [filter, setFilter] = useState('');
   const [program, setProgram] = useState('');

   const [selected, setSelected] = useState(null);
   const [detailLoading, setDetailLoading] = useState(false);

   useEffect(() => {
      fetchList();
   }, [search]);

   // Escape closes the modal (clicking outside does not)
   useEffect(() => {
      if (!selected && !detailLoading) return;
      const onKeyDown = (e) => e.key === 'Escape' && closeDetail();
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
   }, [selected, detailLoading]);

   async function fetchList() {
      setError(null);
      try {
         const params = new URLSearchParams();
         if (search.trim()) params.append('search', search.trim());
         const data = await apiGet(`/api/barangay/training-monitoring?${params.toString()}`);
         setEnrollees(data.enrollees ?? []);
         setCounts(data.counts ?? EMPTY_COUNTS);
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   }

   async function openDetail(id) {
      setDetailLoading(true);
      try {
         setSelected(await apiGet(`/api/barangay/training-monitoring/${id}`));
      } catch (err) {
         setError(err.message);
      } finally {
         setDetailLoading(false);
      }
   }

   function closeDetail() {
      setSelected(null);
      setDetailLoading(false);
   }

   const total = counts.ongoing + counts.completed + counts.dropped;

   const stats = [
      ['', 'All enrolled', total],
      ['Training Started', 'Ongoing', counts.ongoing],
      ['attention', 'Needs follow-up', counts.needs_attention],
      ['Completed', 'Completed', counts.completed],
      ['Dropped', 'Dropped', counts.dropped],
   ];

   const programs = useMemo(() => {
      const map = new Map();
      enrollees.forEach((r) => r.training_program && map.set(String(r.training_program.id), r.training_program.name));
      return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
   }, [enrollees]);

   // Filter on the client, then put people who need follow-up at the top
   const rows = useMemo(() => {
      let list = enrollees;
      if (filter === 'attention') list = list.filter((r) => r.summary.needs_attention);
      else if (filter) list = list.filter((r) => r.status === filter);
      if (program) list = list.filter((r) => String(r.training_program?.id) === program);
      return [...list].sort((a, b) => Number(b.summary.needs_attention) - Number(a.summary.needs_attention));
   }, [enrollees, filter, program]);

   return (
      <>
         <div className="brgyMonitorShell">
            <BarangaySideBar />

            <div className="brgyMonitorMain">
               <div className="brgyMonitorPage">
                  <div className="brgyPageHead">
                     <h1 className="brgyPageTitle">Training Monitoring</h1>
                     <p className="brgyPageSubtitle">
                        Follow every enrolled OSY from their first day of training to the outcome.
                     </p>
                  </div>

                  <div className="brgyStatGrid">
                     {stats.map(([key, label, value]) => (
                        <button
                           key={key || 'all'}
                           className={`brgyStatCard ${filter === key ? 'brgyStatCardActive' : ''} ${
                              key === 'attention' && value > 0 ? 'brgyStatCardAlert' : ''
                           }`}
                           onClick={() => setFilter(key)}
                        >
                           <span className="brgyStatLabel">{label}</span>
                           <span className="brgyStatValue">{value}</span>
                        </button>
                     ))}
                  </div>

                  <section className="brgyPanel">
                     <div className="brgyToolbar">
                        <p className="brgyResultCount">
                           Showing <strong>{rows.length}</strong> of {total} enrolled
                        </p>
                        <div className="brgyToolbarRight">
                           <select
                              className="brgySelect"
                              value={program}
                              onChange={(e) => setProgram(e.target.value)}
                              aria-label="Filter by program"
                           >
                              <option value="">All programs</option>
                              {programs.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
                           </select>
                           <div className="brgySearch">
                              <span className="material-symbols-outlined">search</span>
                              <input
                                 type="text"
                                 placeholder="Search by name..."
                                 value={search}
                                 onChange={(e) => setSearch(e.target.value)}
                              />
                           </div>
                        </div>
                     </div>

                     {error && <div className="brgyNotice brgyNoticeError">{error}</div>}

                     <div className="brgyTableWrap">
                        <table className="brgyTable">
                           <thead>
                              <tr>
                                 <th>OSY</th>
                                 <th>Status</th>
                                 <th>Progress</th>
                                 <th>Attendance</th>
                                 <th></th>
                              </tr>
                           </thead>
                           <tbody>
                              {loading && <tr><td colSpan="5" className="brgyEmptyCell">Loading...</td></tr>}
                              {!loading && rows.length === 0 && (
                                 <tr>
                                    <td colSpan="5" className="brgyEmptyCell">
                                       {enrollees.length === 0
                                          ? 'No enrolled OSY yet. They appear here once Maxima starts their training.'
                                          : 'No OSY match these filters.'}
                                    </td>
                                 </tr>
                              )}
                              {rows.map((row) => (
                                 <tr key={row.id}>
                                    <td>
                                       <div className="brgyPerson">
                                          <span className="brgyAvatar">{initials(row.osy_profile)}</span>
                                          <div>
                                             <span className="brgyPersonName">{fullName(row.osy_profile)}</span>
                                             <span className="brgyPersonSub">
                                                {row.training_program?.name ?? '—'}
                                                {row.batch_name ? `, ${row.batch_name}` : ''}
                                             </span>
                                             {row.summary.needs_attention && (
                                                <span className="brgyFlag">
                                                   <span className="material-symbols-outlined">flag</span>
                                                   {row.summary.alerts[0]}
                                                   {row.summary.alerts.length > 1 && ` +${row.summary.alerts.length - 1} more`}
                                                </span>
                                             )}
                                          </div>
                                       </div>
                                    </td>
                                    <td><StatusTag status={row.status} /></td>
                                    <td><ProgressBar row={row} /></td>
                                    <td>
                                       <span className={rateClass(row.summary.attendance_rate)}>
                                          {formatPercent(row.summary.attendance_rate)}
                                       </span>
                                    </td>
                                    <td className="brgyActionCell">
                                       <button className="brgyBtn brgyBtnSm" onClick={() => openDetail(row.id)}>
                                          <span className="material-symbols-outlined">visibility</span>
                                          View record
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </section>
               </div>
            </div>
         </div>

         {(selected || detailLoading) && (
            <div className="brgyOverlay">
               <div className="brgyModal" role="dialog" aria-modal="true">
                  {detailLoading && !selected && <div className="brgyModalLoading">Loading...</div>}

                  {selected && (
                     <>
                        <div className="brgyModalHead">
                           <div className="brgyPerson">
                              <span className="brgyAvatar brgyAvatarLg">{initials(selected.osy_profile)}</span>
                              <div>
                                 <h2 className="brgyModalName">{fullName(selected.osy_profile)}</h2>
                                 <p className="brgyModalSub">
                                    {selected.training_program?.name ?? '—'}
                                    <StatusTag status={selected.status} />
                                 </p>
                              </div>
                           </div>
                           <button className="brgyModalClose" onClick={closeDetail} aria-label="Close">
                              <span className="material-symbols-outlined">close</span>
                           </button>
                        </div>

                        <div className="brgyModalBody">
                           <OverviewSection detail={selected} />
                           <AttendanceSection detail={selected} />
                           <ConcernsSection detail={selected} />
                           <NotesSection detail={selected} />
                           <HistorySection detail={selected} />
                        </div>

                        <div className="brgyModalFoot">
                           <button className="brgyBtn" onClick={closeDetail}>Close</button>
                        </div>
                     </>
                  )}
               </div>
            </div>
         )}
      </>
   );
}

export default BarangayTrainingMonitoring;
