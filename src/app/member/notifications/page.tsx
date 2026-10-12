// The notifications feed is identical for students and club members: both
// read their own `notifications/{userId}` docs in realtime. Rather than fork
// a second copy of a ~600-line page (which is how the two drift apart), the
// member portal renders the same component under its own route.
import NotificationsPage from "@/app/u/notifications/page";

export default NotificationsPage;
