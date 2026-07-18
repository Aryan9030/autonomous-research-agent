# 🤖 Autonomous AI Research Agent

<div align="center">

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![LangChain](https://img.shields.io/badge/LangChain-1.3-121212?logo=chainlink&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3-orange)
![License](https://img.shields.io/badge/License-MIT-green)

**A multi-agent AI system that autonomously conducts research using specialized AI agents working together**

[Features](#-features) • [Demo](#-demo) • [Installation](#-installation) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture)

</div>

---

## 🌟 Overview

An **autonomous multi-agent AI system** that conducts comprehensive academic research automatically. Simply enter a research topic, and watch 5 specialized AI agents collaborate to search papers, analyze them, identify themes, write reports, and fact-check claims in real-time.

## ✨ Features

### 🧠 Multi-Agent Architecture
- **Orchestrator Agent** - Plans research strategy and coordinates all agents
- **Research Agent** - Searches academic papers from ArXiv, Semantic Scholar, GitHub
- **Analysis Agent** - Deep analyzes each paper with AI
- **Writing Agent** - Generates comprehensive research reports
- **Fact-Check Agent** - Verifies all claims against sources

### 🚀 Core Capabilities
- 📚 Real-time paper search from multiple academic sources
- 🔍 AI-powered deep paper analysis
- 📊 Automatic theme identification and knowledge gap detection
- ✍️ Professional research report generation (1500+ words)
- ✅ Automated fact-checking with confidence scores
- 💬 RAG-powered chat with your research papers
- 🔗 GitHub integration for code implementations
- ⚡ Real-time WebSocket updates
- 🎨 Beautiful modern dark-themed UI

## 🎯 Demo

### Dashboard
> Type any research topic and watch AI agents work in real-time

### Live Agent Activity
> See each agent's actions as they happen

### Research Report
> Get publication-quality reports with citations

### Chat with Papers (RAG)
> Ask questions about your research

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **LangChain + LangGraph** - Multi-agent orchestration
- **Groq (Llama 3.3 70B)** - Fast & free LLM
- **ChromaDB** - Vector database for RAG
- **HuggingFace Embeddings** - Local semantic search
- **SQLAlchemy + SQLite** - Database
- **WebSockets** - Real-time updates

### Frontend
- **React 19** + **TypeScript**
- **Vite** - Lightning fast dev server
- **Tailwind CSS** - Modern styling
- **Lucide React** - Beautiful icons
- **Axios** - API client

### External APIs
- **ArXiv API** - Academic papers
- **Semantic Scholar API** - Citations & metrics
- **GitHub API** - Code implementations

## 🏗️ Architecture

\`\`\`
┌─────────────────┐
│  React Frontend │  WebSocket
│   (Vite/TS)     │◄─────────────┐
└────────┬────────┘              │
         │ REST API              │
         ▼                       │
┌─────────────────┐    Events    │
│  FastAPI Backend│──────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│      Orchestrator Agent         │
│         (LangGraph)             │
└─┬──────┬──────┬──────┬─────────┘
  │      │      │      │
  ▼      ▼      ▼      ▼
┌────┐┌────┐┌────┐┌────┐┌────┐
│Res.││Anl.││Wri.││Fct.││    │
│Agt.││Agt.││Agt.││Agt.││    │
└────┘└────┘└────┘└────┘└────┘
   │      │      │      │
   ▼      ▼      ▼      ▼
┌─────────────────────────┐
│  Vector DB │  SQLite    │
│  (Chroma)  │  Database  │
└─────────────────────────┘
\`\`\`

## 📦 Installation

### Prerequisites
- Python 3.11+
- Node.js 18+
- Groq API key (free at [console.groq.com](https://console.groq.com/keys))

### Backend Setup

\`\`\`bash
# Clone repository
git clone https://github.com/Aryan9030/autonomous-research-agent.git
cd autonomous-research-agent/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
copy .env.example .env
# Edit .env and add your GROQ_API_KEY

# Run backend
uvicorn main:app --reload --port 8000
\`\`\`

### Frontend Setup

\`\`\`bash
cd frontend

# Install dependencies
npm install

# Run frontend
npm run dev
\`\`\`

### Access Application
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

## 🔧 Environment Variables

Create \`backend/.env\`:

\`\`\`env
GROQ_API_KEY=your_groq_api_key_here
DATABASE_URL=sqlite:///./research.db
PRIMARY_MODEL=llama-3.3-70b-versatile
FAST_MODEL=llama-3.1-8b-instant
FRONTEND_URL=http://localhost:5173
DEBUG=True
\`\`\`

## 📖 Usage

1. Open http://localhost:5173
2. Enter a research topic (e.g., "neural networks")
3. Click "Start AI Research"
4. Watch agents work in real-time
5. Explore results in different tabs:
   - **Papers** - View analyzed papers
   - **Themes** - See major themes and gaps
   - **Report** - Read full research report
   - **Chat** - Ask questions about research
   - **GitHub** - Find code implementations

## 🎨 Features Breakdown

### Real-time Agent Activity
Watch specialized AI agents work together in real-time via WebSocket connection.

### Multi-source Research
Simultaneously searches ArXiv, Semantic Scholar, and GitHub for comprehensive coverage.

### Intelligent Analysis
Each paper gets AI analysis including:
- Summary
- Key contributions
- Methodology
- Results
- Limitations
- Novelty score
- Relevance rating

### RAG Chat System
Ask questions about your research and get answers based on actual paper content using vector similarity search.

## 🎓 What This Project Demonstrates

- ✅ Multi-agent AI system architecture
- ✅ LangGraph workflow orchestration
- ✅ Vector databases and RAG systems
- ✅ Real-time WebSocket communication
- ✅ RESTful API design
- ✅ Full-stack development
- ✅ Async programming
- ✅ External API integration
- ✅ Modern React with TypeScript
- ✅ Production-ready code structure

## 📊 Project Statistics

- **Backend**: 15+ Python files
- **Frontend**: 20+ TypeScript/React files
- **Total Lines**: 9,000+
- **AI Agents**: 5 specialized agents
- **API Endpoints**: 10+
- **Real-time Events**: 15+ event types

## 🚀 Future Enhancements

- [ ] User authentication
- [ ] Save & share research sessions
- [ ] Multiple AI provider support (OpenAI, Anthropic)
- [ ] PDF report export
- [ ] Team collaboration features
- [ ] Custom agent creation
- [ ] Deploy to cloud

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 👨‍💻 Author

**Aryan**
- GitHub: [@Aryan9030](https://github.com/Aryan9030)

## 🙏 Acknowledgments

- [Groq](https://groq.com/) for fast & free LLM access
- [LangChain](https://www.langchain.com/) for agent framework
- [ArXiv](https://arxiv.org/) for academic paper access
- [Semantic Scholar](https://www.semanticscholar.org/) for citations

---

<div align="center">

**⭐ Star this repo if you find it helpful!**

Made with ❤️ and AI

</div>
