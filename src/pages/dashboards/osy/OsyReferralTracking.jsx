import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OsySideBar from '../../../components/osySideBar';
import './OsyTrainingProg.css'; // reuses your op* styles and page layout
import './OsyReferralTracking.css';

const TRAINING_PATH = '/osy/training';

const STEPS = ['Referred', 'Accepted by Maxima', 'Training Started', 'Completed'];

const STEP_LABEL = {
   Referred: 'Referred',
   'Accepted by Maxima': 'Accepted',
   'Training Started': 'Training',
   Completed: 'Completed',
};

const STATUS_LABEL = {
   Registered: 'Not yet referred',
   Validated: 'Not yet referred',
   Referred: 'Waiting for Maxima',
   'Accepted by Maxima': 'Accepted',
   'Training Started': 'Ongoing',
   Completed: 'Completed',
   Rejected: 'Not accepted',
   Dropped: 'Dropped',
};

const STATUS_CLASS = {
   Registered: 'opBadgeWaiting',
   Validated: 'opBadgeWaiting',
   Referred: 'opBadgeWaiting',
   'Accepted by Maxima': 'opBadgeOngoing',
   'Training Started': 'opBadgeOngoing',
   Completed: 'opBadgeCompleted',
   Rejected: 'opBadgeDropped',
   Dropped: 'opBadgeDropped',
};

// What each entry in the history means, in plain words
const HISTORY_TITLE = {
   Registered: 'You were registered',
   Validated: 'Your profile was validated',
   Referred: 'You were referred to this program',
   'Accepted by Maxima': 'Maxima accepted your referral',
   'Training Started': 'Your training started',
   Completed: 'You completed the training',
   Rejected: 'Maxima did not accept your referral',
   Dropped: 'You were marked as dropped',
};

// Adjust these to match the role values saved on your users table
const ROLE_LABEL = {
   barangay: 'Barangay official',
   sk: 'SK official',
   sk_official: 'SK official',
};

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

