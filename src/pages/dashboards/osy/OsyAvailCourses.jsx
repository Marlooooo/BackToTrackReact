   import { useEffect, useMemo, useState } from 'react';
   import OsySideBar from '../../../components/osySideBar';
   import "./OsyAvailCourses.css"

   function IconSearch() {
   return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
         <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
         <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
   );
   }

   function IconCheck() {
   return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
         <path d="M5 12.5L10 17.5L19 7.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
   );
   }

   function parseList(text) {
   if (!text) return [];
   return text
      .split(/\r?\n|;|,/)
      .map((s) => s.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(Boolean);
   }

   function slotInfo(course) {
   const slots = Number(course.slots ?? 0);
   if (course.status !== 'active') return { label: 'Not open', tone: 'closed', slots };
   if (slots <= 0) return { label: 'Full', tone: 'closed', slots };
   if (slots <= 5) return { label: `Only ${slots} slot${slots > 1 ? 's' : ''} left`, tone: 'low', slots };
   return { label: `${slots} slots left`, tone: 'ok', slots };
   }

   const FILTERS = [
   { id: 'all', label: 'All' },
   { id: 'open', label: 'Open for enrollment' },
   { id: 'tesda', label: 'TESDA accredited' },
   ];

   function OsyAvailCourses() {
   const [courses, setCourses] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [search, setSearch] = useState('');
   const [filter, setFilter] = useState('all');
   const [sort, setSort] = useState('name');
   const [viewTarget, setViewTarget] = useState(null);
   const [tab, setTab] = useState('about');

   useEffect(() => {
      fetchCourses();
   }, []);

   useEffect(() => {
      if (!viewTarget) return;
      const onKey = (e) => e.key === 'Escape' && closeDrawer();
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [viewTarget]);

   async function fetchCourses() {
      setLoading(true);
      setError(null);
      try {
         const res = await fetch('/api/training-programs', {
         headers: { Accept: 'application/json' },
         credentials: 'include',
         });
         if (!res.ok) throw new Error('Could not load available courses.');
         const data = await res.json();
         setCourses(data.data ?? data);
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   }

   function openDrawer(course) {
      setTab('about');
      setViewTarget(course);
   }
   function closeDrawer() {
      setViewTarget(null);
   }

   const visibleCourses = useMemo(() => {
      const term = search.trim().toLowerCase();
      let list = courses.filter((c) => {
         if (term && !c.name?.toLowerCase().includes(term)) return false;
         if (filter === 'open' && !(c.status === 'active' && Number(c.slots) > 0)) return false;
         if (filter === 'tesda' && !c.tesda_accredited) return false;
         return true;
      });
      list = [...list].sort((a, b) => {
         if (sort === 'slots') return Number(b.slots ?? 0) - Number(a.slots ?? 0);
         return (a.name ?? '').localeCompare(b.name ?? '');
      });
      return list;
   }, [courses, search, filter, sort]);

   const openCount = courses.filter((c) => c.status === 'active' && Number(c.slots) > 0).length;

   const info = viewTarget ? slotInfo(viewTarget) : null;
   const requirements = viewTarget ? parseList(viewTarget.requirements) : [];
   const canApply = viewTarget && info.tone !== 'closed';

   return (
      <>
         <div className='osyAvailCoursesBody'>
         <OsySideBar />

         <div className='osyAvailCoursesBrowse'>
            <div className='osyAvailCoursesTop'>
               <div className='osyAvailCoursesBrowseTop'>
               <h1>Browse Courses</h1>
               {!loading && !error && (
                  <p className="osyCoursesSubtitle">
                     {openCount} of {courses.length} courses are open for enrollment.
                  </p>
               )}
               </div>

               <div className="osyCoursesToolbar">
               <div className="osyCoursesSearchWrap">
                  <IconSearch />
                  <input
                     type="text"
                     className="osyCoursesSearchInput"
                     placeholder="Search courses"
                     aria-label="Search courses"
                     value={search}
                     onChange={(e) => setSearch(e.target.value)}
                  />
               </div>

               <div className="osyCoursesChips" role="group" aria-label="Filter courses">
                  {FILTERS.map((f) => (
                     <button
                     key={f.id}
                     className={`osyCoursesChip ${filter === f.id ? 'osyCoursesChipOn' : ''}`}
                     aria-pressed={filter === f.id}
                     onClick={() => setFilter(f.id)}
                     >
                     {f.label}
                     </button>
                  ))}
               </div>

               <select
                  className="osyCoursesSort"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="Sort courses"
               >
                  <option value="name">Sort: Name (A–Z)</option>
                  <option value="slots">Sort: Most slots left</option>
               </select>
               </div>
            </div>

            <div className='osyAvailCoursesBot'>
               {error && (
               <div className="osyCoursesBanner osyCoursesBannerError">
                  {error} <button className="osyCoursesRetry" onClick={fetchCourses}>Try again</button>
               </div>
               )}

               {loading ? (
               <div className="osyCoursesGrid">
                  {[0, 1, 2, 3].map((i) => <div key={i} className="osyCourseCard osyCourseSkeleton" />)}
               </div>
               ) : visibleCourses.length === 0 ? (
               <div className="osyCoursesEmpty">
                  <p>No courses match your search.</p>
                  <span>Try a different keyword or filter, or check back later for new programs.</span>
                  {(search || filter !== 'all') && (
                     <button className="osyCoursesBtnGhost" onClick={() => { setSearch(''); setFilter('all'); }}>
                     Clear search and filters
                     </button>
                  )}
               </div>
               ) : (
               <div className="osyCoursesGrid">
                  {visibleCourses.map((course) => {
                     const s = slotInfo(course);
                     return (
                     <div className="osyCourseCard" key={course.id}>
                        <div className="osyCourseCard__imageWrap">
                           {course.image_url ? (
                           <img src={course.image_url} alt="" />
                           ) : (
                           <div className="osyCourseCard__imagePlaceholder"><span>COURSES</span></div>
                           )}
                           {course.tesda_accredited && (
                           <span className="osyCourseCard__badge">TESDA accredited</span>
                           )}
                        </div>

                        <div className="osyCourseCard__body">
                           <h3>{course.name}</h3>

                           <div className="osyCourseField">
                           <span className="osyCourseFieldLabel">Schedule</span>
                           <span className="osyCourseFieldValue">{course.schedule || 'To be announced'}</span>
                           </div>

                           <div className="osyCourseField">
                           <span className="osyCourseFieldLabel">Training center</span>
                           <span className="osyCourseFieldValue">Maxima Training Center</span>
                           </div>

                           <span className={`osyCourseSlots osyCourseSlots--${s.tone}`}>{s.label}</span>

                           <button className="osyCourseViewBtn" onClick={() => openDrawer(course)}>
                           View details
                           </button>
                        </div>
                     </div>
                     );
                  })}
               </div>
               )}
            </div>
         </div>
         </div>

         {viewTarget && (
         <div className="osyDrawerOverlay" onClick={closeDrawer}>
            <aside
               className="osyDrawer"
               role="dialog"
               aria-modal="true"
               aria-label={viewTarget.name}
               onClick={(e) => e.stopPropagation()}
            >
               <div className="osyDrawer__hero">
               {viewTarget.image_url ? (
                  <img src={viewTarget.image_url} alt="" />
               ) : (
                  <div className="osyCourseCard__imagePlaceholder"><span>COURSES</span></div>
               )}
               <button className="osyDrawer__close" onClick={closeDrawer} aria-label="Close details">×</button>
               </div>

               <div className="osyDrawer__scroll">
               <div className="osyDrawer__head">
                  <div className="osyDrawer__tags">
                     {viewTarget.tesda_accredited && <span className="osyCourseTagAccredited">TESDA accredited</span>}
                     <span className={`osyCourseSlots osyCourseSlots--${info.tone}`}>{info.label}</span>
                  </div>
                  <h2>{viewTarget.name}</h2>
               </div>

               <div className="osyDrawer__facts">
                  <div>
                     <span className="osyCourseFieldLabel">Schedule</span>
                     <span className="osyCourseFieldValue">{viewTarget.schedule || 'To be announced'}</span>
                  </div>
                  <div>
                     <span className="osyCourseFieldLabel">Training center</span>
                     <span className="osyCourseFieldValue">Maxima Training Center</span>
                  </div>
               </div>

               <div className="osyDrawer__tabs" role="tablist">
                  <button role="tab" aria-selected={tab === 'about'}
                     className={tab === 'about' ? 'on' : ''} onClick={() => setTab('about')}>
                     About
                  </button>
                  <button role="tab" aria-selected={tab === 'req'}
                     className={tab === 'req' ? 'on' : ''} onClick={() => setTab('req')}>
                     Requirements{requirements.length > 0 && ` (${requirements.length})`}
                  </button>
               </div>

               {tab === 'about' ? (
                  <p className="osyDrawer__text">
                     {viewTarget.description || 'No description has been added for this course yet.'}
                  </p>
               ) : requirements.length > 0 ? (
                  <>
                     <p className="osyDrawer__hint">Prepare these before you apply.</p>
                     <ul className="osyDrawer__checklist">
                     {requirements.map((r, i) => (
                        <li key={i}><span className="osyDrawer__tick"><IconCheck /></span>{r}</li>
                     ))}
                     </ul>
                  </>
               ) : (
                  <p className="osyDrawer__text">No requirements listed. Ask the training center for details.</p>
               )}
               </div>

               <div className="osyDrawer__actions">
               <button className="osyCoursesBtnGhost" onClick={closeDrawer}>Close</button>
               <button
                  className="osyCoursesBtnPrimary"
                  disabled={!canApply}
                  onClick={() => {
                  }}
               >
                  {canApply ? 'Apply for this course' : info.label}
               </button>
               </div>
            </aside>
         </div>
         )}
      </>
   );
   }

   export default OsyAvailCourses;
