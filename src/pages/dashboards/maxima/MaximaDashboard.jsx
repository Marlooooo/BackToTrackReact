   import MaximaSideBar from '../../../components/maximaSideBar';
   import './MaximaDashboard.css'
   
   
   function MaximaDashboard() {
   return (
      <>
         <div className='maximaDashboardBody'>


            <MaximaSideBar/>

            <div className='maximaMainDashboard'>

               <div className='maximaMainDashboardTop'>
                  <h1>Maxima Dashboard</h1>
               </div>

               <div className='maximaMainDashboardMid'>
                  <div className='referralRequestDiv'>
                     <p>Referral Request</p>
                     <h2></h2>
                     <p>Pending</p>
                  </div>

                  <div className='threeMidSmallDiv'>

                     <div className='threeMidSmallCardsDiv'>
                        <div className='threeMidSmallCards'>
                           <p>Enrollees</p>
                           <h2></h2>
                           <p>Pending</p>
                        </div>
                        <div className='threeMidSmallCards'>
                           <p>Active Trainings</p>
                           <h2></h2>
                           <p>On Going</p>
                        </div>
                     </div>

                     <div className='threeMidSmallCardsDiv'>
                        <div className='threeMidSmallCards'>
                           <p>Completed Trainings</p>
                           <h2></h2>
                           <p>This Year</p>
                        </div>
                        <div className='threeMidSmallCards'>
                           <p>Completed Trainings</p>
                           <h2></h2>
                           <p>This Year</p>
                        </div>
                     </div>

                  </div>

               </div>



               <div className='maximaMainDashboardBot'>

                  <div className='dashboardBotLeft'>
                     <h1></h1>
                  </div>

                  <div className='dashboardBotRight'>
                     <h1></h1>
                  </div>

               </div>



            </div>

         </div>

      </>
      );
   }

   export default MaximaDashboard;