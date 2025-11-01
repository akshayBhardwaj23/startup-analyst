# VC Analyst AI - Architecture Documentation

## Overview

VC Analyst AI is a Next.js-based application powered by Google Gemini AI that provides comprehensive venture capital analysis of startup documents.

## Architecture Layers

### 1. Frontend Layer (Next.js 15 + React)

#### Pages

- **Home Page** (`/`)

  - Document upload interface (PDF/DOCX)
  - Analysis initiation
  - Rate limiting display (25 analyses per user)
  - App description and features

- **Results Page** (`/results/[id]`)

  - Structured analysis display
  - Visual components (charts, matrices, frameworks)
  - Industry and stage tags
  - Founder and contact information
  - Risk assessment with severity indicators
  - PDF export functionality

- **History Page** (`/history`)
  - List of analyzed companies
  - Company-specific analysis history (`/history/[companyId]`)
  - Filterable by industry and stage tags
  - Timestamps for each analysis

#### Components

- **Strategic Frameworks**

  - `AnsoffMatrix.tsx` - Market/product strategy visualization
  - `BusinessModelCanvas.tsx` - 9-block business model framework
  - `RogersBellCurve.tsx` - Adoption curve positioning

- **UI Components**
  - `NavBar.tsx` - Navigation with usage counter
  - `ChatDrawer.tsx` - Interactive chat interface
  - Rating gauges and progress indicators

#### State Management

- React Hooks (useState, useEffect, useCallback)
- Session management via NextAuth
- Real-time usage tracking

### 2. API Layer (Next.js API Routes)

#### Core Routes

**`/api/analyze`** (POST)

- Main analysis endpoint
- Processes uploaded documents
- Orchestrates AI analysis
- Enforces rate limiting (25 analyses/user)
- Increments user analysis count
- Returns structured JSON with:
  - Industry and stage categorization
  - Problem/solution analysis
  - Market analysis (TAM, ICP, GTM)
  - Team and founder details
  - Contact information
  - Risk assessment with severity levels
  - Strategic frameworks (Ansoff, BMC, Rogers)
  - Traction and business model
  - Ratings and hypotheses

**`/api/results/[id]`** (GET)

- Fetches specific analysis by ID
- Returns brief, web search data, and metadata
- Includes previous analyses for the same company
- Secured by user authentication

**`/api/web-search`** (POST)

- Performs online research about the company
- Fetches latest news and updates
- Gathers market growth data
- Uses Gemini 2.5 Flash Lite for efficiency

**`/api/history/[companyId]`** (GET)

- Returns all analyses for a specific company
- Includes timestamps, industry, and stage tags
- Sorted by creation date

**`/api/blob/upload`** (POST)

- Handles file uploads to Vercel Blob
- Parses PDF and DOCX files
- Extracts text content
- Returns file URLs and parsed text

**`/api/user/usage`** (GET)

- Fetches user's analysis usage statistics
- Returns used count, limit, and remaining analyses
- Real-time usage tracking

**`/api/auth/[...nextauth]`**

- NextAuth.js authentication handler
- Google OAuth 2.0 integration
- Session management

#### Core Services

**Prisma ORM**

- Type-safe database queries
- Schema management and migrations
- Models: User, Company, AnalysisRun
- Relationship handling

**Document Processing**

- PDF parsing using `pdf-parse`
- DOCX parsing using `mammoth`
- Text extraction and chunking
- Multi-document support

**AI Processing**

- Structured prompt engineering
- JSON schema enforcement
- Strategic framework analysis
- Tag generation (industry, stage)
- Founder and contact extraction
- Risk severity assessment

**Rate Limiting**

- Per-user analysis count tracking
- 25 analyses limit per user
- Database-backed counting
- Real-time limit enforcement
- User-friendly error messages

### 3. Data Layer

#### PostgreSQL Database (via Prisma)

**User Model**

