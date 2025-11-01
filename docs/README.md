# Architecture Documentation

This folder contains comprehensive architecture documentation for the VC Analyst AI application, created for the Google AI Hackathon 2025.

## Files Overview

### 📊 Visual Diagrams

1. **`architecture-diagram.svg`**
   - Comprehensive technical architecture diagram
   - Shows all layers: Frontend, API, Services, Data, External
   - Includes data flow arrows
   - Perfect for technical documentation
   - **Best for**: Developer documentation, GitHub README

2. **`presentation-slide.svg`**
   - Clean, presentation-ready slide
   - Highlights problem, solution, architecture flow, and key features
   - Google-style design with brand colors
   - Metrics and technology stack included
   - **Best for**: Pitch decks, hackathon presentations, stakeholder demos

### 📝 Documentation Files

3. **`architecture.md`**
   - Complete technical architecture documentation
   - Detailed explanation of all components
   - Data flow descriptions
   - Feature specifications
   - Security considerations
   - Technology stack details
   - Future enhancement roadmap
   - **Best for**: Technical reference, onboarding new developers

4. **`architecture-mermaid.md`**
   - Interactive Mermaid diagrams (7 different views)
   - High-level system architecture
   - Analysis flow sequence
   - Database schema
   - AI processing pipeline
   - Rate limiting flow
   - Authentication flow
   - Component hierarchy
   - **Best for**: GitHub/GitLab wikis, living documentation

## Usage Guide

### For Presentations

**PowerPoint/Google Slides:**
1. Open `presentation-slide.svg` in a browser
2. Take a screenshot or save as PNG
3. Insert into your presentation

**Hackathon Demo:**
- Use `presentation-slide.svg` as your main technical slide
- It covers problem, solution, architecture, and features in one view
- Professional Google-themed design

### For Documentation

**GitHub README:**
```markdown
## Architecture
![Architecture Diagram](./docs/architecture-diagram.svg)

For detailed documentation, see [Architecture Overview](./docs/architecture.md)
```

**Technical Wiki:**
- Link to `architecture.md` for comprehensive reference
- Embed Mermaid diagrams from `architecture-mermaid.md` for interactive views

### For Development

**Onboarding New Developers:**
1. Start with `architecture.md` for overview
2. Reference `architecture-mermaid.md` for specific flows
3. Use `architecture-diagram.svg` as a reference poster

## Diagram Descriptions

### Architecture Diagram (SVG)
```
┌─────────────────────────────────────┐
│      Frontend Layer (Purple)        │
│  Home | Results | History | Auth    │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│       API Layer (Blue)               │
│  /analyze | /results | /web-search  │
└─────────────────────────────────────┘
                ↓
┌─────────────────────────────────────┐
│   Services Layer (Cyan)              │
│  Prisma | Parser | AI | Rate Limit  │
└─────────────────────────────────────┘
                ↓
┌──────────────────┬──────────────────┐
│  Data (Green)    │  External (Orange)│
│  PostgreSQL      │  Gemini AI       │
│  Vercel Blob     │  Google OAuth    │
└──────────────────┴──────────────────┘
```

### Presentation Slide (SVG)
```
┌────────────┬────────────┬────────────┐
│  Problem   │  Flow      │  Features  │
│  Solution  │  Diagram   │  Metrics   │
└────────────┴────────────┴────────────┘
```

## Mermaid Diagram Types

1. **System Architecture** - Component relationships
2. **Sequence Diagram** - Analysis flow with timing
3. **ER Diagram** - Database schema
4. **Flowchart** - AI processing pipeline
5. **Decision Flow** - Rate limiting logic
6. **Auth Sequence** - OAuth authentication flow
7. **Component Tree** - UI component hierarchy

## Exporting Diagrams

### SVG to PNG (High Quality)
```bash
# Using Inkscape (recommended)
inkscape architecture-diagram.svg --export-png=architecture.png --export-dpi=300

# Using ImageMagick
convert -density 300 architecture-diagram.svg architecture.png

# Using online tool
# Visit: https://cloudconvert.com/svg-to-png
```

### Mermaid to Image
```bash
# Using Mermaid CLI
npm install -g @mermaid-js/mermaid-cli
mmdc -i architecture-mermaid.md -o architecture-flow.png

# Or use online editor
# Visit: https://mermaid.live
```

## Customization

### Changing Colors
Edit the SVG files and modify the gradient definitions:
```svg
<stop offset="0%" style="stop-color:#YOUR_COLOR"/>
```

### Adding New Sections
1. For diagrams: Edit SVG with a tool like Figma, Inkscape, or VS Code
2. For Mermaid: Add new diagram blocks in `architecture-mermaid.md`
3. For documentation: Update `architecture.md`

## Best Practices

✅ **Do:**
- Use `presentation-slide.svg` for non-technical audiences
- Use `architecture-diagram.svg` for technical discussions
- Reference `architecture.md` for implementation details
- Embed Mermaid diagrams in wikis for living documentation

❌ **Don't:**
- Use high-detail diagrams in pitch presentations (too complex)
- Forget to update diagrams when architecture changes
- Mix multiple diagram styles in the same presentation

## Quick Links

- [Full Technical Documentation](./architecture.md)
- [Mermaid Diagrams](./architecture-mermaid.md)
- [Main README](../README.md)

---

**Created for Google AI Hackathon 2025**
**Powered by Google Gemini AI via Vertex AI**

