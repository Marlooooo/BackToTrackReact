import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OsySideBar from '../../../components/osySideBar';
import "./OsyNotif.css"

const API = "http://localhost:8000/api"; // same base URL as your other pages
const STORAGE = API.replace('/api', '/storage'); // where uploaded images are served from

function timeAgo(dateStr) {
   const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
   if (seconds < 60) return 'Just now';
   const minutes = Math.floor(seconds / 60);
   if (minutes < 60) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
   const hours = Math.floor(minutes / 60);
   if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
   const days = Math.floor(hours / 24);
   if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
   return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric',
   });
}

function NotifIcon({ type }) {
   if (type === 'new_announcement') {
      return (
         <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
         </svg>
      );
   }
   return (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
         <path d="M22 10 12 5 2 10l10 5 10-5z" />
         <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
      </svg>
   );
}

function OsyNotif() {
   const navigate = useNavigate();

   const [items, setItems] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [filter, setFilter] = useState('all');

   // preview modal
   const [selected, setSelected] = useState(null);
   const [program, setProgram] = useState(null);
   const [programLoading, setProgramLoading] = useState(false);
   const [programError, setProgramError] = useState('');

   const token = localStorage.getItem("token"); // same key your Login page saves
   const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
   };

   const load = async () => {
      try {
         const res = await fetch(`${API}/notifications`, { headers });
         if (!res.ok) throw new Error('Failed');
         const json = await res.json();
         setItems(json.data || []);
      } catch (err) {
         setError('Could not load notifications. Please try again.');
      } finally {
         setLoading(false);
      }
   };

   useEffect(() => {
      load();
   }, []);

   const markRead = async (id) => {
      await fetch(`${API}/notifications/${id}/read`, { method: "POST", headers });
      setItems((prev) =>
         prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
   };

   const markAllRead = async () => {
      await fetch(`${API}/notifications/read-all`, { method: "POST", headers });
      setItems((prev) =>
         prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
   };

   const openNotif = async (n) => {
      if (!n.read_at) markRead(n.id);

      setSelected(n);
      setProgram(null);
      setProgramError('');

      const programId = n.data?.program_id;
      if (!programId) return;

      setProgramLoading(true);
      try {
         const res = await fetch(`${API}/training-programs/${programId}`, { headers });
         if (res.status === 404) {
            setProgramError('This program is no longer available.');
            return;
         }
         if (!res.ok) throw new Error('Failed');
         const json = await res.json();
         setProgram(json.data || json); // works whether or not your API wraps it in "data"
      } catch (err) {
         setProgramError('Could not load the program details. Please try again.');
      } finally {
         setProgramLoading(false);
      }
   };

   const closeModal = () => {
      setSelected(null);
      setProgram(null);
      setProgramError('');
   };

   const unreadCount = items.filter((n) => !n.read_at).length;
   const visible = filter === 'unread' ? items.filter((n) => !n.read_at) : items;

   // details shown in the preview; only the ones that exist on your program are displayed
   const programName = program ? (program.title ?? program.name) : '';
   const details = program
      ? [
           ['Status', program.status],
           ['Duration', program.duration],
           ['Schedule', program.schedule],
           ['Location', program.location ?? program.venue],
           ['Slots', program.slots ?? program.capacity],
           ['Start date', program.start_date],
           ['End date', program.end_date],
        ].filter(([, value]) => value !== undefined && value !== null && value !== '')
      : [];

   return (
      <>
         <div className='osyNotifBody'>

            <OsySideBar />

            <div className='osyNotifContent'>
               <div className='osyNotifInner'>

                  <div className='osyNotifTopRow'>
                     <div>
                        <div className='osyNotifTitle'>Notifications</div>
                        <div className='osyNotifSubtitle'>
                           {unreadCount > 0
                              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                              : "You're all caught up"}
                        </div>
                     </div>

                     {unreadCount > 0 && (
                        <button className='osyNotifMarkAll' onClick={markAllRead}>
                           Mark all as read
                        </button>
                     )}
                  </div>

                  <div className='osyNotifTabs'>
                     <button
                        className={`osyNotifTab ${filter === 'all' ? 'osyNotifTabActive' : ''}`}
                        onClick={() => setFilter('all')}
                     >
                        All <span className='osyNotifBadge'>{items.length}</span>
                     </button>
                     <button
                        className={`osyNotifTab ${filter === 'unread' ? 'osyNotifTabActive' : ''}`}
                        onClick={() => setFilter('unread')}
                     >
                        Unread <span className='osyNotifBadge'>{unreadCount}</span>
                     </button>
                  </div>

                  {loading && <div className='osyNotifState'>Loading notifications...</div>}
                  {error && <div className='osyNotifState osyNotifStateError'>{error}</div>}

                  {!loading && !error && visible.length === 0 && (
                     <div className='osyNotifState'>
                        <div className='osyNotifEmptyIcon'>
                           <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                              <path d="M13.7 21a2 2 0 0 1-3.4 0" />
                           </svg>
                        </div>
                        <div className='osyNotifStateTitle'>
                           {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                        </div>
                        <div>New programs and updates will show up here.</div>
                     </div>
                  )}

                  <div className='osyNotifList'>
                     {visible.map((n) => (
                        <div
                           key={n.id}
                           className={`osyNotifItem ${n.read_at ? 'osyNotifRead' : 'osyNotifUnread'}`}
                           onClick={() => openNotif(n)}
                        >
                           <div className='osyNotifIcon'>
                              <NotifIcon type={n.data?.type} />
                           </div>

                           <div className='osyNotifText'>
                              <div className='osyNotifItemTitle'>{n.data?.title}</div>
                              <div className='osyNotifItemMessage'>{n.data?.message}</div>
                              <div className='osyNotifItemTime'>{timeAgo(n.created_at)}</div>
                           </div>

                           {!n.read_at && <span className='osyNotifDot' />}
                        </div>
                     ))}
                  </div>

               </div>
            </div>

            {/* Preview modal: closes only with the buttons, not by clicking outside */}
            {selected && (
               <div className='osyNotifOverlay'>
                  <div className='osyNotifModal'>

                     <div className='osyNotifModalHeader'>
                        <div className='osyNotifModalHeading'>Program Preview</div>
                        <button className='osyNotifModalClose' onClick={closeModal} aria-label="Close">
                           ✕
                        </button>
                     </div>

                     <div className='osyNotifModalBody'>
                        {programLoading && (
                           <div className='osyNotifModalState'>Loading program details...</div>
                        )}

                        {programError && (
                           <div className='osyNotifModalState osyNotifModalStateError'>{programError}</div>
                        )}

                        {program && (
                           <>
                              {program.image_path && (
                                 <img
                                    className='osyNotifModalImage'
                                    src={`${STORAGE}/${program.image_path}`}
                                    alt={programName}
                                 />
                              )}

                              <div className='osyNotifModalName'>{programName}</div>

                              {program.description && (
                                 <div className='osyNotifModalDesc'>{program.description}</div>
                              )}

                              {details.length > 0 && (
                                 <div className='osyNotifModalGrid'>
                                    {details.map(([label, value]) => (
                                       <div key={label} className='osyNotifModalDetail'>
                                          <div className='osyNotifModalLabel'>{label}</div>
                                          <div className='osyNotifModalValue'>{String(value)}</div>
                                       </div>
                                    ))}
                                 </div>
                              )}
                           </>
                        )}
                     </div>

                     <div className='osyNotifModalFooter'>
                        <button className='osyNotifBtnSecondary' onClick={closeModal}>
                           Close
                        </button>
                        {program && (
                           <button
                              className='osyNotifBtnPrimary'
                              onClick={() => navigate('/osy/courses')}
                           >
                              View in Available Courses
                           </button>
                        )}
                     </div>

                  </div>
               </div>
            )}

         </div>
      </>
   );
}

export default OsyNotif;