# RareDex - Gamified Rare Item Collection App

A 24-hour hackathon web app where users upload images of rare items, propose category labels, and other users vote to verify the labels. Verified contributions award points and display on a percentile leaderboard.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
npm run preview
```

## 📁 Project Structure

```
src/
├── api/
│   ├── client.ts      # API client (toggles between mock and real)
│   ├── mock.ts        # Mock backend with seeded data
│   └── types.ts       # TypeScript type definitions
├── components/        # Reusable UI components
│   ├── Navbar.tsx
│   ├── Card.tsx
│   ├── SubmissionCard.tsx
│   ├── VoteButtons.tsx
│   ├── CameraCapture.tsx
│   ├── LabelSelect.tsx
│   ├── ProgressBadge.tsx
│   ├── PercentileBadge.tsx
│   ├── CollectionGrid.tsx
│   ├── LeaderboardTable.tsx
│   └── Toast.tsx
├── pages/            # Route pages
│   ├── Upload.tsx
│   ├── Verify.tsx
│   ├── Collection.tsx
│   └── Leaderboard.tsx
├── state/
│   └── store.ts       # Zustand state management
├── utils/            # Helper functions
│   ├── formatting.ts
│   └── imageHelpers.ts
├── App.tsx           # Main app component with routing
└── main.tsx          # Entry point
```

## 🎮 Demo Flow

### 1. Upload Flow (`/upload`) - "Add to RareDex"
- **Camera-first**: Camera automatically opens (default option)
- Take a photo using device camera (outputs JPEG)
- **Or** choose from library (PNG/WebP automatically converted to JPEG)
- Images optimized: resized to max 1600px, white background for transparency
- Preview shows "JPEG Optimized" badge with file size
- Search and select a category from improved selector
- Review submission in confirmation dialog
- Click "Add to RareDex" to submit (validates JPEG format)
- Toast notification confirms submission
- Automatically navigates to Collection page

### 2. Verify Flow (`/verify`) - "Verify Entries"
- Card stack interface showing one submission at a time
- Large, color-coded vote buttons: **Correct** (green), **Wrong** (red), **Unsure** (gray)
- Keyboard shortcuts: **C** (Correct), **W** (Wrong), **U** (Unsure) for speed
- Progress bar shows queue position
- Smooth slide animations between cards
- Toast notifications with rich feedback
- Confetti animation when item gets verified
- Leaderboard updates automatically

### 3. Collection Flow (`/collection`) - "Your Codex Book"
- **Collection Book**: Grid of category tiles (like stickers)
  - Locked tiles: Grayed with "?" pattern
  - Unlocked tiles: Show label name, checkmark, and thumbnail background
  - Progress bar at top showing completion percentage
- **Missions Sidebar**: Gamified achievements
  - "Verify 3 items"
  - "Upload a new class"
  - "Reach Top 20%"
  - Progress bars and checkmarks for completed missions
- **Recent Activity**: Timeline of your submissions with status badges
- **Stats Cards**: Collected count, Pending count, Total points

### 4. Leaderboard Flow (`/leaderboard`)
- **Hero Section**: Large card showing current user's stats
  - Rank (#X)
  - Percentile (e.g., "Top 12%")
  - Points, Verified count, Accuracy, Total votes
  - Gradient background with glassmorphism
- **Leaderboard Table**: 
  - Rank medals for top 3 (🥇 🥈 🥉)
  - Current user row highlighted
  - Percentile badges with color coding
  - Smooth animations on load
- **Tooltip**: "How percentile works" dialog for education

## 🔧 Switching from Mock to Real API

The app currently uses a mock API. To switch to a real backend:

1. Open `src/api/client.ts`
2. Change `USE_MOCK` to `false`:
   ```typescript
   const USE_MOCK = false;
   ```
3. Set the API base URL via environment variable:
   ```bash
   VITE_API_BASE_URL=http://your-api-url.com/api
   ```

The API client expects these endpoints:
- `GET /submissions/pending?excludeUserId={id}` - List pending submissions
- `POST /submissions` - Create new submission
- `POST /submissions/:id/vote` - Vote on submission
- `GET /users/:id/submissions` - Get user's submissions
- `GET /leaderboard` - Get leaderboard

## 🎯 Mock Backend Logic

### Consensus Rules
- Requires minimum **3 votes** (excluding 'unsure')
- **Verified** if: `correct / (correct + wrong) >= 0.7`
- **Rejected** if: `wrong / (correct + wrong) >= 0.7`

### Points System
- **Uploader**: +100 points when verified
- **First-in-class bonus**: +200 points for first verified submission per label globally
- **Voters**: +10 points when their vote matches the final outcome

### Seeded Data
- 15 category labels (Vintage Electronics, Rare Coins, etc.)
- 12 initial pending submissions across different labels
- 5 mock users with varying stats

## 🎨 Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **React Router** for client-side routing
- **Zustand** for state management
- **Tailwind CSS** for styling
- **shadcn/ui** components (Button, Card, Dialog, Badge, Progress, Tabs)
- **Lucide React** for icons
- **Framer Motion** for animations
- **Sonner** for toast notifications
- **Canvas Confetti** for celebration animations

## 📸 JPEG Enforcement

All uploaded images are automatically converted to JPEG format:
- **Camera capture**: Directly outputs JPEG (quality 0.85)
- **File uploads**: Converted from PNG/WebP/HEIC to JPEG
- **Optimization**: Images resized to max 1600px on longer side
- **Transparency**: PNG transparency filled with white background
- **Validation**: Final submission must be JPEG format

## 📱 Discovery Feed (Instagram-style)

The Discovery Feed (`/feed`) features:
- **Infinite scroll**: Automatically loads more as you scroll
- **Instagram-style posts**: Avatar, image, actions (Like/Save/Share), captions
- **Double-tap to like**: Tap image twice to like with heart animation
- **Tabs**: Trending / New / Verified filters
- **Pull-to-refresh**: Refresh button in header
- **Skeleton loaders**: Smooth loading states
- **Pagination**: Efficient cursor-based pagination

## 🔐 Authentication

Currently uses a mocked user ID (`user_demo_1`). To integrate real auth:

1. Replace `currentUserId` in `src/state/store.ts` with your auth provider
2. Update API client to include auth tokens in headers
3. Recommended: Use Supabase Auth or similar

## 📝 Development Notes

- All components are fully typed with TypeScript
- Loading states and error handling included
- Responsive design for mobile and desktop
- Clean component architecture for easy maintenance
- Mock data persists in memory (resets on page refresh)

## 🐛 Known Limitations

- Mock data resets on page refresh
- Image uploads use data URLs (not ideal for production)
- No real authentication (mocked user ID)
- No image optimization or compression

## 🚀 Future Enhancements

- Real backend API integration
- Supabase Auth integration
- Image upload to cloud storage (S3/Cloudinary)
- Real-time updates via WebSockets
- Image quality scoring
- Missions/achievements system
- Social features (follow users, comments)

## 🎬 Demo Script

### Complete Demo Flow (7-10 minutes)

1. **Upload** (`/upload`) → Mission Progress
   - Show camera capture interface
   - Take a photo (or use existing)
   - Select category with search
   - Show confirmation dialog
   - Submit → Toast appears → Navigate to Collection
   - **Highlight**: "First Entry" mission progress updates

2. **Verify** (`/verify`) → Badge Unlock
   - Show card stack interface
   - Demonstrate keyboard shortcuts (C/W/U)
   - Vote on 3 items (complete "Verifier" mission)
   - Show progress bar updating
   - Show confetti on verification
   - **Highlight**: After 3 votes, "Seal of Proof" badge unlocks with modal

3. **Collection** (`/collection`) → Badge Case
   - Show collection book grid
   - Point out locked vs unlocked tiles
   - **Show Badge Case section**: Display earned badges
   - Show missions sidebar with progress
   - Show recent activity timeline
   - Highlight stats cards
   - **Highlight**: Badge counter in sidebar header

4. **Get Verified** → Epic Badge
   - Navigate back to Verify
   - Vote on items until 2 of your uploads get verified
   - **Highlight**: "Curator's Crest" (epic) badge unlocks

5. **Discovery Feed** (`/feed`) - Instagram-style
   - **Sticky header** with tabs: Trending / New / Verified
   - **Infinite scroll**: Scroll down to automatically load more
   - **Instagram-style posts**:
     - Avatar with initials
     - Large square images
     - Like/Save/Share buttons
     - Like count and captions
     - Reason pills (Trending, New, Rare Find)
   - **Double-tap to like**: Tap image twice for heart animation
   - **Pull-to-refresh**: Refresh button in header
   - **Skeleton loaders** while loading
   - **Highlight**: Smooth scrolling, social interactions

6. **Leaderboard** (`/leaderboard`)
   - Show hero section with user stats
   - Highlight percentile badge
   - Show leaderboard table
   - Point out rank medals
   - Show "How percentile works" tooltip

### Key Features to Highlight

- **Missions & Badges**: Gamified rewards system with unlock animations
- **Discovery Feed**: Social feed with trending/new/verified tabs
- **Modern UI**: Glassmorphism, gradients, smooth animations
- **Responsive**: Sidebar on desktop, bottom tabs on mobile
- **Keyboard Shortcuts**: Fast verification workflow (C/W/U)
- **Real-time Feedback**: Toasts, confetti, badge unlock modals
- **Collection Book**: Visual progress tracking with unlockable categories
- **Badge Case**: Collectible badges with rarity tiers (common/rare/epic)

---

Built for HackandRoll 2026 🎯
