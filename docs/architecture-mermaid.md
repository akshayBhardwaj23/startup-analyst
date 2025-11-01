# VC Analyst AI - Mermaid Architecture Diagrams

## High-Level System Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[Home Page] --> B[Results Page]
        A --> C[History Page]
        D[Components] --> B
        D --> C
        E[Auth UI] --> A
    end

    subgraph "API Layer"
        F[/api/analyze]
        G[/api/results]
        H[/api/web-search]
        I[/api/blob/upload]
        J[/api/user/usage]
        K[/api/history]
    end

    subgraph "Services"
        L[Prisma ORM]
        M[Document Parser]
        N[AI Processor]
        O[Rate Limiter]
    end

    subgraph "Data Layer"
        P[(PostgreSQL)]
        Q[Vercel Blob Storage]
    end

    subgraph "External Services"
        R[Google Gemini AI]
        S[Google OAuth]
    end

    A --> F
    B --> G
    C --> K
    A --> I
    A --> J

    F --> N
    F --> O
    G --> L
    H --> R
    I --> M
    J --> L
    K --> L

    L --> P
    M --> Q
    N --> R
    O --> P

    E --> S

    style A fill:#6366f1
    style B fill:#6366f1
    style C fill:#6366f1
    style D fill:#6366f1
    style E fill:#6366f1
    style F fill:#3b82f6
    style G fill:#3b82f6
    style H fill:#3b82f6
    style I fill:#3b82f6
    style J fill:#3b82f6
    style K fill:#3b82f6
    style L fill:#14b8a6
    style M fill:#14b8a6
    style N fill:#14b8a6
    style O fill:#14b8a6
    style P fill:#10b981
    style Q fill:#10b981
    style R fill:#f59e0b
    style S fill:#f59e0b
```

## Analysis Flow Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant API as API Routes
    participant Blob as Vercel Blob
    participant AI as Gemini AI
    participant DB as PostgreSQL

    U->>F: Upload Document(s)
    F->>API: POST /api/blob/upload
    API->>Blob: Store Files
    Blob-->>API: File URLs
    API-->>F: Parsed Text + URLs

    F->>API: POST /api/analyze
    API->>DB: Check Rate Limit
    alt Limit Exceeded
        DB-->>API: Count >= 25
        API-->>F: 429 Error
    else Within Limit
        DB-->>API: Count < 25
        API->>AI: Analyze Documents
        AI-->>API: Structured JSON
        API->>AI: Web Search
        AI-->>API: Market Data
        API->>DB: Save Analysis
        API->>DB: Increment Count
        DB-->>API: Success
        API-->>F: Analysis ID
        F->>U: Redirect to Results
    end

    U->>F: View Results
    F->>API: GET /api/results/[id]
    API->>DB: Fetch Analysis
    DB-->>API: Brief + Metadata
    API-->>F: Analysis Data
    F->>U: Display Formatted Results
```

## Database Schema Diagram

```mermaid
erDiagram
    User ||--o{ Company : creates
    User ||--o{ AnalysisRun : performs
    Company ||--o{ AnalysisRun : has

    User {
        string id PK
        string email
        int analysisCount
        datetime createdAt
        datetime updatedAt
    }

    Company {
        string id PK
        string name
        string userId FK
        datetime createdAt
    }

    AnalysisRun {
        string id PK
        string companyId FK
        string userId FK
        json brief
        string industry
        string stage
        string[] fileUrls
        string[] fileNames
        datetime createdAt
    }
```

## AI Processing Pipeline

```mermaid
flowchart LR
    A[Document Upload] --> B[Parse PDF/DOCX]
    B --> C[Extract Text]
    C --> D{Text > Max Tokens?}
    D -->|Yes| E[Chunk Text]
    D -->|No| F[Send to Gemini]
    E --> F
    F --> G[Gemini 2.0 Flash]
    G --> H[Structured Analysis]
    H --> I[Generate Tags]
    H --> J[Extract Founders]
    H --> K[Assess Risks]
    H --> L[Apply Frameworks]
    I --> M[Industry/Stage]
    J --> N[Contact Info]
    K --> O[Severity Levels]
    L --> P[Ansoff/BMC/Rogers]
    M --> Q[Save to DB]
    N --> Q
    O --> Q
    P --> Q
    Q --> R[Display Results]

    style G fill:#f59e0b
    style Q fill:#10b981
```

