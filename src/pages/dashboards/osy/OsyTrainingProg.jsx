import { useEffect, useState } from 'react';
import OsySideBar from '../../../components/osySideBar';
import "./OsyTrainingProg.css"

const RECORDS_PREVIEW = 5;

const STATUS_LABEL = {
   'Accepted by Maxima': 'Waiting to start',
   'Training Started': 'Ongoing',
   Completed: 'Completed',
   Dropped: 'Dropped',
};

const STATUS_CLASS = {
   'Accepted by Maxima': 'opBadgeWaiting',
   'Training Started': 'opBadgeOngoing',
   Completed: 'opBadgeCompleted',
   Dropped: 'opBadgeDropped',
};

const MILESTONE_LABEL = {
   'Accepted by Maxima': 'Accepted by Maxima',
   'Training Started': 'Training started',
   Completed: 'Training completed',
   Dropped: 'Dropped from training',
};

const ATTENDANCE_CLASS = {
   present: 'opChipGood',
   late: 'opChipWarn',
   absent: 'opChipBad',
   excused: 'opChipMuted',
};

const DOC_LABEL = {
   pending: 'To submit',
   received: 'Submitted',
   not_applicable: 'Not needed',
};

function formatDate(value) {
   if (!value) return '—';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '—';
   return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPercent(value) {
   if (value === null || value === undefined) return '—';
   return `${Math.round(Number(value) * 10) / 10}%`;
}

function attendanceHint(rate) {
   if (rate === null || rate === undefined) return 'Your attendance will show up here once your trainer records it.';
   if (rate >= 90) return 'Great attendance. Keep it up!';
   if (rate >= 75) return 'Good attendance. Try to attend every session.';
   return 'Your attendance is low. Please talk to your trainer if you need help attending.';
}

function TrainingCard({ training }) {
   const [showAllRecords, setShowAllRecords] = useState(false);

   const { status, attendance, documents } = training;
   const pendingDocs = documents.filter((doc) => doc.status === 'pending');
   const records = showAllRecords ? attendance.records : attendance.records.slice(0, RECORDS_PREVIEW);

   // Time-based progress through the training period
   let percent = null;
   let caption = '';

   if (status === 'Completed') {
      percent = 100;
      caption = `Completed on ${formatDate(training.training_end_date)}`;
   } else if (status === 'Training Started') {
      if (training.training_length && training.training_day) {
         percent = Math.min(100, Math.round((training.training_day / training.training_length) * 100));
         caption = `Day ${Math.min(training.training_day, training.training_length)} of ${training.training_length}`;
      } else {
         caption = training.training_day ? `Day ${training.training_day}` : 'Training is ongoing';
      }
   } else if (status === 'Accepted by Maxima') {
      caption = 'Waiting for your batch to start';
   }

   return (
      <section className="opCard">
         <div className="opCardHeader">
            <div>
               <h2 className="opProgram">{training.program?.name ?? 'Training program'}</h2>
               {training.batch_name && <span className="opBatch">{training.batch_name}</span>}
            </div>
            <span className={`opBadge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>
         </div>

         {status !== 'Dropped' && (
            <div className="opProgressBlock">
               <div className="opProgressTop">
                  <span className="opProgressCaption">{caption}</span>
                  {percent !== null && <span className="opProgressPercent">{percent}%</span>}
               </div>
               <div className="opBarTrack">
                  <div
                     className={`opBarFill ${status === 'Completed' ? 'opBarFillDone' : ''}`}
                     style={{ width: `${percent ?? 0}%` }}
                  />
               </div>
               <div className="opProgressDates">
                  <span>Start: {formatDate(training.started_on)}</span>
                  <span>Expected end: {formatDate(training.expected_end_date)}</span>
               </div>
            </div>
         )}

         {status === 'Dropped' && training.outcome && (
            <div className="opNotice opNoticeMuted">
               <i className="las la-info-circle"></i>
               <div>
                  <strong>You are no longer part of this training</strong>
                  <p>
                     Ended on {formatDate(training.outcome.date)}
                     {training.outcome.reason ? ` · Reason: ${training.outcome.reason}` : ''}. If you want to join
                     again, please talk to your barangay or SK official.
                  </p>
               </div>
            </div>
         )}

         {status === 'Completed' && training.outcome && (
            <div className="opNotice opNoticeGood">
               <i className="las la-award"></i>
               <div>
                  <strong>Congratulations on completing your training!</strong>
                  <p>
                     {training.outcome.certificate_number
                        ? `Certificate no. ${training.outcome.certificate_number}${
                             training.outcome.certificate_date ? ` (${formatDate(training.outcome.certificate_date)})` : ''
                          }. `
                        : ''}
                     {training.outcome.after_training
                        ? `After training: ${training.outcome.after_training}${
                             training.outcome.after_training_note ? ` · ${training.outcome.after_training_note}` : ''
                          }.`
                        : ''}
                  </p>
               </div>
            </div>
         )}

         <div className="opInfoGrid">
            <div className="opInfoItem">
               <i className="las la-map-marker"></i>
               <div><span>Venue</span><strong>{training.venue || '—'}</strong></div>
            </div>
            <div className="opInfoItem">
               <i className="las la-user-tie"></i>
               <div><span>Trainer</span><strong>{training.trainer_name || '—'}</strong></div>
            </div>
            <div className="opInfoItem">
               <i className="las la-clock"></i>
               <div><span>Schedule</span><strong>{training.program?.schedule || '—'}</strong></div>
            </div>
         </div>

         {status !== 'Accepted by Maxima' && (
            <div className="opBlock">
               <h3 className="opBlockTitle">My attendance</h3>
               <div className="opChips">
                  <div className="opChipBox opChipBoxMain">
                     <strong>{formatPercent(attendance.rate)}</strong>
                     <span>Attendance rate</span>
                  </div>
                  <div className="opChipBox"><strong>{attendance.present}</strong><span>Present</span></div>
                  <div className="opChipBox"><strong>{attendance.late}</strong><span>Late</span></div>
                  <div className="opChipBox"><strong>{attendance.absent}</strong><span>Absent</span></div>
                  <div className="opChipBox"><strong>{attendance.excused}</strong><span>Excused</span></div>
               </div>
               <p className="opHint">{attendanceHint(attendance.rate)}</p>

               {attendance.records.length > 0 && (
                  <>
                     <div className="opRecords">
                        {records.map((record) => (
                           <div className="opRecord" key={record.date}>
                              <span className="opRecordDate">{formatDate(record.date)}</span>
                              <span className={`opChip ${ATTENDANCE_CLASS[record.status]}`}>{record.status}</span>
                              <span className="opRecordNote">{record.remarks || ''}</span>
                           </div>
                        ))}
                     </div>
                     {attendance.records.length > RECORDS_PREVIEW && (
                        <button className="opLinkBtn" onClick={() => setShowAllRecords((prev) => !prev)}>
                           {showAllRecords ? 'Show less' : `Show all ${attendance.records.length} records`}
                        </button>
                     )}
                  </>
               )}
            </div>
         )}

         {documents.length > 0 && (
            <div className="opBlock">
               <h3 className="opBlockTitle">
                  My documents
                  <small>{training.docs_received} of {training.docs_required} submitted</small>
               </h3>

               {pendingDocs.length > 0 && status !== 'Dropped' && (
                  <div className="opNotice opNoticeWarn">
                     <i className="las la-exclamation-circle"></i>
                     <div>
                        <strong>Please submit the remaining documents to Maxima</strong>
                        <p>{pendingDocs.map((doc) => doc.name).join(', ')}</p>
                     </div>
                  </div>
               )}

               <div className="opDocList">
                  {documents.map((doc) => (
                     <div className={`opDoc ${doc.status === 'received' ? 'opDocDone' : ''}`} key={doc.id}>
                        <i className={`las ${doc.status === 'received' ? 'la-check-circle' : doc.status === 'pending' ? 'la-circle' : 'la-minus-circle'}`}></i>
                        <div className="opDocText">
                           <span>{doc.name}</span>
                           {doc.status === 'received' && doc.received_at && <small>Submitted {formatDate(doc.received_at)}</small>}
                           {doc.remarks && <small>{doc.remarks}</small>}
                        </div>
                        <span className={`opDocStatus opDocStatus-${doc.status}`}>{DOC_LABEL[doc.status]}</span>
                     </div>
                  ))}
               </div>
            </div>
         )}

         {training.milestones.length > 0 && (
            <div className="opBlock">
               <h3 className="opBlockTitle">My journey</h3>
               <div className="opTimeline">
                  {training.milestones.map((item, index) => (
                     <div className="opTimelineItem" key={`${item.status}-${index}`}>
                        <span className="opTimelineDot" />
                        <div>
                           <strong>{MILESTONE_LABEL[item.status]}</strong>
                           <span>{formatDate(item.date)}</span>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         )}
      </section>
   );
}

function OsyTrainingProg() {
   const [trainings, setTrainings] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   useEffect(() => {
      async function load() {
         try {
            const res = await fetch('/api/osy/progress', {
               headers: { Accept: 'application/json' },
               credentials: 'include',
            });
            if (!res.ok) throw new Error('Could not load your training progress.');
            const data = await res.json();
            setTrainings(data.trainings ?? []);
         } catch (err) {
            setError(err.message);
         } finally {
            setLoading(false);
         }
      }
      load();
   }, []);

   return (
      <>
         <div className='osyTrainingProgBody'>
            
            <OsySideBar/>

            <div className='osyTrainingProgMain'>
               <div className='osyTrainingProgHeader'>
                  <h1>My Training Progress</h1>
                  <p>Follow your training: your schedule, attendance and the documents Maxima needs from you.</p>
               </div>

               {loading && <div className="opState">Loading your progress...</div>}
               {error && <div className="opState opStateError">{error}</div>}

               {!loading && !error && trainings.length === 0 && (
                  <div className="opEmpty">
                     <i className="las la-route"></i>
                     <h3>No training to track yet</h3>
                     <p>Your progress will appear here once Maxima accepts your referral.</p>
                  </div>
               )}

               {!loading && !error && trainings.length > 0 && (
                  <div className="opTracker">
                     {trainings.map((training) => (
                        <TrainingCard key={training.id} training={training} />
                     ))}
                  </div>
               )}
            </div>
            
         </div>
      </>
   );
}

export default OsyTrainingProg;