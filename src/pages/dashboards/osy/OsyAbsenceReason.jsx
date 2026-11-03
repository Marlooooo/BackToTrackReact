import { useState } from 'react';
import './OsyAbsenceReason.css';

const REASON_ICON = {
   sickness: 'la-thermometer-half',
   transport: 'la-bus',
   family: 'la-home',
   work: 'la-briefcase',
   schedule: 'la-calendar-times',
   safety: 'la-shield-alt',
   motivation: 'la-sad-tear',
   other: 'la-ellipsis-h',
};

const MAX_PROOF_MB = 4;

function formatDate(value) {
   if (!value) return '—';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '—';
   return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function xsrfHeader() {
   const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
   return match ? { 'X-XSRF-TOKEN': decodeURIComponent(match[1]) } : {};
}

// Read-only view of a reason the OSY already sent
export function AbsenceReasonSummary({ reason, onClose }) {
   return (
      <div className="arPanel">
         <div className="arSummaryHead">
            <strong>Your reason</strong>
            <span>Sent {formatDate(reason.submitted_at)} · self-reported</span>
         </div>
         <dl className="arSummary">
            <div><dt>What happened</dt><dd>{reason.category_label}{reason.followup_label ? ` · ${reason.followup_label}` : ''}</dd></div>
            {reason.return_date && <div><dt>Expected back</dt><dd>{formatDate(reason.return_date)}</dd></div>}
            {reason.support?.length > 0 && <div><dt>What would help</dt><dd>{reason.support.join(', ')}</dd></div>}
            {reason.note && <div><dt>Your note</dt><dd>{reason.note}</dd></div>}
            {reason.proof_url && (
               <div><dt>Photo</dt><dd><a href={reason.proof_url} target="_blank" rel="noreferrer">View photo</a></dd></div>
            )}
         </dl>
         <button type="button" className="arGhostBtn" onClick={onClose}>Close</button>
      </div>
   );
}

// Guided, step-by-step form that opens inside the attendance list
export function AbsenceReasonPanel({ trainingId, candidates, startRecordId, options, onClose, onSaved }) {
   const [stepIndex, setStepIndex] = useState(0);
   const [selectedIds, setSelectedIds] = useState([startRecordId]);
   const [category, setCategory] = useState('');
   const [followup, setFollowup] = useState('');
   const [returnDate, setReturnDate] = useState('');
   const [support, setSupport] = useState([]);
   const [note, setNote] = useState('');
   const [proof, setProof] = useState(null);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState(null);

   const reason = options.reasons.find((item) => item.key === category) ?? null;
   const hasFollowup = !!reason && (reason.followups.length > 0 || reason.asks_return_date);

   const steps = ['days', 'what', ...(hasFollowup ? ['followup'] : []), 'help', 'note', 'review'];
   const step = steps[stepIndex];

   function toggleId(id) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
   }

   function toggleSupport(key) {
      setSupport((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]));
   }

   function chooseCategory(key) {
      if (key !== category) {
         setCategory(key);
         setFollowup('');
         setReturnDate('');
      }
   }

   function chooseProof(event) {
      const file = event.target.files?.[0] ?? null;
      setError(null);

      if (!file) {
         setProof(null);
         return;
      }
      if (!file.type.startsWith('image/')) {
         setError('Please choose a photo (JPG or PNG).');
         event.target.value = '';
         return;
      }
      if (file.size > MAX_PROOF_MB * 1024 * 1024) {
         setError(`That photo is too big. Please choose one under ${MAX_PROOF_MB} MB.`);
         event.target.value = '';
         return;
      }
      setProof(file);
   }

   function canContinue() {
      if (step === 'days') return selectedIds.length > 0;
      if (step === 'what') return !!category;
      if (step === 'followup') return reason.followups.length === 0 || !!followup;
      if (step === 'note') return category !== 'other' || note.trim().length > 0;
      return true;
   }

   function next() {
      if (!canContinue()) return;
      setError(null);
      setStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
   }

   function back() {
      setError(null);
      setStepIndex((prev) => Math.max(prev - 1, 0));
   }

   async function submit() {
      setSaving(true);
      setError(null);

      try {
         const body = new FormData();
         selectedIds.forEach((id) => body.append('record_ids[]', id));
         body.append('category', category);
         if (followup) body.append('followup', followup);
         if (returnDate) body.append('return_date', returnDate);
         support.forEach((key) => body.append('support[]', key));
         if (note.trim()) body.append('note', note.trim());
         if (proof) body.append('proof', proof);

         const res = await fetch(`/api/osy/progress/${trainingId}/absence-reasons`, {
            method: 'POST',
            headers: { Accept: 'application/json', ...xsrfHeader() },
            credentials: 'include',
            body,
         });
         const data = await res.json().catch(() => ({}));
         if (!res.ok) throw new Error(data.message || 'Could not send your reason. Please try again.');

         onSaved(data.records ?? [], data.message);
      } catch (err) {
         setError(err.message);
         setSaving(false);
      }
   }

   const selectedDates = candidates.filter((item) => selectedIds.includes(item.id));
   const supportLabels = options.support.filter((item) => support.includes(item.key)).map((item) => item.label);
   const followupLabel = reason?.followups.find((item) => item.key === followup)?.label;

   return (
      <div className="arPanel">
         <div className="arTop">
            <div className="arSteps" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
               {steps.map((name, index) => (
                  <span
                     key={name}
                     className={`arStepDot ${index === stepIndex ? 'arStepDotActive' : ''} ${index < stepIndex ? 'arStepDotDone' : ''}`}
                  />
               ))}
               <small>Step {stepIndex + 1} of {steps.length}</small>
            </div>
            <button type="button" className="arClose" onClick={onClose} aria-label="Close">
               <i className="las la-times"></i>
            </button>
         </div>

         {step === 'days' && (
            <div className="arBody">
               <h4>Which days are you explaining?</h4>
               <p className="arHelp">Pick every day this reason applies to.</p>
               <div className="arDays">
                  {candidates.map((item) => (
                     <label key={item.id} className={`arDay ${selectedIds.includes(item.id) ? 'arDayOn' : ''}`}>
                        <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleId(item.id)} />
                        <span>{formatDate(item.date)}</span>
                     </label>
                  ))}
               </div>
            </div>
         )}

         {step === 'what' && (
            <div className="arBody">
               <h4>What happened?</h4>
               <p className="arHelp">Choose the one that fits best. Your SK official will see this.</p>
               <div className="arCards">
                  {options.reasons.map((item) => (
                     <button
                        type="button"
                        key={item.key}
                        className={`arCard ${category === item.key ? 'arCardOn' : ''}`}
                        onClick={() => chooseCategory(item.key)}
                     >
                        <i className={`las ${REASON_ICON[item.key] ?? 'la-ellipsis-h'}`}></i>
                        <span>{item.label}</span>
                     </button>
                  ))}
               </div>
            </div>
         )}

         {step === 'followup' && reason && (
            <div className="arBody">
               <h4>{reason.question || 'A little more detail'}</h4>
               {reason.followups.length > 0 && (
                  <div className="arChoices">
                     {reason.followups.map((item) => (
                        <button
                           type="button"
                           key={item.key}
                           className={`arChoice ${followup === item.key ? 'arChoiceOn' : ''}`}
                           onClick={() => setFollowup(item.key)}
                        >
                           {item.label}
                        </button>
                     ))}
                  </div>
               )}
               {reason.asks_return_date && (
                  <label className="arField">
                     <span>When do you expect to be back? <small>(optional)</small></span>
                     <input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                  </label>
               )}
            </div>
         )}

         {step === 'help' && (
            <div className="arBody">
               <h4>What would help you come back?</h4>
               <p className="arHelp">Optional. This helps your SK official know how to support you.</p>
               <div className="arChoices">
                  {options.support.map((item) => (
                     <button
                        type="button"
                        key={item.key}
                        className={`arChoice ${support.includes(item.key) ? 'arChoiceOn' : ''}`}
                        onClick={() => toggleSupport(item.key)}
                     >
                        {support.includes(item.key) && <i className="las la-check"></i>}
                        {item.label}
                     </button>
                  ))}
               </div>
            </div>
         )}

         {step === 'note' && (
            <div className="arBody">
               <h4>Anything else you want to share?</h4>
               <p className="arHelp">
                  {category === 'other' ? 'Please tell us what happened.' : 'Optional. A short note is enough.'}
               </p>
               <textarea
                  className="arTextarea"
                  rows={4}
                  maxLength={1000}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write here..."
               />
               <label className="arField">
                  <span>Add a photo <small>(optional, for example a medical certificate)</small></span>
                  <input type="file" accept="image/*" onChange={chooseProof} />
               </label>
            </div>
         )}

         {step === 'review' && (
            <div className="arBody">
               <h4>Check before sending</h4>
               <dl className="arSummary">
                  <div><dt>Days</dt><dd>{selectedDates.map((item) => formatDate(item.date)).join(', ')}</dd></div>
                  <div><dt>What happened</dt><dd>{reason?.label}{followupLabel ? ` · ${followupLabel}` : ''}</dd></div>
                  {returnDate && <div><dt>Expected back</dt><dd>{formatDate(returnDate)}</dd></div>}
                  {supportLabels.length > 0 && <div><dt>What would help</dt><dd>{supportLabels.join(', ')}</dd></div>}
                  {note.trim() && <div><dt>Your note</dt><dd>{note.trim()}</dd></div>}
                  {proof && <div><dt>Photo</dt><dd>{proof.name}</dd></div>}
               </dl>
               <p className="arHelp">Your reason is self-reported and will be shared with your SK official.</p>
            </div>
         )}

         {error && <div className="arError">{error}</div>}

         <div className="arActions">
            {stepIndex > 0 ? (
               <button type="button" className="arGhostBtn" onClick={back} disabled={saving}>Back</button>
            ) : (
               <button type="button" className="arGhostBtn" onClick={onClose}>Cancel</button>
            )}
            {step === 'review' ? (
               <button type="button" className="arPrimaryBtn" onClick={submit} disabled={saving}>
                  {saving ? 'Sending...' : 'Send reason'}
               </button>
            ) : (
               <button type="button" className="arPrimaryBtn" onClick={next} disabled={!canContinue()}>Continue</button>
            )}
         </div>
      </div>
   );
}