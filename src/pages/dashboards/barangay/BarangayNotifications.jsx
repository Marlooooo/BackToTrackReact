import { useEffect, useState } from 'react';
import BarangaySideBar from '../../../components/skOfficialSideBar';
import './BarangayNotifications.css';

const API = "http://localhost:8000/api";

// How each status looks: label, color class, and icon
const STATUS_META = {
   'Accepted by Maxima': {
      label: 'Accepted',
      className: 'barangayNotifAccepted',
      icon: 'check',
   },
   'Training Started': {
      label: 'Enrolled',
      className: 'barangayNotifOngoing',
      icon: 'enroll',
   },
   'Completed': {
      label: 'Completed',
      className: 'barangayNotifCompleted',
      icon: 'award',
   },
   'Rejected': {
      label: 'Rejected',
      className: 'barangayNotifRejected',
      icon: 'cross',
   },
   'Dropped': {
      label: 'Dropped',
      className: 'barangayNotifRejected',
      icon: 'cross',
   },
};

const DEFAULT_META = {
   label: 'Update',
   className: 'barangayNotifDefault',
   icon: 'bell',
};

const DROP_REASONS = {
   transport: 'Transportation problem',
   work: 'Needs to work',
   family: 'Family reasons',
   health: 'Health reasons',
   lost_interest: 'Lost interest',
   other: 'Other',
};

const AFTER_TRAINING = {
   employed: 'Employed',
   self_employed: 'Self-employed',
   further_training: 'Taking further training',
   looking_for_work: 'Looking for work',
   other: 'Other',
};

/* ---------- Helpers ---------- */

function timeAgo(dateStr) {
   const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);

   if (seconds < 60) {
      return 'Just now';
   }

   const minutes = Math.floor(seconds / 60);
   if (minutes < 60) {
      return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
   }

   const hours = Math.floor(minutes / 60);
   if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
   }

   const days = Math.floor(hours / 24);
   if (days < 7) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
   }

   return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
   });
}

function formatDate(dateStr) {
   if (!dateStr) {
      return '';
   }

   return new Date(dateStr).toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
   });
}

function formatDateTime(dateStr) {
   if (!dateStr) {
      return '';
   }

   return new Date(dateStr).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
   });
}

// Today / Yesterday / This week / Earlier
function groupLabel(dateStr) {
   const date = new Date(dateStr);
   const today = new Date();

   const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
   const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
   const diffDays = Math.round((startOfToday - startOfDate) / 86400000);

   if (diffDays <= 0) {
      return 'Today';
   }

   if (diffDays === 1) {
      return 'Yesterday';
   }

   if (diffDays < 7) {
      return 'This week';
   }

   return 'Earlier';
}

function fullName(profile) {
   if (!profile) {
      return 'Unknown OSY';
   }

   const middle = profile.middle_name ? `${profile.middle_name.charAt(0)}.` : '';

   return [profile.first_name, middle, profile.last_name]
      .filter(Boolean)
      .join(' ');
}

function initials(profile) {
   if (!profile) {
      return '?';
   }

   return `${profile.first_name?.charAt(0) ?? ''}${profile.last_name?.charAt(0) ?? ''}`.toUpperCase() || '?';
}

function NotifIcon({ type, size = 20 }) {
   const props = {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 2,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
   };

   if (type === 'check') {
      return (
         <svg {...props}>
            <path d="M20 6 9 17l-5-5" />
         </svg>
      );
   }

   if (type === 'enroll') {
      return (
         <svg {...props}>
            <path d="M22 10 12 5 2 10l10 5 10-5z" />
            <path d="M6 12v5c0 1.5 2.7 3 6 3s6-1.5 6-3v-5" />
         </svg>
      );
   }

   if (type === 'award') {
      return (
         <svg {...props}>
            <circle cx="12" cy="8" r="6" />
            <path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5" />
         </svg>
      );
   }

   if (type === 'cross') {
      return (
         <svg {...props}>
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
         </svg>
      );
   }

   if (type === 'search') {
      return (
         <svg {...props}>
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
         </svg>
      );
   }

   if (type === 'refresh') {
      return (
         <svg {...props}>
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <path d="M21 4v5h-5" />
         </svg>
      );
   }

   if (type === 'chevron-right') {
      return (
         <svg {...props}>
            <path d="m9 18 6-6-6-6" />
         </svg>
      );
   }

   if (type === 'chevron-left') {
      return (
         <svg {...props}>
            <path d="m15 18-6-6 6-6" />
         </svg>
      );
   }

   return (
      <svg {...props}>
         <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
         <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
   );
}

