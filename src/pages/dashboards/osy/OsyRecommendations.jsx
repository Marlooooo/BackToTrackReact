import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import OsySideBar from '../../../components/osySideBar';
import './OsyRecommendations.css';

const API_URL = 'http://localhost:8000/api';

const BASED_ON = {
   preferred_career: {
      short: 'Preferred career',
      label: 'Matched to your preferred career',
      text: 'These courses were matched to the career you told us you want to pursue.',
   },
   interview_notes: {
      short: 'Interview',
      label: 'Matched to your interview',
      text: 'These courses were matched to what you shared during your interview: your goals, background and personal observations.',
   },
};

const NEXT_STEPS = [
   {
      icon: 'la-search',
      title: 'Review the course',
      text: 'Check the description, schedule and requirements to be sure it fits you.',
   },
   {
      icon: 'la-user-friends',
      title: 'Talk to your SK official',
      text: 'Let them know which course you want so they can refer you to TESDA.',
   },
   {
      icon: 'la-bell',
      title: 'Watch your notifications',
      text: 'You will be notified when your referral is accepted or your status changes.',
   },
];

function formatDate(value) {
   if (!value) return null;
   const date = new Date(value);
   if (Number.isNaN(date.getTime())) return null;
   return date.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function capitalize(word) {
   return word ? word.charAt(0).toUpperCase() + word.slice(1) : word;
}

/* Course image with a clean fallback when there is no image or it fails to load */
function CourseImage({ src, alt, className }) {
   const [failed, setFailed] = useState(false);

   if (!src || failed) {
      return (
         <div className="oRec-imgFallback" aria-hidden="true">
            <i className="las la-graduation-cap"></i>
         </div>
      );
   }

   return <img className={className} src={src} alt={alt} onError={() => setFailed(true)} />;
}

/* Schedule / slots / accreditation, only the ones the API sends */
function CourseFacts({ rec }) {
   const items = [];

   if (rec.schedule) items.push({ icon: 'la-calendar', text: rec.schedule });
   if (rec.slots !== undefined && rec.slots !== null) {
      items.push({ icon: 'la-users', text: `${rec.slots} slot${Number(rec.slots) === 1 ? '' : 's'}` });
   }
   if (rec.tesda_accredited) items.push({ icon: 'la-certificate', text: 'TESDA accredited' });

   if (items.length === 0) return null;

   return (
      <ul className="oRec-facts">
         {items.map((item) => (
            <li key={item.text}>
               <i className={`las ${item.icon}`}></i>
               <span>{item.text}</span>
            </li>
         ))}
      </ul>
   );
}

function MatchedWords({ words }) {
   const unique = [...new Set(words || [])];
   if (unique.length === 0) return null;

   return (
      <div>
         <span className="oRec-label">Why this fits</span>
         <div className="oRec-chips">
            {unique.map((word) => (
               <span key={word} className="oRec-chip">{capitalize(word)}</span>
            ))}
         </div>
      </div>
   );
}

function FeaturedCard({ rec }) {
   return (
      <article className="oRec-featured">
         <div className="oRec-featuredMedia">
            <CourseImage src={rec.image_url} alt={rec.title} className="oRec-featuredImg" />
            <span className="oRec-badge"><i className="las la-star"></i> Top match</span>
         </div>

         <div className="oRec-featuredBody">
            <span className="oRec-eyebrow">Recommended #{rec.rank}</span>
            <h2>{rec.title}</h2>

            {rec.description && <p className="oRec-desc">{rec.description}</p>}

            <CourseFacts rec={rec} />
            <MatchedWords words={rec.matched} />

            {rec.requirements && (
               <div className="oRec-requirements">
                  <span className="oRec-label">Requirements</span>
                  <p>{rec.requirements}</p>
               </div>
            )}

            <div className="oRec-actions">
               <Link to="/osy/courses" className="oRec-btn primary">
                  View in available courses <i className="las la-arrow-right"></i>
               </Link>
            </div>
         </div>
      </article>
   );
}

function CourseCard({ rec, topScore }) {
   // Fit compared with the top match. This is relative, not a percentage of suitability.
   const fit = topScore > 0 ? Math.max(8, Math.round((rec.score / topScore) * 100)) : 0;

   return (
      <article className="oRec-card">
         <div className="oRec-cardMedia">
            <CourseImage src={rec.image_url} alt={rec.title} className="oRec-cardImg" />
            <span className="oRec-rankPill">#{rec.rank}</span>
         </div>

         <div className="oRec-cardBody">
            <h3>{rec.title}</h3>

            {rec.description && <p className="oRec-desc oRec-clamp">{rec.description}</p>}

            <CourseFacts rec={rec} />
            <MatchedWords words={rec.matched} />

            <div title="How close this course is compared with your top match">
               <div className="oRec-fitHead">Fit vs. top match</div>
               <div className="oRec-fitTrack">
                  <div className="oRec-fitBar" style={{ width: `${fit}%` }}></div>
               </div>
            </div>

            <Link to="/osy/courses" className="oRec-btn ghost">
               View course <i className="las la-arrow-right"></i>
            </Link>
         </div>
      </article>
   );
}

function LoadingSkeleton() {
   return (
      <div aria-busy="true" aria-label="Loading recommendations">
         <div className="oRec-skeleton featured"></div>
         <div className="oRec-skeleton card"></div>
      </div>
   );
}

function OsyRecommendations() {
   const [recommendations, setRecommendations] = useState([]);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');
   const [reloadKey, setReloadKey] = useState(0);

   const retry = useCallback(() => {
      setLoading(true);
      setError('');
      setReloadKey((k) => k + 1);
   }, []);

   useEffect(() => {
      let cancelled = false;

      const load = async () => {
         try {
            const res = await fetch(`${API_URL}/osy/recommendations`, {
               headers: { Accept: 'application/json' },
               credentials: 'include',
            });

            if (!res.ok) throw new Error(`Request failed (${res.status})`);

            const json = await res.json();
            const list = (json.data || []).slice().sort((a, b) => a.rank - b.rank);
            if (!cancelled) setRecommendations(list);
         } catch (err) {
            console.error('Could not load recommendations:', err);
            if (!cancelled) setError('We could not load your recommendations right now.');
         } finally {
            if (!cancelled) setLoading(false);
         }
      };

      load();

      return () => {
         cancelled = true;
      };
   }, [reloadKey]);

   const featured = recommendations[0];
   const others = recommendations.slice(1);
   const topScore = featured?.score || 0;
   const generatedAt = formatDate(featured?.generated_at);
   const source = BASED_ON[featured?.based_on];

   return (
      <>
         <div className="oRec-layout">
            <OsySideBar />

            <main className="oRec-main">
               <header className="oRec-header">
                  <div>
                     <h1>Recommended Courses</h1>
                     <p className="oRec-sub">
                        Training programs selected from your interview with the SK, so you can take the next step toward your goals.
                     </p>
                  </div>
               </header>

               {loading && <LoadingSkeleton />}

               {!loading && error && (
                  <div className="oRec-error" role="alert">
                     <span>{error} Please check your connection and try again.</span>
                     <button type="button" className="oRec-retry" onClick={retry}>Try again</button>
                  </div>
               )}

               {!loading && !error && recommendations.length === 0 && (
                  <div className="oRec-panel">
                     <div className="oRec-empty">
                        <div className="oRec-emptyIcon"><i className="las la-compass"></i></div>
                        <strong>No recommendations yet</strong>
                        <p>
                           Your SK official will add suggestions based on your interview.
                           In the meantime, you can explore every course that is currently open.
                        </p>
                        <Link to="/osy/courses" className="oRec-btn primary">
                           Browse available courses <i className="las la-arrow-right"></i>
                        </Link>
                     </div>
                  </div>
               )}

               {!loading && !error && featured && (
                  <>
                     <div className="oRec-stats">
                        <div className="oRec-stat">
                           <div className="oRec-statIcon total"><i className="las la-graduation-cap"></i></div>
                           <div>
                              <strong>{recommendations.length}</strong>
                              <span>{recommendations.length === 1 ? 'Course recommended' : 'Courses recommended'}</span>
                           </div>
                        </div>

                        <div className="oRec-stat">
                           <div className="oRec-statIcon updated"><i className="las la-calendar"></i></div>
                           <div>
                              <strong>{generatedAt || '-'}</strong>
                              <span>Last updated</span>
                           </div>
                        </div>

                        <div className="oRec-stat">
                           <div className="oRec-statIcon source"><i className="las la-lightbulb"></i></div>
                           <div>
                              <strong>{source ? source.short : '-'}</strong>
                              <span>Based on</span>
                           </div>
                        </div>
                     </div>

                     {source && (
                        <div className="oRec-note">
                           <i className="las la-info-circle"></i>
                           <div>
                              <strong>{source.label}</strong>
                              <p>{source.text}</p>
                           </div>
                        </div>
                     )}

                     <FeaturedCard rec={featured} />

                     {others.length > 0 && (
                        <section className="oRec-section">
                           <div className="oRec-sectionHead">
                              <h2>Other courses that may suit you</h2>
                              <span>{others.length} more</span>
                           </div>

                           <div className="oRec-grid">
                              {others.map((rec) => (
                                 <CourseCard key={rec.id} rec={rec} topScore={topScore} />
                              ))}
                           </div>
                        </section>
                     )}

                     <section className="oRec-section">
                        <div className="oRec-sectionHead">
                           <h2>What to do next</h2>
                        </div>

                        <ol className="oRec-steps">
                           {NEXT_STEPS.map((step, i) => (
                              <li key={step.title} className="oRec-step">
                                 <span className="oRec-stepIcon">
                                    <i className={`las ${step.icon}`}></i>
                                 </span>
                                 <div>
                                    <span className="oRec-stepNum">Step {i + 1}</span>
                                    <h3>{step.title}</h3>
                                    <p>{step.text}</p>
                                 </div>
                              </li>
                           ))}
                        </ol>
                     </section>
                  </>
               )}
            </main>
         </div>
      </>
   );
}

export default OsyRecommendations;