import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
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

function IconBookmark({ filled }) {
   return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} aria-hidden="true">
         <path d="M6 4h12v17l-6-4-6 4V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      </svg>
   );
}

function IconClock() {
   return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
         <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
         <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
   );
}

function IconGrid() {
   return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
         <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
         <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
         <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
         <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2" />
      </svg>
   );
}

function IconList() {
   return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
         <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
   );
}

function readStore(key, fallback) {
   try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
   } catch {
      return fallback;
   }
}

function parseList(text) {
   if (!text) return [];
   return text
      .split(/\r?\n|;|,/)
      .map((s) => s.replace(/^[-•*\d.)\s]+/, '').trim())
      .filter(Boolean);
}

function slotInfo(course) {
   const slots = Number(course.slots_left ?? 0);
   if (course.status !== 'active') return { label: 'Not open', tone: 'closed', slots };
   if (slots <= 0) return { label: 'Full', tone: 'closed', slots };
   if (slots <= 5) return { label: `Only ${slots} slot${slots > 1 ? 's' : ''} left`, tone: 'low', slots };
   return { label: `${slots} slots left`, tone: 'ok', slots };
}

const FILTERS = [
   { id: 'all', label: 'All' },
   { id: 'open', label: 'Open for enrollment' },
   { id: 'tesda', label: 'TESDA accredited' },
   { id: 'saved', label: 'Saved' },
];

const PATH_STEPS = [
   { title: 'Save a course', text: 'Bookmark the courses you are interested in.' },
   { title: 'Prepare requirements', text: 'Check off the documents you already have.' },
   { title: 'Talk to your SK official', text: 'Tell them which course you want to take.' },
   { title: 'Get referred', text: 'They refer you to Maxima, who reviews it and replies.' },
];

