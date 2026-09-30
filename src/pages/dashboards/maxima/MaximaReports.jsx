import MaximaSideBar from '../../../components/maximaSideBar';
import './MaximaReports.css';

function MaximaReports() {
   return (
      <>
         <div className='maximaDashboardBody'>
            <MaximaSideBar/>

            <div className='maximaMainContent'>
               {/* Reports content goes here */}
            </div>
         </div>
      </>
   );
}

export default MaximaReports;