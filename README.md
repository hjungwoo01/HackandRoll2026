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

### Git Branch Setup

```bash
# Initialize git (if not already done)
git init

# Create and switch to frontend-mvp branch
git checkout -b frontend-mvp

# Add all files
git add .

# Commit with clear message
git commit -m "feat: implement RareDex frontend MVP with React + TypeScript

- Set up Vite + React + TypeScript + Tailwind CSS
- Implement 4 main pages: Upload, Verify, Collection, Leaderboard
- Create mock API with seeded data and consensus logic
- Add Zustand state management
- Implement all required components and utilities
- Add toast notifications and confetti animations
- Include comprehensive README"
```

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
│   ├── UploadDropzone.tsx
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

### 1. Upload Flow (`/upload`)
- Drag and drop or click to upload an image
- Select a category from the dropdown
- Submit for verification
- Toast notification confirms submission
- Automatically navigates to Collection page

### 2. Verify Flow (`/verify`)
- View feed of pending submissions (excluding your own)
- Vote on each submission: **Correct**, **Wrong**, or **Unsure**
- After voting, item is removed from feed
- Toast confirms vote was recorded
- Confetti animation plays on verification
- Leaderboard updates automatically

### 3. Collection Flow (`/collection`)
- View collection grid showing all available categories
- Filled slots indicate verified submissions for that category
- Progress badge shows "X / N collected"
- Recent submissions list with status badges:
  - 🟡 **Pending** - Awaiting verification
  - 🟢 **Verified** - Approved by community
  - 🔴 **Rejected** - Community rejected the label

### 4. Leaderboard Flow (`/leaderboard`)
- Table of top users ranked by points
- Percentile badges show relative ranking
- Current user row is highlighted
- Stats include:
  - Points
  - Verified uploads
  - Correct votes / Total votes
  - Percentile ranking

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
- **Canvas Confetti** for celebration animations

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

---

Built for HackandRoll 2026 🎯
