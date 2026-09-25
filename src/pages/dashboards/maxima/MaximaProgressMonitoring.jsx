import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaProgressMonitoring.css';

function MaximaProgressMonitoring() {
   return (
      <>
         <div className='maximaProgressMonitoringBody'>
            <MaximaSideBar/>

            <div className='maximaMainContent'>
               {/* Progress Monitoring content goes here */}
            </div>
         </div>
      </>
   );
}

export default MaximaProgressMonitoring;