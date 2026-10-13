import BarangaySideBar from '../../../components/skOfficialSideBar';
import './BarangayCourseRecommendation.css'


function BarangayCourseRecommendation() {
   return (
      <>
         <div className='barangayCourseRecommendationBody'>
            <BarangaySideBar />

            <div className='barangayCourseRecommendationContent'>
               <h1>Course Recommendation</h1>
            </div>
         </div>
      </>
   );
}

export default BarangayCourseRecommendation;