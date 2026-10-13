import OsySideBar from '../../../components/osySideBar';
import './OsyRecommendations.css';

function OsyRecommendations() {
   return (
      <>
         <div className="osyRecommendationsBody">
            <OsySideBar />

            <div className="osyRecommendationsContent">
               <h1>Recommendations</h1>
            </div>
         </div>
      </>
   );
}

export default OsyRecommendations;
