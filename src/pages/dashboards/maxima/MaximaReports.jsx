import { useEffect, useMemo, useState } from 'react';
import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaReports.css';

/* ------------------------------------------------------------------ */
/* API                                                                 */
/* ------------------------------------------------------------------ */
async function apiGet(url) {
   const res = await fetch(url, { headers: { Accept: 'application/json' }, credentials: 'include' });
   const data = await res.json().catch(() => null);
   if (!res.ok) {
      const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
      throw new Error(firstError ?? data?.message ?? 'Could not load the report.');
   }
   return data;
}

/* ------------------------------------------------------------------ */
/* Constants + formatting                                              */
/* ------------------------------------------------------------------ */
const STATUS_LABEL = { 'Training Started': 'Ongoing', Completed: 'Completed', Dropped: 'Dropped' };
const STATUS_DOT = {
   'Training Started': 'maximaReportDotOngoing',
   Completed: 'maximaReportDotCompleted',
   Dropped: 'maximaReportDotDropped',
};

// Status filter for the Enrollees tab
const ENROLLEE_STATUS_FILTERS = [
   ['', 'All statuses'],
   ['Training Started', 'Ongoing'],
   ['Completed', 'Completed'],
   ['Dropped', 'Dropped'],
];

const CONDUCT_LABEL = { excellent: 'Excellent', good: 'Good', fair: 'Fair', needs_improvement: 'Needs improvement' };
const CONDUCT_BADGE = {
   excellent: 'maximaReportBadgeGood',
   good: 'maximaReportBadgeGood',
   fair: 'maximaReportBadgeWarn',
   needs_improvement: 'maximaReportBadgeBad',
};

// Program history labels
const HISTORY_FIELDS = {
   name: 'Program name',
   description: 'Description',
   requirements: 'Requirements',
   schedule: 'Schedule',
   slots: 'Slots',
   tesda_accredited: 'TESDA accreditation',
   status: 'Status',
   image: 'Program image',
};

const HISTORY_ACTION = {
   created: 'Created',
   updated: 'Edited',
   deleted: 'Removed',
};

const HISTORY_BADGE = {
   created: 'maximaReportBadgeGood',
   updated: '',
   deleted: 'maximaReportBadgeBad',
};

const PRINT_OPTIONS = [
   ['overview', 'Overview'],
   ['programs', 'Programs'],
   ['enrollees', 'Enrollees'],
   ['history', 'Program changes'],
   ['all', 'Everything'],
];

function formatDate(value) {
   if (!value) return '';
   const d = new Date(value);
   return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value) {
   if (!value) return '—';
   const d = new Date(value);
   if (Number.isNaN(d.getTime())) return '—';
   return d.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
   });
}

function formatPercent(v) {
   return v === null || v === undefined || v === '' ? '—' : `${Math.round(Number(v) * 10) / 10}%`;
}

function periodLabel(from, to) {
   if (from && to) return `${formatDate(from)} to ${formatDate(to)}`;
   if (from) return `From ${formatDate(from)}`;
   if (to) return `Up to ${formatDate(to)}`;
   return 'All time';
}

function initials(name) {
   const words = (name ?? '').split(' ').filter(Boolean);
   if (words.length === 0) return '?';
   return `${words[0][0]}${words.length > 1 ? words[words.length - 1][0] : ''}`.toUpperCase();
}

function rateClass(rate) {
   if (rate === null || rate === undefined) return 'maximaReportMuted';
   if (rate >= 90) return 'maximaReportRateGood';
   if (rate >= 75) return 'maximaReportRateWarn';
   return 'maximaReportRateLow';
}

function historyValue(field, value) {
   if (value === null || value === undefined || value === '') return 'Empty';
   if (field === 'tesda_accredited') return value ? 'Accredited' : 'Not accredited';
   if (field === 'status') return value === 'active' ? 'Active' : 'Inactive';
   return String(value);
}

