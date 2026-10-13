import BarangaySideBar from '../../../components/skOfficialSideBar';
import './BarangayReports.css'


function BarangayReports() {
   return (
      <>
         <div className='barangayReportsBody'>
            <BarangaySideBar />

            <div className='barangayReportsContent'>
               <h1>Reports</h1>
            </div>
         </div>
      </>
   );
}

export default BarangayReports;