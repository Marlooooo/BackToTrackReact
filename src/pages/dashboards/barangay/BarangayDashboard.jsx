import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SkOfficialSideBar from "../../../components/skOfficialSideBar";
import "./BarangayDashboard.css";

const DASHBOARD_ENDPOINT = "/api/barangay/dashboard";

// Paths taken from App.jsx
const ROUTES = {
   osyManagement: "/barangay/management",
   referrals: "/barangay/referrals",
   monitoring: "/barangay/training",
   recommendations: "/barangay/recommendation",
   reports: "/barangay/reports",
};

/** Turns a failed request into a message a staff member can act on. */
function describeError(status) {
   switch (status) {
      case 0:
         return "Could not reach the server. Check your internet connection and try again.";
      case 401:
      case 419:
         return "Your session has expired. Refresh the page and sign in again.";
      case 403:
         return "You do not have permission to view this dashboard.";
      default:
         return status >= 500
            ? "The server ran into a problem. Please try again in a moment."
            : "Could not load the dashboard.";
   }
}

function Icon({ name }) {
   return (
      <span className="material-symbols-outlined brgyDashIcon" aria-hidden="true">
         {name}
      </span>
   );
}

function BarangayDashboard() {
   const navigate = useNavigate();
   const [data, setData] = useState(null);
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState(null);

   useEffect(() => {
      let cancelled = false;

      async function load() {
         try {
            const res = await fetch(DASHBOARD_ENDPOINT, {
               credentials: "include",
               headers: { Accept: "application/json" },
            });

            if (!res.ok) {
               if (!cancelled) setError(describeError(res.status));
               return;
            }

            const json = await res.json();
            if (!cancelled) setData(json);
         } catch {
            if (!cancelled) setError(describeError(0));
         } finally {
            if (!cancelled) setLoading(false);
         }
      }

      load();
      return () => {
         cancelled = true;
      };
   }, []);

   const stats = data?.stats;
   const attention = data?.attention;
   const userName =
      data?.user?.name || localStorage.getItem("userName") || "SK Official";

   const statCards = stats
      ? [
           { label: "Total OSY registered", value: stats.total_osy, icon: "groups", tone: "green" },
           { label: "Active referrals", value: stats.active_referrals, icon: "assignment_ind", tone: "blue" },
           { label: "Currently in training", value: stats.in_training, icon: "school", tone: "amber" },
           { label: "Completed trainings", value: stats.completed, icon: "task_alt", tone: "green" },
        ]
      : [];

   const attentionItems = attention
      ? [
           {
              count: attention.concerns,
              icon: "error",
              tone: "red",
              text: "attendance concern(s) from Maxima waiting for your review",
              action: "Review",
              to: ROUTES.monitoring,
           },
           {
              count: attention.reasons,
              icon: "chat",
              tone: "amber",
              text: "absence reason(s) submitted by OSY",
              action: "View",
              to: ROUTES.monitoring,
           },
           {
              count: attention.awaiting_referral,
              icon: "pending_actions",
              tone: "blue",
              text: "registered OSY not yet referred to a program",
              action: "Refer",
              to: ROUTES.referrals,
           },
        ].filter((item) => item.count > 0)
      : [];

   const quickActions = [
      { label: "Register new OSY", icon: "person_add", to: ROUTES.osyManagement },
      { label: "Refer an OSY", icon: "assignment_ind", to: ROUTES.referrals },
      { label: "Course recommendation", icon: "school", to: ROUTES.recommendations },
      { label: "View reports", icon: "assessment", to: ROUTES.reports },
   ];

   return (
      <div className="brgyDashBody">
         <SkOfficialSideBar />

         <div className="brgyDashMain">
            <div className="brgyDashHeader">
               <div>
                  <h1>Dashboard</h1>
                  <p>
                     Welcome back, {userName}. Here is an overview of the OSY
                     program in your barangay.
                  </p>
               </div>
            </div>

            {error && (
               <div className="brgyDashBanner brgyDashBannerError" role="alert">
                  {error}
               </div>
            )}

            {loading && <div className="brgyDashEmpty">Loading dashboard…</div>}

            {!loading && !error && data && (
               <>
                  <section className="brgyDashStats" aria-label="Summary">
                     {statCards.map((card) => (
                        <div className="brgyDashStatCard" key={card.label}>
                           <span className={`brgyDashStatIcon brgyDashTone--${card.tone}`}>
                              <Icon name={card.icon} />
                           </span>
                           <div>
                              <div className="brgyDashStatValue">{card.value}</div>
                              <div className="brgyDashStatLabel">{card.label}</div>
                           </div>
                        </div>
                     ))}
                  </section>

                  <div className="brgyDashGrid">
                     <section className="brgyDashCard">
                        <h2 className="brgyDashCardTitle">Needs your attention</h2>

                        {attentionItems.length === 0 ? (
                           <div className="brgyDashEmpty">
                              <p>You are all caught up.</p>
                              <span>Nothing needs your action right now.</span>
                           </div>
                        ) : (
                           <ul className="brgyDashAttentionList">
                              {attentionItems.map((item) => (
                                 <li className="brgyDashAttentionItem" key={item.text}>
                                    <span className={`brgyDashAttentionIcon brgyDashTone--${item.tone}`}>
                                       <Icon name={item.icon} />
                                    </span>
                                    <p className="brgyDashAttentionText">
                                       <strong>{item.count}</strong> {item.text}
                                    </p>
                                    <button
                                       type="button"
                                       className="brgyDashBtn brgyDashBtnGhost"
                                       onClick={() => navigate(item.to)}
                                    >
                                       {item.action}
                                    </button>
                                 </li>
                              ))}
                           </ul>
                        )}
                     </section>

                     <section className="brgyDashCard">
                        <h2 className="brgyDashCardTitle">Quick actions</h2>
                        <div className="brgyDashActions">
                           {quickActions.map((action) => (
                              <button
                                 type="button"
                                 className="brgyDashActionBtn"
                                 key={action.label}
                                 onClick={() => navigate(action.to)}
                              >
                                 <Icon name={action.icon} />
                                 <span>{action.label}</span>
                              </button>
                           ))}
                        </div>
                     </section>
                  </div>

                  <section className="brgyDashCard brgyDashCardFlush">
                     <div className="brgyDashCardHead">
                        <h2 className="brgyDashCardTitle">Recent referrals</h2>
                        <button
                           type="button"
                           className="brgyDashBtn brgyDashBtnGhost"
                           onClick={() => navigate(ROUTES.referrals)}
                        >
                           View all
                        </button>
                     </div>

                     {data.recent_referrals.length === 0 ? (
                        <div className="brgyDashEmpty">
                           <p>No referrals yet.</p>
                           <span>Referrals you make will show up here.</span>
                        </div>
                     ) : (
                        <div className="brgyDashTableWrap">
                           <table className="brgyDashTable">
                              <thead>
                                 <tr>
                                    <th scope="col">Name</th>
                                    <th scope="col">Course</th>
                                    <th scope="col">Date</th>
                                    <th scope="col">Status</th>
                                 </tr>
                              </thead>
                              <tbody>
                                 {data.recent_referrals.map((row) => (
                                    <tr key={row.id}>
                                       <td className="brgyDashTableName">{row.name}</td>
                                       <td>{row.course}</td>
                                       <td>{row.date}</td>
                                       <td>
                                          <span
                                             className={`brgyDashStatus brgyDashStatus--${row.status?.replace(/\s+/g, "")}`}
                                          >
                                             {row.status}
                                          </span>
                                       </td>
                                    </tr>
                                 ))}
                              </tbody>
                           </table>
                        </div>
                     )}
                  </section>
               </>
            )}
         </div>
      </div>
   );
}

export default BarangayDashboard;