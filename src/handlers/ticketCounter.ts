/**
 * Generate a pseudo-random ticket ID: 5-digit alphanumeric (uppercase).
 * Example: #A3K7F, #9BX2M
 * Collision-resistant enough for ticket volumes.
 */
export function nextTicketId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
    let id = '';
    for (let i = 0; i < 5; i++) {
        id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
}
