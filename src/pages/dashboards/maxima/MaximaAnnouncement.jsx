import { useEffect, useMemo, useState } from 'react';
import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaAnnouncement.css';

function getCookie(name) {
   const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
   return match ? decodeURIComponent(match[2]) : null;
}

async function ensureCsrfCookie() {
   await fetch('/sanctum/csrf-cookie', { credentials: 'include' });
}

function formatDateTime(value) {
   if (!value) return '—';
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return '—';
   const day = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
   });
   const time = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
   });
   return `${day} · ${time}`;
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

const EMPTY_FORM = { title: '', content: '', training_program_id: '' };

function MaximaAnnouncement() {
   const [announcements, setAnnouncements] = useState([]);
   const [programs, setPrograms] = useState([]);
   const [form, setForm] = useState(EMPTY_FORM);
   const [editingId, setEditingId] = useState(null);
   const [showForm, setShowForm] = useState(false);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [deletingId, setDeletingId] = useState(null);
   const [error, setError] = useState(null);
   const [search, setSearch] = useState('');
   const [audienceFilter, setAudienceFilter] = useState('');

   useEffect(() => {
      fetchAnnouncements();
      fetchPrograms();
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

   async function fetchPrograms() {
      try {
         const res = await fetch('/api/training-programs', {
            headers: { Accept: 'application/json' },
            credentials: 'include',
         });
         if (!res.ok) return;
         const data = await res.json();
         setPrograms(Array.isArray(data) ? data : data.data ?? []);
      } catch {
         // dropdown simply stays empty
      }
   }

   function handleChange(e) {
      setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
   }

   function handleOpenNew() {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setError(null);
      setShowForm(true);
   }

   async function handleSubmit(e) {
      e.preventDefault();
      setSaving(true);
      setError(null);
      try {
         await ensureCsrfCookie();

         const url = editingId ? `/api/announcements/${editingId}` : '/api/announcements';
         const res = await fetch(url, {
            method: editingId ? 'PUT' : 'POST',
            credentials: 'include',
            headers: {
               Accept: 'application/json',
               'Content-Type': 'application/json',
               'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
            },
            body: JSON.stringify({
               ...form,
               training_program_id: form.training_program_id || null,
            }),
         });

         if (!res.ok) {
            const responseBody = await res.json().catch(() => null);
            throw new Error(responseBody?.message ?? 'Could not save the announcement.');
         }

         setForm(EMPTY_FORM);
         setEditingId(null);
         setShowForm(false);
         await fetchAnnouncements();
      } catch (err) {
         setError(err.message);
      } finally {
         setSaving(false);
      }
   }

   function handleEdit(a) {
      setEditingId(a.id);
      setForm({
         title: a.title,
         content: a.content,
         training_program_id: a.training_program_id ?? '',
      });
      setError(null);
      setShowForm(true);
   }

   function handleCancel() {
      setEditingId(null);
      setForm(EMPTY_FORM);
      setShowForm(false);
   }

   async function handleDelete(id) {
      if (!window.confirm('Delete this announcement?')) return;

      setDeletingId(id);
      setError(null);
      try {
         await ensureCsrfCookie();

         const res = await fetch(`/api/announcements/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: {
               Accept: 'application/json',
               'X-XSRF-TOKEN': getCookie('XSRF-TOKEN'),
            },
         });

         if (!res.ok) {
            const responseBody = await res.json().catch(() => null);
            throw new Error(responseBody?.message ?? 'Could not delete the announcement.');
         }

         if (editingId === id) handleCancel();
         await fetchAnnouncements();
      } catch (err) {
         setError(err.message);
      } finally {
         setDeletingId(null);
      }
   }

   const filtered = useMemo(() => {
      const q = search.trim().toLowerCase();
      return announcements.filter((a) => {
         if (audienceFilter === 'general' && a.training_program_id) return false;
         if (
            audienceFilter &&
            audienceFilter !== 'general' &&
            String(a.training_program_id) !== audienceFilter
         ) {
            return false;
         }
         if (!q) return true;
         return a.title?.toLowerCase().includes(q) || a.content?.toLowerCase().includes(q);
      });
   }, [announcements, search, audienceFilter]);

   const programCount = announcements.filter((a) => a.training_program_id).length;
   const generalCount = announcements.length - programCount;

   return (
      <div className="mAnn-layout">
         <MaximaSideBar />

         <main className="mAnn-main">
            {/* ---------- Page header ---------- */}
            <header className="mAnn-header">
               <div className="mAnn-headerLeft">
                  <div className="mAnn-titleIcon">
                     <span className="material-symbols-outlined">campaign</span>
                  </div>
                  <div>
                     <h1>Announcements</h1>
                     <p className="mAnn-sub">
                        Post important updates, news and reminders for other users.
                     </p>
                  </div>
               </div>

               <button type="button" className="mAnn-addBtn" onClick={handleOpenNew}>
                  <span className="material-symbols-outlined">add</span>
                  Add Announcement
               </button>
            </header>

            {/* ---------- Summary cards ---------- */}
            <section className="mAnn-stats">
               <div className="mAnn-stat">
                  <div className="mAnn-statIcon total">
                     <span className="material-symbols-outlined">forum</span>
                  </div>
                  <div>
                     <strong>{announcements.length}</strong>
                     <span>Total announcements</span>
                  </div>
               </div>
               <div className="mAnn-stat">
                  <div className="mAnn-statIcon general">
                     <span className="material-symbols-outlined">public</span>
                  </div>
                  <div>
                     <strong>{generalCount}</strong>
                     <span>General</span>
                  </div>
               </div>
               <div className="mAnn-stat">
                  <div className="mAnn-statIcon program">
                     <span className="material-symbols-outlined">school</span>
                  </div>
                  <div>
                     <strong>{programCount}</strong>
                     <span>Program-specific</span>
                  </div>
               </div>
            </section>

            {error && !showForm && <div className="mAnn-error">{error}</div>}

            {/* ---------- List card ---------- */}
            <section className="mAnn-panel">
               <div className="mAnn-toolbar">
                  <div className="mAnn-filters">
                     <div className="mAnn-searchBox">
                        <span className="material-symbols-outlined">search</span>
                        <input
                           className="mAnn-search"
                           type="text"
                           placeholder="Search announcements..."
                           value={search}
                           onChange={(e) => setSearch(e.target.value)}
                        />
                     </div>

                     <select
                        className="mAnn-select"
                        value={audienceFilter}
                        onChange={(e) => setAudienceFilter(e.target.value)}
                     >
                        <option value="">All users</option>
                        <option value="general">General</option>
                        {programs.map((p) => (
                           <option key={p.id} value={String(p.id)}>
                              {programName(p)}
                           </option>
                        ))}
                     </select>
                  </div>

                  <span className="mAnn-count">
                     {filtered.length} {filtered.length === 1 ? 'announcement' : 'announcements'}
                  </span>
               </div>

               <div className="mAnn-list">
                  {loading && (
                     <>
                        <div className="mAnn-skeleton" />
                        <div className="mAnn-skeleton" />
                        <div className="mAnn-skeleton" />
                     </>
                  )}

                  {!loading && filtered.length === 0 && (
                     <div className="mAnn-empty">
                        <div className="mAnn-emptyIcon">
                           <span className="material-symbols-outlined">campaign</span>
                        </div>
                        <strong>No announcements found</strong>
                        <p>
                           {announcements.length === 0
                              ? 'Post your first announcement to keep everyone updated.'
                              : 'Try a different search or filter.'}
                        </p>
                        {announcements.length === 0 && (
                           <button type="button" className="mAnn-addBtn" onClick={handleOpenNew}>
                              <span className="material-symbols-outlined">add</span>
                              Add Announcement
                           </button>
                        )}
                     </div>
                  )}

                  {filtered.map((a) => (
                     <article
                        key={a.id}
                        className={`mAnn-row ${a.training_program ? 'program' : ''}`}
                     >
                        <div className="mAnn-rowIcon">
                           <span className="material-symbols-outlined">
                              {a.training_program ? 'school' : 'info'}
                           </span>
                        </div>

                        <div className="mAnn-rowBody">
                           <div className="mAnn-rowTitle">
                              <h3>{a.title}</h3>
                              <span className={`mAnn-badge ${a.training_program ? 'program' : ''}`}>
                                 {a.training_program ? programName(a.training_program) : 'General'}
                              </span>
                           </div>

                           <p className="mAnn-content">{a.content}</p>

                           <div className="mAnn-meta">
                              <span className="mAnn-author">
                                 <span className="mAnn-avatar">{initials(a.author?.name)}</span>
                                 {a.author?.name ?? 'Maxima'}
                              </span>
                              <span className="mAnn-dot" />
                              <span className="mAnn-date">
                                 <span className="material-symbols-outlined">schedule</span>
                                 {formatDateTime(a.posted_at)}
                              </span>
                           </div>
                        </div>

                        <div className="mAnn-actions">
                           <button
                              type="button"
                              className="mAnn-iconBtn edit"
                              title="Edit"
                              onClick={() => handleEdit(a)}
                           >
                              <span className="material-symbols-outlined">edit_square</span>
                           </button>
                           <button
                              type="button"
                              className="mAnn-iconBtn delete"
                              title="Delete"
                              onClick={() => handleDelete(a.id)}
                              disabled={deletingId === a.id}
                           >
                              <span className="material-symbols-outlined">delete</span>
                           </button>
                        </div>
                     </article>
                  ))}
               </div>
            </section>

            {/* ---------- Popup form ---------- */}
            {showForm && (
               <div className="mAnn-overlay" onClick={handleCancel}>
                  <form
                     className="mAnn-composer"
                     onSubmit={handleSubmit}
                     onClick={(e) => e.stopPropagation()}
                  >
                     <div className="mAnn-composerHead">
                        <div>
                           <h2>{editingId ? 'Edit Announcement' : 'New Announcement'}</h2>
                           <p>
                              {editingId
                                 ? 'Update the details of this announcement.'
                                 : 'Share an update with your OSY users.'}
                           </p>
                        </div>
                        <button
                           type="button"
                           className="mAnn-close"
                           onClick={handleCancel}
                           aria-label="Close"
                        >
                           <span className="material-symbols-outlined">close</span>
                        </button>
                     </div>

                     {error && <div className="mAnn-error">{error}</div>}

                     <div className="mAnn-field">
                        <label htmlFor="title">Title</label>
                        <input
                           id="title"
                           type="text"
                           name="title"
                           placeholder="e.g. Enrollment schedule update"
                           value={form.title}
                           onChange={handleChange}
                           required
                        />
                     </div>

                     <div className="mAnn-field">
                        <label htmlFor="content">Message</label>
                        <textarea
                           id="content"
                           name="content"
                           placeholder="Write your announcement..."
                           rows="6"
                           value={form.content}
                           onChange={handleChange}
                           required
                        />
                     </div>

                     <div className="mAnn-field">
                        <label htmlFor="training_program_id">Audience</label>
                        <select
                           id="training_program_id"
                           name="training_program_id"
                           value={form.training_program_id}
                           onChange={handleChange}
                        >
                           <option value="">General (no specific program)</option>
                           {programs.map((p) => (
                              <option key={p.id} value={p.id}>
                                 {programName(p)}
                              </option>
                           ))}
                        </select>
                     </div>

                     <div className="mAnn-formButtons">
                        <button type="button" className="mAnn-cancel" onClick={handleCancel}>
                           Cancel
                        </button>
                        <button type="submit" className="mAnn-submit" disabled={saving}>
                           {saving
                              ? 'Saving...'
                              : editingId
                              ? 'Update Announcement'
                              : 'Post Announcement'}
                        </button>
                     </div>
                  </form>
               </div>
            )}
         </main>
      </div>
   );
}

export default MaximaAnnouncement;