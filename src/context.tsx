"use client";

import React, { createContext, useContext, useState } from "react";
import { Message } from "@/components/chat/chat-bottombar";
import { toast } from "sonner";

interface GithubRepo {
  id: number;
  name: string;
  html_url: string;
}
interface RepoContextType {
  selectedRepo: string | null;
  setSelectedRepo: (repo: string, triggerEmbedding?: boolean) => void;
  repos: GithubRepo[];
  setRepos: (repos: GithubRepo[]) => void;
  fetchRepos: () => Promise<void>;
}

interface MessagesContextType {
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  addMessage: (message: Message) => void;
  updateMessage: (index: number, message: Message) => void;
}

export const MessagesContext = createContext<MessagesContextType>({
  messages: [],
  setMessages: () => {},
  addMessage: () => {},
  updateMessage: (index: number, message: Message) => {},
});

export function MessagesProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const addMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const updateMessage = (index: number, message: Message) => {
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[index] = message;
      return newMessages;
    });
  };

  return (
    <MessagesContext.Provider
      value={{ messages, setMessages, addMessage, updateMessage }}
    >
      {children}
    </MessagesContext.Provider>
  );
}

export function useMessages() {
  const context = useContext(MessagesContext);
  if (context === undefined) {
    throw new Error("useMessages must be used within a MessagesProvider");
  }
  return context;
}

export const RepoContext = createContext<RepoContextType | undefined>(
  undefined
);

export function RepoProvider({ children }: { children: React.ReactNode }) {
  const [selectedRepo, setRepo] = useState<string | null>(null);
  const [repos, setRepos] = useState<GithubRepo[]>([]);

  const fetchRepos = async () => {
    const response = await fetch("/api/github-repos", {
      method: "GET",
    });
    const { repos } = await response.json();
    setRepos(repos);
  };

  const setSelectedRepo = (repo: string, triggerEmbedding: boolean = true) => {
    setRepo(repo);
    if (!triggerEmbedding) return;

    // Show loading state
    toast.loading("Embedding repository...");

    // Call the embedding API
    fetch("/api/embedding", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        repository: repo,
      }),
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to embed repository");
        }
        const data = await response.json();
        toast.success(
          `Repository embedded successfully! ${data.stats.totalItems} items processed`
        );
      })
      .catch((error) => {
        console.error("Error embedding repository:", error);
        toast.error("Failed to embed repository. Please try again.");
      });
  };

  return (
    <RepoContext.Provider
      value={{ selectedRepo, setSelectedRepo, repos, setRepos, fetchRepos }}
    >
      {children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  const context = useContext(RepoContext);
  if (context === undefined) {
    throw new Error("useRepo must be used within a RepoProvider");
  }
  return context;
}
