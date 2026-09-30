import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaEnrollees.css';

function MaximaEnrollees() {
   return (
      <>
         <div className='maximaDashboardBody'>
            <MaximaSideBar/>

            <div className='maximaMainContent'>
               {/* Enrollees content goes here */}
            </div>
         </div>
      </>
   );
}

export default MaximaEnrollees;