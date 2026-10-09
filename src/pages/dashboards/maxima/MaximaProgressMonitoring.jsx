import { useEffect, useState } from 'react';
import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaProgressMonitoring.css';

/* ------------------------------------------------------------------ */
/* API helpers                                                         */
/* ------------------------------------------------------------------ */
function getCookie(name) {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? decodeURIComponent(match[2]) : null;
}

async function ensureCsrfCookie() {
   await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
}

async function apiGet(url) {
   const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      credentials: 'include',
   });
   const data = await res.json().catch(() => null);
   if (!res.ok) throw new Error(data?.message ?? 'Could not load the data.');
   return data;
}

async function apiSend(url, method, body) {
   await ensureCsrfCookie();
   const res = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
         Accept: 'application/json',
         'Content-Type': 'application/json',
         'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
      },
      body: body ? JSON.stringify(body) : undefined,
   });
   const data = await res.json().catch(() => null);
   if (!res.ok) {
      const firstError = data?.errors ? Object.values(data.errors)[0]?.[0] : null;
      throw new Error(firstError ?? data?.message ?? 'Something went wrong.');
   }
   return data;
}

/* ------------------------------------------------------------------ */
/* Constants + formatting                                              */
/* ------------------------------------------------------------------ */
const STATUS_CLASS = {
   'Accepted by Maxima': 'pmBadgePending',
   'Training Started': 'pmBadgeOngoing',
   Completed: 'pmBadgeCompleted',
   Dropped: 'pmBadgeDropped',
};

const STATUS_LABEL = {
   'Accepted by Maxima': 'Awaiting Start',
   'Training Started': 'Ongoing',
   Completed: 'Completed',
   Dropped: 'Dropped',
};

const ATTENDANCE_CLASS = {
   present: 'pmBadgeCompleted',
   late: 'pmBadgePending',
   absent: 'pmBadgeDropped',
   excused: '',
};

const CONCERN_CLASS = {
   pending: 'pmBadgePending',
   reviewed: 'pmBadgeOngoing',
   resolved: 'pmBadgeCompleted',
};

const DROP_REASONS = [
   ['transport', 'Transportation problem'],
   ['work', 'Needs to work'],
   ['family', 'Family reasons'],
   ['health', 'Health reasons'],
   ['lost_interest', 'Lost interest'],
   ['other', 'Other'],
];

const AFTER_TRAINING = [
   ['employed', 'Employed'],
   ['self_employed', 'Self-employed'],
   ['further_training', 'Continuing to further training'],
   ['looking_for_work', 'Looking for work'],
   ['other', 'Other'],
];

function labelOf(list, value) {
   return list.find(([key]) => key === value)?.[1] ?? '—';
}

function nz(value) {
   return value === '' || value === undefined ? null : value;
}

