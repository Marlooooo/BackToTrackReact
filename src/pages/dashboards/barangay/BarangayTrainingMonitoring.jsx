import BarangaySideBar from '../../../components/skOfficialSideBar';
import './BarangayTrainingMonitoring.css'


function BarangayTrainingMonitoring() {
   return (
      <>
         <div className='barangayTrainingMonitoringBody'>
            <BarangaySideBar />

            <div className='barangayTrainingMonitoringContent'>
               <h1>Training Monitoring</h1>
            </div>
         </div>
      </>
   );
}

export default BarangayTrainingMonitoring;