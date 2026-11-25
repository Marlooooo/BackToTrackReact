import { useState, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";

// Accounts that still have a step to finish can only use that page
const VERIFY_EMAIL_PATH = "/verify-email";
const CHANGE_PASSWORD_PATH = "/change-password";

function ProtectedRoute({ children }) {
   const location = useLocation();
   const [authChecked, setAuthChecked] = useState(false);
   const [isAuthed, setIsAuthed] = useState(false);
   const [mustVerifyEmail, setMustVerifyEmail] = useState(false);
   const [mustChangePassword, setMustChangePassword] = useState(false);

   useEffect(() => {
      fetch("/api/user", {
         credentials: "include",
      })
         .then(async (res) => {
            setIsAuthed(res.ok);

            if (res.ok) {
               const user = await res.json().catch(() => null);
               setMustVerifyEmail(Boolean(user?.must_verify_email));
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

   if (mustVerifyEmail && location.pathname !== VERIFY_EMAIL_PATH) {
      return <Navigate to={VERIFY_EMAIL_PATH} replace />;
   }

   if (mustChangePassword && location.pathname !== CHANGE_PASSWORD_PATH) {
      return <Navigate to={CHANGE_PASSWORD_PATH} replace />;
   }

   return children;
}

export default ProtectedRoute;