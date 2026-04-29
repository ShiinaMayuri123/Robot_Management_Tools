# Robot Management Tools

## ⚠️ 重要规则 / Critical Rules

**所有与 Claude Code 的交互必须使用中文，包括 Claude Code 的回复、解释、错误信息等所有输出内容。**

All interactions with Claude Code MUST be in Chinese, including all responses, explanations, error messages, and any other output.

---

## Project Overview

A web-based robot management terminal for tracking and managing robot device information. The application allows users to scan QR codes or manually enter MAC addresses to view and edit robot details, with data synchronized to Cloudflare KV storage.

**Primary Use Case:** Field technicians and support staff can quickly access and update robot information by scanning QR codes attached to physical robots.

## Tech Stack

- **Frontend:** React 19.2.5 with JSX
- **Build Tool:** Vite 8.0.10 (with HMR)
- **Styling:** Tailwind CSS 4.2.4 + PostCSS
- **Backend:** Cloudflare Pages Functions (serverless)
- **Storage:** Cloudflare KV (with localStorage fallback)
- **Linting:** ESLint 10 with React plugins
- **Deployment:** Cloudflare Pages

## Architecture

### Frontend (SPA)
- Single-page React application with dynamic routing via URL parameters
- State management using React hooks (useState, useEffect, useCallback)
- Responsive design: two-column layout on desktop, single-column on mobile
- Device detection for PC-specific features (PuduInstaller integration)

### Backend (Serverless)
- Cloudflare Pages Functions handle API requests
- RESTful API at `/api/robot` with GET/PUT methods
- Data keyed by MAC address in Cloudflare KV namespace `ROBOT_DATA`

### Data Flow
1. User scans QR code → URL with `?mac=XX:XX:XX:XX:XX:XX` parameter
2. Frontend fetches data from `/api/robot?mac=...`
3. User edits fields → saves to Cloudflare KV via PUT request
4. Fallback to localStorage when API is unavailable (local development)

## Key Files

### Source Code
- `src/App.jsx` - Main application component with all business logic
- `src/main.jsx` - React entry point
- `src/index.css` - Global styles and Tailwind directives
- `functions/api/robot.js` - Cloudflare Pages Function for GET/PUT operations

### Configuration
- `vite.config.js` - Vite build configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `eslint.config.js` - ESLint rules
- `postcss.config.js` - PostCSS with Tailwind plugin
- `package.json` - Dependencies and scripts

### Assets
- `public/favicon.svg` - Site favicon
- `public/icon-installer.svg` - PuduInstaller button icon
- `public/icon-pudu.svg` - Pudutech link icon
- `src/assets/` - React logo and hero image

## Development Workflow

### Commands
```bash
npm run dev      # Start dev server (default: http://localhost:5173)
npm run build    # Build for production (output: dist/)
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Local Development
- API calls to `/api/robot` will fail locally (no Cloudflare KV)
- App automatically falls back to localStorage for data persistence
- Test with URL parameter: `http://localhost:5173/?mac=AA:BB:CC:DD:EE:FF`

### Testing Checklist
- Landing page (no MAC parameter)
- Manual MAC input and navigation
- QR code scanning flow (requires deployment)
- Field CRUD operations (add, edit, delete, copy)
- Save functionality (check localStorage in dev, KV in production)
- PuduInstaller integration (PC only)
- Responsive layout (desktop vs mobile)

## Deployment

### Cloudflare Pages Setup
1. Connect GitHub repository to Cloudflare Pages
2. Build settings:
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: `/`
3. Environment bindings:
   - KV Namespace: `ROBOT_DATA` (must be created and bound)

### Environment Variables
None required. All configuration is client-side or in KV bindings.

## Code Conventions

### React Patterns
- Functional components with hooks (no class components)
- State management via useState, not external libraries
- useCallback for memoized functions (e.g., showToast)
- Inline event handlers for simple operations

### Naming
- Components: PascalCase (e.g., `App`)
- Functions: camelCase (e.g., `fetchData`, `updateFieldValue`)
- State variables: descriptive camelCase (e.g., `hasChanges`, `copiedId`)
- CSS classes: kebab-case (e.g., `app-container`, `field-row`)

### Comments
- Chinese comments for business logic and domain-specific context
- JSDoc-style comments for complex functions
- Inline comments for non-obvious behavior

### File Organization
- Keep all App logic in `App.jsx` (no premature abstraction)
- Utility functions defined at top of component
- State declarations grouped by category
- Effects follow state declarations
- Event handlers before render logic

## Important Context

### Custom Protocol Handler (pudu://)
- Windows-only feature for launching PuduInstaller.exe
- Requires registry modification (generated via "生成并下载环境修复脚本")
- Registry key: `HKEY_CLASSES_ROOT\pudu`
- Path stored in localStorage: `pudu_exe_path`
- Only enabled on PC devices (mobile shows warning)

### Data Structure
```javascript
{
  fields: [
    { id: 'abc123', label: 'MAC 地址', value: 'AA:BB:CC:DD:EE:FF' },
    { id: 'def456', label: '安装固件版本', value: '1.2.3' }
  ],
  updatedAt: '2026-04-28T12:00:00.000Z'
}
```

### Default Fields (New Robots)
When a MAC address is accessed for the first time:
1. MAC 地址 (pre-filled from URL)
2. 安装固件版本
3. 本体APK版本
4. 建图工具版本

## Common Tasks

### Adding a New Tool Button
1. Add button in `toolbox-actions` section of `App.jsx`
2. Use className `action-btn` with modifier (`primary`, `secondary`, `ghost`)
3. Add icon (SVG in `/public` or emoji span)
4. Implement click handler or external link

### Modifying Field Behavior
- Field operations: `updateFieldLabel`, `updateFieldValue`, `deleteField`, `addField`
- All operations set `hasChanges` to true
- Changes persist only after clicking "保存修改"

### Updating API Endpoints
- Modify `functions/api/robot.js` for backend changes
- GET handler: `onRequestGet(context)`
- PUT handler: `onRequestPut(context)`
- Access KV via `context.env.ROBOT_DATA`

### Styling Changes
- Global styles: `src/index.css`
- Tailwind utilities: inline className attributes
- Custom CSS classes: defined in `index.css`
- Responsive breakpoints: use Tailwind's responsive prefixes

## Troubleshooting

### API Not Working Locally
Expected behavior. Use localStorage fallback or deploy to Cloudflare Pages for full functionality.

### PuduInstaller Not Opening
1. Check if on PC (not mobile)
2. Verify registry key exists: `HKEY_CLASSES_ROOT\pudu`
3. Confirm path in localStorage matches actual .exe location
4. Re-download and run registry script if needed

### Build Errors
- Check Node.js version compatibility (Vite 8 requires Node 18+)
- Clear `node_modules` and reinstall: `rm -rf node_modules package-lock.json && npm install`
- Check for ESLint errors: `npm run lint`

## Security Considerations

- No authentication (public access by MAC address)
- MAC addresses are not sensitive identifiers
- No PII stored beyond user-entered robot metadata
- XSS protection via React's automatic escaping
- CORS handled by Cloudflare Pages (same-origin)

## Future Enhancements

- "在我的电脑上打开此网页" feature (currently placeholder)
- QR code generation for new robots
- Batch operations (export/import multiple robots)
- Search and filter functionality
- Audit log for changes (track who modified what)
