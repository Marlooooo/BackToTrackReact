   import MaximaSideBar from '../../components/maximaSideBar';
   import './MaximaProgramManagement.css'
   
   
   function MaximaProgramManagement() {
   return (
      <>
         <div className='maximaDashboardBody'>

            <MaximaSideBar/>

            <div className='programManagementMainDiv'>

               <div className='programManagementTopPart'>
                  <h1>Program Management</h1>
                  <p>Manage MAXIMA training programs and information.</p>
               </div>

               <div className='programManagementBotPart'>
                  <div>
                     
                  </div>
               </div>

            </div>

         </div>

      </>
      );
   }

   export default MaximaProgramManagement;