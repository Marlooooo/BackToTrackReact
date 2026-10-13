import BarangaySideBar from '../../../components/skOfficialSideBar';
import './BarangayNotifications.css'


function BarangayNotifications() {
   return (
      <>
         <div className='barangayNotificationsBody'>
            <BarangaySideBar />

            <div className='barangayNotificationsContent'>
               <h1>Notifications</h1>
            </div>
         </div>
      </>
   );
}

export default BarangayNotifications;