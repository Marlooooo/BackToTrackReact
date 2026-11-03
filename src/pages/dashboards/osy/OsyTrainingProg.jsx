import { Fragment, useEffect, useState } from 'react';
import OsySideBar from '../../../components/osySideBar';
import { AbsenceReasonPanel, AbsenceReasonSummary } from './OsyAbsenceReason';
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

// Order of the course tabs: ongoing first, then waiting, completed, dropped
const STATUS_ORDER = {
   'Training Started': 0,
   'Accepted by Maxima': 1,
   Completed: 2,
   Dropped: 3,
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
   if (value === null || value === undefined) return '—';
   return `${Math.round(Number(value) * 10) / 10}%`;
}

function attendanceHint(rate) {
   if (rate === null || rate === undefined) return 'Your attendance will show up here once your trainer records it.';
   if (rate >= 90) return 'Great attendance. Keep it up!';
   if (rate >= 75) return 'Good attendance. Try to attend every session.';
   return 'Your attendance is low. Please talk to your trainer if you need help attending.';
}

function TrainingCard({ training, reasonOptions, onReasonsSaved }) {
   const [showAllRecords, setShowAllRecords] = useState(false);
   const [onlyNeedsReason, setOnlyNeedsReason] = useState(false);
   const [openRecordId, setOpenRecordId] = useState(null);
   const [flash, setFlash] = useState('');

   const { status, attendance, documents } = training;
   const pendingDocs = documents.filter((doc) => doc.status === 'pending');

   const canAddReason = status === 'Training Started' && !!reasonOptions;
   const needsReason = attendance.needs_reason ?? 0;
   const needsReasonRecords = attendance.records.filter((record) => record.status === 'absent' && !record.reason && record.reason_request);
   const showReasonBanner = canAddReason && needsReason > 0;
   const listRecords = onlyNeedsReason ? needsReasonRecords : attendance.records;
   const records = showAllRecords ? listRecords : listRecords.slice(0, RECORDS_PREVIEW);

   function handleReasonsSaved(updatedRecords, message) {
      onReasonsSaved(training.id, updatedRecords);
      setOpenRecordId(null);
      setFlash(message || 'Your reason was sent.');
      setTimeout(() => setFlash(''), 5000);
   }

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
               {showReasonBanner && (
                  <div className="opNotice opNoticeWarn">
                     <i className="las la-exclamation-circle"></i>
                     <div>
                        <strong>
                           Your SK official asked you to explain {needsReason} {needsReason === 1 ? 'absence' : 'absences'}
                        </strong>
                        <p>
                           {needsReasonRecords[0]?.reason_request?.message
                              || 'Tell us what happened so your SK official can help you get back on track.'}
                        </p>
                        <button
                           type="button"
                           className="arBannerBtn"
                           onClick={() => {
                              setOnlyNeedsReason(true);
                              setOpenRecordId(needsReasonRecords[0]?.id ?? null);
                           }}
                        >
                           Add reasons
                        </button>
                     </div>
                  </div>
               )}
               {!(showReasonBanner && attendance.rate !== null && attendance.rate < 75) && (
                  <p className="opHint">{attendanceHint(attendance.rate)}</p>
               )}
               {flash && (
                  <div className="opNotice opNoticeGood arFlash">
                     <i className="las la-check-circle"></i>
                     <div><strong>{flash}</strong></div>
                  </div>
               )}

               {canAddReason && (needsReason > 0 || onlyNeedsReason) && (
                  <div className="arFilters">
                     <button
                        type="button"
                        className={`arFilter ${!onlyNeedsReason ? 'arFilterOn' : ''}`}
                        onClick={() => setOnlyNeedsReason(false)}
                     >
                        All
                     </button>
                     <button
                        type="button"
                        className={`arFilter ${onlyNeedsReason ? 'arFilterOn' : ''}`}
                        onClick={() => setOnlyNeedsReason(true)}
                     >
                        Needs reason ({needsReason})
                     </button>
                  </div>
               )}

               {attendance.records.length > 0 && onlyNeedsReason && needsReasonRecords.length === 0 && (
                  <div className="arEmptyFilter">All your absences have a reason. Nice work.</div>
               )}

               {attendance.records.length > 0 && listRecords.length > 0 && (
                  <>
                     <div className="opRecords">
                        {records.map((record) => (
                           <Fragment key={record.date}>
                              <div className="opRecord">
                                 <span className="opRecordDate">{formatDate(record.date)}</span>
                                 <span className={`opChip ${ATTENDANCE_CLASS[record.status]}`}>{record.status}</span>
                                 <span className="opRecordNote">
                                    {record.status === 'absent' && (record.reason || (canAddReason && record.reason_request)) ? (
                                       <span className="arRowAction">
                                          <span>{record.remarks || ''}</span>
                                          {record.reason ? (
                                             <button
                                                type="button"
                                                className="arSentTag"
                                                onClick={() => setOpenRecordId(openRecordId === record.id ? null : record.id)}
                                             >
                                                <i className="las la-check-circle"></i> Reason sent
                                             </button>
                                          ) : (
                                             <button
                                                type="button"
                                                className="arAddBtn"
                                                onClick={() => setOpenRecordId(openRecordId === record.id ? null : record.id)}
                                             >
                                                <span className="arDot" /> Add reason
                                             </button>
                                          )}
                                       </span>
                                    ) : (
                                       record.remarks || ''
                                    )}
                                 </span>
                              </div>
                              {openRecordId === record.id && (
                                 record.reason ? (
                                    <AbsenceReasonSummary reason={record.reason} onClose={() => setOpenRecordId(null)} />
                                 ) : (
                                    <AbsenceReasonPanel
                                       trainingId={training.id}
                                       candidates={needsReasonRecords}
                                       startRecordId={record.id}
                                       options={reasonOptions}
                                       onClose={() => setOpenRecordId(null)}
                                       onSaved={handleReasonsSaved}
                                    />
                                 )
                              )}
                           </Fragment>
                        ))}
                     </div>
                     {listRecords.length > RECORDS_PREVIEW && (
                        <button className="opLinkBtn" onClick={() => setShowAllRecords((prev) => !prev)}>
                           {showAllRecords ? 'Show less' : `Show all ${listRecords.length} records`}
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

         {training.history?.length > 0 && (
            <div className="opBlock">
               <h3 className="opBlockTitle">My journey</h3>
               <div className="opTimeline">
                  {training.history.map((item, index) => (
                     <div className="opTimelineItem" key={`${item.status}-${index}`}>
                        <span className="opTimelineDot" />
                        <div>
                           <strong>{item.status}</strong>
                           <span>{formatDateTime(item.created_at)}</span>
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
   const [reasonOptions, setReasonOptions] = useState(null);
   const [activeId, setActiveId] = useState(null);

   // Ongoing first, then waiting, completed, dropped
   const sortedTrainings = [...trainings].sort(
      (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
   );
   const activeTraining = sortedTrainings.find((t) => t.id === activeId) ?? sortedTrainings[0];

   function handleReasonsSaved(trainingId, updatedRecords) {
      setTrainings((prev) => prev.map((item) => {
         if (item.id !== trainingId) return item;

         const byId = new Map(updatedRecords.map((record) => [record.id, record]));

         return {
            ...item,
            attendance: {
               ...item.attendance,
               records: item.attendance.records.map((record) => byId.get(record.id) ?? record),
               needs_reason: Math.max(0, (item.attendance.needs_reason ?? 0) - updatedRecords.length),
            },
         };
      }));
   }

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
            setReasonOptions(data.reason_options ?? null);
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
                     {trainings.length > 1 && (
                        <div className="opCourseTabs" role="tablist" aria-label="My courses">
                           {sortedTrainings.map((t) => {
                              const needsReason =
                                 t.status === 'Training Started' && (t.attendance?.needs_reason ?? 0) > 0;
                              const isActive = activeTraining?.id === t.id;
                              return (
                                 <button
                                    key={t.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={isActive}
                                    className={`opCourseTab ${isActive ? 'opCourseTabActive' : ''}`}
                                    onClick={() => setActiveId(t.id)}
                                 >
                                    <span className="opCourseTabName">
                                       {t.program?.name ?? 'Training program'}
                                       {needsReason && <i className="opCourseTabAlert" title="Needs your reason" />}
                                    </span>
                                    <span className={`opBadge ${STATUS_CLASS[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                                 </button>
                              );
                           })}
                        </div>
                     )}

                     {activeTraining && (
                        <TrainingCard
                           key={activeTraining.id}
                           training={activeTraining}
                           reasonOptions={reasonOptions}
                           onReasonsSaved={handleReasonsSaved}
                        />
                     )}
                  </div>
               )}
            </div>

         </div>
      </>
   );
}

export default OsyTrainingProg;