import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import OsySideBar from '../../../components/osySideBar';
import useUnreadCount from '../../../hooks/useUnreadCount';
import "./OsyDashboard.css"

const STATUS_LABEL = {
   'Accepted by Maxima': 'Waiting to start',
   'Training Started': 'Ongoing',
   Completed: 'Completed',
   Dropped: 'Dropped',
};

const STATUS_ORDER = {
   'Training Started': 0,
   'Accepted by Maxima': 1,
   Completed: 2,
   Dropped: 3,
};

function formatDate(value) {
   if (!value) return '—';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '—';
   return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function OsyDashboard() {
   const [trainings, setTrainings] = useState([]);
   const [announcements, setAnnouncements] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const { count: unreadCount } = useUnreadCount();

   const userName = localStorage.getItem('userName') || 'User';

   useEffect(() => {
      async function load() {
         try {
            const [progressRes, announcementRes] = await Promise.all([
               fetch('/api/osy/progress', {
                  headers: { Accept: 'application/json' },
                  credentials: 'include',
               }),
               fetch('/api/announcements', {
                  headers: { Accept: 'application/json' },
                  credentials: 'include',
               }),
            ]);

            if (!progressRes.ok) throw new Error('Could not load your dashboard.');

            const progress = await progressRes.json();
            setTrainings(progress.trainings ?? []);

            if (announcementRes.ok) {
               const list = await announcementRes.json();
               setAnnouncements(Array.isArray(list) ? list : []);
            }
         } catch (err) {
            setError(err.message);
         } finally {
            setLoading(false);
         }
      }
      load();
   }, []);

   const sortedTrainings = [...trainings].sort(
      (a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9)
   );
   const current = sortedTrainings[0];

   const needsReasonTotal = trainings
      .filter((t) => t.status === 'Training Started')
      .reduce((sum, t) => sum + (t.attendance?.needs_reason ?? 0), 0);

   const latestAnnouncements = [...announcements]
      .sort((a, b) => new Date(b.posted_at) - new Date(a.posted_at))
      .slice(0, 3);

   let percent = null;
   let caption = '';

   if (current) {
      if (current.status === 'Completed') {
         percent = 100;
         caption = `Completed on ${formatDate(current.training_end_date)}`;
      } else if (current.status === 'Training Started') {
         if (current.training_length && current.training_day) {
            percent = Math.min(100, Math.round((current.training_day / current.training_length) * 100));
            caption = `Day ${Math.min(current.training_day, current.training_length)} of ${current.training_length}`;
         } else {
            caption = current.training_day ? `Day ${current.training_day}` : 'Training is ongoing';
         }
      } else if (current.status === 'Accepted by Maxima') {
         caption = 'Waiting for your batch to start';
      } else if (current.status === 'Dropped') {
         caption = `Ended on ${formatDate(current.training_end_date)}`;
      }
   }

   const rate = current?.attendance?.rate;

   const hour = new Date().getHours();
   const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
   const firstName = userName.split(' ')[0];
   const today = new Date().toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
   });

   return (
      <>
         <div className='osyDashboardBody'>

            <OsySideBar/>

            <div className='osyDashboardMain'>

               <div className='osyDashboardHero'>
                  <div className='osyDashboardHeroText'>
                     <span className='osyDashboardDate'>{today}</span>
                     <h1>{greeting}, {firstName}</h1>
                     <p>
                        {current && current.status === 'Training Started' && 'Your training is ongoing. Here is how you are doing so far.'}
                        {current && current.status === 'Accepted by Maxima' && 'Your referral was accepted. Your batch will start soon.'}
                        {current && current.status === 'Completed' && 'You completed your training. Well done!'}
                        {current && current.status === 'Dropped' && 'Your last training has ended. You can look for a new course anytime.'}
                        {!current && 'Welcome to BackToTrack. Start by exploring the courses available for you.'}
                     </p>
                  </div>
                  <Link to={current ? '/osy/training' : '/osy/courses'} className='osyDashboardHeroBtn'>
                     {current ? 'View my training' : 'Browse courses'}
                     <i className="las la-arrow-right"></i>
                  </Link>
               </div>

               {loading && <div className='osyDashboardState'>Loading your dashboard...</div>}
               {error && <div className='osyDashboardState osyDashboardStateError'>{error}</div>}

               {!loading && !error && (
                  <>
                     {needsReasonTotal > 0 && (
                        <div className='osyDashboardAlert'>
                           <div className='osyDashboardAlertIcon'>
                              <i className="las la-exclamation-circle"></i>
                           </div>
                           <div className='osyDashboardAlertText'>
                              <strong>
                                 Your SK official asked you to explain {needsReasonTotal} {needsReasonTotal === 1 ? 'absence' : 'absences'}
                              </strong>
                              <p>Tell us what happened so you can get the support you need.</p>
                           </div>
                           <Link to="/osy/training">Add reasons</Link>
                        </div>
                     )}

                     <div className='osyDashboardStats'>
                        <div className='osyDashboardStat'>
                           <div className='osyDashboardStatIcon green'>
                              <i className="las la-graduation-cap"></i>
                           </div>
                           <div className='osyDashboardStatText'>
                              <span>Current training</span>
                              <strong>{current ? (current.program?.name ?? 'Training program') : 'None yet'}</strong>
                              {current && <small>{STATUS_LABEL[current.status]}</small>}
                           </div>
                        </div>

                        <div className='osyDashboardStat'>
                           <div className='osyDashboardStatIcon blue'>
                              <i className="las la-calendar-check"></i>
                           </div>
                           <div className='osyDashboardStatText'>
                              <span>Attendance rate</span>
                              <strong>{rate !== null && rate !== undefined ? `${Math.round(Number(rate))}%` : '—'}</strong>
                              {current && (
                                 <small>
                                    {current.attendance?.present ?? 0} present · {current.attendance?.absent ?? 0} absent
                                 </small>
                              )}
                           </div>
                        </div>

                        <div className='osyDashboardStat'>
                           <div className='osyDashboardStatIcon amber'>
                              <i className="las la-comment-dots"></i>
                           </div>
                           <div className='osyDashboardStatText'>
                              <span>Reasons to add</span>
                              <strong>{needsReasonTotal}</strong>
                              <small>{needsReasonTotal > 0 ? 'Needs your reply' : 'All caught up'}</small>
                           </div>
                        </div>

                        <Link to="/osy/notifications" className='osyDashboardStat osyDashboardStatLink'>
                           <div className='osyDashboardStatIcon rose'>
                              <i className="las la-bell"></i>
                           </div>
                           <div className='osyDashboardStatText'>
                              <span>Unread notifications</span>
                              <strong>{unreadCount}</strong>
                              <small>{unreadCount > 0 ? 'Tap to view' : 'Nothing new'}</small>
                           </div>
                        </Link>
                     </div>

                     <div className='osyDashboardGrid'>
                        <div className='osyDashboardPanel'>
                           <div className='osyDashboardPanelHead'>
                              <h2>Training progress</h2>
                              <Link to="/osy/training">View details <i className="las la-angle-right"></i></Link>
                           </div>

                           {!current && (
                              <div className='osyDashboardEmpty'>
                                 <div className='osyDashboardEmptyIcon'>
                                    <i className="las la-route"></i>
                                 </div>
                                 <strong>No training yet</strong>
                                 <p>Your progress will appear here once Maxima accepts your referral.</p>
                                 <Link to="/osy/courses">Browse available courses</Link>
                              </div>
                           )}

                           {current && (
                              <div className='osyDashboardPanelBody'>
                                 <div className='osyDashboardProgramRow'>
                                    <h3>{current.program?.name ?? 'Training program'}</h3>
                                    <span className='osyDashboardBadge'>{STATUS_LABEL[current.status]}</span>
                                 </div>

                                 {current.status !== 'Dropped' && (
                                    <div className='osyDashboardProgress'>
                                       <div className='osyDashboardProgressTop'>
                                          <span>{caption}</span>
                                          {percent !== null && <strong>{percent}%</strong>}
                                       </div>
                                       <div className='osyDashboardBarTrack'>
                                          <div className='osyDashboardBarFill' style={{ width: `${percent ?? 0}%` }} />
                                       </div>
                                       <div className='osyDashboardProgressDates'>
                                          <span>Start: {formatDate(current.started_on)}</span>
                                          <span>Expected end: {formatDate(current.expected_end_date)}</span>
                                       </div>
                                    </div>
                                 )}

                                 {current.status === 'Dropped' && <p className='osyDashboardMuted'>{caption}</p>}

                                 {current.status !== 'Accepted by Maxima' && (
                                    <div className='osyDashboardAttendance'>
                                       <div className='osyDashboardAttBox present'>
                                          <strong>{current.attendance?.present ?? 0}</strong>
                                          <span>Present</span>
                                       </div>
                                       <div className='osyDashboardAttBox late'>
                                          <strong>{current.attendance?.late ?? 0}</strong>
                                          <span>Late</span>
                                       </div>
                                       <div className='osyDashboardAttBox absent'>
                                          <strong>{current.attendance?.absent ?? 0}</strong>
                                          <span>Absent</span>
                                       </div>
                                       <div className='osyDashboardAttBox excused'>
                                          <strong>{current.attendance?.excused ?? 0}</strong>
                                          <span>Excused</span>
                                       </div>
                                    </div>
                                 )}

                                 <div className='osyDashboardInfo'>
                                    <div className='osyDashboardInfoItem'>
                                       <i className="las la-map-marker"></i>
                                       <div>
                                          <span>Venue</span>
                                          <strong>{current.venue || '—'}</strong>
                                       </div>
                                    </div>
                                    <div className='osyDashboardInfoItem'>
                                       <i className="las la-user-tie"></i>
                                       <div>
                                          <span>Trainer</span>
                                          <strong>{current.trainer_name || '—'}</strong>
                                       </div>
                                    </div>
                                    <div className='osyDashboardInfoItem'>
                                       <i className="las la-clock"></i>
                                       <div>
                                          <span>Schedule</span>
                                          <strong>{current.program?.schedule || '—'}</strong>
                                       </div>
                                    </div>
                                 </div>
                              </div>
                           )}
                        </div>

                        <div className='osyDashboardPanel'>
                           <div className='osyDashboardPanelHead'>
                              <h2>Latest announcements</h2>
                              <Link to="/osy/announcements">See all <i className="las la-angle-right"></i></Link>
                           </div>

                           {latestAnnouncements.length === 0 && (
                              <div className='osyDashboardEmpty'>
                                 <div className='osyDashboardEmptyIcon'>
                                    <i className="las la-bullhorn"></i>
                                 </div>
                                 <strong>No announcements yet</strong>
                                 <p>Check back later for updates from Maxima.</p>
                              </div>
                           )}

                           <div className='osyDashboardPanelBody'>
                              {latestAnnouncements.map((a) => (
                                 <div className='osyDashboardAnn' key={a.id}>
                                    <div className='osyDashboardAnnIcon'>
                                       <i className={`las ${a.training_program ? 'la-graduation-cap' : 'la-info-circle'}`}></i>
                                    </div>
                                    <div className='osyDashboardAnnBody'>
                                       <h3>{a.title}</h3>
                                       <p>{a.content}</p>
                                       <span>{formatDate(a.posted_at)}</span>
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>

                     <div className='osyDashboardQuick'>
                        <Link to="/osy/courses" className='osyDashboardQuickItem'>
                           <i className="las la-graduation-cap"></i>
                           <div>
                              <strong>Available courses</strong>
                              <span>Find a training for you</span>
                           </div>
                        </Link>
                        <Link to="/osy/recommendations" className='osyDashboardQuickItem'>
                           <i className="las la-lightbulb"></i>
                           <div>
                              <strong>Recommendations</strong>
                              <span>Courses picked for you</span>
                           </div>
                        </Link>
                        <Link to="/osy/referrals" className='osyDashboardQuickItem'>
                           <i className="las la-paper-plane"></i>
                           <div>
                              <strong>My referrals</strong>
                              <span>Track your referral status</span>
                           </div>
                        </Link>
                        <Link to="/osy/profile" className='osyDashboardQuickItem'>
                           <i className="las la-user"></i>
                           <div>
                              <strong>My profile</strong>
                              <span>Keep your details updated</span>
                           </div>
                        </Link>
                     </div>
                  </>
               )}
            </div>

         </div>
      </>
   );
}

export default OsyDashboard;