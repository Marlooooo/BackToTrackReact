import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BarangaySideBar from '../../../components/skOfficialSideBar';
import './BarangayTrainingMonitoring.css';
import './BarangayReports.css';

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
/* Formatting                                                          */
/* ------------------------------------------------------------------ */
function formatDate(value) {
   if (!value) return '';
   const d = new Date(value);
   return Number.isNaN(d.getTime())
      ? ''
      : d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
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

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */
function csvCell(value) {
   const text = value === null || value === undefined ? '' : String(value);
   return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadCsv(report, programName) {
   const rows = [];
   const add = (...cells) => rows.push(cells.map(csvCell).join(','));

   const f = report.filters;
   const today = new Date().toISOString().slice(0, 10);

   add('BackToTrack - SK Report');
   add('Period', periodLabel(f.from, f.to));
   add('Program', programName || 'All programs');
   add('Generated', today);
   add();

   add('SUMMARY');
   add('Total OSY', report.summary.total_osy);
   add('Active referrals', report.summary.active_referrals);
   add('Ongoing trainings', report.summary.ongoing);
   add('Completed trainings', report.summary.completed);
   add('Dropped', report.summary.dropped);
   add('OSY at risk', report.summary.at_risk);
   add();

   const distribution = (title, items) => {
      add(title);
      add('Category', 'Count', 'Percent');
      items.forEach((i) => add(i.label, i.count, `${i.percent}%`));
      add();
   };

   distribution('GENDER DISTRIBUTION', report.gender);
   distribution('AGE DISTRIBUTION', report.age_groups);
   distribution('OSY BY STAGE', report.osy_stages);
   distribution('REFERRALS BY STATUS', report.referral_stages);

   add('TRANSPORTATION SUPPORT');
   add('Total OSY', report.transportation.total);
   add('With transportation support', report.transportation.with_support);
   add('Lacking transportation support', report.transportation.lacking);
   add('Percent lacking', `${report.transportation.lacking_percent}%`);
   add();

   add('TRAINING PROGRAM PERFORMANCE');
   add('Program', 'Enrollees', 'Ongoing', 'Completed', 'Dropped', 'Completion rate', 'Average attendance', 'Average assessment');
   report.programs.forEach((p) =>
      add(
         p.program,
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

   add('OSY AT RISK');
   add('OSY', 'Program', 'Attendance rate', 'Absences', 'Pending concerns', 'Reasons');
   report.at_risk.forEach((r) =>
      add(
         r.osy_name,
         r.program,
         r.attendance_rate === null ? '' : `${r.attendance_rate}%`,
         r.absences,
         r.pending_concerns,
         r.reasons.join('; ')
      )
   );

   // The leading BOM makes Excel read the file as UTF-8
   const blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
   const url = URL.createObjectURL(blob);
   const link = document.createElement('a');
   link.href = url;
   link.download = `sk-report-${today}.csv`;
   document.body.appendChild(link);
   link.click();
   link.remove();
   URL.revokeObjectURL(url);
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

/*
   Color tones (defined in BarangayReports.css as .brgyTone-<name>):
   blue, teal, amber, green, slate, red, purple, pink, orange, indigo
*/

// `tone` colors the whole list. `toneMap` can override the tone for specific labels,
// and an item can also carry its own `tone`.
function BarList({ items, toneMap = {} }) {
   const max = Math.max(1, ...items.map((i) => i.count));

   return (
      <div className="brgyRepBars">
         {items.map((item) => {
            const itemTone = item.tone ?? toneMap[item.label];

            return (
               <div className={`brgyRepBarRow ${itemTone ? `brgyTone-${itemTone}` : ''}`} key={item.label}>
                  <span className="brgyRepBarLabel">{item.label}</span>
                  <div className="brgyRepBarTrack">
                     <div className="brgyRepBarFill" style={{ width: `${(item.count / max) * 100}%` }} />
                  </div>
                  <span className="brgyRepBarValue">
                     {item.count} <em>({formatPercent(item.percent)})</em>
                  </span>
               </div>
            );
         })}
      </div>
   );
}

function ReportCard({ icon, title, hint, tone = 'blue', children }) {
   return (
      <section className={`brgyPanel brgyRepCard brgyTone-${tone}`}>
         <div className="brgyRepCardHead">
            <span className="material-symbols-outlined brgyRepCardIcon">{icon}</span>
            <div>
               <h2 className="brgyRepCardTitle">{title}</h2>
               {hint && <p className="brgyRepCardHint">{hint}</p>}
            </div>
         </div>
         {children}
      </section>
   );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
function BarangayReports() {
   const [report, setReport] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   const [from, setFrom] = useState('');
   const [to, setTo] = useState('');
   const [program, setProgram] = useState('');
   const [programOptions, setProgramOptions] = useState([]);

   const badRange = Boolean(from && to && to < from);

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

            const data = await apiGet(`/api/barangay/reports?${params.toString()}`);
            if (cancelled) return;

            setReport(data);

            // Keep every program we have seen, so the dropdown doesn't shrink when a program is chosen
            setProgramOptions((prev) => {
               const map = new Map(prev);
               (data.programs ?? []).forEach((p) => map.set(String(p.program_id), p.program));
               return [...map.entries()].sort((a, b) => a[1].localeCompare(b[1]));
            });
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

   const programName = useMemo(
      () => programOptions.find(([id]) => id === program)?.[1] ?? '',
      [programOptions, program]
   );

   function resetFilters() {
      setFrom('');
      setTo('');
      setProgram('');
   }

   const summary = report?.summary;

   // [label, value, alert, tone]
   const stats = summary
      ? [
           ['Total OSY', summary.total_osy, false, 'blue'],
           ['Active referrals', summary.active_referrals, false, 'teal'],
           ['Ongoing trainings', summary.ongoing, false, 'amber'],
           ['Completed trainings', summary.completed, false, 'green'],
           ['Dropped', summary.dropped, false, 'slate'],
           ['OSY at risk', summary.at_risk, summary.at_risk > 0, 'red'],
        ]
      : [];

   return (
      <>
         <div className="brgyMonitorShell">
            <BarangaySideBar />

            <div className="brgyMonitorMain">
               <div className="brgyMonitorPage">
                  <div className="brgyPageHead">
                     <h1 className="brgyPageTitle">Reports</h1>
                     <p className="brgyPageSubtitle">
                        Overall statistics for out-of-school youth, referrals and training outcomes.
                     </p>
                  </div>

                  <div className="brgyRepPrintHeader">
                     <h2>BackToTrack - SK Report</h2>
                     <p>Barangay Pogo Grande</p>
                     <p>Period: {periodLabel(from, to)}</p>
                     <p>Program: {programName || 'All programs'}</p>
                     <p>Generated on {formatDate(new Date())}</p>
                  </div>

                  <section className="brgyPanel brgyRepNoPrint">
                     <div className="brgyRepFilters">
                        <label className="brgyRepField">
                           <span>From</span>
                           <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
                        </label>
                        <label className="brgyRepField">
                           <span>To</span>
                           <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
                        </label>
                        <label className="brgyRepField">
                           <span>Program</span>
                           <select className="brgySelect" value={program} onChange={(e) => setProgram(e.target.value)}>
                              <option value="">All programs</option>
                              {programOptions.map(([id, name]) => (
                                 <option key={id} value={id}>{name}</option>
                              ))}
                           </select>
                        </label>

                        <div className="brgyRepActions">
                           <button className="brgyBtn brgyBtnSm" onClick={resetFilters}>
                              <span className="material-symbols-outlined">restart_alt</span>
                              Reset
                           </button>
                           <button className="brgyBtn brgyBtnSm" disabled={!report} onClick={() => downloadCsv(report, programName)}>
                              <span className="material-symbols-outlined">download</span>
                              Download CSV
                           </button>
                           <button className="brgyBtn brgyBtnSm" disabled={!report} onClick={() => window.print()}>
                              <span className="material-symbols-outlined">print</span>
                              Print
                           </button>
                        </div>
                     </div>

                     <p className="brgyRepNote">
                        OSY statistics (gender, age, stages, transportation) include everyone registered up to the end date.
                        Referral and program statistics cover referrals created within the period.
                     </p>
                  </section>

                  {badRange && <div className="brgyNotice brgyNoticeError">The end date must be on or after the start date.</div>}
                  {error && <div className="brgyNotice brgyNoticeError">{error}</div>}
                  {loading && !report && <div className="brgyRepLoading">Loading report...</div>}

                  {report && (
                     <div className={loading ? 'brgyRepBody brgyRepBodyBusy' : 'brgyRepBody'}>
                        <div className="brgyRepStatGrid">
                           {stats.map(([label, value, alert, tone]) => (
                              <div
                                 className={`brgyStatCard brgyTone-${tone} ${alert ? 'brgyStatCardAlert' : ''}`}
                                 key={label}
                              >
                                 <span className="brgyStatLabel">{label}</span>
                                 <span className="brgyStatValue">{value}</span>
                              </div>
                           ))}
                        </div>

                        <div className="brgyRepGrid">
                           <ReportCard icon="wc" title="Gender distribution" tone="indigo">
                              <BarList items={report.gender} toneMap={{ Male: 'blue', Female: 'pink' }} />
                           </ReportCard>

                           <ReportCard icon="cake" title="Age distribution" tone="purple">
                              <BarList items={report.age_groups} />
                           </ReportCard>

                           <ReportCard
                              icon="groups"
                              title="OSY by stage"
                              hint="Where each registered OSY is right now."
                              tone="green"
                           >
                              <BarList items={report.osy_stages} />
                           </ReportCard>

                           <ReportCard icon="assignment_ind" title="Referrals by status" tone="orange">
                              <BarList items={report.referral_stages} />
                           </ReportCard>
                        </div>

                        <ReportCard
                           icon="directions_bus"
                           title="Transportation support"
                           hint="Useful for proposing community projects, such as a transport allowance."
                           tone="amber"
                        >
                           {report.transportation.total === 0 ? (
                              <div className="brgyEmptyBlock">No OSY are registered yet.</div>
                           ) : (
                              <div className="brgyRepTransport">
                                 <div className="brgyRepBigNumber">
                                    <strong>{formatPercent(report.transportation.lacking_percent)}</strong>
                                    <span>
                                       {report.transportation.lacking} of {report.transportation.total} OSY lack transportation support
                                    </span>
                                 </div>
                                 <BarList
                                    items={[
                                       {
                                          label: 'With support',
                                          count: report.transportation.with_support,
                                          percent: 100 - report.transportation.lacking_percent,
                                          tone: 'green',
                                       },
                                       {
                                          label: 'Lacking support',
                                          count: report.transportation.lacking,
                                          percent: report.transportation.lacking_percent,
                                          tone: 'red',
                                       },
                                    ]}
                                 />
                              </div>
                           )}
                        </ReportCard>

                        <ReportCard
                           icon="emoji_events"
                           title="Training program performance"
                           hint="Sorted by average assessment score, then completion rate."
                           tone="teal"
                        >
                           <div className="brgyTableWrap">
                              <table className="brgyTable">
                                 <thead>
                                    <tr>
                                       <th>Program</th>
                                       <th>Enrollees</th>
                                       <th>Ongoing</th>
                                       <th>Completed</th>
                                       <th>Dropped</th>
                                       <th>Completion</th>
                                       <th>Avg. attendance</th>
                                       <th>Avg. assessment</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {report.programs.length === 0 && (
                                       <tr>
                                          <td colSpan="8" className="brgyEmptyCell">No enrolled OSY for this period.</td>
                                       </tr>
                                    )}
                                    {report.programs.map((p) => (
                                       <tr key={p.program_id ?? p.program}>
                                          <td><strong>{p.program}</strong></td>
                                          <td>{p.enrollees}</td>
                                          <td>{p.ongoing}</td>
                                          <td>{p.completed}</td>
                                          <td>{p.dropped}</td>
                                          <td>{formatPercent(p.completion_rate)}</td>
                                          <td>{formatPercent(p.attendance_rate)}</td>
                                          <td>{formatPercent(p.assessment_average)}</td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </ReportCard>

                        <ReportCard
                           icon="flag"
                           title="OSY at risk"
                           hint="Low attendance, repeated absences, pending concerns or low assessment scores."
                           tone="red"
                        >
                           <div className="brgyTableWrap">
                              <table className="brgyTable">
                                 <thead>
                                    <tr>
                                       <th>OSY</th>
                                       <th>Program</th>
                                       <th>Attendance</th>
                                       <th>Why flagged</th>
                                       <th className="brgyRepNoPrint"></th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    {report.at_risk.length === 0 && (
                                       <tr>
                                          <td colSpan="5" className="brgyEmptyCell">No OSY need follow-up right now.</td>
                                       </tr>
                                    )}
                                    {report.at_risk.map((row) => (
                                       <tr key={row.referral_id}>
                                          <td><strong>{row.osy_name}</strong></td>
                                          <td>{row.program}</td>
                                          <td>{formatPercent(row.attendance_rate)}</td>
                                          <td>
                                             <div className="brgyRepReasons">
                                                {row.reasons.map((reason) => (
                                                   <span className="brgyBadge brgyBadgeWarn" key={reason}>{reason}</span>
                                                ))}
                                             </div>
                                          </td>
                                          <td className="brgyActionCell brgyRepNoPrint">
                                             <Link className="brgyBtn brgyBtnSm brgyRepLink" to={`/barangay/training?open=${row.referral_id}`}>
                                                <span className="material-symbols-outlined">visibility</span>
                                                View record
                                             </Link>
                                          </td>
                                       </tr>
                                    ))}
                                 </tbody>
                              </table>
                           </div>
                        </ReportCard>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </>
   );
}

export default BarangayReports;
