# Next.js App with Authentication, GitHub API Integration, and RAG Chatbot

This repository hosts a **Next.js** application featuring **Clerk authentication**, **GitHub API integration**, and **Retrieval-Augmented Generation (RAG)** capabilities. The app allows users to connect their GitHub repositories, analyze their codebase, and interact with an AI chatbot that answers questions about the codebase.

---

## Features

- **Authentication**:

  - Secure user authentication using [Clerk](https://clerk.dev).
  - Support for email/password and third-party logins.

- **GitHub API Integration**:

  - Connect and fetch repositories from a user's GitHub account.
  - Analyze codebase contents for RAG-based AI operations.

- **Retrieval-Augmented Generation (RAG)**:

  - Perform intelligent queries on the codebase.
  - Get detailed responses in a conversational format using OpenAI's GPT.

- **Chat UI**:
  - User-friendly chat interface for seamless interactions with the AI assistant.
  - Responses enriched with markdown support for code snippets, tables, and more.

---

## Tech Stack

- **Frontend**: Next.js, React, Tailwind CSS
- **Authentication**: Clerk
- **Backend**: Node.js, GitHub API, OpenAI API
- **Database**: Vector database for embeddings
- **Styling**: Tailwind CSS

---

## Installation

### Prerequisites

- Node.js (v18+)
- npm or Yarn
- GitHub Personal Access Token ([How to generate](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token))
- Clerk Project Credentials ([Get started with Clerk](https://clerk.dev/docs))
