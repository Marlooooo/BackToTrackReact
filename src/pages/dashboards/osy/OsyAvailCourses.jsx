   import { useEffect, useMemo, useState } from 'react';
   import OsySideBar from '../../../components/osySideBar';
   import "./OsyAvailCourses.css"

   function IconSearch() {
   return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
         <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
         <path d="M20 20L16.5 16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
   );
   }

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
         setCourses(list);
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

               <div className='osyAvailCoursesBrowseTop'>
                  <h1>Browse Courses</h1>
               </div>
               
               <div className="osyCoursesSearchWrap">
               <IconSearch />
               <input
                  type="text"
                  className="osyCoursesSearchInput"
                  placeholder="Search Courses"
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
                     <div className="osyCourseCard__imageWrap">
                        {course.image_url ? (
                           <img src={course.image_url} alt={course.name} />
                        ) : (
                           <div className="osyCourseCard__imagePlaceholder">
                           <span>COURSES</span>
                           </div>
                        )}
                     </div>

                     <div className="osyCourseCard__body">
                        <h3>{course.name}</h3>

                        <div className="osyCourseField">
                           <span className="osyCourseFieldLabel">Schedule</span>
                           <span className="osyCourseFieldValue">{course.schedule || 'To be announced'}</span>
                        </div>

                        <div className="osyCourseField">
                           <span className="osyCourseFieldLabel">Training Center</span>
                           <span className="osyCourseFieldValue">Maxima Training Center</span>
                        </div>

                        <span className={`osyCourseStatus ${course.status === 'active' ? 'osyCourseStatusActive' : 'osyCourseStatusInactive'}`}>
                           {course.status === 'active' ? 'Active' : 'Inactive'}
                        </span>

                        <button
                           className="osyCourseViewBtn"
                           onClick={() => setViewTarget(course)}
                        >
                           View Details
                        </button>
                     </div>
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
               {viewTarget.image_url && (
               <div className="osyCoursesModal__image">
                  <img src={viewTarget.image_url} alt={viewTarget.name} />
               </div>
               )}

               <div className="osyCoursesModal__header">
               <h2>{viewTarget.name}</h2>
               {viewTarget.tesda_accredited && (
                  <span className="osyCourseTagAccredited">TESDA Accredited</span>
               )}
               </div>

               <dl className="osyCoursesDetailList">
               <div>
                  <dt>Schedule</dt>
                  <dd>{viewTarget.schedule || 'To be announced'}</dd>
               </div>
               <div>
                  <dt>Training Center</dt>
                  <dd>Maxima Training Center</dd>
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
