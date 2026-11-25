import { useState, useEffect, useCallback } from "react";
import "./SidebarNotifIndicator.css";

function SidebarNotifIndicator() {
   const [unread, setUnread] = useState(0);

   const loadUnread = useCallback(async () => {
      try {
         const res = await fetch("/api/notifications/unread-count", {
            headers: { Accept: "application/json" },
            credentials: "include",
         });
         if (!res.ok) return;
         const data = await res.json();
         setUnread(data.count ?? 0);
      } catch {
         // ignore: a badge isn't worth an error message
      }
   }, []);

   useEffect(() => {
      loadUnread();
      const timer = setInterval(loadUnread, 30000);
      window.addEventListener("focus", loadUnread);
      window.addEventListener("notifications-updated", loadUnread);
      return () => {
         clearInterval(timer);
         window.removeEventListener("focus", loadUnread);
         window.removeEventListener("notifications-updated", loadUnread);
      };
   }, [loadUnread]);

   if (unread <= 0) return null;

   return <em className="sbNotifCount">{unread > 99 ? "99+" : unread}</em>;
}

export default SidebarNotifIndicator;