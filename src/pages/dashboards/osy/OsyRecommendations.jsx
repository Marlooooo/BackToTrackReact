import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import OsySideBar from '../../../components/osySideBar';
import './OsyRecommendations.css';

const API_URL = 'http://localhost:8000/api';

// Saved recommendations record which interview field they came from.
// To the OSY, all of those are simply "your interview".
const INTERVIEW_SOURCE = {
   short: 'Interview',
   label: 'Matched to your interview',
   text: 'These courses were matched to what you shared during your interview: your goals, background and personal observations.',
};

const BASED_ON = {
   preferred_career: {
      short: 'Preferred career',
      label: 'Matched to your preferred career',
      text: 'These courses were matched to the career you told us you want to pursue.',
   },
   interview_notes: INTERVIEW_SOURCE,
   background_circumstances: INTERVIEW_SOURCE,
   personal_observations: INTERVIEW_SOURCE,
   expressed_goals: INTERVIEW_SOURCE,
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
      text: 'Let them know which course you want so they can refer you to Maxima.',
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
            <span className="oRec-badge">
               <i className="las la-star"></i> {rec.rank === 1 ? 'Top match' : 'Best available'}
            </span>
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
               <Link to={`/osy/courses?course=${rec.id}`} className="oRec-btn primary">
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

            <Link to={`/osy/courses?course=${rec.id}`} className="oRec-btn ghost">
               View course <i className="las la-arrow-right"></i>
            </Link>
         </div>
      </article>
   );
}

/* Suggestions that fit the OSY but that Maxima does not offer. Never shown as enrollable. */
function NotOfferedSection({ items }) {
   return (
      <section className="oRec-section">
         <div className="oRec-sectionHead">
            <h2>Also suggested for you</h2>
            <span>{items.length} not offered by Maxima</span>
         </div>

         <p className="oRec-otherNote">
            These fit your interview, but Maxima does not offer them right now. They are ideas to talk
            about with your SK official. You are not enrolled in them and they cannot be referred.
         </p>

         <ul className="oRec-otherList">
            {items.map((s) => (
               <li key={s.rank} className="oRec-other">
                  <span className="oRec-otherRank">#{s.rank}</span>
                  <div className="oRec-otherBody">
                     <div className="oRec-otherHead">
                        <h3>{s.title}</h3>
                        <span className="oRec-otherTag">Not Available at Maxima</span>
                     </div>
                     {s.career_path && <p className="oRec-otherMeta">Career path: {s.career_path}</p>}
                     {s.reason && <p className="oRec-otherMeta">{s.reason}</p>}
                  </div>
               </li>
            ))}
         </ul>
      </section>
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
   const [suggestions, setSuggestions] = useState([]);
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
            const byRank = (a, b) => a.rank - b.rank;
            const list = (json.data || []).slice().sort(byRank);
            const all = (json.suggestions || []).slice().sort(byRank);

            if (!cancelled) {
               setRecommendations(list);
               setSuggestions(all);
            }
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

   // Courses Maxima offers (full cards) and suggestions it does not offer
   const featured = recommendations[0];
   const others = recommendations.slice(1);
   const notOffered = suggestions.filter((s) => !s.available);
   const total = suggestions.length || recommendations.length;

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

               {!loading && !error && total === 0 && (
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

               {!loading && !error && total > 0 && (
                  <>
                     <div className="oRec-stats">
                        <div className="oRec-stat">
                           <div className="oRec-statIcon total"><i className="las la-graduation-cap"></i></div>
                           <div>
                              <strong>{total}</strong>
                              <span>{total === 1 ? 'Course recommended' : 'Courses recommended'}</span>
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

                     {featured && <FeaturedCard rec={featured} />}

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

                     {notOffered.length > 0 && <NotOfferedSection items={notOffered} />}

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