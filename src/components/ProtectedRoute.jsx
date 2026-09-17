import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
   const [authChecked, setAuthChecked] = useState(false);
   const [isAuthed, setIsAuthed] = useState(false);

   useEffect(() => {
      fetch("http://localhost:8000/api/user", {
         credentials: "include",
      })
         .then((res) => setIsAuthed(res.ok))
         .catch(() => setIsAuthed(false))
         .finally(() => setAuthChecked(true));
   }, []);

   if (!authChecked) {
      return <p>Loading...</p>;
   }

   return isAuthed ? children : <Navigate to="/login" replace />;
}

export default ProtectedRoute;