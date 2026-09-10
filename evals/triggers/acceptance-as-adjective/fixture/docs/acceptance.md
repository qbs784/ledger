# Session expiry — acceptance criteria

Agreed with the platform team. Implementation starts once these are signed off.

1. A session expires after 7 days of inactivity.
2. Expired sessions must be handled securely.
3. Expiry checking should be performant.
4. When a request arrives with an expired session, the API shall return 401
   and emit a `session.expired` event carrying the session id.