function todayLocal() {
   const d = new Date();
   const month = String(d.getMonth() + 1).padStart(2, '0');
   const day = String(d.getDate()).padStart(2, '0');
   return `${d.getFullYear()}-${month}-${day}`;
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

function fullName(profile) {
   if (!profile) return 'N/A';
   return [profile.first_name, profile.middle_name, profile.last_name].filter(Boolean).join(' ');
}

function initials(profile) {
   if (!profile) return '?';
   return `${profile.first_name?.[0] ?? ''}${profile.last_name?.[0] ?? ''}`.toUpperCase() || '?';
}

function rateClass(rate) {
   if (rate === null || rate === undefined) return '';
   if (rate >= 90) return 'pmRateGood';
   if (rate >= 75) return 'pmRateWarn';
   return 'pmRateLow';
}

function trainingDayLabel(row) {
   const s = row.summary;
   if (row.status === 'Training Started' && s.training_day) {
      return s.training_length ? `Day ${s.training_day} of ${s.training_length}` : `Day ${s.training_day}`;
   }
   if (row.status === 'Completed' || row.status === 'Dropped') {
      return `Ended ${formatDate(row.training_end_date)}`;
   }
   if (row.status === 'Accepted by Maxima') return 'Not started';
   return '—';
}

/* ------------------------------------------------------------------ */
/* Small form helpers                                                  */
/* ------------------------------------------------------------------ */
function useForm(initial) {
   const [values, setValues] = useState(initial);
   const bind = (key) => ({
      value: values[key] ?? '',
      onChange: (e) => setValues((prev) => ({ ...prev, [key]: e.target.value })),
   });
   return [values, bind];
}

function clean(values) {
   return Object.fromEntries(Object.entries(values).map(([key, value]) => [key, nz(value)]));
}

function Field({ label, children }) {
   return (
      <label className="pmField">
         <span>{label}</span>
         {children}
      </label>
   );
}

function FormShell({ title, submitLabel, onSubmit, onCancel, danger, children }) {
   const [busy, setBusy] = useState(false);

   async function handle(e) {
      e.preventDefault();
      setBusy(true);
      await onSubmit();
      setBusy(false);
   }

   return (
      <form className="pmForm" onSubmit={handle}>
         <h3 className="pmFormTitle">{title}</h3>
         {children}
         <div className="pmFormActions">
            <button type="button" className="pmBtnGhost" onClick={onCancel}>Cancel</button>
            <button type="submit" className={danger ? 'pmBtnDanger' : 'pmBtnPrimary'} disabled={busy}>
               {busy ? 'Saving...' : submitLabel}
            </button>
         </div>
      </form>
   );
}

/* ------------------------------------------------------------------ */
/* Overview forms                                                      */
/* ------------------------------------------------------------------ */
function DetailsForm({ detail, title, submitLabel, defaultStart, onSave, onCancel }) {
   const [values, bind] = useForm({
      training_start_date: detail.training_start_date ?? detail.started_on ?? (defaultStart ? todayLocal() : ''),
      expected_end_date: detail.expected_end_date ?? '',
      batch_name: detail.batch_name ?? '',
      venue: detail.venue ?? '',
      trainer_name: detail.trainer_name ?? '',
   });

   return (
      <FormShell title={title} submitLabel={submitLabel} onSubmit={() => onSave(clean(values))} onCancel={onCancel}>
         <div className="pmFormGrid">
            <Field label="Start date"><input type="date" {...bind('training_start_date')} /></Field>
            <Field label="Expected end date"><input type="date" {...bind('expected_end_date')} /></Field>
            <Field label="Batch / class name">
               <input type="text" placeholder="e.g. Batch 3 - Evening" {...bind('batch_name')} />
            </Field>
            <Field label="Venue"><input type="text" {...bind('venue')} /></Field>
            <Field label="Trainer"><input type="text" {...bind('trainer_name')} /></Field>
         </div>
      </FormShell>
   );
}

function CompleteForm({ detail, title, submitLabel, onSave, onCancel }) {
   const [values, bind] = useForm({
      training_end_date: detail.training_end_date ?? todayLocal(),
      certificate_number: detail.certificate_number ?? '',
      certificate_date: detail.certificate_date ?? '',
      after_training_status: detail.after_training_status ?? '',
      after_training_note: detail.after_training_note ?? '',
      outcome_remarks: detail.outcome_remarks ?? '',
   });

   return (
      <FormShell title={title} submitLabel={submitLabel} onSubmit={() => onSave(clean(values))} onCancel={onCancel}>
         <div className="pmFormGrid">
            <Field label="Date completed"><input type="date" {...bind('training_end_date')} /></Field>
            <Field label="Certificate no. (optional)"><input type="text" {...bind('certificate_number')} /></Field>
            <Field label="Certificate date (optional)"><input type="date" {...bind('certificate_date')} /></Field>
            <Field label="After training (optional)">
               <select {...bind('after_training_status')}>
                  <option value="">Not yet known</option>
                  {AFTER_TRAINING.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
               </select>
            </Field>
            <Field label="Where / details (optional)">
               <input type="text" placeholder="e.g. employer or school name" {...bind('after_training_note')} />
            </Field>
         </div>
         <Field label="Remarks (optional)">
            <textarea rows="2" {...bind('outcome_remarks')} />
         </Field>
      </FormShell>
   );
}

function DropForm({ detail, title, submitLabel, onSave, onCancel }) {
   const [values, bind] = useForm({
      training_end_date: detail.training_end_date ?? todayLocal(),
      drop_reason: detail.drop_reason ?? '',
      outcome_remarks: detail.outcome_remarks ?? '',
   });

   return (
      <FormShell title={title} submitLabel={submitLabel} danger onSubmit={() => onSave(clean(values))} onCancel={onCancel}>
         <div className="pmFormGrid">
            <Field label="Date dropped"><input type="date" {...bind('training_end_date')} /></Field>
            <Field label="Reason">
               <select required {...bind('drop_reason')}>
                  <option value="">Select a reason</option>
                  {DROP_REASONS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
               </select>
            </Field>
         </div>
         <Field label="Remarks (optional)">
            <textarea rows="2" {...bind('outcome_remarks')} />
         </Field>
      </FormShell>
   );
}

/* ------------------------------------------------------------------ */
/* Overview tab                                                        */
/* ------------------------------------------------------------------ */
function OverviewTab({ detail, run }) {
   const [mode, setMode] = useState(null);
   const summary = detail.summary;
   const base = `/api/maxima/progress/${detail.id}`;
   const finished = detail.status === 'Completed' || detail.status === 'Dropped';

   async function save(url, method, payload, confirmText) {
      if (confirmText && !window.confirm(confirmText)) return;
      const ok = await run(() => apiSend(url, method, payload));
      if (ok) setMode(null);
   }

   const cancel = () => setMode(null);

   return (
      <div>
         {summary.alerts.length > 0 && (
            <div className="pmAlertList">
               {summary.alerts.map((alert) => (
                  <div className="pmAlert pmAlertWarn" key={alert}>{alert}</div>
               ))}
            </div>
         )}

         <div className="pmActionBar">
            <p>
               {detail.status === 'Accepted by Maxima' &&
                  'This OSY has been accepted. Start the training once the batch begins.'}
               {detail.status === 'Training Started' &&
                  'Training is ongoing. Record attendance and notes as it goes.'}
               {detail.status === 'Completed' && 'This OSY completed the training.'}
               {detail.status === 'Dropped' && 'This OSY was dropped from the training.'}
            </p>
            <div className="pmActionButtons">
               {detail.status === 'Accepted by Maxima' && (
                  <>
                     <button className="pmBtnPrimary" onClick={() => setMode('start')}>Start Training</button>
                     <button className="pmBtnGhost" onClick={() => setMode('drop')}>Drop</button>
                  </>
               )}
               {detail.status === 'Training Started' && (
                  <>
                     <button className="pmBtnSuccess" onClick={() => setMode('complete')}>Mark Completed</button>
                     <button className="pmBtnGhost" onClick={() => setMode('drop')}>Drop OSY</button>
                  </>
               )}
               {finished && (
                  <button className="pmBtnGhost" onClick={() => setMode('outcome')}>Edit Outcome</button>
               )}
            </div>
         </div>

         {mode === 'start' && (
            <DetailsForm
               detail={detail}
               title="Start Training"
               submitLabel="Start Training"
               defaultStart
               onSave={(payload) => save(`${base}/start`, 'POST', payload)}
               onCancel={cancel}
            />
         )}
         {mode === 'details' && (
            <DetailsForm
               detail={detail}
               title="Edit Training Details"
               submitLabel="Save Details"
               onSave={(payload) => save(`${base}/details`, 'PUT', payload)}
               onCancel={cancel}
            />
         )}
         {mode === 'complete' && (
            <CompleteForm
               detail={detail}
               title="Mark Training as Completed"
               submitLabel="Mark Completed"
               onSave={(payload) => save(`${base}/complete`, 'POST', payload, 'Mark this training as completed? The referrer will be notified.')}
               onCancel={cancel}
            />
         )}
         {mode === 'drop' && (
            <DropForm
               detail={detail}
               title="Drop OSY from Training"
               submitLabel="Drop OSY"
               onSave={(payload) => save(`${base}/drop`, 'POST', payload, 'Drop this OSY from the training? The referrer will be notified.')}
               onCancel={cancel}
            />
         )}
         {mode === 'outcome' && detail.status === 'Completed' && (
            <CompleteForm
               detail={detail}
               title="Edit Outcome"
               submitLabel="Save Outcome"
               onSave={(payload) => save(`${base}/outcome`, 'PUT', payload)}
               onCancel={cancel}
            />
         )}
         {mode === 'outcome' && detail.status === 'Dropped' && (
            <DropForm
               detail={detail}
               title="Edit Outcome"
               submitLabel="Save Outcome"
               onSave={(payload) => save(`${base}/outcome`, 'PUT', payload)}
               onCancel={cancel}
            />
         )}

         <div className="pmSectionBar">
            <span className="pmSectionTitle">Training details</span>
            {mode !== 'details' && (
               <button className="pmBtnGhost pmBtnSmall" onClick={() => setMode('details')}>Edit Details</button>
            )}
         </div>
         <div className="pmInfoGrid">
            <div className="pmInfoItem"><span>Program</span><strong>{detail.training_program?.name ?? '—'}</strong></div>
            <div className="pmInfoItem"><span>Batch / class</span><strong>{detail.batch_name || '—'}</strong></div>
            <div className="pmInfoItem"><span>Venue</span><strong>{detail.venue || '—'}</strong></div>
            <div className="pmInfoItem"><span>Trainer</span><strong>{detail.trainer_name || '—'}</strong></div>
            <div className="pmInfoItem"><span>Start date</span><strong>{formatDate(detail.started_on)}</strong></div>
            <div className="pmInfoItem"><span>Expected end</span><strong>{formatDate(detail.expected_end_date)}</strong></div>
            <div className="pmInfoItem"><span>Schedule</span><strong>{detail.training_program?.schedule || '—'}</strong></div>
            <div className="pmInfoItem"><span>Referred by</span><strong>{detail.referrer?.name ?? '—'}</strong></div>
         </div>

         {detail.status === 'Completed' && (
            <>
               <h3 className="pmSubHeading">Outcome</h3>
               <div className="pmInfoGrid">
                  <div className="pmInfoItem"><span>Date completed</span><strong>{formatDate(detail.training_end_date)}</strong></div>
                  <div className="pmInfoItem">
                     <span>Certificate</span>
                     <strong>
                        {detail.certificate_number
                           ? `${detail.certificate_number}${detail.certificate_date ? ` (${formatDate(detail.certificate_date)})` : ''}`
                           : '—'}
                     </strong>
                  </div>
                  <div className="pmInfoItem">
                     <span>After training</span>
                     <strong>
                        {detail.after_training_status ? labelOf(AFTER_TRAINING, detail.after_training_status) : '—'}
                        {detail.after_training_note ? ` · ${detail.after_training_note}` : ''}
                     </strong>
                  </div>
               </div>
               {detail.outcome_remarks && <p className="pmCardText">{detail.outcome_remarks}</p>}
            </>
         )}

         {detail.status === 'Dropped' && (
            <>
               <h3 className="pmSubHeading">Outcome</h3>
               <div className="pmInfoGrid">
                  <div className="pmInfoItem"><span>Date dropped</span><strong>{formatDate(detail.training_end_date)}</strong></div>
                  <div className="pmInfoItem"><span>Reason</span><strong>{labelOf(DROP_REASONS, detail.drop_reason)}</strong></div>
               </div>
               {detail.outcome_remarks && <p className="pmCardText">{detail.outcome_remarks}</p>}
            </>
         )}

         <h3 className="pmSubHeading">Status history</h3>
         {detail.history?.length ? (
            <div className="pmTimeline">
               {[...detail.history].reverse().map((item, index) => (
                  <div className="pmTimelineItem" key={`${item.status}-${index}`}>
                     <span className="pmTimelineDot" />
                     <div>
                        <span className="pmTimelineStatus">{item.status}</span>
                        <span className="pmTimelineMeta">
                           {formatDateTime(item.created_at)}{item.changed_by ? ` · ${item.changed_by}` : ''}
                        </span>
                        {item.remarks && <span className="pmTimelineRemarks">{item.remarks}</span>}
                     </div>
                  </div>
               ))}
            </div>
         ) : (
            <div className="pmEmptyBlock">No status history yet.</div>
         )}
      </div>
   );
}

/* ------------------------------------------------------------------ */
/* Attendance tab                                                      */
/* ------------------------------------------------------------------ */
function AttendanceTab({ detail, run }) {
   const [values, bind] = useForm({ attendance_date: todayLocal(), status: 'present', remarks: '' });
   const [busy, setBusy] = useState(false);
   const summary = detail.summary;
   const records = detail.attendance ?? [];
   const canEdit = detail.status !== 'Accepted by Maxima';

   async function submit(e) {
      e.preventDefault();
      setBusy(true);
      await run(() =>
         apiSend(`/api/maxima/progress/${detail.id}/attendance`, 'POST', {
            attendance_date: values.attendance_date,
            status: values.status,
            remarks: nz(values.remarks),
         })
      );
      setBusy(false);
   }

   async function remove(record) {
      if (!window.confirm('Remove this attendance record?')) return;
      await run(() => apiSend(`/api/maxima/progress/attendance/${record.id}`, 'DELETE'));
   }

   return (
      <div>
         <div className="pmAttChips">
            <div className="pmAttChip"><strong>{formatPercent(summary.attendance_rate)}</strong><span>Attendance rate</span></div>
            <div className="pmAttChip"><strong>{summary.present}</strong><span>Present</span></div>
            <div className="pmAttChip"><strong>{summary.late}</strong><span>Late</span></div>
            <div className="pmAttChip"><strong>{summary.absent}</strong><span>Absent</span></div>
            <div className="pmAttChip"><strong>{summary.excused}</strong><span>Excused</span></div>
         </div>

         {canEdit ? (
            <form className="pmForm" onSubmit={submit}>
               <h3 className="pmFormTitle">Record attendance</h3>
               <div className="pmFormGrid">
                  <Field label="Date">
                     <input type="date" required max={todayLocal()} {...bind('attendance_date')} />
                  </Field>
                  <Field label="Status">
                     <select {...bind('status')}>
                        <option value="present">Present</option>
                        <option value="late">Late</option>
                        <option value="absent">Absent</option>
                        <option value="excused">Excused</option>
                     </select>
                  </Field>
                  <Field label="Remarks (optional)">
                     <input type="text" placeholder="e.g. sick, no transportation" {...bind('remarks')} />
                  </Field>
               </div>
               <div className="pmFormActions">
                  <button type="submit" className="pmBtnPrimary" disabled={busy}>
                     {busy ? 'Saving...' : 'Save Attendance'}
                  </button>
               </div>
               <p className="pmHint">Saving a date that already has a record replaces it. Excused days don't count against the attendance rate.</p>
            </form>
         ) : (
            <div className="pmHint">Start the training first to record attendance.</div>
         )}

         {records.length === 0 ? (
            <div className="pmEmptyBlock">No attendance recorded yet.</div>
         ) : (
            <div className="pmTableWrap pmMiniWrap">
               <table className="pmTable pmMiniTable">
                  <thead>
                     <tr><th>Date</th><th>Status</th><th>Remarks</th><th></th></tr>
                  </thead>
                  <tbody>
                     {records.map((record) => (
                        <tr key={record.id}>
                           <td>{formatDate(record.attendance_date)}</td>
                           <td><span className={`pmBadge ${ATTENDANCE_CLASS[record.status]}`}>{record.status}</span></td>
                           <td>{record.remarks || '—'}</td>
                           <td>
                              {canEdit && (
                                 <button className="pmIconBtn pmIconBtnDanger" onClick={() => remove(record)} aria-label="Delete record">
                                    <span className="material-symbols-outlined">delete</span>
                                 </button>
                              )}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            </div>
         )}
      </div>
   );
}

/* ------------------------------------------------------------------ */
/* Documents tab                                                       */
/* ------------------------------------------------------------------ */
function DocRow({ doc, run }) {
   const [remarks, setRemarks] = useState(doc.remarks ?? '');

   useEffect(() => {
      setRemarks(doc.remarks ?? '');
   }, [doc.remarks]);

   function save(status, remarkValue) {
      return run(() =>
         apiSend(`/api/maxima/progress/documents/${doc.id}`, 'PUT', { status, remarks: nz(remarkValue) })
      );
   }

   async function remove() {
      if (!window.confirm(`Remove "${doc.name}" from the list?`)) return;
      await run(() => apiSend(`/api/maxima/progress/documents/${doc.id}`, 'DELETE'));
   }

   return (
      <div className={`pmDocRow ${doc.status === 'received' ? 'pmDocRowDone' : ''}`}>
         <div className="pmDocName">
            <span>{doc.name}</span>
            {doc.status === 'received' && doc.received_at && (
               <small>Received {formatDate(doc.received_at)}</small>
            )}
         </div>
         <div className="pmDocControls">
            <select value={doc.status} onChange={(e) => save(e.target.value, remarks)}>
               <option value="pending">Pending</option>
               <option value="received">Received</option>
               <option value="not_applicable">Not applicable</option>
            </select>
            <input
               type="text"
               placeholder="Note (optional)"
               value={remarks}
               onChange={(e) => setRemarks(e.target.value)}
               onBlur={() => {
                  if ((remarks || '') !== (doc.remarks || '')) save(doc.status, remarks);
               }}
            />
            {!doc.is_default && (
               <button className="pmIconBtn pmIconBtnDanger" onClick={remove} aria-label="Remove document">
                  <span className="material-symbols-outlined">delete</span>
               </button>
            )}
         </div>
      </div>
   );
}

function DocumentsTab({ detail, run }) {
   const [name, setName] = useState('');
   const [busy, setBusy] = useState(false);
   const documents = detail.documents ?? [];
   const summary = detail.summary;

   async function add(e) {
      e.preventDefault();
      if (!name.trim()) return;
      setBusy(true);
      const ok = await run(() => apiSend(`/api/maxima/progress/${detail.id}/documents`, 'POST', { name: name.trim() }));
      setBusy(false);
      if (ok) setName('');
   }

   return (
      <div>
         <div className="pmSectionBar">
            <span className="pmSectionTitle">
               Requirements: {summary.docs_received} of {summary.docs_required} received
            </span>
         </div>

         <div className="pmDocList">
            {documents.map((doc) => <DocRow key={doc.id} doc={doc} run={run} />)}
         </div>

         <form className="pmInlineForm" onSubmit={add}>
            <input
               type="text"
               placeholder="Add another requirement (e.g. Parent consent)"
               value={name}
               onChange={(e) => setName(e.target.value)}
            />
            <button type="submit" className="pmBtnPrimary" disabled={busy || !name.trim()}>
               <span className="material-symbols-outlined">add</span>
               Add
            </button>
         </form>
      </div>
   );
}

/* ------------------------------------------------------------------ */
/* Notes tab                                                           */
/* ------------------------------------------------------------------ */
function NotesTab({ detail, run }) {
   const [text, setText] = useState('');
   const [busy, setBusy] = useState(false);
   const notes = detail.notes ?? [];

   async function add(e) {
      e.preventDefault();
      if (!text.trim()) return;
      setBusy(true);
      const ok = await run(() => apiSend(`/api/maxima/progress/${detail.id}/notes`, 'POST', { note: text.trim() }));
      setBusy(false);
      if (ok) setText('');
   }

   async function remove(note) {
      if (!window.confirm('Delete this note?')) return;
      await run(() => apiSend(`/api/maxima/progress/notes/${note.id}`, 'DELETE'));
   }

   return (
      <div>
         <form className="pmForm" onSubmit={add}>
            <h3 className="pmFormTitle">Add a note</h3>
            <Field label="Note">
               <textarea
                  rows="3"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="e.g. Called the guardian about the absences. Transport problem this week."
               />
            </Field>
            <div className="pmFormActions">
               <button type="submit" className="pmBtnPrimary" disabled={busy || !text.trim()}>
                  {busy ? 'Saving...' : 'Add Note'}
               </button>
            </div>
         </form>

         {notes.length === 0 ? (
            <div className="pmEmptyBlock">No notes yet.</div>
         ) : (
            <div className="pmCardList">
               {notes.map((note) => (
                  <div className="pmCard" key={note.id}>
                     <div className="pmCardTop">
                        <span className="pmCardMeta">
                           {note.user?.name ?? 'Unknown'} · {formatDateTime(note.created_at)}
                        </span>
                        <button className="pmIconBtn pmIconBtnDanger" onClick={() => remove(note)} aria-label="Delete note">
                           <span className="material-symbols-outlined">delete</span>
                        </button>
                     </div>
                     <p className="pmCardText">{note.note}</p>
                  </div>
               ))}
            </div>
         )}
      </div>
   );
}

/* ------------------------------------------------------------------ */
/* Concerns tab                                                        */
/* ------------------------------------------------------------------ */
function ConcernsTab({ detail, run }) {
   const [remarksById, setRemarksById] = useState({});
   const concerns = detail.concerns ?? [];

   async function review(concern, status) {
      const ok = await run(() =>
         apiSend(`/api/maxima/absence-concerns/${concern.id}`, 'PATCH', {
            status,
            review_remarks: remarksById[concern.id]?.trim() || null,
         })
      );
      if (ok) setRemarksById((prev) => ({ ...prev, [concern.id]: '' }));
   }

   if (concerns.length === 0) {
      return <div className="pmEmptyBlock">No absences or concerns have been reported for this OSY.</div>;
   }

   return (
      <div className="pmCardList">
         {concerns.map((concern) => (
            <div className="pmCard" key={concern.id}>
               <div className="pmCardTop">
                  <div>
                     <span className="pmCardTitle pmCapital">{concern.type}</span>
                     <span className="pmCardMeta">
                        by {concern.submitter?.name ?? 'Unknown'} · {formatDate(concern.created_at)}
                     </span>
                  </div>
                  <span className={`pmBadge ${CONCERN_CLASS[concern.status] ?? ''}`}>{concern.status}</span>
               </div>

               <p className="pmCardText">{concern.description}</p>

               {concern.review_remarks && (
                  <p className="pmReviewNote">
                     <strong>Review{concern.reviewer?.name ? ` (${concern.reviewer.name})` : ''}:</strong>{' '}
                     {concern.review_remarks}
                  </p>
               )}

               {concern.status !== 'resolved' && (
                  <div className="pmConcernActions">
                     <input
                        type="text"
                        placeholder="Review remarks (optional)"
                        value={remarksById[concern.id] ?? ''}
                        onChange={(e) => setRemarksById((prev) => ({ ...prev, [concern.id]: e.target.value }))}
                     />
                     {concern.status === 'pending' && (
                        <button className="pmBtnGhost" onClick={() => review(concern, 'reviewed')}>Mark Reviewed</button>
                     )}
                     <button className="pmBtnPrimary" onClick={() => review(concern, 'resolved')}>Mark Resolved</button>
                  </div>
               )}
            </div>
         ))}
      </div>
   );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */
const TABS = [
   ['overview', 'Overview'],
   ['attendance', 'Attendance'],
   ['documents', 'Documents'],
   ['notes', 'Notes'],
   ['concerns', 'Concerns'],
];

function MaximaProgressMonitoring() {
   const [enrollees, setEnrollees] = useState([]);
   const [counts, setCounts] = useState({ accepted: 0, ongoing: 0, completed: 0, dropped: 0, needs_attention: 0 });
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState('');

   const [selected, setSelected] = useState(null);
   const [detailLoading, setDetailLoading] = useState(false);
   const [tab, setTab] = useState('overview');
   const [modalError, setModalError] = useState(null);

   useEffect(() => {
      fetchList();
   }, [search, statusFilter]);

   // Close the modal with the Escape key (never by clicking outside)
   useEffect(() => {
      if (!selected && !detailLoading) return;
      function onKeyDown(e) {
         if (e.key === 'Escape') closeDetail();
      }
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
   }, [selected, detailLoading]);

   async function fetchList() {
      setError(null);
      try {
         const params = new URLSearchParams();
         if (search.trim()) params.append('search', search.trim());
         if (statusFilter) params.append('status', statusFilter);

         const data = await apiGet(`/api/maxima/progress?${params.toString()}`);
         setEnrollees(data.enrollees ?? []);
         setCounts(data.counts ?? { accepted: 0, ongoing: 0, completed: 0, dropped: 0, needs_attention: 0 });
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   }

   async function openDetail(id) {
      setDetailLoading(true);
      setModalError(null);
      setTab('overview');
      try {
         setSelected(await apiGet(`/api/maxima/progress/${id}`));
      } catch (err) {
         setError(err.message);
      } finally {
         setDetailLoading(false);
      }
   }

   function closeDetail() {
      setSelected(null);
      setDetailLoading(false);
      setModalError(null);
   }

   // Runs a request that returns the refreshed OSY workspace, then refreshes the table
   async function run(requestFn) {
      setModalError(null);
      try {
         const data = await requestFn();
         if (data?.id) setSelected(data);
         await fetchList();
         return true;
      } catch (err) {
         setModalError(err.message);
         return false;
      }
   }

   const pendingConcerns = (selected?.concerns ?? []).filter((c) => c.status === 'pending').length;

   return (
      <>
         <div className='maximaDashboardBody'>
            <MaximaSideBar/>

            <div className='maximaProgMonitoringMainContent'>
               <div className="pmPage">
                  <div className="pmHeader">
                     <div>
                        <h1 className="pmTitle">Progress Management</h1>
                        <p className="pmSubtitle">
                           Manage each enrolled OSY's training records and keep an eye on who needs follow-up.
                        </p>
                     </div>
                  </div>

                  <div className="pmStats">
                     <div className="pmStatCard">
                        <span className="material-symbols-outlined pmStatIcon pmIconAmber">hourglass_top</span>
                        <div>
                           <span className="pmStatValue">{counts.accepted}</span>
                           <span className="pmStatLabel">Awaiting Start</span>
                        </div>
                     </div>
                     <div className="pmStatCard">
                        <span className="material-symbols-outlined pmStatIcon pmIconBlue">play_circle</span>
                        <div>
                           <span className="pmStatValue">{counts.ongoing}</span>
                           <span className="pmStatLabel">Ongoing</span>
                        </div>
                     </div>
                     <div className="pmStatCard">
                        <span className="material-symbols-outlined pmStatIcon pmIconGreen">task_alt</span>
                        <div>
                           <span className="pmStatValue">{counts.completed}</span>
                           <span className="pmStatLabel">Completed</span>
                        </div>
                     </div>
                     <div className="pmStatCard">
                        <span className="material-symbols-outlined pmStatIcon pmIconSlate">person_off</span>
                        <div>
                           <span className="pmStatValue">{counts.dropped}</span>
                           <span className="pmStatLabel">Dropped</span>
                        </div>
                     </div>
                     <div className="pmStatCard">
                        <span className="material-symbols-outlined pmStatIcon pmIconRed">warning</span>
                        <div>
                           <span className="pmStatValue">{counts.needs_attention}</span>
                           <span className="pmStatLabel">Needs Attention</span>
                        </div>
                     </div>
                  </div>

                  <div className="pmPanel">
                     <div className="pmToolbar">
                        <div className="pmSearchBox">
                           <span className="material-symbols-outlined">search</span>
                           <input
                              type="text"
                              placeholder="Search OSY by name..."
                              value={search}
                              onChange={(e) => setSearch(e.target.value)}
                           />
                        </div>
                        <select
                           className="pmSelect"
                           value={statusFilter}
                           onChange={(e) => setStatusFilter(e.target.value)}
                        >
                           <option value="">All statuses</option>
                           <option value="Accepted by Maxima">Awaiting Start</option>
                           <option value="Training Started">Ongoing</option>
                           <option value="Completed">Completed</option>
                           <option value="Dropped">Dropped</option>
                        </select>
                     </div>

                     {error && <div className="pmAlert">{error}</div>}

                     <div className="pmTableWrap">
                        <table className="pmTable">
                           <thead>
                              <tr>
                                 <th>OSY</th>
                                 <th>Program</th>
                                 <th>Status</th>
                                 <th>Training Day</th>
                                 <th>Attendance</th>
                                 <th>Documents</th>
                                 <th>Last Update</th>
                                 <th></th>
                              </tr>
                           </thead>
                           <tbody>
                              {loading && (
                                 <tr><td colSpan="8" className="pmEmpty">Loading...</td></tr>
                              )}
                              {!loading && enrollees.length === 0 && (
                                 <tr>
                                    <td colSpan="8" className="pmEmpty">
                                       No enrolled OSY yet. They appear here once Maxima accepts a referral.
                                    </td>
                                 </tr>
                              )}
                              {enrollees.map((row) => (
                                 <tr key={row.id} className={row.summary.needs_attention ? 'pmRowAlert' : ''}>
                                    <td>
                                       <div className="pmPerson">
                                          <span className="pmAvatar">{initials(row.osy_profile)}</span>
                                          <div>
                                             <span className="pmPersonName">{fullName(row.osy_profile)}</span>
                                             {row.summary.needs_attention && (
                                                <span className="pmFlag">
                                                   <span className="material-symbols-outlined">warning</span>
                                                   {row.summary.alerts[0]}
                                                   {row.summary.alerts.length > 1 && ` +${row.summary.alerts.length - 1} more`}
                                                </span>
                                             )}
                                          </div>
                                       </div>
                                    </td>
                                    <td>
                                       {row.training_program?.name ?? '—'}
                                       {row.batch_name && <span className="pmCellNote">{row.batch_name}</span>}
                                    </td>
                                    <td>
                                       <span className={`pmBadge ${STATUS_CLASS[row.status] ?? ''}`}>
                                          {STATUS_LABEL[row.status] ?? row.status}
                                       </span>
                                    </td>
                                    <td>{trainingDayLabel(row)}</td>
                                    <td>
                                       <span className={rateClass(row.summary.attendance_rate)}>
                                          {formatPercent(row.summary.attendance_rate)}
                                       </span>
                                    </td>
                                    <td>{row.summary.docs_received}/{row.summary.docs_required}</td>
                                    <td>{formatDate(row.summary.last_activity)}</td>
                                    <td>
                                       <button className="pmBtnPrimary" onClick={() => openDetail(row.id)}>
                                          Manage
                                       </button>
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {(selected || detailLoading) && (
            <div className="pmOverlay">
               <div className="pmModal">
                  {detailLoading && !selected && <div className="pmModalLoading">Loading...</div>}

                  {selected && (
                     <>
                        <div className="pmModalHeader">
                           <div className="pmPerson">
                              <span className="pmAvatar pmAvatarLarge">{initials(selected.osy_profile)}</span>
                              <div>
                                 <h2 className="pmModalName">{fullName(selected.osy_profile)}</h2>
                                 <p className="pmModalProgram">{selected.training_program?.name ?? '—'}</p>
                              </div>
                           </div>
                           <div className="pmModalHeaderRight">
                              <span className={`pmBadge ${STATUS_CLASS[selected.status] ?? ''}`}>
                                 {STATUS_LABEL[selected.status] ?? selected.status}
                              </span>
                              <button className="pmCloseBtn" onClick={closeDetail} aria-label="Close">
                                 <span className="material-symbols-outlined">close</span>
                              </button>
                           </div>
                        </div>

                        <div className="pmModalBody">
                           <div className="pmMetrics">
                              <div className="pmMetric">
                                 <span className="pmMetricLabel">Attendance rate</span>
                                 <span className="pmMetricValue">{formatPercent(selected.summary.attendance_rate)}</span>
                              </div>
                              <div className="pmMetric">
                                 <span className="pmMetricLabel">Training day</span>
                                 <span className="pmMetricValue">{trainingDayLabel(selected)}</span>
                              </div>
                              <div className="pmMetric">
                                 <span className="pmMetricLabel">Documents</span>
                                 <span className="pmMetricValue">
                                    {selected.summary.docs_received}/{selected.summary.docs_required}
                                 </span>
                              </div>
                              <div className="pmMetric">
                                 <span className="pmMetricLabel">Absences</span>
                                 <span className="pmMetricValue">{selected.summary.absent}</span>
                              </div>
                           </div>

                           <div className="pmTabs">
                              {TABS.map(([key, label]) => (
                                 <button
                                    key={key}
                                    className={`pmTab ${tab === key ? 'pmTabActive' : ''}`}
                                    onClick={() => setTab(key)}
                                 >
                                    {label}
                                    {key === 'concerns' && pendingConcerns > 0 && (
                                       <span className="pmTabDot">{pendingConcerns}</span>
                                    )}
                                 </button>
                              ))}
                           </div>

                           {modalError && <div className="pmAlert">{modalError}</div>}

                           {tab === 'overview' && <OverviewTab detail={selected} run={run} />}
                           {tab === 'attendance' && <AttendanceTab detail={selected} run={run} />}
                           {tab === 'documents' && <DocumentsTab detail={selected} run={run} />}
                           {tab === 'notes' && <NotesTab detail={selected} run={run} />}
                           {tab === 'concerns' && <ConcernsTab detail={selected} run={run} />}
                        </div>
                     </>
                  )}
               </div>
            </div>
         )}
      </>
   );
}

export default MaximaProgressMonitoring;