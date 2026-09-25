import SkOfficialSideBar from '../../../components/skOfficialSideBar';
import './BarangayReferralManagement.css';

function BarangayReferralManagement() {
   return (
      <>
         <div className='barangayReferralManagementBody'>
            <SkOfficialSideBar/>

            <div className='barangayMainContent'>
               {/* Referral Management content goes here */}
            </div>
         </div>
      </>
   );
}

export default BarangayReferralManagement;