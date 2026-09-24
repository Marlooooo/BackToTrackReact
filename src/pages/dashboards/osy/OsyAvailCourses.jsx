   import { useEffect, useMemo, useState } from 'react';
   import OsySideBar from '../../../components/osySideBar';
   import "./OsyAvailCourses.css"

   function OsyAvailCourses() {
   const [courses, setCourses] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);
   const [search, setSearch] = useState('');
   const [viewTarget, setViewTarget] = useState(null);

   useEffect(() => {
      fetchCourses();
   }, []);

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
         const list = data.data ?? data;
         setCourses(list.filter((c) => c.status === 'active'));
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   }

   const visibleCourses = useMemo(() => {
      const term = search.trim().toLowerCase();
      if (!term) return courses;
      return courses.filter((c) => c.name?.toLowerCase().includes(term));
   }, [courses, search]);

   return (
      <>
         <div className='osyAvailCoursesBody'>

         <OsySideBar/>

         <div className='osyAvailCoursesBrowse'>
            <div className='osyAvailCoursesTop'>
               <div className="osyCoursesHeading">
               <h1>Available Courses</h1>
               <p>Browse the training programs currently open for referral.</p>
               </div>

               <div className="osyCoursesSearchWrap">
               <input
                  type="text"
                  className="osyCoursesSearchInput"
                  placeholder="Search courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
               />
               </div>
            </div>

            <div className='osyAvailCoursesBot'>
               {error && <div className="osyCoursesBanner osyCoursesBannerError">{error}</div>}

               {loading ? (
               <div className="osyCoursesEmpty">Loading courses…</div>
               ) : visibleCourses.length === 0 ? (
               <div className="osyCoursesEmpty">
                  <p>No courses found.</p>
                  <span>Try a different keyword, or check back later for new programs.</span>
               </div>
               ) : (
               <div className="osyCoursesGrid">
                  {visibleCourses.map((course) => (
                     <div className="osyCourseCard" key={course.id}>
                     <div className="osyCourseCard__top">
                        <h3>{course.name}</h3>
                        {course.tesda_accredited && (
                           <span className="osyCourseTag osyCourseTagAccredited">TESDA Accredited</span>
                        )}
                     </div>

                     {course.description && (
                        <p className="osyCourseCard__desc">{course.description}</p>
                     )}

                     <div className="osyCourseCard__meta">
                        <div>
                           <span className="osyCourseMetaLabel">Schedule</span>
                           <span>{course.schedule || 'To be announced'}</span>
                        </div>
                        <div>
                           <span className="osyCourseMetaLabel">Slots</span>
                           <span>{course.slots}</span>
                        </div>
                     </div>

                     <button
                        className="osyCourseViewBtn"
                        onClick={() => setViewTarget(course)}
                     >
                        View details
                     </button>
                     </div>
                  ))}
               </div>
               )}
            </div>
         </div>

         </div>

         {viewTarget && (
         <div className="osyCoursesModalOverlay" onClick={() => setViewTarget(null)}>
            <div className="osyCoursesModal" onClick={(e) => e.stopPropagation()}>
               <div className="osyCoursesModal__header">
               <h2>{viewTarget.name}</h2>
               {viewTarget.tesda_accredited && (
                  <span className="osyCourseTag osyCourseTagAccredited">TESDA Accredited</span>
               )}
               </div>

               <dl className="osyCoursesDetailList">
               <div>
                  <dt>Schedule</dt>
                  <dd>{viewTarget.schedule || 'To be announced'}</dd>
               </div>
               <div>
                  <dt>Slots available</dt>
                  <dd>{viewTarget.slots}</dd>
               </div>
               <div>
                  <dt>Description</dt>
                  <dd>{viewTarget.description || '—'}</dd>
               </div>
               <div>
                  <dt>Requirements</dt>
                  <dd>{viewTarget.requirements || '—'}</dd>
               </div>
               </dl>

               <div className="osyCoursesModal__actions">
               <button className="osyCoursesBtnGhost" onClick={() => setViewTarget(null)}>
                  Close
               </button>
               </div>
            </div>
         </div>
         )}
      </>
   );
   }

   export default OsyAvailCourses;