function DetailItem({ label, value, wide }) {
   if (value === undefined || value === null || value === '') {
      return null;
   }

   return (
      <div className={`barangayNotifDetailItem ${wide ? 'barangayNotifDetailWide' : ''}`}>
         <span className='barangayNotifDetailLabel'>{label}</span>
         <span className='barangayNotifDetailValue'>{String(value)}</span>
      </div>
   );
}

/* ---------- Page ---------- */

function BarangayNotifications() {
   const [items, setItems] = useState([]);
   const [loading, setLoading] = useState(true);
   const [loadingMore, setLoadingMore] = useState(false);
   const [refreshing, setRefreshing] = useState(false);
   const [error, setError] = useState('');
   const [nextPage, setNextPage] = useState(null);

   const [filter, setFilter] = useState('all');
   const [statusFilter, setStatusFilter] = useState('all');
   const [search, setSearch] = useState('');

   // modal
   const [selected, setSelected] = useState(null);
   const [detail, setDetail] = useState(null);
   const [detailLoading, setDetailLoading] = useState(false);
   const [detailError, setDetailError] = useState('');

   const token = localStorage.getItem("token");
   const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
   };

   /* ----- Loading ----- */

   const fetchPage = async (page) => {
      const res = await fetch(`${API}/notifications?page=${page}`, { headers });

      if (!res.ok) {
         throw new Error('Failed');
      }

      return res.json();
   };

   const load = async () => {
      try {
         const json = await fetchPage(1);

         setItems(json.data || []);
         setNextPage(json.next_page_url ? 2 : null);
         setError('');
      } catch (err) {
         setError('Could not load notifications. Please try again.');
      } finally {
         setLoading(false);
      }
   };

   // Quietly check for new notifications without resetting the list
   const checkForNew = async () => {
      try {
         const json = await fetchPage(1);

         setItems((prev) => {
            const known = new Set(prev.map((n) => n.id));
            const fresh = (json.data || []).filter((n) => !known.has(n.id));

            return fresh.length > 0 ? [...fresh, ...prev] : prev;
         });
      } catch (err) {
         // ignore, the next check will try again
      }
   };

   const refresh = async () => {
      setRefreshing(true);
      await load();
      setRefreshing(false);
   };

   const loadMore = async () => {
      if (!nextPage) {
         return;
      }

      setLoadingMore(true);

      try {
         const json = await fetchPage(nextPage);

         setItems((prev) => {
            const known = new Set(prev.map((n) => n.id));
            const more = (json.data || []).filter((n) => !known.has(n.id));

            return [...prev, ...more];
         });
         setNextPage(json.next_page_url ? nextPage + 1 : null);
      } catch (err) {
         setError('Could not load more notifications.');
      } finally {
         setLoadingMore(false);
      }
   };

   useEffect(() => {
      load();

      const id = setInterval(checkForNew, 30000);
      return () => clearInterval(id);
   }, []);

   /* ----- Read state ----- */

   const markRead = async (id) => {
      setItems((prev) =>
         prev.map((n) =>
            n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n
         )
      );

      try {
         await fetch(`${API}/notifications/${id}/read`, {
            method: "POST",
            headers,
         });
      } catch (err) {
         // the page already shows it as read, the next refresh will correct it
      }
   };

   const markAllRead = async () => {
      await fetch(`${API}/notifications/read-all`, {
         method: "POST",
         headers,
      });

      setItems((prev) =>
         prev.map((n) => ({
            ...n,
            read_at: n.read_at || new Date().toISOString(),
         }))
      );
   };

   /* ----- Modal ----- */

   const openNotif = (n) => {
      if (!n.read_at) {
         markRead(n.id);
      }

      setSelected(n);
   };

   const closeModal = () => {
      setSelected(null);
      setDetail(null);
      setDetailError('');
   };

   // Load the referral details whenever a different notification is opened
   useEffect(() => {
      if (!selected) {
         return undefined;
      }

      let cancelled = false;
      const referralId = selected.data?.referral_id;

      setDetail(null);
      setDetailError('');

      if (!referralId) {
         setDetailError('No referral details are attached to this notification.');
         return undefined;
      }

      const loadDetail = async () => {
         setDetailLoading(true);

         try {
            const res = await fetch(`${API}/notifications/referrals/${referralId}`, { headers });

            if (res.status === 404) {
               throw new Error('This referral is no longer available.');
            }

            if (res.status === 403) {
               throw new Error('You do not have access to this referral.');
            }

            if (!res.ok) {
               throw new Error('Could not load the referral details. Please try again.');
            }

            const json = await res.json();

            if (!cancelled) {
               setDetail(json);
            }
         } catch (err) {
            if (!cancelled) {
               setDetailError(err.message);
            }
         } finally {
            if (!cancelled) {
               setDetailLoading(false);
            }
         }
      };

      loadDetail();

      return () => {
         cancelled = true;
      };
   }, [selected?.id]);

   // Close the modal with the Escape key
   useEffect(() => {
      if (!selected) {
         return undefined;
      }

      const onKey = (e) => {
         if (e.key === 'Escape') {
            closeModal();
         }
      };

      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [selected]);

   /* ----- Derived data ----- */

   const unreadCount = items.filter((n) => !n.read_at).length;

   const countStatus = (status) =>
      items.filter((n) => n.data?.status === status).length;

   const term = search.trim().toLowerCase();

   const visible = items.filter((n) => {
      if (filter === 'unread' && n.read_at) {
         return false;
      }

      if (statusFilter !== 'all' && n.data?.status !== statusFilter) {
         return false;
      }

      if (term) {
         const text = `${n.data?.title ?? ''} ${n.data?.message ?? ''}`.toLowerCase();

         if (!text.includes(term)) {
            return false;
         }
      }

      return true;
   });

   // Group the visible notifications by day
   const groups = [];

   visible.forEach((n) => {
      const label = groupLabel(n.created_at);
      const last = groups[groups.length - 1];

      if (last && last.label === label) {
         last.items.push(n);
      } else {
         groups.push({ label, items: [n] });
      }
   });

   const hasFilters = filter !== 'all' || statusFilter !== 'all' || term !== '';

   const clearFilters = () => {
      setFilter('all');
      setStatusFilter('all');
      setSearch('');
   };

   // Previous / next inside the modal
   const selectedIndex = selected ? visible.findIndex((n) => n.id === selected.id) : -1;
   const previousItem = selectedIndex > 0 ? visible[selectedIndex - 1] : null;
   const nextItem =
      selectedIndex >= 0 && selectedIndex < visible.length - 1
         ? visible[selectedIndex + 1]
         : null;

   // Modal content
   const selectedMeta = selected
      ? STATUS_META[selected.data?.status] || DEFAULT_META
      : DEFAULT_META;

   const referral = detail?.referral;
   const history = detail?.history || [];
   const program = referral?.training_program;
   const programName = program ? (program.title ?? program.name) : '';

   const programDetails = program
      ? [
           ['Duration', program.duration],
           ['Schedule', program.schedule],
           ['Location', program.location ?? program.venue],
        ]
      : [];

   const hasTrainingInfo =
      referral &&
      (referral.training_start_date ||
         referral.expected_end_date ||
         referral.training_end_date ||
         referral.batch_name ||
         referral.venue ||
         referral.trainer_name);

   const hasOutcome =
      referral &&
      (referral.drop_reason ||
         referral.after_training_status ||
         referral.after_training_note ||
         referral.outcome_remarks ||
         (referral.status === 'Rejected' && referral.remarks));

   return (
      <>
         <div className='barangayNotificationsBody'>
            <BarangaySideBar />

            <div className='barangayNotificationsContent'>
               <div className='barangayNotifPage'>

                  {/* Header */}
                  <div className='barangayNotifHeader'>
                     <div>
                        <h1 className='barangayNotifTitle'>Notifications</h1>
                        <p className='barangayNotifSubtitle'>
                           {unreadCount > 0
                              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
                              : "You're all caught up"}
                        </p>
                     </div>

                     <div className='barangayNotifHeaderActions'>
                        <button
                           className='barangayNotifGhostBtn'
                           onClick={refresh}
                           disabled={refreshing}
                        >
                           <NotifIcon type='refresh' size={15} />
                           {refreshing ? 'Refreshing...' : 'Refresh'}
                        </button>

                        {unreadCount > 0 && (
                           <button
                              className='barangayNotifPrimaryBtn'
                              onClick={markAllRead}
                           >
                              Mark all as read
                           </button>
                        )}
                     </div>
                  </div>

                  {/* Summary cards */}
                  <div className='barangayNotifSummary'>
                     <div className='barangayNotifSummaryCard barangayNotifSummaryUnread'>
                        <span className='barangayNotifSummaryLabel'>Unread</span>
                        <span className='barangayNotifSummaryValue'>{unreadCount}</span>
                     </div>

                     <div className='barangayNotifSummaryCard barangayNotifSummaryAccepted'>
                        <span className='barangayNotifSummaryLabel'>Accepted</span>
                        <span className='barangayNotifSummaryValue'>
                           {countStatus('Accepted by Maxima')}
                        </span>
                     </div>

                     <div className='barangayNotifSummaryCard barangayNotifSummaryOngoing'>
                        <span className='barangayNotifSummaryLabel'>Enrolled</span>
                        <span className='barangayNotifSummaryValue'>
                           {countStatus('Training Started')}
                        </span>
                     </div>

                     <div className='barangayNotifSummaryCard barangayNotifSummaryCompleted'>
                        <span className='barangayNotifSummaryLabel'>Completed</span>
                        <span className='barangayNotifSummaryValue'>
                           {countStatus('Completed')}
                        </span>
                     </div>
                  </div>

                  {/* Main panel */}
                  <div className='barangayNotifPanel'>

                     <div className='barangayNotifToolbar'>
                        <div className='barangayNotifTabs'>
                           <button
                              className={`barangayNotifTab ${filter === 'all' ? 'barangayNotifTabActive' : ''}`}
                              onClick={() => setFilter('all')}
                           >
                              All
                              <span className='barangayNotifTabCount'>{items.length}</span>
                           </button>

                           <button
                              className={`barangayNotifTab ${filter === 'unread' ? 'barangayNotifTabActive' : ''}`}
                              onClick={() => setFilter('unread')}
                           >
                              Unread
                              <span className='barangayNotifTabCount'>{unreadCount}</span>
                           </button>
                        </div>

                        <div className='barangayNotifToolbarRight'>
                           <div className='barangayNotifSearchWrap'>
                              <span className='barangayNotifSearchIcon'>
                                 <NotifIcon type='search' size={15} />
                              </span>
                              <input
                                 type='text'
                                 className='barangayNotifSearch'
                                 placeholder='Search notifications'
                                 value={search}
                                 onChange={(e) => setSearch(e.target.value)}
                              />
                           </div>

                           <select
                              className='barangayNotifFilter'
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                           >
                              <option value='all'>All statuses</option>
                              <option value='Accepted by Maxima'>Accepted</option>
                              <option value='Training Started'>Enrolled</option>
                              <option value='Completed'>Completed</option>
                              <option value='Rejected'>Rejected</option>
                              <option value='Dropped'>Dropped</option>
                           </select>
                        </div>
                     </div>

                     {error && (
                        <div className='barangayNotifError'>{error}</div>
                     )}

                     {/* Loading skeleton */}
                     {loading && (
                        <div className='barangayNotifSkeletonList'>
                           {[1, 2, 3, 4].map((n) => (
                              <div key={n} className='barangayNotifSkeletonRow'>
                                 <span className='barangayNotifSkeletonCircle' />
                                 <div className='barangayNotifSkeletonLines'>
                                    <span className='barangayNotifSkeletonLine barangayNotifSkeletonShort' />
                                    <span className='barangayNotifSkeletonLine' />
                                 </div>
                              </div>
                           ))}
                        </div>
                     )}

                     {/* Empty state */}
                     {!loading && !error && visible.length === 0 && (
                        <div className='barangayNotifEmpty'>
                           <div className='barangayNotifEmptyIcon'>
                              <NotifIcon type='bell' size={26} />
                           </div>
                           <div className='barangayNotifEmptyTitle'>
                              {hasFilters ? 'No matching notifications' : 'No notifications yet'}
                           </div>
                           <div>
                              {hasFilters
                                 ? 'Try a different search or filter.'
                                 : 'Updates on your referrals will show up here.'}
                           </div>

                           {hasFilters && (
                              <button
                                 className='barangayNotifGhostBtn barangayNotifEmptyBtn'
                                 onClick={clearFilters}
                              >
                                 Clear filters
                              </button>
                           )}
                        </div>
                     )}

                     {/* Notification list */}
                     {!loading && visible.length > 0 && (
                        <div className='barangayNotifListWrap'>
                           {groups.map((group) => (
                              <div key={group.label}>
                                 <div className='barangayNotifGroupLabel'>{group.label}</div>

                                 <ul className='barangayNotifList'>
                                    {group.items.map((n) => {
                                       const meta = STATUS_META[n.data?.status] || DEFAULT_META;
                                       const isUnread = !n.read_at;

                                       return (
                                          <li
                                             key={n.id}
                                             className={`barangayNotifItem ${meta.className} ${isUnread ? 'barangayNotifUnread' : ''}`}
                                             onClick={() => openNotif(n)}
                                             onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                   e.preventDefault();
                                                   openNotif(n);
                                                }
                                             }}
                                             tabIndex={0}
                                             role='button'
                                          >
                                             <div className='barangayNotifIcon'>
                                                <NotifIcon type={meta.icon} />
                                             </div>

                                             <div className='barangayNotifText'>
                                                <div className='barangayNotifItemTop'>
                                                   <span className='barangayNotifItemTitle'>
                                                      {n.data?.title}
                                                   </span>
                                                   <span className='barangayNotifBadge'>
                                                      {meta.label}
                                                   </span>
                                                </div>

                                                <div className='barangayNotifItemMessage'>
                                                   {n.data?.message}
                                                </div>

                                                <div className='barangayNotifItemTime'>
                                                   {timeAgo(n.created_at)}
                                                </div>
                                             </div>

                                             {isUnread && <span className='barangayNotifDot' />}

                                             <span className='barangayNotifChevron'>
                                                <NotifIcon type='chevron-right' size={18} />
                                             </span>
                                          </li>
                                       );
                                    })}
                                 </ul>
                              </div>
                           ))}

                           {nextPage && (
                              <div className='barangayNotifLoadMore'>
                                 <button
                                    className='barangayNotifGhostBtn'
                                    onClick={loadMore}
                                    disabled={loadingMore}
                                 >
                                    {loadingMore ? 'Loading...' : 'Load older notifications'}
                                 </button>
                              </div>
                           )}
                        </div>
                     )}

                  </div>

               </div>
            </div>

            {/* Detail modal */}
            {selected && (
               <div
                  className='barangayNotifOverlay'
                  onClick={(e) => {
                     if (e.target === e.currentTarget) {
                        closeModal();
                     }
                  }}
               >
                  <div
                     className={`barangayNotifModal ${selectedMeta.className}`}
                     role='dialog'
                     aria-modal='true'
                  >

                     {/* Header */}
                     <div className='barangayNotifModalHeader'>
                        <div className='barangayNotifModalIdentity'>
                           <div className='barangayNotifIcon barangayNotifIconLarge'>
                              <NotifIcon type={selectedMeta.icon} size={24} />
                           </div>

                           <div>
                              <h2 className='barangayNotifModalName'>{selected.data?.title}</h2>
                              <div className='barangayNotifModalMeta'>
                                 <span className='barangayNotifBadge'>{selectedMeta.label}</span>
                                 <span className='barangayNotifMuted'>
                                    {formatDateTime(selected.created_at)}
                                 </span>
                              </div>
                           </div>
                        </div>

                        <button
                           className='barangayNotifModalClose'
                           onClick={closeModal}
                           aria-label='Close'
                        >
                           ×
                        </button>
                     </div>

                     {/* Body */}
                     <div className='barangayNotifModalBody'>

                        <div className='barangayNotifSection'>
                           <div className='barangayNotifMessageBox'>
                              {selected.data?.message}
                           </div>
                        </div>

                        {detailLoading && (
                           <div className='barangayNotifModalState'>
                              Loading referral details...
                           </div>
                        )}

                        {detailError && (
                           <div className='barangayNotifError barangayNotifModalError'>
                              {detailError}
                           </div>
                        )}

                        {referral && (
                           <>
                              {/* OSY and referral */}
                              <div className='barangayNotifSection'>
                                 <h3 className='barangayNotifSectionTitle'>Referral</h3>

                                 <div className='barangayNotifPerson'>
                                    <span className='barangayNotifAvatar'>
                                       {initials(referral.osy_profile)}
                                    </span>
                                    <div>
                                       <div className='barangayNotifPersonName'>
                                          {fullName(referral.osy_profile)}
                                       </div>
                                       <div className='barangayNotifMuted'>
                                          Referred to {programName || 'a training program'}
                                       </div>
                                    </div>
                                 </div>

                                 <div className='barangayNotifDetailGrid'>
                                    <DetailItem label='Training program' value={programName} />
                                    <DetailItem label='Current status' value={referral.status} />
                                    <DetailItem label='Referred on' value={formatDate(referral.created_at)} />
                                    <DetailItem label='Reviewed by' value={referral.reviewer?.name} />
                                    {programDetails.map(([label, value]) => (
                                       <DetailItem key={label} label={label} value={value} />
                                    ))}
                                 </div>
                              </div>

                              {/* Training */}
                              {hasTrainingInfo && (
                                 <div className='barangayNotifSection'>
                                    <h3 className='barangayNotifSectionTitle'>Training</h3>

                                    <div className='barangayNotifDetailGrid'>
                                       <DetailItem label='Start date' value={formatDate(referral.training_start_date)} />
                                       <DetailItem label='Expected end date' value={formatDate(referral.expected_end_date)} />
                                       <DetailItem label='End date' value={formatDate(referral.training_end_date)} />
                                       <DetailItem label='Batch' value={referral.batch_name} />
                                       <DetailItem label='Venue' value={referral.venue} />
                                       <DetailItem label='Trainer' value={referral.trainer_name} />
                                    </div>
                                 </div>
                              )}

                              {/* Outcome and remarks */}
                              {hasOutcome && (
                                 <div className='barangayNotifSection'>
                                    <h3 className='barangayNotifSectionTitle'>Outcome</h3>

                                    <div className='barangayNotifDetailGrid'>
                                       <DetailItem
                                          label='Drop reason'
                                          value={DROP_REASONS[referral.drop_reason] || referral.drop_reason}
                                       />
                                       <DetailItem
                                          label='After training'
                                          value={AFTER_TRAINING[referral.after_training_status] || referral.after_training_status}
                                       />
                                       <DetailItem label='Note' value={referral.after_training_note} wide />
                                       <DetailItem label='Remarks' value={referral.outcome_remarks} wide />
                                       {referral.status === 'Rejected' && (
                                          <DetailItem label='Rejection reason' value={referral.remarks} wide />
                                       )}
                                    </div>
                                 </div>
                              )}

                              {/* Timeline */}
                              {history.length > 0 && (
                                 <div className='barangayNotifSection'>
                                    <h3 className='barangayNotifSectionTitle'>Status history</h3>

                                    <ul className='barangayNotifTimeline'>
                                       {history.map((h, index) => (
                                          <li key={`${h.status}-${index}`} className='barangayNotifTimelineItem'>
                                             <span className='barangayNotifTimelineDot' />

                                             <div className='barangayNotifTimelineContent'>
                                                <span className='barangayNotifTimelineStatus'>{h.status}</span>
                                                <span className='barangayNotifTimelineMeta'>
                                                   {formatDateTime(h.created_at)}
                                                   {h.changed_by ? ` · ${h.changed_by}` : ''}
                                                </span>
                                                {h.remarks && (
                                                   <span className='barangayNotifTimelineRemarks'>{h.remarks}</span>
                                                )}
                                             </div>
                                          </li>
                                       ))}
                                    </ul>
                                 </div>
                              )}
                           </>
                        )}

                     </div>

                     {/* Footer */}
                     <div className='barangayNotifModalFooter'>
                        <div className='barangayNotifModalNav'>
                           <button
                              className='barangayNotifGhostBtn'
                              onClick={() => previousItem && openNotif(previousItem)}
                              disabled={!previousItem}
                           >
                              <NotifIcon type='chevron-left' size={15} />
                              Newer
                           </button>

                           <button
                              className='barangayNotifGhostBtn'
                              onClick={() => nextItem && openNotif(nextItem)}
                              disabled={!nextItem}
                           >
                              Older
                              <NotifIcon type='chevron-right' size={15} />
                           </button>
                        </div>

                        <button className='barangayNotifPrimaryBtn' onClick={closeModal}>
                           Close
                        </button>
                     </div>

                  </div>
               </div>
            )}

         </div>
      </>
   );
}

export default BarangayNotifications;