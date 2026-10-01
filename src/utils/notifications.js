/* A notification counts as unread until the backend marks it read. */
export const isUnread = (n) => !(n.read ?? n.isRead ?? n.seen ?? false);