```prisma
model User {
  id            String    @id @default(cuid())
  email         String?   @unique
  analysisCount Int       @default(0)
  companies     Company[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

**Company Model**

```prisma
model Company {
  id        String        @id @default(cuid())
  name      String
  userId    String
  user      User          @relation(fields: [userId], references: [id])
  runs      AnalysisRun[]
  createdAt DateTime      @default(now())
}
```

**AnalysisRun Model**

```prisma
model AnalysisRun {
  id         String   @id @default(cuid())
  companyId  String
  company    Company  @relation(fields: [companyId], references: [id])
  userId     String
  brief      Json
  industry   String?
  stage      String?
  fileUrls   String[]
  fileNames  String[]
  createdAt  DateTime @default(now())
}
```

#### Vercel Blob Storage

- Secure document storage
- PDF and DOCX file handling
- Unique URL generation
- Access control via signed URLs

### 4. External Services

#### Google Gemini AI (Vertex AI)

**Gemini 2.5 Pro** - Primary Analysis

- High-quality structured analysis
- Strategic framework generation
- Comprehensive startup evaluation
- JSON mode for structured output

**Gemini 2.5 Flash Lite** - Web Search

- Real-time online research
- Market data gathering
- News and updates aggregation
- Cost-efficient for search tasks

**AI Capabilities:**

- Problem/solution identification
- Market sizing (TAM, target segment, growth)
- Team and founder analysis
- Contact information extraction
- Competitive moat assessment
- Risk evaluation with severity levels
- Industry categorization (FinTech, HealthTech, etc.)
- Stage determination (Pre-seed, Seed, Series A+)
- Strategic frameworks:
  - Ansoff Matrix (market/product strategy)
  - Business Model Canvas (9-block framework)
  - Rogers Bell Curve (adoption positioning)

#### Google OAuth 2.0

- Secure user authentication
- Email-based user identification
- Session token management
- Automatic account creation

## Data Flow

### Analysis Flow

```
1. User uploads document(s) → Frontend
2. Files sent to /api/blob/upload → Vercel Blob Storage
3. Text extracted from documents
4. /api/analyze called with text → Gemini 2.5 Pro
5. AI generates structured analysis (JSON)
6. /api/web-search called → Gemini 2.5 Flash Lite
7. Results saved to PostgreSQL
8. User redirected to /results/[id]
9. Results page fetches and displays formatted analysis
```

### Authentication Flow

```
1. User clicks "Sign in with Google"
2. Redirected to Google OAuth
3. Google authenticates user
4. Callback to /api/auth/callback
5. User record created/fetched in database
6. Session established with JWT
7. User authenticated across all routes
```

### Rate Limiting Flow

```
1. User initiates analysis
2. /api/analyze checks user.analysisCount
3. If count >= 25, return 429 error
4. If count < 25, proceed with analysis
5. After successful analysis, increment count
6. Display remaining analyses in UI (navbar + home page)
```

## Key Features

### AI-Powered Analysis

- ✅ One-liner pitch extraction
- ✅ Problem and solution identification
- ✅ ICP (Ideal Customer Profile) and GTM (Go-To-Market) strategy
- ✅ Traction bullets with evidence
- ✅ Business model analysis
- ✅ TAM (Total Addressable Market) breakdown
- ✅ Team evaluation
- ✅ Founder profiles with LinkedIn and email
- ✅ Company contact information
- ✅ Competitive moat assessment
- ✅ Risk analysis with severity levels (HIGH, MEDIUM, LOW)
- ✅ Hypotheses generation with evidence status
- ✅ Founder questions and due diligence points
- ✅ Multi-dimensional ratings (team, market, product, moat, traction, risk)

### Strategic Frameworks

- ✅ **Ansoff Matrix**: Market penetration, development, product development, diversification
- ✅ **Business Model Canvas**: 9-block analysis (partners, activities, resources, value props, customer relationships, channels, segments, costs, revenue)
- ✅ **Rogers Bell Curve**: Adoption category (innovators, early adopters, early/late majority, laggards)

### Smart Tagging

- ✅ **Industry Tags**: FinTech, HealthTech, EdTech, PropTech, CleanTech, AI/ML, etc.
- ✅ **Stage Labels**: Idea, Pre-seed, Seed, Series A/B/C+, Growth
- ✅ Auto-generated by AI from document analysis
- ✅ Displayed on history and results pages with tooltips

### User Experience

- ✅ Rate limiting with visual counter (25 analyses per user)
- ✅ Color-coded usage display (red ≤5, amber ≤10, blue >10)
- ✅ PDF export of analysis
- ✅ Analysis history with timestamps
- ✅ Previous run comparison
- ✅ Responsive design (mobile-friendly)
- ✅ Dark theme with gradient accents
- ✅ Interactive visualizations

### Security & Scalability

- ✅ NextAuth.js authentication
- ✅ Row-level security (users only see their analyses)
- ✅ Rate limiting to prevent abuse
- ✅ Secure file storage with Vercel Blob
- ✅ Database indexing for performance
- ✅ Type-safe API with TypeScript

## Technology Stack

### Frontend

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom React components
- **Charts**: jsPDF for PDF generation
- **Authentication**: NextAuth.js

### Backend

- **Runtime**: Node.js (Next.js API Routes)
- **Database ORM**: Prisma
- **Database**: PostgreSQL
- **File Storage**: Vercel Blob
- **Authentication**: NextAuth.js + Google OAuth

### AI & External Services

- **Primary AI**: Google Gemini 2.5 Pro (Vertex AI)
- **Search AI**: Google Gemini 2.5 Flash Lite (Vertex AI)
- **Auth Provider**: Google OAuth 2.0

### Document Processing

- **PDF**: pdf-parse
- **DOCX**: mammoth
- **Text Processing**: Custom chunking algorithms

### Deployment

- **Platform**: Vercel (recommended)
- **Database**: PostgreSQL (Vercel Postgres, Supabase, or similar)
- **Storage**: Vercel Blob
- **Region**: Auto-selected based on user location

## Performance Optimizations

1. **Dynamic Imports**: Components loaded on-demand to reduce initial bundle size
2. **Database Indexing**: Optimized queries for company and user lookups
3. **Blob Storage**: CDN-backed file delivery
4. **SSR/SSG**: Server-side rendering for faster page loads
5. **Rate Limiting**: Prevents API abuse and manages costs
6. **Efficient AI Model Selection**: 2.5 Pro for analysis, 2.5 Flash Lite for search

## Security Considerations

1. **Authentication Required**: All API routes protected by NextAuth
2. **User Isolation**: Row-level security ensures data privacy
3. **Rate Limiting**: Prevents abuse and runaway costs
4. **Secure File Storage**: Blob URLs with time-limited access
5. **Input Validation**: All user inputs sanitized
6. **CORS Protection**: API routes restricted to same-origin
7. **Environment Variables**: Sensitive keys stored securely

## Future Enhancements

- [ ] Advanced filtering and search in history
- [ ] Collaborative features (team access)
- [ ] Custom report templates
- [ ] Integration with pitch deck parsers
- [ ] Financial model analysis
- [ ] Competitive landscape mapping
- [ ] Email notifications for analysis completion
- [ ] API for programmatic access
- [ ] Bulk analysis capabilities
- [ ] Custom AI training on user feedback

---

**Built for Google AI Hackathon 2025**
Powered by Google Gemini AI via Vertex AI