function OsyAvailCourses() {
   const [searchParams, setSearchParams] = useSearchParams();
   const [courses, setCourses] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [search, setSearch] = useState('');
   const [filter, setFilter] = useState('all');
   const [sort, setSort] = useState('name');
   const [layout, setLayout] = useState('grid');
   const [showPath, setShowPath] = useState(true);
   const [viewTarget, setViewTarget] = useState(null);
   const [tab, setTab] = useState('about');
   const [copied, setCopied] = useState(false);
   const [highlightId, setHighlightId] = useState(null);
   const [courseNotFound, setCourseNotFound] = useState(false);
   const [savedIds, setSavedIds] = useState(() => readStore('osySavedCourses', []));
   const [readyMap, setReadyMap] = useState(() => readStore('osyReadyRequirements', {}));

   // Course id from a recommendation link, for example /osy/courses?course=12
   const targetId = Number(searchParams.get('course')) || null;

   useEffect(() => {
      fetchCourses();
   }, []);

   useEffect(() => {
      if (!viewTarget) return;
      const onKey = (e) => e.key === 'Escape' && closeDrawer();
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
   }, [viewTarget]);

   // Opened from a recommendation: show that exact course
   useEffect(() => {
      if (!targetId || loading || error) return;

      const course = courses.find((c) => Number(c.id) === targetId);

      if (!course) {
         setCourseNotFound(true);
         return;
      }

      setCourseNotFound(false);
      openDrawer(course);
      setHighlightId(course.id);

      // Bring the card into view behind the drawer, so it is easy to find after closing
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.getElementById(`osyCourse-${course.id}`)?.scrollIntoView({
         behavior: reduceMotion ? 'auto' : 'smooth',
         block: 'center',
      });
   }, [targetId, courses, loading, error]);

   // The highlight fades a few seconds after the drawer is closed
   useEffect(() => {
      if (!highlightId || viewTarget) return;
      const timer = setTimeout(() => setHighlightId(null), 4000);
      return () => clearTimeout(timer);
   }, [highlightId, viewTarget]);

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

   /** Removes ?course= from the address so a refresh doesn't reopen the course. */
   function clearCourseParam() {
      if (!searchParams.has('course')) return;
      const next = new URLSearchParams(searchParams);
      next.delete('course');
      setSearchParams(next, { replace: true });
   }

   function openDrawer(course) {
      setTab('about');
      setCopied(false);
      setViewTarget(course);
   }

   function closeDrawer() {
      setViewTarget(null);
      clearCourseParam();
   }

   function dismissNotFound() {
      setCourseNotFound(false);
      clearCourseParam();
   }

   function toggleSaved(id) {
      setSavedIds((prev) => {
         const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
         localStorage.setItem('osySavedCourses', JSON.stringify(next));
         return next;
      });
   }

   function toggleReady(courseId, req) {
      setReadyMap((prev) => {
         const current = prev[courseId] || [];
         const nextList = current.includes(req) ? current.filter((r) => r !== req) : [...current, req];
         const next = { ...prev, [courseId]: nextList };
         localStorage.setItem('osyReadyRequirements', JSON.stringify(next));
         return next;
      });
   }

   function readyCount(course) {
      const reqs = parseList(course.requirements);
      const done = readyMap[course.id] || [];
      return { total: reqs.length, done: reqs.filter((r) => done.includes(r)).length };
   }

   async function copySummary() {
      const done = readyMap[viewTarget.id] || [];
      const have = requirements.filter((r) => done.includes(r));
      const need = requirements.filter((r) => !done.includes(r));
      const lines = [
         `Course: ${viewTarget.name}`,
         'Training center: Maxima Training Center',
         `Schedule: ${viewTarget.schedule || 'To be announced'}`,
         '',
      ];
      if (requirements.length > 0) {
         lines.push('Requirements I have:');
         lines.push(...(have.length > 0 ? have.map((r) => `- ${r}`) : ['- none yet']));
         lines.push('', 'Requirements I still need:');
         lines.push(...(need.length > 0 ? need.map((r) => `- ${r}`) : ['- none']));
         lines.push('');
      }
      lines.push('I would like to be referred to this course.');
      try {
         await navigator.clipboard.writeText(lines.join('\n'));
         setCopied(true);
         setTimeout(() => setCopied(false), 2000);
      } catch {
         setCopied(false);
      }
   }

   const visibleCourses = useMemo(() => {
      const term = search.trim().toLowerCase();
      let list = courses.filter((c) => {
         if (term && !c.name?.toLowerCase().includes(term)) return false;
         if (filter === 'open' && !(c.status === 'active' && Number(c.slots_left) > 0)) return false;
         if (filter === 'tesda' && !c.tesda_accredited) return false;
         if (filter === 'saved' && !savedIds.includes(c.id)) return false;
         return true;
      });
      list = [...list].sort((a, b) => {
         if (sort === 'slots') return Number(b.slots_left ?? 0) - Number(a.slots_left ?? 0);
         return (a.name ?? '').localeCompare(b.name ?? '');
      });
      return list;
   }, [courses, search, filter, sort, savedIds]);

   const openCount = courses.filter((c) => c.status === 'active' && Number(c.slots_left) > 0).length;
   const tesdaCount = courses.filter((c) => c.tesda_accredited).length;
   const savedCount = courses.filter((c) => savedIds.includes(c.id)).length;

   const info = viewTarget ? slotInfo(viewTarget) : null;
   const requirements = viewTarget ? parseList(viewTarget.requirements) : [];
   const viewReady = viewTarget ? readyCount(viewTarget) : { total: 0, done: 0 };
   const viewReadyPct = viewReady.total > 0 ? Math.round((viewReady.done / viewReady.total) * 100) : 0;

   return (
      <>
         <div className='osyAvailCoursesBody'>
            <OsySideBar />

            <div className='osyAvailCoursesBrowse'>
               <div className='osyAvailCoursesTop'>
                  <div className="osyCoursesHero">
                     <div className='osyAvailCoursesBrowseTop'>
                        <h1>Browse Courses</h1>
                        {!loading && !error && (
                           <p className="osyCoursesSubtitle">
                              {openCount} of {courses.length} courses are open for enrollment.
                           </p>
                        )}
                        <p className="osyCoursesHeroNote">
                           Save the courses you like and prepare the requirements. Then talk to your SK official to be referred to Maxima.
                        </p>
                     </div>

                     {!loading && !error && (
                        <div className="osyCoursesStats">
                           <div className="osyCoursesStat">
                              <strong>{openCount}</strong>
                              <span>Open now</span>
                           </div>
                           <div className="osyCoursesStat">
                              <strong>{tesdaCount}</strong>
                              <span>TESDA accredited</span>
                           </div>
                           <div className="osyCoursesStat">
                              <strong>{savedCount}</strong>
                              <span>Saved by you</span>
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="osyCoursesPath">
                     <div className="osyCoursesPath__head">
                        <h2>How enrollment works here</h2>
                        <button className="osyCoursesPath__toggle" onClick={() => setShowPath(!showPath)} aria-expanded={showPath}>
                           {showPath ? 'Hide' : 'Show'}
                        </button>
                     </div>
                     {showPath && (
                        <ol className="osyCoursesPath__steps">
                           {PATH_STEPS.map((s, i) => (
                              <li key={s.title}>
                                 <span className="osyCoursesPath__num">{i + 1}</span>
                                 <div>
                                    <strong>{s.title}</strong>
                                    <p>{s.text}</p>
                                 </div>
                              </li>
                           ))}
                        </ol>
                     )}
                  </div>
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
                           {f.id === 'saved' && savedCount > 0 && ` (${savedCount})`}
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

                  <div className="osyCoursesViewToggle" role="group" aria-label="Change layout">
                     <button
                        className={layout === 'grid' ? 'on' : ''}
                        aria-pressed={layout === 'grid'}
                        aria-label="Grid view"
                        onClick={() => setLayout('grid')}
                     >
                        <IconGrid />
                     </button>
                     <button
                        className={layout === 'list' ? 'on' : ''}
                        aria-pressed={layout === 'list'}
                        aria-label="List view"
                        onClick={() => setLayout('list')}
                     >
                        <IconList />
                     </button>
                  </div>
               </div>

               <div className='osyAvailCoursesBot'>
                  {error && (
                     <div className="osyCoursesBanner osyCoursesBannerError">
                        {error} <button className="osyCoursesRetry" onClick={fetchCourses}>Try again</button>
                     </div>
                  )}

                  {courseNotFound && (
                     <div className="osyCoursesBanner osyCoursesBannerInfo" role="status">
                        We couldn't find that course. Maxima may have closed or removed it, so here are all the courses you can browse.
                        <button className="osyCoursesRetry" onClick={dismissNotFound}>Dismiss</button>
                     </div>
                  )}

                  {loading ? (
                     <div className="osyCoursesGrid">
                        {[0, 1, 2, 3].map((i) => <div key={i} className="osyCourseCard osyCourseSkeleton" />)}
                     </div>
                  ) : visibleCourses.length === 0 ? (
                     <div className="osyCoursesEmpty">
                        <p>{filter === 'saved' && !search ? 'You have no saved courses yet.' : 'No courses match your search.'}</p>
                        <span>
                           {filter === 'saved' && !search
                              ? 'Tap the bookmark on a course to save it for later.'
                              : 'Try a different keyword or filter, or check back later for new programs.'}
                        </span>
                        {(search || filter !== 'all') && (
                           <button className="osyCoursesBtnGhost" onClick={() => { setSearch(''); setFilter('all'); }}>
                              Clear search and filters
                           </button>
                        )}
                     </div>
                  ) : (
                     <div className={`osyCoursesGrid ${layout === 'list' ? 'osyCoursesGrid--list' : ''}`}>
                        {visibleCourses.map((course) => {
                           const s = slotInfo(course);
                           const isSaved = savedIds.includes(course.id);
                           const ready = readyCount(course);
                           return (
                              <div
                                 id={`osyCourse-${course.id}`}
                                 className={`osyCourseCard ${s.tone === 'closed' ? 'osyCourseCard--closed' : ''} ${highlightId === course.id ? 'osyCourseCard--target' : ''}`}
                                 key={course.id}
                              >
                                 <div className="osyCourseCard__imageWrap">
                                    {course.image_url ? (
                                       <img src={course.image_url} alt="" />
                                    ) : (
                                       <div className="osyCourseCard__imagePlaceholder"><span>COURSES</span></div>
                                    )}
                                    {course.tesda_accredited && (
                                       <span className="osyCourseCard__badge">TESDA accredited</span>
                                    )}
                                    <button
                                       className="osyCourseCard__save"
                                       onClick={() => toggleSaved(course.id)}
                                       aria-pressed={isSaved}
                                       aria-label={isSaved ? 'Remove from saved' : 'Save course'}
                                    >
                                       <IconBookmark filled={isSaved} />
                                    </button>
                                 </div>

                                 <div className="osyCourseCard__body">
                                    <h3>{course.name}</h3>

                                    <div className="osyCourseMeta">
                                       <IconClock />
                                       <span>{course.schedule || 'To be announced'}</span>
                                    </div>

                                    <span className={`osyCourseSlots osyCourseSlots--${s.tone}`}>{s.label}</span>

                                    <div className="osyCourseCard__foot">
                                       {isSaved && ready.total > 0 ? (
                                          <div className="osyCourseReady">
                                             <div className="osyCourseReady__bar">
                                                <span style={{ width: `${Math.round((ready.done / ready.total) * 100)}%` }} />
                                             </div>
                                             <small>{ready.done} of {ready.total} requirements ready</small>
                                          </div>
                                       ) : (
                                          <span className="osyCourseFieldValue">Maxima Training Center</span>
                                       )}
                                       <button className="osyCourseViewBtn" onClick={() => openDrawer(course)}>
                                          View details
                                       </button>
                                    </div>
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
                        <div>
                           <span className="osyCourseFieldLabel">Availability</span>
                           <span className="osyCourseFieldValue">{info.label}</span>
                        </div>
                        <div>
                           <span className="osyCourseFieldLabel">Accreditation</span>
                           <span className="osyCourseFieldValue">{viewTarget.tesda_accredited ? 'TESDA accredited' : 'Not indicated'}</span>
                        </div>
                     </div>

                     <div className="osyDrawer__tabs" role="tablist">
                        <button role="tab" aria-selected={tab === 'about'}
                           className={tab === 'about' ? 'on' : ''} onClick={() => setTab('about')}>
                           About
                        </button>
                        <button role="tab" aria-selected={tab === 'req'}
                           className={tab === 'req' ? 'on' : ''} onClick={() => setTab('req')}>
                           Requirements{requirements.length > 0 && ` (${viewReady.done}/${requirements.length})`}
                        </button>
                        <button role="tab" aria-selected={tab === 'how'}
                           className={tab === 'how' ? 'on' : ''} onClick={() => setTab('how')}>
                           How to enroll
                        </button>
                     </div>

                     {tab === 'about' ? (
                        <p className="osyDrawer__text">
                           {viewTarget.description || 'No description has been added for this course yet.'}
                        </p>
                     ) : tab === 'how' ? (
                        <>
                           {info.tone === 'closed' && (
                              <div className="osyDrawer__notice">
                                 This course is not open right now. You can still save it and ask your SK official when it reopens.
                              </div>
                           )}
                           <p className="osyDrawer__hint">You don't enroll directly. Enrollment happens through a referral.</p>
                           <ol className="osyDrawer__steps">
                              <li>
                                 <span className="osyDrawer__stepNum">1</span>
                                 <div>
                                    <strong>Save this course</strong>
                                    <p>Keep it in your saved list so you remember what you're interested in.</p>
                                 </div>
                              </li>
                              <li>
                                 <span className="osyDrawer__stepNum">2</span>
                                 <div>
                                    <strong>Prepare your requirements</strong>
                                    <p>Use the Requirements tab to check off what you already have.</p>
                                 </div>
                              </li>
                              <li>
                                 <span className="osyDrawer__stepNum">3</span>
                                 <div>
                                    <strong>Talk to your SK official</strong>
                                    <p>Visit your barangay SK office and tell them you want to take {viewTarget.name}. You can copy a summary to show them.</p>
                                 </div>
                              </li>
                              <li>
                                 <span className="osyDrawer__stepNum">4</span>
                                 <div>
                                    <strong>Your SK official refers you</strong>
                                    <p>They submit a referral to Maxima Training Center on your behalf.</p>
                                 </div>
                              </li>
                              <li>
                                 <span className="osyDrawer__stepNum">5</span>
                                 <div>
                                    <strong>Wait for the decision</strong>
                                    <p>Maxima reviews the referral. You'll get a notification, and you can follow its status in Referral Tracking.</p>
                                 </div>
                              </li>
                           </ol>
                        </>
                     ) : requirements.length > 0 ? (
                        <>
                           <div className="osyDrawer__progress">
                              <div className="osyDrawer__progressBar">
                                 <span style={{ width: `${viewReadyPct}%` }} />
                              </div>
                              <small>{viewReady.done} of {viewReady.total} ready</small>
                           </div>
                           <p className="osyDrawer__hint">Check off the ones you already have before you talk to your SK official.</p>
                           <ul className="osyDrawer__checklist">
                              {requirements.map((r) => {
                                 const checked = (readyMap[viewTarget.id] || []).includes(r);
                                 return (
                                    <li key={r}>
                                       <label className={`osyDrawer__check ${checked ? 'osyDrawer__check--done' : ''}`}>
                                          <input
                                             type="checkbox"
                                             checked={checked}
                                             onChange={() => toggleReady(viewTarget.id, r)}
                                          />
                                          <span className="osyDrawer__box"><IconCheck /></span>
                                          <span>{r}</span>
                                       </label>
                                    </li>
                                 );
                              })}
                           </ul>
                        </>
                     ) : (
                        <p className="osyDrawer__text">No requirements listed. Ask the training center for details.</p>
                     )}
                  </div>

                  <div className="osyDrawer__actions">
                     <button className="osyCoursesBtnGhost" onClick={() => toggleSaved(viewTarget.id)}>
                        {savedIds.includes(viewTarget.id) ? 'Saved' : 'Save course'}
                     </button>
                     {tab === 'how' ? (
                        <button className="osyCoursesBtnPrimary" onClick={copySummary}>
                           {copied ? 'Copied' : 'Copy summary for SK official'}
                        </button>
                     ) : (
                        <button className="osyCoursesBtnPrimary" onClick={() => setTab('how')}>
                           How to enroll
                        </button>
                     )}
                  </div>
               </aside>
            </div>
         )}
      </>
   );
}

export default OsyAvailCourses;