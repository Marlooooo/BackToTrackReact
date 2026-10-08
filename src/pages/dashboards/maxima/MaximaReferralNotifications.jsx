import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaReferralNotifications.css';

function getCookie(name) {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? decodeURIComponent(match[2]) : null;
}

async function ensureCsrfCookie() {
   await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
}

function timeAgo(dateString) {
   const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
   if (seconds < 60) return 'Just now';
   const minutes = Math.floor(seconds / 60);
   if (minutes < 60) return `${minutes} min ago`;
   const hours = Math.floor(minutes / 60);
   if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
   const days = Math.floor(hours / 24);
   if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
   return new Date(dateString).toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
   });
}

function isToday(dateString) {
   return new Date(dateString).toDateString() === new Date().toDateString();
}

function MaximaReferralNotifications() {
   const [notifications, setNotifications] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [tab, setTab] = useState('all');
   const navigate = useNavigate();

   useEffect(() => {
      fetchNotifications();
      const timer = setInterval(fetchNotifications, 30000);
      return () => clearInterval(timer);
   }, []);

   async function fetchNotifications() {
      try {
         const res = await fetch('/api/notifications', {
            headers: { Accept: 'application/json' },
            credentials: 'include',
         });
         if (!res.ok) throw new Error('Could not load notifications.');
         const data = await res.json();
         const list = Array.isArray(data) ? data : data.data ?? [];
         setNotifications(Array.isArray(list) ? list : []);
         setError(null);
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   }

   async function postAction(url) {
      await ensureCsrfCookie();
      const res = await fetch(url, {
         method: 'POST',
         credentials: 'include',
         headers: {
            Accept: 'application/json',
            'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
         },
      });
      if (!res.ok) throw new Error('Request failed.');
   }

   async function handleClick(n) {
      try {
         if (!n.read_at) {
            await postAction(`/api/notifications/${n.id}/read`);
         }
      } catch (err) {
         setError(err.message);
      }

      if (n.data?.type === 'new_referral') {
         navigate('/maxima/referrals'); // adjust to your real Maxima referrals route
      } else {
         fetchNotifications();
      }
   }

   async function markAllAsRead() {
      try {
         await postAction('/api/notifications/read-all');
         fetchNotifications();
      } catch (err) {
         setError(err.message);
      }
   }

   const unreadCount = useMemo(
      () => notifications.filter((n) => !n.read_at).length,
      [notifications]
   );
   const todayCount = useMemo(
      () => notifications.filter((n) => isToday(n.created_at)).length,
      [notifications]
   );
   const visible = useMemo(
      () => (tab === 'unread' ? notifications.filter((n) => !n.read_at) : notifications),
      [notifications, tab]
   );

   const today = new Date().toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
   });

   return (
      <>
         <div className='maximaDashboardBody'>
            <MaximaSideBar/>

            <div className='maximalNotificationsMainContent'>
               <div className='mrn-page'>

                  <div className='mrn-page-header'>
                     <div>
                        <h1 className='mrn-page-title'>Notifications</h1>
                        <p className='mrn-page-subtitle'>
                           New referrals from barangay and SK officials.
                        </p>
                     </div>
                     <span className='mrn-page-date'>{today}</span>
                  </div>

                  <dl className='mrn-stats'>
                     <div className='mrn-stat'>
                        <dt className='mrn-stat-label'>Unread</dt>
                        <dd className='mrn-stat-value'>{unreadCount}</dd>
                     </div>
                     <div className='mrn-stat'>
                        <dt className='mrn-stat-label'>Received today</dt>
                        <dd className='mrn-stat-value'>{todayCount}</dd>
                     </div>
                     <div className='mrn-stat'>
                        <dt className='mrn-stat-label'>Total</dt>
                        <dd className='mrn-stat-value'>{notifications.length}</dd>
                     </div>
                  </dl>

                  <section className='mrn-panel'>
                     <div className='mrn-toolbar'>
                        <div className='mrn-tabs' role='group' aria-label='Filter notifications'>
                           <button
                              type='button'
                              className={`mrn-tab ${tab === 'all' ? 'mrn-tab-active' : ''}`}
                              aria-pressed={tab === 'all'}
                              onClick={() => setTab('all')}
                           >
                              All ({notifications.length})
                           </button>
                           <button
                              type='button'
                              className={`mrn-tab ${tab === 'unread' ? 'mrn-tab-active' : ''}`}
                              aria-pressed={tab === 'unread'}
                              onClick={() => setTab('unread')}
                           >
                              Unread ({unreadCount})
                           </button>
                        </div>

                        <button
                           type='button'
                           className='mrn-markall'
                           onClick={markAllAsRead}
                           disabled={unreadCount === 0}
                        >
                           Mark all as read
                        </button>
                     </div>

                     {loading && (
                        <p className='mrn-message' role='status'>Loading notifications…</p>
                     )}

                     {error && (
                        <p className='mrn-error' role='alert'>{error}</p>
                     )}

                     {!loading && !error && visible.length === 0 && (
                        <div className='mrn-empty'>
                           <p className='mrn-empty-title'>
                              {tab === 'unread' ? 'No unread notifications' : 'No notifications yet'}
                           </p>
                           <p className='mrn-empty-text'>
                              {tab === 'unread'
                                 ? 'You have read everything.'
                                 : 'Referrals from barangay and SK officials will show up here.'}
                           </p>
                        </div>
                     )}

                     {visible.length > 0 && (
                        <ul className='mrn-list'>
                           {visible.map((n) => (
                              <li key={n.id} className='mrn-row'>
                                 <button
                                    type='button'
                                    className={`mrn-item ${n.read_at ? 'mrn-read' : 'mrn-unread'}`}
                                    onClick={() => handleClick(n)}
                                 >
                                    <span className='mrn-marker' aria-hidden='true'></span>

                                    <span className='mrn-body'>
                                       <span className='mrn-item-top'>
                                          <span className='mrn-item-title'>{n.data?.title}</span>
                                          <span className='mrn-item-time'>{timeAgo(n.created_at)}</span>
                                       </span>
                                       <span className='mrn-item-text'>{n.data?.message}</span>
                                    </span>

                                    {!n.read_at && <span className='mrn-sr'>Unread</span>}
                                 </button>
                              </li>
                           ))}
                        </ul>
                     )}
                  </section>

               </div>
            </div>
         </div>
      </>
   );
}

export default MaximaReferralNotifications;
