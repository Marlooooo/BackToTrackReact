import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import BarangaySideBar from '../../../components/skOfficialSideBar';
import './BarangayCourseRecommendation.css';

/* -------------------------------------------------------------------------- */
/* API helper                                                                 */
/* -------------------------------------------------------------------------- */

const RECOMMENDATIONS_ENDPOINT = '/api/osy-recommendations';

// Same cookie-based Sanctum auth as BarangayOsyManagement (GET needs no CSRF header)
async function fetchRecommendations() {
   let res;
   try {
      res = await fetch(RECOMMENDATIONS_ENDPOINT, {
         credentials: 'include',
         headers: { Accept: 'application/json' },
      });
   } catch {
      throw new Error('Could not reach the server. Check your internet connection and try again.');
   }

   const body = await res.json().catch(() => null);

   if (!res.ok) {
      if (res.status === 401 || res.status === 419) {
         throw new Error('Your session has expired. Refresh the page and sign in again.');
      }
      if (res.status === 403) {
         throw new Error('You do not have permission to view recommendations.');
      }
      throw new Error(body?.message ?? `Request failed (${res.status})`);
   }

   return body.data ?? [];
}

/* -------------------------------------------------------------------------- */
/* Constants + pure helpers                                                   */
/* -------------------------------------------------------------------------- */

const TABS = [
   { key: 'all', label: 'All OSY' },
   { key: 'with', label: 'With courses' },
   { key: 'none', label: 'No courses yet' },
];

const MAX_PILLS = 3;

function initialsOf(name) {
   return (
      String(name ?? '')
         .split(/\s+/)
         .filter(Boolean)
         .slice(0, 2)
         .map((w) => w[0])
         .join('')
         .toUpperCase() || '?'
   );
}