function changeText(item) {
   return (item.changes ?? [])
      .map((c) => {
         const label = HISTORY_FIELDS[c.field] ?? c.field;
         return item.action === 'created'
            ? `${label}: ${historyValue(c.field, c.new)}`
            : `${label}: ${historyValue(c.field, c.old)} → ${historyValue(c.field, c.new)}`;
      })
      .join('; ');
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */
function csvCell(value) {
   const text = value === null || value === undefined ? '' : String(value);
   return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(report, programName, history) {
   const rows = [];
   const add = (...cells) => rows.push(cells.map(csvCell).join(','));

   const f = report.filters;
   const s = report.summary;
   const today = new Date().toISOString().slice(0, 10);

   add('BackToTrack - Maxima Training Report');
   add('Period', periodLabel(f.from, f.to));
   add('Program', programName || 'All programs');
   add('Generated', today);
   add();

   add('SUMMARY');
   add('Referrals received', s.referrals_received);
   add('Pending review', s.pending_review);
   add('Accepted (not started)', s.accepted);
   add('Ongoing trainings', s.ongoing);
   add('Completed trainings', s.completed);
   add('Dropped', s.dropped);
   add('Needs follow-up', s.needs_follow_up);
   add();

   add('REFERRALS BY STATUS');
   add('Status', 'Count', 'Percent');
   report.referral_stages.forEach((i) => add(i.label, i.count, `${i.percent}%`));
   add();

   add('PROGRAM SUMMARY');
   add('Program', 'Referrals', 'Enrollees', 'Ongoing', 'Completed', 'Dropped', 'Completion rate', 'Average attendance', 'Average assessment');
   report.programs.forEach((p) =>
      add(
         p.program,
         p.referrals,
         p.enrollees,
         p.ongoing,
         p.completed,
         p.dropped,
         p.completion_rate === null ? '' : `${p.completion_rate}%`,
         p.attendance_rate === null ? '' : `${p.attendance_rate}%`,
         p.assessment_average === null ? '' : `${p.assessment_average}%`
      )
   );
   add();

   add('ENROLLEES');
   add('OSY', 'Program', 'Status', 'Attendance rate', 'Absences', 'Assessment average', 'Conduct', 'Pending concerns', 'Needs follow-up');
   report.enrollees.forEach((r) =>
      add(
         r.osy_name,
         r.program,
         STATUS_LABEL[r.status] ?? r.status,
         r.attendance_rate === null ? '' : `${r.attendance_rate}%`,
         r.absences,
         r.assessment_average === null ? '' : `${r.assessment_average}%`,
         CONDUCT_LABEL[r.conduct_rating] ?? '',
         r.pending_concerns,
         r.reasons.join('; ')
      )
   );
   add();

   add('PROGRAM CHANGES');
   add('Date', 'Program', 'Action', 'Changes', 'Changed by');
   history.forEach((item) =>
      add(
         formatDateTime(item.created_at),
         item.program_name,
         HISTORY_ACTION[item.action] ?? item.action,
         changeText(item),
         item.user?.name ?? ''
      )
   );

   // The leading BOM makes Excel read the file as UTF-8
   const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
   const url = URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.download = `maxima-report-${today}.csv`;
   document.body.appendChild(link);
   link.click();
   link.remove();
   URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */
function BarList({ items }) {
   const max = Math.max(1, ...items.map((i) => i.count));

   return (
      <div className="maximaReportBars">
         {items.map((item) => (
            <div className="maximaReportBarRow" key={item.label}>
               <span className="maximaReportBarLabel">{item.label}</span>
               <div className="maximaReportBarTrack">
                  <div className="maximaReportBarFill" style={{ width: `${(item.count / max) * 100}%` }} />
               </div>
               <span className="maximaReportBarValue">
                  {item.count} <em>{formatPercent(item.percent)}</em>
               </span>
            </div>
         ))}
      </div>
   );
}

function ReportCard({ title, hint, action, children }) {
   return (
      <section className="maximaReportCard">
         <div className="maximaReportCardHead">
            <div>
               <h2 className="maximaReportCardTitle">{title}</h2>
               {hint && <p className="maximaReportCardHint">{hint}</p>}
            </div>
            {action}
         </div>
         {children}
      </section>
   );
}

function StatCard({ icon, tone, label, value, sub }) {
   return (
      <div className="maximaReportStat">
         <span className={`maximaReportStatIcon ${tone}`}>
            <span className="material-symbols-outlined">{icon}</span>
         </span>
         <div className="maximaReportStatText">
            <span className="maximaReportStatLabel">{label}</span>
            <span className="maximaReportStatValue">{value}</span>
            <span className="maximaReportStatSub">{sub}</span>
         </div>
      </div>
   );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
function MaximaReports() {
   const [report, setReport] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   const [history, setHistory] = useState([]);
   const [historyLoading, setHistoryLoading] = useState(true);
   const [historyError, setHistoryError] = useState(null);

   const [from, setFrom] = useState('');
   const [to, setTo] = useState('');
   const [program, setProgram] = useState('');

   const [tab, setTab] = useState('overview');
   const [onlyFlagged, setOnlyFlagged] = useState(false);
   const [statusFilter, setStatusFilter] = useState('');
   const [printScope, setPrintScope] = useState('all');
   const [showPrint, setShowPrint] = useState(false);

   const badRange = Boolean(from && to && to < from);

   // Load the report
   useEffect(() => {
      if (badRange) return undefined;

      let cancelled = false;

      async function load() {
         setLoading(true);
         setError(null);
         try {
            const params = new URLSearchParams();
            if (from) params.append('from', from);
            if (to) params.append('to', to);
            if (program) params.append('program_id', program);

            const data = await apiGet(`/api/maxima/reports?${params.toString()}`);
            if (!cancelled) setReport(data);
         } catch (err) {
            if (!cancelled) setError(err.message);
         } finally {
            if (!cancelled) setLoading(false);
         }
      }

      load();

      return () => {
         cancelled = true;
      };
   }, [from, to, program, badRange]);

   // Load the program history
   useEffect(() => {
      if (badRange) return undefined;

      let cancelled = false;

      async function loadHistory() {
         setHistoryLoading(true);
         setHistoryError(null);
         try {
            const params = new URLSearchParams();
            if (from) params.append('from', from);
            if (to) params.append('to', to);
            if (program) params.append('program_id', program);

            const data = await apiGet(`/api/maxima/program-history?${params.toString()}`);
            if (!cancelled) setHistory(data);
         } catch (err) {
            if (!cancelled) setHistoryError(err.message);
         } finally {
            if (!cancelled) setHistoryLoading(false);
         }
      }

      loadHistory();

      return () => {
         cancelled = true;
      };
   }, [from, to, program, badRange]);

   const programOptions = report?.program_options ?? [];

   const programName = useMemo(
      () => programOptions.find((p) => String(p.id) === program)?.name ?? '',
      [programOptions, program]
   );

   const allEnrollees = report?.enrollees ?? [];

   const flagged = useMemo(
      () => allEnrollees.filter((r) => r.reasons.length > 0),
      [allEnrollees]
   );

   const statusCounts = useMemo(() => {
      const counts = { '': allEnrollees.length };
      allEnrollees.forEach((r) => {
         counts[r.status] = (counts[r.status] ?? 0) + 1;
      });
      return counts;
   }, [allEnrollees]);

   const visibleEnrollees = allEnrollees.filter(
      (r) => (!onlyFlagged || r.reasons.length > 0) && (!statusFilter || r.status === statusFilter)
   );

   function resetFilters() {
      setFrom('');
      setTo('');
      setProgram('');
   }

   function showFlagged() {
      setOnlyFlagged(true);
      setTab('enrollees');
   }

   const s = report?.summary;
   const filtersActive = Boolean(from || to || program);

   const tabs = [
      ['overview', 'Overview'],
      ['programs', 'Programs'],
      ['enrollees', 'Enrollees'],
      ['history', 'Program changes'],
   ];

   const panelClass = (name) => {
      let cls = tab === name ? 'maximaReportPanel' : 'maximaReportPanel maximaReportPanelOff';
      if (printScope !== 'all' && printScope !== name) cls += ' maximaReportPrintHide';
      return cls;
   };

   function startPrint(scope) {
      setPrintScope(scope);
      setShowPrint(false);
      // wait a moment so the page re-renders with the chosen section before printing
      setTimeout(() => window.print(), 150);
   }

   return (
      <>
         <div className="maximaReportBody">
            <MaximaSideBar />

            <div className="maximaReportMainContent">
               <div className="maximaReportPage">
                  <div className="maximaReportContainer">
                     {/* Title + actions */}
                     <div className="maximaReportHeader">
                        <div>
                           <h1 className="maximaReportTitle">Reports</h1>
                           <p className="maximaReportSubtitle">
                              A summary of referrals, programs and enrolled OSY for the period you choose.
                           </p>
                        </div>
                        <div className="maximaReportActions maximaReportNoPrint">
                           <button className="maximaReportBtn maximaReportBtnGhost" disabled={!report} onClick={() => downloadCsv(report, programName, history)}>
                              <span className="material-symbols-outlined">download</span>
                              Download CSV
                           </button>
               
                           <button className="maximaReportBtn maximaReportBtnPrimary" disabled={!report} onClick={() => setShowPrint(true)}>
                              <span className="material-symbols-outlined">print</span>
                              Print
                           </button>
                        </div>
                     </div>

                     {/* Only shown when printing */}
                     <div className="maximaReportPrintHeader">
                        <h2>BackToTrack - Maxima Training Report</h2>
                        <p>Maxima Technical &amp; Skills Training Institute Inc.</p>
                        <p>Period: {periodLabel(from, to)}</p>
                        <p>Program: {programName || 'All programs'}</p>
                        <p>Section: {PRINT_OPTIONS.find(([key]) => key === printScope)?.[1]}</p>
                        <p>Generated on {formatDate(new Date())}</p>
                     </div>

                     {/* Print options */}
                     {showPrint && (
                        <div className="maximaReportModalOverlay maximaReportNoPrint" onClick={() => setShowPrint(false)}>
                           <div className="maximaReportModal" onClick={(e) => e.stopPropagation()}>
                              <h2 className="maximaReportCardTitle">What do you want to print?</h2>
                              <p className="maximaReportCardHint">Pick a section. The print preview opens right after.</p>
                              <div className="maximaReportModalList">
                                 {PRINT_OPTIONS.map(([key, label]) => (
                                    <button key={key} className="maximaReportBtn maximaReportBtnGhost" onClick={() => startPrint(key)}>
                                       {label}
                                    </button>
                                 ))}
                              </div>
                              <button className="maximaReportLink" onClick={() => setShowPrint(false)}>Cancel</button>
                           </div>
                        </div>
                     )}

                     {/* Filters */}
                     <section className="maximaReportFilterBar maximaReportNoPrint">
                        <label className="maximaReportField">
                           <span>From</span>
                           <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                        </label>
                        <label className="maximaReportField">
                           <span>To</span>
                           <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                        </label>
                        <label className="maximaReportField">
                           <span>Program</span>
                           <select value={program} onChange={(e) => setProgram(e.target.value)}>
                              <option value="">All programs</option>
                              {programOptions.map((p) => (
                                 <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                           </select>
                        </label>
                        {filtersActive && (
                           <button className="maximaReportLink" onClick={resetFilters}>Clear filters</button>
                        )}
                        <span className="maximaReportFilterNote">Covers referrals created in this period.</span>
                     </section>

                     {badRange && <div className="maximaReportAlert maximaReportAlertError">The end date must be on or after the start date.</div>}
                     {error && <div className="maximaReportAlert maximaReportAlertError">{error}</div>}
                     {loading && !report && <div className="maximaReportLoading">Loading report...</div>}

                     {report && (
                        <div className={loading ? 'maximaReportBodyContent maximaReportBodyBusy' : 'maximaReportBodyContent'}>
                           {/* Key numbers */}
                           <div className={printScope === 'all' || printScope === 'overview' ? 'maximaReportStatGrid' : 'maximaReportStatGrid maximaReportPrintHide'}>
                              <StatCard
                                 icon="assignment_ind"
                                 tone="maximaReportToneBlue"
                                 label="Referrals received"
                                 value={s.referrals_received}
                                 sub={`${s.pending_review} pending review`}
                              />
                              <StatCard
                                 icon="play_circle"
                                 tone="maximaReportToneGreen"
                                 label="Ongoing trainings"
                                 value={s.ongoing}
                                 sub={`${s.accepted} accepted, not started`}
                              />
                              <StatCard
                                 icon="task_alt"
                                 tone="maximaReportToneTeal"
                                 label="Completed"
                                 value={s.completed}
                                 sub={`${s.dropped} dropped`}
                              />
                              <StatCard
                                 icon="flag"
                                 tone={s.needs_follow_up > 0 ? 'maximaReportToneRed' : 'maximaReportToneGrey'}
                                 label="Needs follow-up"
                                 value={s.needs_follow_up}
                                 sub={s.needs_follow_up > 0 ? 'See the list in Overview' : 'All on track'}
                              />
                           </div>

                           {/* Tabs */}
                           <div className="maximaReportTabs maximaReportNoPrint">
                              {tabs.map(([key, label]) => (
                                 <button
                                    key={key}
                                    className={tab === key ? 'maximaReportTab maximaReportTabActive' : 'maximaReportTab'}
                                    onClick={() => setTab(key)}
                                 >
                                    {label}
                                 </button>
                              ))}
                           </div>

                           {/* Overview */}
                           <div className={panelClass('overview')}>
                              <div className="maximaReportTwoCol">
                                 <ReportCard title="Referral pipeline" hint="Where each referral from SK officials is now.">
                                    <BarList items={report.referral_stages} />
                                 </ReportCard>

                                 <ReportCard
                                    title="Needs follow-up"
                                    hint="Low attendance, repeated absences, low scores or open concerns."
                                    action={
                                       flagged.length > 5 && (
                                          <button className="maximaReportLink maximaReportNoPrint" onClick={showFlagged}>View all {flagged.length}</button>
                                       )
                                    }
                                 >
                                    {flagged.length === 0 ? (
                                       <p className="maximaReportEmpty">No one needs follow-up right now.</p>
                                    ) : (
                                       <ul className="maximaReportFlagList">
                                          {flagged.slice(0, 5).map((row) => (
                                             <li className="maximaReportFlagItem" key={row.referral_id}>
                                                <span className="maximaReportAvatar">{initials(row.osy_name)}</span>
                                                <div className="maximaReportFlagText">
                                                   <span className="maximaReportFlagName">{row.osy_name}</span>
                                                   <span className="maximaReportFlagMeta">
                                                      {row.program} · {row.reasons[0]}
                                                      {row.reasons.length > 1 && ` +${row.reasons.length - 1} more`}
                                                   </span>
                                                </div>
                                             </li>
                                          ))}
                                       </ul>
                                    )}
                                 </ReportCard>
                              </div>
                           </div>

                           {/* Programs */}
                           <div className={panelClass('programs')}>
                              <ReportCard title="Program summary" hint="Enrollees are OSY whose training has started.">
                                 <div className="maximaReportTableWrap">
                                    <table className="maximaReportTable">
                                       <thead>
                                          <tr>
                                             <th>Program</th>
                                             <th>Referrals</th>
                                             <th>Enrollees</th>
                                             <th>Completed</th>
                                             <th>Completion</th>
                                             <th>Attendance</th>
                                             <th>Assessment</th>
                                          </tr>
                                       </thead>
                                       <tbody>
                                          {report.programs.length === 0 && (
                                             <tr>
                                                <td colSpan="7" className="maximaReportTableEmpty">No referrals for this period.</td>
                                             </tr>
                                          )}
                                          {report.programs.map((p) => (
                                             <tr key={p.program_id ?? p.program}>
                                                <td><strong>{p.program}</strong></td>
                                                <td>{p.referrals}</td>
                                                <td>{p.enrollees}</td>
                                                <td>{p.completed}</td>
                                                <td>
                                                   <div className="maximaReportMini">
                                                      <div className="maximaReportMiniTrack">
                                                         <div className="maximaReportMiniFill" style={{ width: `${p.completion_rate ?? 0}%` }} />
                                                      </div>
                                                      <span>{formatPercent(p.completion_rate)}</span>
                                                   </div>
                                                </td>
                                                <td>{formatPercent(p.attendance_rate)}</td>
                                                <td>{formatPercent(p.assessment_average)}</td>
                                             </tr>
                                          ))}
                                       </tbody>
                                    </table>
                                 </div>
                              </ReportCard>
                           </div>

                           {/* Enrollees */}
                           <div className={panelClass('enrollees')}>
                              <ReportCard
                                 title="Enrollees"
                                 hint="Attendance, assessment, conduct and concerns for each enrolled OSY."
                                 action={
                                    <div className="maximaReportSegment maximaReportNoPrint">
                                       <button className={!onlyFlagged ? 'maximaReportSegBtn maximaReportSegActive' : 'maximaReportSegBtn'} onClick={() => setOnlyFlagged(false)}>
                                          All ({allEnrollees.length})
                                       </button>
                                       <button className={onlyFlagged ? 'maximaReportSegBtn maximaReportSegActive' : 'maximaReportSegBtn'} onClick={() => setOnlyFlagged(true)}>
                                          Needs follow-up ({flagged.length})
                                       </button>
                                    </div>
                                 }
                              >
                                 <div className="maximaReportStatusBar maximaReportNoPrint">
                                    {ENROLLEE_STATUS_FILTERS.map(([key, label]) => (
                                       <button
                                          key={key || 'all'}
                                          className={statusFilter === key ? 'maximaReportPill maximaReportPillActive' : 'maximaReportPill'}
                                          onClick={() => setStatusFilter(key)}
                                       >
                                          {label}
                                          <span className="maximaReportPillCount">{statusCounts[key] ?? 0}</span>
                                       </button>
                                    ))}
                                 </div>

                                 <div className="maximaReportTableWrap">
                                    <table className="maximaReportTable">
                                       <thead>
                                          <tr>
                                             <th>OSY</th>
                                             <th>Program</th>
                                             <th>Status</th>
                                             <th>Attendance</th>
                                             <th>Assessment</th>
                                             <th>Conduct</th>
                                             <th>Concerns</th>
                                          </tr>
                                       </thead>
                                       <tbody>
                                          {visibleEnrollees.length === 0 && (
                                             <tr>
                                                <td colSpan="7" className="maximaReportTableEmpty">
                                                   {allEnrollees.length === 0
                                                      ? 'No enrolled OSY for this period.'
                                                      : 'No enrollees match this filter.'}
                                                </td>
                                             </tr>
                                          )}
                                          {visibleEnrollees.map((row) => (
                                             <tr key={row.referral_id}>
                                                <td>
                                                   <div className="maximaReportPerson">
                                                      <span className="maximaReportAvatar">{initials(row.osy_name)}</span>
                                                      <div>
                                                         <span className="maximaReportPersonName">{row.osy_name}</span>
                                                         {row.reasons.length > 0 && (
                                                            <span className="maximaReportFlag">
                                                               <span className="material-symbols-outlined">flag</span>
                                                               {row.reasons[0]}
                                                               {row.reasons.length > 1 && ` +${row.reasons.length - 1} more`}
                                                            </span>
                                                         )}
                                                      </div>
                                                   </div>
                                                </td>
                                                <td>{row.program}</td>
                                                <td>
                                                   <span className="maximaReportStatus">
                                                      <i className={`maximaReportDot ${STATUS_DOT[row.status] ?? ''}`} />
                                                      {STATUS_LABEL[row.status] ?? row.status}
                                                   </span>
                                                </td>
                                                <td>
                                                   <span className={rateClass(row.attendance_rate)}>
                                                      {formatPercent(row.attendance_rate)}
                                                   </span>
                                                </td>
                                                <td>{formatPercent(row.assessment_average)}</td>
                                                <td>
                                                   {row.conduct_rating ? (
                                                      <span className={`maximaReportBadge ${CONDUCT_BADGE[row.conduct_rating] ?? ''}`}>
                                                         {CONDUCT_LABEL[row.conduct_rating]}
                                                      </span>
                                                   ) : (
                                                      <span className="maximaReportMuted">—</span>
                                                   )}
                                                </td>
                                                <td>
                                                   {row.pending_concerns > 0 ? (
                                                      <span className="maximaReportBadge maximaReportBadgeWarn">{row.pending_concerns} pending</span>
                                                   ) : (
                                                      <span className="maximaReportMuted">None</span>
                                                   )}
                                                </td>
                                             </tr>
                                          ))}
                                       </tbody>
                                    </table>
                                 </div>
                              </ReportCard>
                           </div>

                           {/* Program changes */}
                           <div className={panelClass('history')}>
                              <ReportCard
                                 title="Program changes"
                                 hint="Edits, additions and removals of training programs. Filtered by the date the change was made."
                              >
                                 {historyError && (
                                    <div className="maximaReportAlert maximaReportAlertError maximaReportAlertFlush">{historyError}</div>
                                 )}

                                 <div className="maximaReportTableWrap">
                                    <table className="maximaReportTable">
                                       <thead>
                                          <tr>
                                             <th>Date</th>
                                             <th>Program</th>
                                             <th>Action</th>
                                             <th>Changes</th>
                                             <th>Changed by</th>
                                          </tr>
                                       </thead>
                                       <tbody>
                                          {historyLoading && (
                                             <tr>
                                                <td colSpan="5" className="maximaReportTableEmpty">Loading program changes...</td>
                                             </tr>
                                          )}
                                          {!historyLoading && history.length === 0 && (
                                             <tr>
                                                <td colSpan="5" className="maximaReportTableEmpty">
                                                   No program changes recorded for this period.
                                                </td>
                                             </tr>
                                          )}
                                          {!historyLoading && history.map((item) => (
                                             <tr key={item.id}>
                                                <td className="maximaReportNoWrap">{formatDateTime(item.created_at)}</td>
                                                <td><strong>{item.program_name}</strong></td>
                                                <td>
                                                   <span className={`maximaReportBadge ${HISTORY_BADGE[item.action] ?? ''}`}>
                                                      {HISTORY_ACTION[item.action] ?? item.action}
                                                   </span>
                                                </td>
                                                <td className="maximaReportChangeCell">
                                                   {(item.changes ?? []).length === 0 ? (
                                                      <span className="maximaReportMuted">—</span>
                                                   ) : (
                                                      <ul className="maximaReportChangeList">
                                                         {item.changes.map((change) => (
                                                            <li className="maximaReportChange" key={change.field}>
                                                               <span className="maximaReportChangeField">
                                                                  {HISTORY_FIELDS[change.field] ?? change.field}
                                                               </span>
                                                               {item.action === 'created' ? (
                                                                  <span className="maximaReportChangeNew">
                                                                     {historyValue(change.field, change.new)}
                                                                  </span>
                                                               ) : (
                                                                  <>
                                                                     <span className="maximaReportChangeOld">
                                                                        {historyValue(change.field, change.old)}
                                                                     </span>
                                                                     <span className="maximaReportChangeArrow">→</span>
                                                                     <span className="maximaReportChangeNew">
                                                                        {historyValue(change.field, change.new)}
                                                                     </span>
                                                                  </>
                                                               )}
                                                            </li>
                                                         ))}
                                                      </ul>
                                                   )}
                                                </td>
                                                <td>{item.user?.name ?? '—'}</td>
                                             </tr>
                                          ))}
                                       </tbody>
                                    </table>
                                 </div>

                                 {history.length >= 500 && (
                                    <p className="maximaReportCardHint maximaReportLimitNote">
                                       Showing the latest 500 changes. Narrow the dates to see older ones.
                                    </p>
                                 )}
                              </ReportCard>
                           </div>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>
      </>
   );
}

export default MaximaReports;