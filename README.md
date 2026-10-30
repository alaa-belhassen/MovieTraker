# CinéTrack

## Database

Set `MONGODB_URI` to a MongoDB connection string and optionally set `MONGODB_DB` (defaults to `cinetrack`) in the local environment and deployment environment. MongoDB stores app profiles, movie entries, favorite actors, shared lists, watch rooms, playback state, reports, and chat history. Keep the URI server-side; do not prefix it with `NEXT_PUBLIC_`.

Supabase remains the authentication provider and powers watch-room presence. Records already stored in Supabase or Upstash Redis are not copied automatically; export and import the data you need before switching a deployed app to MongoDB.

## PWA

La version installable se construit avec `pnpm build`, puis se teste avec `pnpm start` en ouvrant Chrome DevTools > Application. Le service worker est enregistré uniquement côté navigateur et l&apos;expérience hors ligne est disponible sur `/offline`.

Pour les notifications Web Push, générez des clés VAPID avec `npx web-push generate-vapid-keys`, puis renseignez `NEXT_PUBLIC_VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_KEY` dans l&apos;environnement de déploiement. Safari iOS affiche le guide d&apos;installation natif et limite les notifications aux versions récentes d&apos;iOS installées sur l&apos;écran d&apos;accueil.
