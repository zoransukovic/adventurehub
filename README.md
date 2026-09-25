# AdventureHub 🏔️

Web aplikacija za ponudu i potražnju outdoor tura i aktivnosti u turizmu.

## Tehnologije
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes
- **Baza podataka:** PostgreSQL + Prisma ORM
- **Auth:** JWT tokeni u httpOnly cookieju, bcrypt lozinke

## Funkcionalnosti
- Registracija/login (turista, vodič, admin)
- Pretraga i filtriranje tura po aktivnosti
- Kreiranje tura sa rutom (3 koraka)
- Live GPS tracking tokom ture (navigator.geolocation)
- Chat između turiste i vodiča
- Sistem recenzija i ocjenjivanja
- Rezervacije termina
- Notifikacije (in-app)
- Admin panel: upravljanje aktivnostima, odobravanje vodiča

## Pokretanje

### 1. Instaliraj zavisnosti
\`\`\`bash
npm install
\`\`\`

### 2. Postavi PostgreSQL bazu
Kreiraj PostgreSQL bazu podataka i postavi connection string:
\`\`\`bash
cp .env.example .env
# Izmijeni DATABASE_URL i JWT_SECRET u .env
\`\`\`

### 3. Pokreni migracije i seed
\`\`\`bash
npm run db:migrate    # Kreira tabele u bazi
npm run db:seed       # Dodaje početne podatke + admin nalog
\`\`\`

**Admin nalog:** `admin@adventurehub.me` / `PromijeniMe123!`  
⚠️ **Obavezno promijeni lozinku nakon prve prijave!**

### 4. Pokreni razvojni server
\`\`\`bash
npm run dev
\`\`\`
Aplikacija je dostupna na http://localhost:3000

## Hosting (Preporučeno)

### Vercel + Supabase (besplatno)
1. Kreiraj Supabase projekat → dobij PostgreSQL connection string
2. Povezi GitHub repozitorijum sa Vercel
3. U Vercel environment variables postavi:
   - `DATABASE_URL` = Supabase connection string (sa `?pgbouncer=true&connection_limit=1`)
   - `JWT_SECRET` = random string od 64+ karaktera
4. U build settings dodaj: `npm run db:deploy` before build
5. Deploy!

### VPS (DigitalOcean, Hetzner...)
\`\`\`bash
npm run build
npm run db:deploy
npm start
\`\`\`
Koristi PM2 ili systemd za process management.

## Mapa - Integracija

Na produkciji zamijeni placeholder mapu sa Mapbox ili Leaflet:
\`\`\`bash
npm install mapbox-gl @types/mapbox-gl
# ili
npm install leaflet react-leaflet @types/leaflet
\`\`\`
Dodaj `NEXT_PUBLIC_MAPBOX_TOKEN` u `.env` i zamijeni sadržaj `app/map/page.tsx`.

## Struktura projekta
\`\`\`
app/
  (auth)/          # Login, Register
  api/             # Svi backend API endpointi
    auth/          # register, login, logout, me
    activities/    # CRUD za vrste aktivnosti (admin)
    tours/         # CRUD za ture + recenzije
    tracking/      # GPS tracking sesije
    messages/      # Chat
    bookings/      # Rezervacije
    notifications/ # In-app notifikacije
    admin/         # Admin: vodiči, statistike
  dashboard/       # Početna - lista tura
  tours/           # Detalji ture, nova tura
  tracking/        # Live GPS tracking
  messages/        # Chat inbox i razgovori
  notifications/   # Centar obavještenja
  profile/         # Profil korisnika
  admin/           # Admin panel
  map/             # Mapa svih tura
  bookings/        # Moje rezervacije
  components/      # Navbar, StarRating
lib/               # prisma, auth, guard, notify
prisma/
  schema.prisma    # Šema baze podataka
  seed.ts          # Početni podaci
\`\`\`

## Buduće nadogradnje
- WebSocket real-time chat (Socket.io ili Pusher)
- Mapbox/Leaflet interaktivna mapa sa crtanjem ruta
- Email notifikacije (Resend/Nodemailer)
- Platni sistem (Stripe)
- PWA (instalacija na mobilni)
- Push notifikacije
