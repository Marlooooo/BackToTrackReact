import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaAnnouncement.css';

function MaximaAnnouncement() {
   return (
      <>
         <div className='maximaAnnouncementBody'>
            <MaximaSideBar/>

            <div className='maximaMainContent'>
               {/* Announcements content goes here */}
            </div>
         </div>
      </>
   );
}

export default MaximaAnnouncement;