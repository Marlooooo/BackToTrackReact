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

function formatWeekday(value) {
   if (!value) return '';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '';
   return date.toLocaleDateString('en-PH', { weekday: 'long' });
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

// Guided, step-by-step form that opens under the attendance banner
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

   // The "days" step is skipped when there is only one absence to explain.
   // "What would help" and the note are combined into one optional "more" step.
   // The follow-up question appears on the "what" step itself, so the number of steps never changes.
   const steps = [
      ...(candidates.length > 1 ? ['days'] : []),
      'what',
      'more',
      'review',
   ];
   const step = steps[stepIndex];
   const allSelected = candidates.length > 0 && selectedIds.length === candidates.length;

   function toggleId(id) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
   }

   function toggleAllIds() {
      setSelectedIds(allSelected ? [] : candidates.map((item) => item.id));
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
      if (step === 'what') return !!category && (!reason || reason.followups.length === 0 || !!followup);
      if (step === 'more') return category !== 'other' || note.trim().length > 0;
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
   const isLastBeforeReview = stepIndex === steps.length - 2;

   return (
      <div className="arPanel">
         <div className="arTop">
            <div className="arTopText">
               <strong className="arPanelTitle">Explain your absence</strong>
               <div className="arSteps" aria-label={`Step ${stepIndex + 1} of ${steps.length}`}>
                  <span className="arStepLabel">Step {stepIndex + 1} of {steps.length}</span>
                  {steps.map((name, index) => (
                     <span
                        key={name}
                        className={`arStepDot ${index === stepIndex ? 'arStepDotActive' : ''} ${index < stepIndex ? 'arStepDotDone' : ''}`}
                     />
                  ))}
               </div>
            </div>
            <button type="button" className="arClose" onClick={onClose} aria-label="Close">
               <i className="las la-times"></i>
            </button>
         </div>

         {step === 'days' && (
            <div className="arBody">
               <h4>Which days are you explaining?</h4>
               <p className="arHelp">Tick every day this reason applies to.</p>
               <button type="button" className="arSelectAll" onClick={toggleAllIds}>
                  {allSelected ? 'Clear all' : 'Select all'}
               </button>
               <div className="arDays">
                  {candidates.map((item) => (
                     <label key={item.id} className={`arDay ${selectedIds.includes(item.id) ? 'arDayOn' : ''}`}>
                        <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleId(item.id)} />
                        <span>
                           {formatDate(item.date)}
                           <small className="arDayName">{formatWeekday(item.date)}</small>
                        </span>
                     </label>
                  ))}
               </div>
            </div>
         )}

         {step === 'what' && (
            <div className="arBody">
               <h4>What happened?</h4>
               <p className="arHelp">Tap the one that fits best. Your SK official will see this.</p>
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

               {reason && hasFollowup && (
                  <div className="arFollowup">
                     <span className="arFollowupTitle">{reason.question || 'A little more detail'}</span>
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
            </div>
         )}

         {step === 'more' && (
            <div className="arBody">
               <h4>
                  Anything else you want to share?
                  <span className="arOptionalTag">{category === 'other' ? 'Note required' : 'Optional'}</span>
               </h4>
               <p className="arHelp">
                  {category === 'other'
                     ? 'Please tell us what happened in the note below.'
                     : 'You can skip this and tap Review.'}
               </p>

               <div className="arMoreGroup">
                  <span className="arGroupLabel">What would help you come back?</span>
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

               <div className="arMoreGroup">
                  <span className="arGroupLabel">Your note</span>
                  <textarea
                     className="arTextarea"
                     rows={4}
                     maxLength={1000}
                     value={note}
                     onChange={(e) => setNote(e.target.value)}
                     placeholder="A short note is enough..."
                  />
               </div>

               <label className="arField">
                  <span>Add a photo <small>(optional, for example a medical certificate)</small></span>
                  <input type="file" accept="image/*" onChange={chooseProof} />
               </label>
            </div>
         )}

         {step === 'review' && (
            <div className="arBody">
               <h4>Check before sending</h4>
               <p className="arHelp">Tap Back if you want to change something.</p>
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
               <button type="button" className="arPrimaryBtn" onClick={next} disabled={!canContinue()}>
                  {isLastBeforeReview ? 'Review' : 'Continue'}
               </button>
            )}
         </div>
      </div>
   );
}