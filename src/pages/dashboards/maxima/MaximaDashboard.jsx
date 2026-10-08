import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaDashboard.css'

const ROUTES = {
   referrals: '/maxima/referrals',
   programs: '/maxima/management',
};

const STATUS_LABELS = {
   'Referred': 'Pending',
   'Accepted by Maxima': 'Accepted',
   'Training Started': 'In Progress',
   'Completed': 'Completed',
   'Rejected': 'Rejected',
   'active': 'In Progress',
};

const STATUS_TONES = {
   'Referred': 'orange',
   'Accepted by Maxima': 'green',
   'Training Started': 'blue',
   'Completed': 'green',
   'Rejected': 'red',
   'active': 'blue',
};

const statusLabel = (s) => STATUS_LABELS[s] ?? String(s);
const statusTone = (s) => STATUS_TONES[s] ?? 'gray';


function MaximaDashboard() {
const navigate = useNavigate();
const [data, setData] = useState(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState('');

useEffect(() => {
   const loadDashboard = async () => {
      try {
         const res = await fetch("http://localhost:8000/api/maxima/dashboard", {
            headers: {
               Accept: "application/json",
               Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
         });

         if (!res.ok) throw new Error("Failed to load dashboard data.");
         setData(await res.json());
      } catch (err) {
         setError(err.message);
      } finally {
         setLoading(false);
      }
   };

   loadDashboard();
}, []);

const stats = data?.stats;
const statValue = (v) => (loading ? '…' : v ?? 0);

return (
   <>
      <div className='maximaDashboardBody'>


         <MaximaSideBar/>

         <div className='maximaMainDashboard'>



            <div className='maximaMainDashboardTop'>
               <h1>Dashboard</h1>
            </div>

            {error && <p className='dashboardError'>{error}</p>}

            <div className='maximaMainDashboardMid'>
               <div className='referralRequestDiv'>
                  <div className='cardTop'>
                     <h2>Recent Referral Request</h2>
                     <p className='viewAllLink' onClick={() => navigate(ROUTES.referrals)}>View all</p>
                  </div>

                  <div className='tableHeader cols4'>
                     <p>Name</p>
                     <p>Course</p>
                     <p>Date Referred</p>
                     <p>Status</p>
                  </div>

                  <div className='tableBody'>
                     {loading && <p className='emptyRow'>Loading…</p>}
                     {!loading && data?.recent_referrals?.length === 0 && (
                        <p className='emptyRow'>No referral requests yet.</p>
                     )}
                     {data?.recent_referrals?.map((r) => (
                        <div className='tableRow cols4' key={r.id}>
                           <p>{r.name}</p>
                           <p>{r.course}</p>
                           <p>{r.date}</p>
                           <p>
                              <span className={`statusBadge tone-${statusTone(r.status)}`}>
                                 {statusLabel(r.status)}
                              </span>
                           </p>
                        </div>
                     ))}
                  </div>
               </div>

               <div className='maximaMainDashboardMidRight'>

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

                  <div className='dashboardBotLeft'>
                     <div className='cardTop'>
                        <h2>Ongoing Trainings</h2>
                        <p className='viewAllLink' onClick={() => navigate(ROUTES.programs)}>View all</p>
                     </div>

                     <div className='tableHeader cols3'>
                        <p>Programs</p>
                        <p>Enrollees</p>
                        <p>Status</p>
                     </div>

                     <div className='tableBody'>
                        {loading && <p className='emptyRow'>Loading…</p>}
                        {!loading && data?.ongoing_trainings?.length === 0 && (
                           <p className='emptyRow'>No ongoing trainings.</p>
                        )}
                        {data?.ongoing_trainings?.map((p) => (
                           <div className='tableRow cols3' key={p.id}>
                              <p>{p.title}</p>
                              <p>{p.enrollees}</p>
                              <p>
                                 <span className={`statusBadge tone-${statusTone(p.status)}`}>
                                    {statusLabel(p.status)}
                                 </span>
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