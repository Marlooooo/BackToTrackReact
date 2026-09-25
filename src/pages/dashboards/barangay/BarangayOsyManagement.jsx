import SkOfficialSideBar from '../../../components/skOfficialSideBar';
import './BarangayOsyManagement.css';

function BarangayOsyManagement() {
   return (
      <>
         <div className='barangayOsyManagementBody'>
            <SkOfficialSideBar/>

            <div className='barangayMainContent'>

               <div className='barangayMainContentTopPart'>
                  <h1>
                     OSY Management
                  </h1>
                  <p>
                     Manage and view all Out-of-school youth in your barangay
                  </p>
               </div>


               <div className='barangayMainContentBotPart'>
                  <div className='searchAndAddOsy'>

                  </div>

                  <div className='osyList'>

                  </div>
               </div>

            </div>
         </div>
      </>
   );
}

export default BarangayOsyManagement;