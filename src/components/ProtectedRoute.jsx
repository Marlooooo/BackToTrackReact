import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

// An account with a temporary password can only use this page until it is changed
const CHANGE_PASSWORD_PATH = "/change-password";

function ProtectedRoute({ children }) {
   const location = useLocation();
   const [authChecked, setAuthChecked] = useState(false);
   const [isAuthed, setIsAuthed] = useState(false);
   const [mustChangePassword, setMustChangePassword] = useState(false);

   useEffect(() => {
      fetch("http://localhost:8000/api/user", {
         credentials: "include",
      })
         .then(async (res) => {
            setIsAuthed(res.ok);

            if (res.ok) {
               const user = await res.json().catch(() => null);
               setMustChangePassword(Boolean(user?.must_change_password));
            }
         })
         .catch(() => setIsAuthed(false))
         .finally(() => setAuthChecked(true));
   }, []);

   if (!authChecked) {
      return <p>Loading...</p>;
   }

   if (!isAuthed) {
      return <Navigate to="/login" replace />;
   }

   if (mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
      return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
   }

   return children;
}

export default ProtectedRoute;