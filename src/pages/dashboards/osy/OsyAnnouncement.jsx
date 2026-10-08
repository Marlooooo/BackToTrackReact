import { useEffect, useMemo, useState } from 'react';
import OsySideBar from '../../../components/osySideBar';
import './OsyAnnouncement.css';

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

function isRecent(value) {
   if (!value) return false;
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return false;
   return Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000;
}

function programName(p) {
   return p?.title ?? p?.name ?? `Program #${p?.id}`;
}

function initials(name) {
   return (
      (name ?? 'Maxima')
         .split(' ')
         .filter(Boolean)
         .slice(0, 2)
         .map((w) => w[0])
         .join('')
         .toUpperCase() || 'M'
   );
}

function OsyAnnouncement() {
   const [announcements, setAnnouncements] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [search, setSearch] = useState('');
   const [filter, setFilter] = useState('all');

   useEffect(() => {
      fetchAnnouncements();
   }, []);

   async function fetchAnnouncements() {
      setError(null);
      try {
         const res = await fetch('/api/announcements', {
            headers: { Accept: 'application/json' },
            credentials: 'include',
         });
         if (!res.ok) throw new Error('Could not load announcements.');
         setAnnouncements(await res.json());
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   }

   const filtered = useMemo(() => {
      const q = search.trim().toLowerCase();
      return announcements.filter((a) => {
         if (filter === 'general' && a.training_program_id) return false;
         if (filter === 'program' && !a.training_program_id) return false;
         if (!q) return true;
         return a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q);
      });
   }, [announcements, search, filter]);

   const programCount = announcements.filter((a) => a.training_program_id).length;
   const generalCount = announcements.length - programCount;

   const tabs = [
      { key: 'all', label: 'All', count: announcements.length },
      { key: 'general', label: 'General', count: generalCount },
      { key: 'program', label: 'Program-specific', count: programCount },
   ];

   return (
      <div className="oAnn-layout">
         <OsySideBar />

         <main className="oAnn-main">
            {/* ---------- Page header ---------- */}
            <header className="oAnn-header">
               <div className="oAnn-titleIcon">
                  <i className="las la-bullhorn"></i>
               </div>
               <div>
                  <h1>Announcements</h1>
                  <p className="oAnn-sub">Latest updates, news and reminders from Maxima.</p>
               </div>
            </header>

            {/* ---------- Summary cards ---------- */}
            <section className="oAnn-stats">
               <div className="oAnn-stat">
                  <div className="oAnn-statIcon total">
                     <i className="las la-comment-dots"></i>
                  </div>
                  <div>
                     <strong>{announcements.length}</strong>
                     <span>Total announcements</span>
                  </div>
               </div>
               <div className="oAnn-stat">
                  <div className="oAnn-statIcon general">
                     <i className="las la-globe"></i>
                  </div>
                  <div>
                     <strong>{generalCount}</strong>
                     <span>General</span>
                  </div>
               </div>
               <div className="oAnn-stat">
                  <div className="oAnn-statIcon program">
                     <i className="las la-graduation-cap"></i>
                  </div>
                  <div>
                     <strong>{programCount}</strong>
                     <span>Program-specific</span>
                  </div>
               </div>
            </section>

            {error && <div className="oAnn-error">{error}</div>}

            {/* ---------- List card ---------- */}
            <section className="oAnn-panel">
               <div className="oAnn-toolbar">
                  <div className="oAnn-tabs">
                     {tabs.map((t) => (
                        <button
                           key={t.key}
                           type="button"
                           className={`oAnn-tab ${filter === t.key ? 'active' : ''}`}
                           onClick={() => setFilter(t.key)}
                        >
                           {t.label}
                           <span className="oAnn-tabCount">{t.count}</span>
                        </button>
                     ))}
                  </div>

                  <div className="oAnn-searchBox">
                     <i className="las la-search"></i>
                     <input
                        type="text"
                        placeholder="Search announcements..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                     />
                  </div>
               </div>

               <div className="oAnn-list">
                  {loading && (
                     <>
                        <div className="oAnn-skeleton" />
                        <div className="oAnn-skeleton" />
                        <div className="oAnn-skeleton" />
                     </>
                  )}

                  {!loading && !error && filtered.length === 0 && (
                     <div className="oAnn-empty">
                        <div className="oAnn-emptyIcon">
                           <i className="las la-bullhorn"></i>
                        </div>
                        <strong>No announcements found</strong>
                        <p>
                           {announcements.length === 0
                              ? 'Check back later for updates from Maxima.'
                              : 'Try a different search or filter.'}
                        </p>
                     </div>
                  )}

                  {filtered.map((a) => (
                     <article
                        key={a.id}
                        className={`oAnn-row ${a.training_program ? 'program' : ''}`}
                     >
                        <div className="oAnn-rowIcon">
                           <i
                              className={`las ${
                                 a.training_program ? 'la-graduation-cap' : 'la-info-circle'
                              }`}
                           ></i>
                        </div>

                        <div className="oAnn-rowBody">
                           <div className="oAnn-rowTitle">
                              <h3>{a.title}</h3>
                              <span className={`oAnn-badge ${a.training_program ? 'program' : ''}`}>
                                 {a.training_program ? programName(a.training_program) : 'General'}
                              </span>
                              {isRecent(a.posted_at) && <span className="oAnn-new">New</span>}
                           </div>

                           <p className="oAnn-content">{a.content}</p>

                           <div className="oAnn-meta">
                              <span className="oAnn-author">
                                 <span className="oAnn-avatar">{initials(a.author?.name)}</span>
                                 {a.author?.name ?? 'Maxima'}
                              </span>
                              <span className="oAnn-dot" />
                              <span className="oAnn-date">
                                 <i className="las la-clock"></i>
                                 {formatDateTime(a.posted_at)}
                              </span>
                           </div>
                        </div>
                     </article>
                  ))}
               </div>
            </section>
         </main>
      </div>
   );
}

export default OsyAnnouncement;