function formatDate(value) {
   if (!value) return null;
   const d = new Date(value);
   if (Number.isNaN(d.getTime())) return null;
   return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Maps an OSY status onto one of the badge colors. */
function statusTone(status) {
   switch (status) {
      case 'Referred':
      case 'Accepted by Maxima':
         return 'Accepted';
      case 'Training Started':
         return 'Ongoing';
      case 'Completed':
         return 'Completed';
      case 'Rejected':
      case 'Dropped':
         return 'Rejected';
      default:
         return 'Neutral';
   }
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function Svg({ size = 18, children }) {
   return (
      <svg
         width={size}
         height={size}
         viewBox="0 0 24 24"
         fill="none"
         stroke="currentColor"
         strokeWidth="2"
         strokeLinecap="round"
         strokeLinejoin="round"
         aria-hidden="true"
      >
         {children}
      </svg>
   );
}

const SearchIcon = () => (
   <Svg size={16}>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
   </Svg>
);

const RefreshIcon = () => (
   <Svg size={16}>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <polyline points="21 3 21 9 15 9" />
   </Svg>
);

const ChevronIcon = () => (
   <Svg size={18}>
      <polyline points="9 18 15 12 9 6" />
   </Svg>
);

const BookIcon = () => (
   <Svg size={26}>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
   </Svg>
);

/* -------------------------------------------------------------------------- */
/* Small presentational components                                            */
/* -------------------------------------------------------------------------- */

/** Round profile photo, falling back to initials when there is no photo or it fails to load. */
function Avatar({ name, src, large = false }) {
   const [failed, setFailed] = useState(false);

   useEffect(() => {
      setFailed(false);
   }, [src]);

   return (
      <span className={`barangayRecoAvatar ${large ? 'barangayRecoAvatarLarge' : ''}`}>
         {src && !failed ? (
            <img src={src} alt={`${name} profile`} onError={() => setFailed(true)} />
         ) : (
            <span aria-hidden="true">{initialsOf(name)}</span>
         )}
      </span>
   );
}

function StatusBadge({ status }) {
   return (
      <span className={`barangayRecoBadge barangayRecoBadge${statusTone(status)}`}>
         {status}
      </span>
   );
}

function DetailItem({ label, value, wide = false }) {
   return (
      <div className={`barangayRecoDetailItem ${wide ? 'barangayRecoDetailWide' : ''}`}>
         <span className="barangayRecoDetailLabel">{label}</span>
         <span className="barangayRecoDetailValue">{value || '—'}</span>
      </div>
   );
}

function SkeletonRows({ count = 6 }) {
   return (
      <div className="barangayRecoSkeletonList" aria-hidden="true">
         {Array.from({ length: count }, (_, i) => (
            <div className="barangayRecoSkeletonRow" key={i}>
               <span className="barangayRecoSkeletonCircle" />
               <span className="barangayRecoSkeletonLines">
                  <span className="barangayRecoSkeletonLine" />
                  <span className="barangayRecoSkeletonLine barangayRecoSkeletonShort" />
               </span>
            </div>
         ))}
      </div>
   );
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

function BarangayCourseRecommendation() {
   const [osyList, setOsyList] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [tab, setTab] = useState('all');
   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState('all');
   const [selectedId, setSelectedId] = useState(null);
   const closeBtnRef = useRef(null);

   /* ---- data loading ---- */

   const load = useCallback(async () => {
      setLoading(true);
      setError('');
      try {
         setOsyList(await fetchRecommendations());
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   }, []);

   useEffect(() => {
      load();
   }, [load]);

   /* ---- derived data ---- */

   const counts = useMemo(() => {
      const withCourses = osyList.filter((o) => o.recommendations.length > 0).length;
      const matched = osyList.filter((o) => o.recommendations.some((r) => r.available)).length;
      return {
         all: osyList.length,
         with: withCourses,
         none: osyList.length - withCourses,
         matched,
      };
   }, [osyList]);

   const statuses = useMemo(
      () => [...new Set(osyList.map((o) => o.status).filter(Boolean))],
      [osyList],
   );

   const filtered = useMemo(() => {
      const q = search.trim().toLowerCase();
      return osyList.filter((o) => {
         if (tab === 'with' && o.recommendations.length === 0) return false;
         if (tab === 'none' && o.recommendations.length > 0) return false;
         if (statusFilter !== 'all' && o.status !== statusFilter) return false;
         if (!q) return true;
         return (
            [o.name, o.address, o.preferred_career].some((v) => v?.toLowerCase().includes(q)) ||
            o.recommendations.some((r) => r.title?.toLowerCase().includes(q))
         );
      });
   }, [osyList, tab, search, statusFilter]);

   const selectedIndex = filtered.findIndex((o) => o.id === selectedId);
   const selected = selectedIndex === -1 ? null : filtered[selectedIndex];

   const hasActiveFilters = tab !== 'all' || statusFilter !== 'all' || search.trim() !== '';

   function resetFilters() {
      setTab('all');
      setStatusFilter('all');
      setSearch('');
   }

   /* ---- modal behavior ---- */

   // Escape closes the modal
   useEffect(() => {
      if (selectedId === null) return undefined;
      const onKeyDown = (e) => {
         if (e.key === 'Escape') setSelectedId(null);
      };
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
   }, [selectedId]);

   // Move focus into the dialog when it opens
   useEffect(() => {
      if (selectedId !== null) closeBtnRef.current?.focus();
   }, [selectedId]);

   /* ---- render ---- */

   return (
      <>
         <div className="barangayCourseRecommendationBody">
            <BarangaySideBar />

            <div className="barangayCourseRecommendationContent">
               <div className="barangayRecoPage">
                  {/* Header */}
                  <div className="barangayRecoHeader">
                     <div>
                        <h1 className="barangayRecoTitle">Course Recommendation</h1>
                        <p className="barangayRecoSubtitle">
                           Suggested Maxima courses for every registered OSY, based on their interview details
                        </p>
                     </div>
                     <div className="barangayRecoHeaderActions">
                        <button
                           type="button"
                           className="barangayRecoGhostBtn"
                           onClick={load}
                           disabled={loading}
                        >
                           <RefreshIcon />
                           {loading ? 'Refreshing…' : 'Refresh'}
                        </button>
                     </div>
                  </div>

                  {/* Summary cards */}
                  <div className="barangayRecoSummary">
                     <div className="barangayRecoSummaryCard">
                        <span className="barangayRecoSummaryLabel">Total OSY</span>
                        <span className="barangayRecoSummaryValue">{counts.all}</span>
                     </div>
                     <div className="barangayRecoSummaryCard barangayRecoSummaryWith">
                        <span className="barangayRecoSummaryLabel">With Recommendations</span>
                        <span className="barangayRecoSummaryValue">{counts.with}</span>
                     </div>
                     <div className="barangayRecoSummaryCard barangayRecoSummaryAvailable">
                        <span className="barangayRecoSummaryLabel">Matched to Maxima Courses</span>
                        <span className="barangayRecoSummaryValue">{counts.matched}</span>
                     </div>
                     <div className="barangayRecoSummaryCard barangayRecoSummaryNone">
                        <span className="barangayRecoSummaryLabel">No Recommendations Yet</span>
                        <span className="barangayRecoSummaryValue">{counts.none}</span>
                     </div>
                  </div>

                  {/* Main panel */}
                  <div className="barangayRecoPanel">
                     <div className="barangayRecoToolbar">
                        <div className="barangayRecoTabs" role="tablist">
                           {TABS.map((t) => (
                              <button
                                 key={t.key}
                                 type="button"
                                 role="tab"
                                 aria-selected={tab === t.key}
                                 className={`barangayRecoTab ${tab === t.key ? 'barangayRecoTabActive' : ''}`}
                                 onClick={() => setTab(t.key)}
                              >
                                 {t.label}
                                 <span className="barangayRecoTabCount">{counts[t.key]}</span>
                              </button>
                           ))}
                        </div>

                        <div className="barangayRecoToolbarRight">
                           <div className="barangayRecoSearchWrap">
                              <span className="barangayRecoSearchIcon">
                                 <SearchIcon />
                              </span>
                              <input
                                 type="search"
                                 className="barangayRecoSearch"
                                 placeholder="Search name, address, career or course"
                                 aria-label="Search OSY"
                                 value={search}
                                 onChange={(e) => setSearch(e.target.value)}
                              />
                           </div>
                           <select
                              className="barangayRecoFilter"
                              aria-label="Filter by status"
                              value={statusFilter}
                              onChange={(e) => setStatusFilter(e.target.value)}
                           >
                              <option value="all">All statuses</option>
                              {statuses.map((s) => (
                                 <option key={s} value={s}>
                                    {s}
                                 </option>
                              ))}
                           </select>
                        </div>
                     </div>

                     {error && (
                        <div className="barangayRecoError" role="alert">
                           {error}
                        </div>
                     )}

                     {loading ? (
                        <SkeletonRows />
                     ) : filtered.length === 0 ? (
                        <div className="barangayRecoEmpty">
                           <span className="barangayRecoEmptyIcon">
                              <BookIcon />
                           </span>
                           <div className="barangayRecoEmptyTitle">
                              {osyList.length === 0 ? 'No OSY records yet' : 'No results found'}
                           </div>
                           <div>
                              {osyList.length === 0
                                 ? 'Registered OSY and their recommended courses will appear here.'
                                 : 'Try a different search or change the filters.'}
                           </div>
                           {hasActiveFilters && osyList.length > 0 && (
                              <button
                                 type="button"
                                 className="barangayRecoGhostBtn barangayRecoEmptyBtn"
                                 onClick={resetFilters}
                              >
                                 Clear filters
                              </button>
                           )}
                        </div>
                     ) : (
                        <div className="barangayRecoListWrap">
                           <ul className="barangayRecoList">
                              {filtered.map((osy) => {
                                 const recs = osy.recommendations;
                                 return (
                                    <li key={osy.id}>
                                       <button
                                          type="button"
                                          className="barangayRecoItem"
                                          onClick={() => setSelectedId(osy.id)}
                                       >
                                          <Avatar name={osy.name} src={osy.profile_photo_url} />

                                          <span className="barangayRecoText">
                                             <span className="barangayRecoItemTop">
                                                <span className="barangayRecoItemName">{osy.name}</span>
                                                <StatusBadge status={osy.status} />
                                             </span>
                                             <span className="barangayRecoItemMeta">
                                                {osy.address}
                                                {' · '}
                                                Preferred career: {osy.preferred_career || 'Not specified'}
                                             </span>

                                             {recs.length === 0 ? (
                                                <span className="barangayRecoItemMeta">
                                                   No saved recommendations yet
                                                </span>
                                             ) : (
                                                <span className="barangayRecoPills">
                                                   {recs.slice(0, MAX_PILLS).map((r) => (
                                                      <span
                                                         key={r.rank}
                                                         className={`barangayRecoPill ${
                                                            r.available
                                                               ? 'barangayRecoPillAvailable'
                                                               : 'barangayRecoPillUnavailable'
                                                         }`}
                                                      >
                                                         {r.title}
                                                      </span>
                                                   ))}
                                                   {recs.length > MAX_PILLS && (
                                                      <span className="barangayRecoPill barangayRecoPillMore">
                                                         +{recs.length - MAX_PILLS} more
                                                      </span>
                                                   )}
                                                </span>
                                             )}
                                          </span>

                                          <span className="barangayRecoCount">
                                             {recs.length} {recs.length === 1 ? 'course' : 'courses'}
                                          </span>
                                          <span className="barangayRecoChevron">
                                             <ChevronIcon />
                                          </span>
                                       </button>
                                    </li>
                                 );
                              })}
                           </ul>
                        </div>
                     )}
                  </div>
               </div>
            </div>
         </div>

         {/* Detail modal */}
         {selected && (
            <div className="barangayRecoOverlay" onClick={() => setSelectedId(null)}>
               <div
                  className="barangayRecoModal"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="barangayRecoModalTitle"
                  onClick={(e) => e.stopPropagation()}
               >
                  <div className="barangayRecoModalHeader">
                     <div className="barangayRecoModalIdentity">
                        <Avatar name={selected.name} src={selected.profile_photo_url} large />
                        <div>
                           <h2 className="barangayRecoModalName" id="barangayRecoModalTitle">
                              {selected.name}
                           </h2>
                           <div className="barangayRecoModalMeta">
                              <StatusBadge status={selected.status} />
                              <span className="barangayRecoMuted">{selected.address}</span>
                           </div>
                        </div>
                     </div>
                     <button
                        type="button"
                        ref={closeBtnRef}
                        className="barangayRecoModalClose"
                        aria-label="Close"
                        onClick={() => setSelectedId(null)}
                     >
                        ×
                     </button>
                  </div>

                  <div className="barangayRecoModalBody">
                     <section className="barangayRecoSection">
                        <h3 className="barangayRecoSectionTitle">Interview summary</h3>
                        <div className="barangayRecoDetailGrid">
                           <DetailItem label="Preferred career" value={selected.preferred_career} />
                           <DetailItem
                              label="Educational attainment"
                              value={selected.educational_attainment}
                           />
                           <DetailItem label="Address" value={selected.address} wide />
                        </div>
                     </section>

                     <section className="barangayRecoSection">
                        <h3 className="barangayRecoSectionTitle">Recommended courses</h3>

                        {selected.recommendations.length === 0 ? (
                           <p className="barangayRecoMuted">
                              No saved recommendations yet. Open this OSY in OSY Management and save the
                              record to generate them.
                           </p>
                        ) : (
                           <>
                              {formatDate(selected.recommendations[0].generated_at) && (
                                 <p className="barangayRecoMuted barangayRecoGenerated">
                                    Generated on {formatDate(selected.recommendations[0].generated_at)}
                                 </p>
                              )}

                              <ol className="barangayRecoCourseList">
                                 {selected.recommendations.map((r) => (
                                    <li
                                       key={r.rank}
                                       className={`barangayRecoCourseCard ${
                                          r.available
                                             ? 'barangayRecoCourseAvailable'
                                             : 'barangayRecoCourseUnavailable'
                                       }`}
                                    >
                                       <span className="barangayRecoCourseRank">{r.rank}</span>

                                       <div className="barangayRecoCourseBody">
                                          <div className="barangayRecoCourseHead">
                                             <span className="barangayRecoCourseTitle">{r.title}</span>
                                             <span
                                                className={`barangayRecoPill ${
                                                   r.available
                                                      ? 'barangayRecoPillAvailable'
                                                      : 'barangayRecoPillUnavailable'
                                                }`}
                                             >
                                                {r.available ? 'Available at Maxima' : 'Not Available at Maxima'}
                                             </span>
                                          </div>

                                          {r.career_path && (
                                             <span className="barangayRecoCoursePath">
                                                Career path: {r.career_path}
                                             </span>
                                          )}

                                          {r.image_url && (
                                             <img
                                                className="barangayRecoCourseImg"
                                                src={r.image_url}
                                                alt=""
                                                loading="lazy"
                                                onError={(e) => {
                                                   e.currentTarget.style.display = 'none';
                                                }}
                                             />
                                          )}

                                          {r.matched.length > 0 && (
                                             <div className="barangayRecoKeywords">
                                                <span className="barangayRecoMuted">Matched on</span>
                                                {r.matched.map((m) => (
                                                   <span className="barangayRecoKeyword" key={m}>
                                                      {m}
                                                   </span>
                                                ))}
                                             </div>
                                          )}

                                          {!r.available && (
                                             <span className="barangayRecoCourseNote">
                                                Suggestion only. Maxima does not offer this course, so it cannot
                                                be referred.
                                             </span>
                                          )}
                                       </div>
                                    </li>
                                 ))}
                              </ol>
                           </>
                        )}
                     </section>
                  </div>

                  <div className="barangayRecoModalFooter">
                     <span className="barangayRecoMuted">
                        {selectedIndex + 1} of {filtered.length}
                     </span>
                     <div className="barangayRecoModalNav">
                        <button
                           type="button"
                           className="barangayRecoGhostBtn"
                           disabled={selectedIndex <= 0}
                           onClick={() => setSelectedId(filtered[selectedIndex - 1].id)}
                        >
                           Previous
                        </button>
                        <button
                           type="button"
                           className="barangayRecoGhostBtn"
                           disabled={selectedIndex >= filtered.length - 1}
                           onClick={() => setSelectedId(filtered[selectedIndex + 1].id)}
                        >
                           Next
                        </button>
                        <button
                           type="button"
                           className="barangayRecoPrimaryBtn"
                           onClick={() => setSelectedId(null)}
                        >
                           Close
                        </button>
                     </div>
                  </div>
               </div>
            </div>
         )}
      </>
   );
}

export default BarangayCourseRecommendation;