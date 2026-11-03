import { useState, useEffect, useCallback } from "react";

export default function useUnreadCount(intervalMs = 30000) {
   const [count, setCount] = useState(0);

   // Asks Laravel for the unread count and stores it in state
   const refresh = useCallback(async () => {
      try {
         const res = await fetch("http://localhost:8000/api/notifications/unread-count", {
            headers: { Accept: "application/json" },
            credentials: "include", // sends your Sanctum session cookie
         });

         if (!res.ok) return; // e.g. 401 when logged out: just keep the old number

         const data = await res.json();
         setCount(data.count ?? 0);
      } catch {
         // A badge isn't worth showing an error for
      }
   }, []);

   useEffect(() => {
      refresh(); // fetch once when the sidebar appears

      const id = setInterval(refresh, intervalMs); // then poll every 30s

      // Refetch when the user comes back to the browser tab
      window.addEventListener("focus", refresh);

      // Refetch when a notifications page says "something was read"
      window.addEventListener("notifications-updated", refresh);

      // Cleanup so timers/listeners don't pile up
      return () => {
         clearInterval(id);
         window.removeEventListener("focus", refresh);
         window.removeEventListener("notifications-updated", refresh);
      };
   }, [refresh, intervalMs]);

   return { count, refresh };
}