## Rate Limiting Flow

```mermaid
flowchart TD
    A[User Initiates Analysis] --> B{Check analysisCount}
    B -->|Count >= 25| C[Return 429 Error]
    B -->|Count < 25| D[Process Analysis]
    C --> E[Display Error Message]
    D --> F[Analysis Complete]
    F --> G[Increment analysisCount]
    G --> H[Save to Database]
    H --> I[Update UI Counter]

    I --> J{Remaining <= 5?}
    J -->|Yes| K[Show Red Warning]
    J -->|No| L{Remaining <= 10?}
    L -->|Yes| M[Show Amber Warning]
    L -->|No| N[Show Blue Info]

    style C fill:#ef4444
    style K fill:#ef4444
    style M fill:#f59e0b
    style N fill:#3b82f6
```

## Authentication Flow

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant NA as NextAuth
    participant GO as Google OAuth
    participant DB as Database

    U->>F: Click "Sign in with Google"
    F->>NA: Initiate OAuth
    NA->>GO: Redirect to Google
    GO->>U: Show Google Login
    U->>GO: Enter Credentials
    GO->>NA: Return Auth Token
    NA->>DB: Check/Create User
    DB-->>NA: User Record
    NA->>NA: Generate Session JWT
    NA-->>F: Set Session Cookie
    F->>U: Redirect to Dashboard

    Note over U,DB: User is now authenticated

    U->>F: Access Protected Route
    F->>NA: Verify Session
    NA-->>F: Valid Session
    F->>U: Show Protected Content
```

## Component Hierarchy

```mermaid
graph TD
    A[App Layout] --> B[NavBar]
    A --> C[Home Page]
    A --> D[Results Page]
    A --> E[History Page]

    C --> F[Document Upload]
    C --> G[Analysis Button]
    C --> H[Usage Counter]

    D --> I[One-Liner]
    D --> J[Ratings Gauges]
    D --> K[Analysis Sections]
    D --> L[Strategic Components]
    D --> M[Previous Runs]

    K --> N[Problem/Solution]
    K --> O[Team/Founders]
    K --> P[Contact Info]
    K --> Q[Risks with Severity]

    L --> R[AnsoffMatrix]
    L --> S[BusinessModelCanvas]
    L --> T[RogersBellCurve]

    E --> U[Company List]
    E --> V[Company Detail]

    U --> W[Company Cards]
    U --> X[Industry/Stage Tags]

    style A fill:#1e293b
    style D fill:#6366f1
    style L fill:#8b5cf6
    style R fill:#f59e0b
    style S fill:#f59e0b
    style T fill:#f59e0b
```

## Feature Dependencies

```mermaid
mindmap
  root((VC Analyst AI))
    Frontend
      Next.js 15
      React Components
      Tailwind CSS
      TypeScript
    Backend
      API Routes
      Prisma ORM
      Rate Limiting
      File Parsing
    AI Features
      Document Analysis
      Strategic Frameworks
        Ansoff Matrix
        Business Model Canvas
        Rogers Bell Curve
      Tag Generation
      Risk Assessment
      Founder Extraction
    Data
      PostgreSQL
      Vercel Blob
      User Management
    External
      Gemini AI
      Google OAuth
      Web Search
```

---

## How to Use These Diagrams

### In Markdown/GitHub

Copy the Mermaid code blocks directly into your markdown files. GitHub and many markdown viewers will automatically render them.

### In Presentations

1. Use online tools like [mermaid.live](https://mermaid.live) to render diagrams
2. Export as PNG/SVG
3. Insert into PowerPoint/Google Slides

### In Documentation

Keep these diagrams in your docs folder and reference them in your README or technical documentation.

---

**Note**: The SVG architecture diagram (`architecture-diagram.svg`) is ready for immediate use in presentations!
