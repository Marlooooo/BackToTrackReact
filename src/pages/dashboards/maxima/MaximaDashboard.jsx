import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaDashboard.css';


/* -------------------------------------------------------------------------- */
/* API helper (Sanctum cookie auth, same as the other Maxima pages)           */
/* -------------------------------------------------------------------------- */

class ApiError extends Error {
   constructor(message, status) {
      super(message);
      this.status = status;
   }
}

async function apiFetch(url) {
   const res = await fetch(url, {
      credentials: 'include',
      headers: { Accept: 'application/json' },
   });

   const data = await res.json().catch(() => null);

   if (!res.ok) {
      throw new ApiError(data?.message ?? `Request failed (${res.status})`, res.status);
   }

   return data;
}

function describeError(err) {
   if (!(err instanceof ApiError)) {
      return 'Could not reach the server. Check your connection and try again.';
   }

   if (err.status === 401 || err.status === 419) {
      return 'Your session has expired. Refresh the page and sign in again.';
   }

   if (err.status === 403) {
      return 'You do not have permission to view the dashboard.';
   }

   return 'Failed to load dashboard data.';
}


/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const ROUTES = {
   referrals: '/maxima/referrals',
   programs: '/maxima/management',
};

// Referral statuses: same wording as the Referrals and Enrollees pages
const REFERRAL_LABELS = {
   'Referred': 'Referred',
   'Accepted by Maxima': 'Accepted',
   'Training Started': 'Enrolled',
   'Completed': 'Completed',
   'Rejected': 'Rejected',
   'Dropped': 'Dropped',
};

const REFERRAL_TONES = {
   'Referred': 'orange',
   'Accepted by Maxima': 'blue',
   'Training Started': 'orange',
   'Completed': 'green',
   'Rejected': 'red',
   'Dropped': 'red',
};

// Training program statuses (a program is not a referral)
const PROGRAM_LABELS = {
   'active': 'In Progress',
};

const PROGRAM_TONES = {
   'active': 'blue',
};

const referralLabel = (s) => REFERRAL_LABELS[s] ?? String(s);
const referralTone = (s) => REFERRAL_TONES[s] ?? 'gray';
const programLabel = (s) => PROGRAM_LABELS[s] ?? String(s);
const programTone = (s) => PROGRAM_TONES[s] ?? 'gray';


/* -------------------------------------------------------------------------- */
/* Small components                                                           */
/* -------------------------------------------------------------------------- */

function ViewAllLink({ onClick }) {
   return (
      <p
         className='viewAllLink'
         role='button'
         tabIndex={0}
         onClick={onClick}
         onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
               e.preventDefault();
               onClick();
            }
         }}
      >
         View all
      </p>
   );
}

function StatusBadge({ label, tone }) {
   return <span className={`statusBadge tone-${tone}`}>{label}</span>;
}


/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

function MaximaDashboard() {
   const navigate = useNavigate();
   const [data, setData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState('');

   useEffect(() => {
      let cancelled = false;

      async function loadDashboard() {
         try {
            const result = await apiFetch('/api/maxima/dashboard');
            if (cancelled) return;

            setData(result);
            setError('');
         } catch (err) {
            if (!cancelled) setError(describeError(err));
         } finally {
            if (!cancelled) setLoading(false);
         }
      }

      loadDashboard();

      return () => {
         cancelled = true;
      };
   }, []);

   const stats = data?.stats;
   const recentReferrals = data?.recent_referrals ?? [];
   const ongoingTrainings = data?.ongoing_trainings ?? [];
   const statValue = (v) => (loading ? '…' : v ?? 0);

   return (
      <>
         <div className='maximaDashboardBody'>

            <MaximaSideBar />

            <div className='maximaMainDashboard'>

               <div className='maximaMainDashboardTop'>
                  <h1>Dashboard</h1>
                  <p>Overview of referral requests, program activity, and key stats at a glance.</p>
               </div>

               {error && <p className='dashboardError' role='alert'>{error}</p>}

               <div className='maximaMainDashboardMid'>

                  {/* Recent referral requests */}
                  <div className='referralRequestDiv'>
                     <div className='cardTop'>
                        <h2>Recent Referral Request</h2>
                        <ViewAllLink onClick={() => navigate(ROUTES.referrals)} />
                     </div>

                     <div className='tableHeader cols4'>
                        <p>Name</p>
                        <p>Course</p>
                        <p>Date Referred</p>
                        <p>Status</p>
                     </div>

                     <div className='tableBody'>
                        {loading && <p className='emptyRow'>Loading…</p>}

                        {!loading && !error && recentReferrals.length === 0 && (
                           <p className='emptyRow'>No referral requests yet.</p>
                        )}

                        {recentReferrals.map((r) => (
                           <div className='tableRow cols4' key={r.id}>
                              <p>{r.name}</p>
                              <p>{r.course}</p>
                              <p>{r.date}</p>
                              <p>
                                 <StatusBadge
                                    label={referralLabel(r.status)}
                                    tone={referralTone(r.status)}
                                 />
                              </p>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className='maximaMainDashboardMidRight'>

                     {/* Stat cards */}
                     <div className='twoMidSmallDiv'>
                        <div className='twoMidSmallCardsDiv'>
                           <div className='twoMidSmallCards'>
                              <p>Referral Request</p>
                              <h2>{statValue(stats?.pending_referrals)}</h2>
                              <p>Pending</p>
                           </div>
                           <div className='twoMidSmallCards'>
                              <p>Completed</p>
                              <h2>{statValue(stats?.completed_this_year)}</h2>
                              <p>This Year</p>
                           </div>
                        </div>
                     </div>

                     <div className='botTwoMidSmallDiv'>
                        <div className='botTwoMidSmallCardsDiv'>
                           <div className='botTwoMidSmallCards'>
                              <p>Active Trainings</p>
                              <h2>{statValue(stats?.active_trainings)}</h2>
                              <p>On Going</p>
                           </div>
                           <div className='botTwoMidSmallCards'>
                              <p>Enrollees</p>
                              <h2>{statValue(stats?.enrollees)}</h2>
                              <p>Total Enrollees</p>
                           </div>
                        </div>
                     </div>

                     {/* Ongoing trainings */}
                     <div className='dashboardBotLeft'>
                        <div className='cardTop'>
                           <h2>Ongoing Trainings</h2>
                           <ViewAllLink onClick={() => navigate(ROUTES.programs)} />
                        </div>

                        <div className='tableHeader cols3'>
                           <p>Programs</p>
                           <p>Enrollees</p>
                           <p>Status</p>
                        </div>

                        <div className='tableBody'>
                           {loading && <p className='emptyRow'>Loading…</p>}

                           {!loading && !error && ongoingTrainings.length === 0 && (
                              <p className='emptyRow'>No ongoing trainings.</p>
                           )}

                           {ongoingTrainings.map((p) => (
                              <div className='tableRow cols3' key={p.id}>
                                 <p>{p.title}</p>
                                 <p>{p.enrollees}</p>
                                 <p>
                                    <StatusBadge
                                       label={programLabel(p.status)}
                                       tone={programTone(p.status)}
                                    />
                                 </p>
                              </div>
                           ))}
                        </div>
                     </div>

                  </div>
               </div>

            </div>
         </div>
      </>
   );
}

export default MaximaDashboard;