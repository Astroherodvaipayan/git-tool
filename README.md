# 🔍 GitHub Repository Analyzer

> A powerful, real-time web application for comprehensive GitHub repository analysis, visualization, and AI-ready data export.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-blue)](https://tailwindcss.com/)
[![D3.js](https://img.shields.io/badge/D3.js-7-orange)](https://d3js.org/)

## ✨ Features

### 📊 **Repository Analytics**
- **Repository Overview**: Comprehensive metadata including stars, forks, language, license, and activity metrics
- **Contributor Analysis**: Detailed contributor statistics with visual representations
- **Commit Activity Visualization**: Interactive charts with multiple view types (bar, line, area) and time ranges (week, month, year)
- **Rate Limit Monitoring**: Real-time GitHub API quota tracking and intelligent rate limit management

### 🌳 **Real-time Repository Structure**
- **Live Streaming Visualization**: Real-time updates every 15 seconds with visual change indicators
- **Interactive File Tree**: Expandable/collapsible directory structure with file size information
- **Dynamic Circle Packing**: D3.js-powered animated visualization showing file relationships and sizes
- **Branch Switching**: Analyze different branches with dynamic branch detection
- **File Content Viewer**: Click any file to view its contents with syntax highlighting
- **Change Detection**: Visual highlighting of recently modified files and directories

### 🎯 **Advanced Visualizations**
- **System Architecture Diagrams**: Auto-generated Mermaid diagrams representing repository structure
- **Interactive D3.js Charts**: Zoom, pan, and explore repository data with smooth animations
- **Multiple Chart Types**: Bar charts, line graphs, area charts, and circle packing visualizations
- **Export Capabilities**: Download charts as SVG files for presentations and documentation

### 🤖 **AI Integration & Export**
- **LLM-Ready Export**: Export repository structure and contents optimized for Large Language Model analysis
- **Structured Data Output**: Clean, formatted repository summaries perfect for AI consumption
- **Selective Content Export**: Choose specific files and directories for targeted analysis

### 🔧 **Technical Features**
- **Server-side GitHub API Authentication**: Secure token handling with 5,000 requests/hour limit
- **Intelligent Caching**: Multi-layer caching system for optimal performance
- **Error Recovery**: Robust error handling with user-friendly feedback
- **Responsive Design**: Mobile-first design that works on all devices
- **Dark/Light Mode**: Automatic theme detection with manual toggle

## 🚀 Quick Start

### Prerequisites
- **Node.js**: Version 16.x or higher
- **Package Manager**: npm, yarn, or pnpm
- **GitHub Account**: For higher API rate limits (optional but recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/github-repo-analyzer.git
   cd github-repo-analyzer
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Environment Setup**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Add your GitHub Personal Access Token to `.env.local`:
   ```env
   GITHUB_PAT=your_github_personal_access_token_here
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## 🔑 GitHub API Configuration

### Creating a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `public_repo` - For public repositories
   - `repo` - For private repositories (if needed)
4. Copy the token and add it to your `.env.local` file

### Rate Limits
| Authentication | Requests/Hour | Use Case |
|----------------|---------------|----------|
| No Token | 60 | Basic testing |
| Personal Token | 5,000 | Full application features |
| GitHub App | 15,000 | Enterprise usage |

## 📖 Usage Guide

### Basic Repository Analysis
1. Enter repository owner and name (e.g., `facebook/react`)
2. Explore different tabs:
   - **Overview**: Repository metadata and quick stats
   - **Contributors**: Detailed contributor analysis
   - **Commit Activity**: Interactive commit visualizations
   - **Repository Structure**: Real-time file tree and visualizations
   - **System Diagram**: Architecture diagrams
   - **LLM Export**: AI-ready data export

### Advanced Features
- **Real-time Mode**: Toggle streaming to see live repository updates
- **Branch Analysis**: Switch between branches to compare structure
- **File Exploration**: Click files to view content with syntax highlighting
- **Chart Customization**: Choose different visualization types and time ranges
- **Data Export**: Download charts and export repository data

## 🏗️ Architecture

### Tech Stack
- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Visualizations**: D3.js, Mermaid diagrams
- **API**: GitHub REST API with server-side proxy
- **State Management**: React hooks, client-side caching
- **Build Tools**: Webpack, PostCSS, ESLint

### Project Structure
```
github-repo-analyzer/
├── app/                          # Next.js App Router
│   ├── api/                      # API routes
│   │   ├── components/               # React components
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── commit-activity-panel.tsx
│   │   │   ├── repo-structure-panel.tsx
│   │   │   └── ...
│   │   ├── lib/                      # Utility libraries
│   │   │   ├── github.ts             # GitHub API wrapper
│   │   │   ├── github-client.ts      # Client-side GitHub functions
│   │   │   ├── cache.ts              # Caching system
│   │   │   └── utils.ts              # Utility functions
│   │   ├── repo/[owner]/[repo]/      # Dynamic repository pages
│   │   └── globals.css               # Global styles
│   ├── public/                       # Static assets
│   ├── components.json               # shadcn/ui configuration
│   ├── next.config.js               # Next.js configuration
│   ├── tailwind.config.js           # Tailwind CSS configuration
│   └── package.json                 # Project dependencies
```

### Key Components
- **RepoStructurePanel**: Real-time repository visualization with streaming updates
- **CommitActivityPanel**: Interactive commit activity charts with multiple view types
- **ContributorsPanel**: Contributor statistics and visualizations
- **SystemDiagramPanel**: Architecture diagram generation
- **LLMExportPanel**: AI-ready data export functionality

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started
1. **Fork the repository** and clone your fork
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Install dependencies**: `npm install`
4. **Set up environment**: Copy `.env.local.example` to `.env.local`
5. **Start development**: `npm run dev`

### Development Guidelines

#### Code Style
- **TypeScript**: Use strict typing, avoid `any` when possible
- **Components**: Use functional components with hooks
- **Naming**: Use descriptive names (PascalCase for components, camelCase for functions)
- **Files**: Use kebab-case for file names, PascalCase for component files

#### Commit Convention
```bash
feat: add new repository visualization feature
fix: resolve commit activity loading issue
docs: update API documentation
style: improve responsive design
refactor: optimize GitHub API calls
test: add unit tests for cache system
```

#### Pull Request Process
1. **Update documentation** if you're adding features
2. **Add tests** for new functionality
3. **Ensure all tests pass**: `npm run test`
4. **Check TypeScript**: `npm run type-check`
5. **Format code**: `npm run format`
6. **Create detailed PR description** with screenshots for UI changes

### Areas for Contribution

#### 🌟 High Priority
- **Performance Optimization**: Improve large repository handling
- **Testing**: Add comprehensive test coverage
- **Accessibility**: Improve ARIA labels and keyboard navigation
- **Mobile Experience**: Enhance mobile responsiveness

#### 🔧 Medium Priority
- **New Visualizations**: Additional chart types and data views
- **GitHub Enterprise**: Support for GitHub Enterprise servers
- **Export Formats**: Additional export options (PDF, JSON, etc.)
- **Caching Improvements**: Advanced caching strategies

#### 💡 Feature Ideas
- **Repository Comparison**: Compare multiple repositories
- **Historical Analysis**: Track repository changes over time
- **Team Analytics**: Team-based contribution analysis
- **Integration APIs**: Webhook support for automated analysis

### Issue Templates
When creating issues, please use our templates:
- **🐛 Bug Report**: For reporting bugs
- **✨ Feature Request**: For suggesting new features
- **📚 Documentation**: For documentation improvements
- **❓ Question**: For general questions

### Code Review Guidelines
- **Be constructive**: Provide helpful feedback
- **Test thoroughly**: Verify changes work as expected
- **Consider edge cases**: Think about error scenarios
- **Security first**: Review for potential security issues

## 🔒 Security & Privacy

### Data Handling
- **No Data Storage**: Repository data is not permanently stored
- **Secure API Calls**: All GitHub API calls are server-side
- **Token Security**: GitHub tokens are never exposed to the client
- **Rate Limit Protection**: Intelligent rate limiting prevents API abuse

### Security Best Practices
- Regular dependency updates
- Server-side input validation
- Secure environment variable handling
- No sensitive data in client bundles

## 🚨 Troubleshooting

### Common Issues

#### "Missing script: dev" Error
```bash
# Make sure you're in the correct directory
cd github-repo-analyzer
npm install
npm run dev
```

#### API Rate Limit Exceeded
- Add a GitHub Personal Access Token to `.env.local`
- Check current rate limit in the app's rate limit indicator
- Wait for rate limit reset (shown in app)

#### Repository Not Found
- Verify repository owner and name are correct
- Ensure repository is public (or token has private repo access)
- Check if repository exists on GitHub

#### Commit Activity Not Loading
- GitHub computes statistics on-demand (may take a few moments)
- Try refreshing after a few seconds
- Some repositories may not have sufficient commit history

## 📊 Performance

### Optimization Features
- **Smart Caching**: Multi-layer caching reduces API calls
- **Lazy Loading**: Components load on demand
- **Code Splitting**: Optimized bundle sizes
- **Image Optimization**: Next.js automatic image optimization
- **API Batching**: Efficient GitHub API usage

### Performance Monitoring
- Real-time rate limit tracking
- Cache hit/miss statistics
- API response time monitoring
- Error rate tracking

## 🛣️ Roadmap

### Version 2.0 (Planned)
- [ ] Repository comparison tools
- [ ] Historical trend analysis
- [ ] Advanced search and filtering
- [ ] Custom dashboard creation
- [ ] API webhooks support

### Version 1.5 (In Progress)
- [x] Real-time streaming updates
- [x] Enhanced error handling
- [x] Improved loading states
- [ ] Comprehensive test suite
- [ ] Performance optimizations

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **GitHub API** - For providing comprehensive repository data
- **D3.js** - For powerful data visualization capabilities
- **Next.js Team** - For the excellent React framework
- **shadcn/ui** - For beautiful, accessible UI components
- **Tailwind CSS** - For utility-first CSS framework
- **Mermaid** - For diagram generation
- **All Contributors** - Thank you for making this project better!

## 📞 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Open a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for questions and ideas

---

**Made with ❤️ by the kishna dvaipayan & windsurf ** 
