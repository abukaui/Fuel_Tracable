# Automated Fuel Distribution & Anti-Black-Market Control System

## Week 1 Summary
The foundational layers of the system are complete:
- **Scaffold & DB**: Express server setup, generic configuration, database connection pooling (`pg`), structured migration runner (`db:check`, `migrate`, `seed`).
- **Authentication**: JWT-based auth with bcrypt hashing, enforcing role-based access (`ADMIN`, `DRIVER`, etc.).
- **Stations & Tanks CRUD**: Endpoints for managing stations and their associated physical tanks, fully guarded with Zod payload validation and role authorization.
- **ATG Simulation**: A background cron job simulates real-time Automatic Tank Gauge (ATG) volume readings, mimicking typical fluctuations. Exposes endpoints to query historical and latest tank volumes.

*(Note: Fuel requests, OTP generation, reconciliation, USSD integration, and the frontend dashboard are NOT built yet—these belong to Week 2 and beyond).*

## Local Development
To test the ATG Simulator locally with a short interval:
1. Update your `.env` to include: `ATG_SIMULATOR_INTERVAL_CRON="*/30 * * * * *"` (every 30 seconds).
2. Start the server: `npm run dev`
3. Hit the `/api/tanks/:id/readings/latest` endpoint repeatedly to see the simulated volume changes.