function formatDate(value) {
   if (!value) return '—';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '—';
   return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(value) {
   if (!value) return '—';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '—';
   const days = Math.floor((Date.now() - date.getTime()) / 86400000);
   if (days <= 0) return 'Today';
   if (days === 1) return 'Yesterday';
   return `${days} days ago`;
}

// Date a step was reached, taken from the status history
function reachedAt(history, step) {
   return history.find((item) => item.status === step)?.created_at ?? null;
}

// What the OSY should expect and do at each stage
function nextInfo(status) {
   switch (status) {
      case 'Registered':
      case 'Validated':
         return {
            title: 'Waiting to be referred',
            text: 'Your barangay or SK official has not sent your referral to Maxima yet.',
            steps: ['Keep your profile complete and up to date.', 'Ask your barangay or SK official if you are not sure what is missing.'],
         };
      case 'Referred':
         return {
            title: 'Maxima is reviewing your referral',
            text: 'Maxima checks your profile and the program slots before deciding.',
            steps: [
               'Wait for a notification. You do not need to follow up with Maxima yet.',
               'Start getting your documents ready so you can submit them quickly once accepted.',
               'If you are accepted, your next step is to submit your documents.',
            ],
         };
      case 'Accepted by Maxima':
         return {
            title: 'You were accepted. Prepare to start',
            text: 'Your slot is reserved. Maxima will set up your batch and schedule.',
            steps: [
               'Submit every document on your checklist to Maxima.',
               'Wait for your start date, venue and trainer to be set.',
               'Check your training progress page for those details.',
            ],
         };
      case 'Training Started':
         return {
            title: 'Your training is ongoing',
            text: 'You are now part of the batch. Attendance and your schedule are on your training progress page.',
            steps: [
               'Attend every session on your schedule.',
               'If you must be absent, tell your trainer or Maxima as early as you can.',
               'Finish the training to receive your outcome.',
            ],
         };
      case 'Completed':
         return {
            title: 'You finished this training',
            text: 'Congratulations. Your result is saved on your training progress page.',
            steps: [
               'Review your outcome in your training progress.',
               'Talk to your barangay or SK official about your next program or work opportunities.',
            ],
         };
      case 'Rejected':
         return {
            title: 'This referral was not accepted',
            text: 'This does not close the door on training. You can still apply to another program.',
            steps: [
               'Read the reason below.',
               'Talk to your barangay or SK official about applying again or choosing another program.',
               'Check Available Courses and your Recommendations for other options.',
            ],
         };
      case 'Dropped':
         return {
            title: 'You are no longer part of this training',
            text: 'Your training record is kept on your training progress page.',
            steps: [
               'See the details on your training progress page.',
               'Talk to your barangay or SK official if you want to join a program again.',
            ],
         };
      default:
         return null;
   }
}

function Stepper({ referral }) {
   const { status, history } = referral;
   const rejected = status === 'Rejected';
   const dropped = status === 'Dropped';

   // Where the referral is on the track. Dropped happens after acceptance.
   let current = STEPS.indexOf(status);
   if (rejected) current = 0;
   if (dropped) {
      const lastReached = STEPS.reduce(
         (acc, step, i) => (history.some((h) => h.status === step) ? i : acc),
         1
      );
      current = lastReached;
   }
   if (current < 0) current = -1; // Registered / Validated

   return (
      <ol className="orStepper">
         {STEPS.map((step, index) => {
            // On a rejection, the second step turns into "Not accepted"
            const isRejectedStep = rejected && index === 1;
            const done = !rejected && !dropped && index <= current;
            const doneBeforeDrop = dropped && index <= current;
            const isCurrent = !rejected && !dropped && index === current && status !== 'Completed';

            let stateClass = '';
            if (isRejectedStep) stateClass = 'orStepBad';
            else if (done || doneBeforeDrop || (rejected && index === 0)) stateClass = 'orStepDone';
            if (isCurrent) stateClass = 'orStepCurrent';
            if (dropped && index === current) stateClass = 'orStepBad';

            const label = isRejectedStep ? 'Not accepted' : dropped && index === current ? 'Dropped' : STEP_LABEL[step];
            const date = isRejectedStep ? reachedAt(history, 'Rejected') : reachedAt(history, step) ?? (index === 0 ? referral.referred_at : null);

            return (
               <li className={`orStep ${stateClass}`} key={step}>
                  <span className="orStepDot" />
                  <strong>{label}</strong>
                  <small>{date ? formatDate(date) : ''}</small>
               </li>
            );
         })}
      </ol>
   );
}

function Summary({ referral }) {
   const { status, history, referrer } = referral;

   // The decision is the latest accepted / rejected entry in the history
   const decisionLog = [...history].reverse().find((h) => h.status === 'Accepted by Maxima' || h.status === 'Rejected');

   let decisionValue = STATUS_LABEL[status] ?? status;
   let decisionNote = '';
   if (decisionLog) {
      decisionValue = decisionLog.status === 'Rejected' ? 'Not accepted' : 'Accepted';
      decisionNote = `${decisionLog.changed_by ? `By ${decisionLog.changed_by} · ` : ''}${formatDate(decisionLog.created_at)}`;
   } else if (status === 'Referred') {
      decisionValue = 'Waiting for Maxima';
      decisionNote = 'You will get a notification';
   }

   const roleLabel = referrer?.role ? ROLE_LABEL[referrer.role] : null;

   return (
      <div className="orSummary">
         <div className="orSummaryItem">
            <span className="orSummaryLabel">Referred by</span>
            <strong className="orSummaryValue">{referrer?.name ?? '—'}</strong>
            {roleLabel && <small>{roleLabel}</small>}
         </div>
         <div className="orSummaryItem">
            <span className="orSummaryLabel">Maxima's decision</span>
            <strong className="orSummaryValue">{decisionValue}</strong>
            {decisionNote && <small>{decisionNote}</small>}
         </div>
         <div className="orSummaryItem">
            <span className="orSummaryLabel">Referred</span>
            <strong className="orSummaryValue">{timeAgo(referral.referred_at)}</strong>
            <small>{formatDate(referral.referred_at)}</small>
         </div>
      </div>
   );
}

function NextBlock({ referral }) {
   const { status, requirements } = referral;
   const info = nextInfo(status);
   if (!info) return null;

   const isBad = status === 'Rejected';

   return (
      <div className={`orNext ${isBad ? 'orNextBad' : ''}`}>
         <h3 className="orNextTitle">What happens next</h3>
         <strong className="orNextHeading">{info.title}</strong>
         <p className="orNextText">{info.text}</p>

         {isBad && (
            <blockquote className="orReason">
               <span>Reason from Maxima</span>
               <p>{referral.rejection_note || 'No reason was given. Please ask your barangay or SK official.'}</p>
            </blockquote>
         )}

         <ol className="orNextSteps">
            {info.steps.map((step) => (
               <li key={step}>{step}</li>
            ))}
         </ol>

         {status === 'Referred' && requirements.length > 0 && (
            <div className="orPrepare">
               <span className="orPrepareLabel">Documents Maxima will ask for</span>
               <div className="orChips">
                  {requirements.map((name) => (
                     <span className="orChip" key={name}>{name}</span>
                  ))}
               </div>
            </div>
         )}
      </div>
   );
}

function DocumentsLine({ referral }) {
   const { documents, docs_received: received, docs_required: required } = referral;
   const percent = required > 0 ? Math.round((received / required) * 100) : 0;
   const left = Math.max(required - received, 0);

   return (
      <div className="orDocLine">
         <div className="orDocLineText">
            <strong>Documents</strong>
            <span>
               {received} of {required} submitted
               {left > 0 && referral.status !== 'Dropped' ? ` · ${left} still to submit` : ''}
            </span>
            <div className="orMeter" aria-hidden="true">
               <div className="orMeterFill" style={{ width: `${percent}%` }} />
            </div>
         </div>
         <Link className="orLink orLinkInline" to={TRAINING_PATH}>
            Open my checklist
         </Link>
      </div>
   );
}

function History({ history }) {
   // Newest first, so the latest update is always at the top
   const items = [...history].reverse();

   return (
      <div className="opBlock">
         <h3 className="opBlockTitle">
            Full history
            <small>{items.length} {items.length === 1 ? 'update' : 'updates'}</small>
         </h3>
         <div className="opTimeline">
            {items.map((item, index) => (
               <div className="opTimelineItem" key={`${item.status}-${item.created_at}-${index}`}>
                  <span className="opTimelineDot" />
                  <div className="orHistoryText">
                     <strong>
                        {HISTORY_TITLE[item.status] ?? item.status}
                        {index === 0 && <em className="orLatest">Latest</em>}
                     </strong>
                     <span>
                        {formatDateTime(item.created_at)}
                        {item.changed_by ? ` · by ${item.changed_by}` : ''}
                     </span>
                     {item.remarks && <p className="orHistoryRemarks">{item.remarks}</p>}
                  </div>
               </div>
            ))}
         </div>
      </div>
   );
}

function ReferralCard({ referral }) {
   const { status, documents, history } = referral;
   const accepted = ['Accepted by Maxima', 'Training Started', 'Completed', 'Dropped'].includes(status);
   const showDocs = accepted && documents.length > 0;

   return (
      <section className="opCard">
         <div className="opCardHeader">
            <div>
               <h2 className="opProgram">{referral.program?.name ?? 'Training program'}</h2>
               <span className="opBatch">Referred on {formatDate(referral.referred_at)}</span>
            </div>
            <span className={`opBadge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status] ?? status}</span>
         </div>

         <Stepper referral={referral} />

         <Summary referral={referral} />

         <NextBlock referral={referral} />

         {showDocs && <DocumentsLine referral={referral} />}

         {history.length > 0 && <History history={history} />}

         {accepted && !showDocs && (
            <Link className="orLink" to={TRAINING_PATH}>
               See my training progress
            </Link>
         )}
      </section>
   );
}

function OsyReferralTracking() {
   const [referrals, setReferrals] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   useEffect(() => {
      async function load() {
         try {
            const res = await fetch('/api/osy/referrals', {
               headers: { Accept: 'application/json' },
               credentials: 'include',
            });
            if (!res.ok) throw new Error('Could not load your referrals.');
            const data = await res.json();
            setReferrals(data.referrals ?? []);
         } catch (err) {
            setError(err.message);
         } finally {
            setLoading(false);
         }
      }
      load();
   }, []);

   return (
      <div className="osyTrainingProgBody">
         <OsySideBar />

         <div className="osyTrainingProgMain orPage">
            <div className="osyTrainingProgHeader">
               <h1>My Referrals</h1>
               <p>Follow your referral from start to finish: who referred you, what happens next, and every update along the way.</p>
            </div>

            {loading && <div className="opState">Loading your referrals...</div>}
            {error && <div className="opState opStateError">{error}</div>}

            {!loading && !error && referrals.length === 0 && (
               <div className="opEmpty">
                  <i className="las la-paper-plane"></i>
                  <h3>No referrals yet</h3>
                  <p>When your barangay or SK official refers you to a program, it will show up here.</p>
               </div>
            )}

            {!loading && !error && referrals.length > 0 && (
               <div className="opTracker">
                  {referrals.map((referral) => (
                     <ReferralCard key={referral.id} referral={referral} />
                  ))}
               </div>
            )}
         </div>
      </div>
   );
}

export default OsyReferralTracking;