"use client";
import axios from "axios";
import React, { useEffect, useRef } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "../ui/button";
import { CaretSortIcon, HamburgerMenuIcon } from "@radix-ui/react-icons";
import { Sidebar } from "../sidebar";
import { useRepo } from "@/context";
import { toast } from "sonner";

interface Repository {
  name: string;
  html_url: string;
  // Add other properties as needed
}

interface ChatTopbarProps {
  isLoading: boolean;
}

const getRepoIdentifier = (html_url: string) => {
  try {
    const url = new URL(html_url);
    const [, , , owner, repo] = url.pathname.split("/");
    return `${owner}/${repo}`;
  } catch (e) {
    return html_url;
  }
};

// Add this helper function at the top of the component
const dismissAllToasts = async () => {
  // Dismiss all toasts by known IDs
  toast.dismiss("repo-loading-toast");
  toast.dismiss("repo-success-toast");
  toast.dismiss("repo-error-toast");
  // Dismiss any other toasts
  toast.dismiss();
  // Wait to ensure they're all cleared
  await new Promise((resolve) => setTimeout(resolve, 100));
};

export default function ChatTopbar({ isLoading }: ChatTopbarProps) {
  const [open, setOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const { selectedRepo, setSelectedRepo, repos, fetchRepos } = useRepo();
  const [isEmbedding, setIsEmbedding] = React.useState(false);
  const loadingToastRef = React.useRef<string | number>();

  useEffect(() => {
    let mounted = true;

    async function initializeRepos() {
      try {
        // Only fetch if we don't already have repos
        if (!repos?.length) {
          await fetchRepos();
        }

        // Only proceed if component is still mounted and we have repos
        if (!mounted || !repos?.length) return;

        const storedRepo = localStorage.getItem("selectedRepo");
        if (storedRepo) {
          const repoIdentifier = getRepoIdentifier(storedRepo);
          const repoExists = repos.some(
            (repo) => getRepoIdentifier(repo.html_url) === repoIdentifier
          );

          if (
            repoIdentifier &&
            repoExists &&
            repoIdentifier !== "undefined/undefined"
          ) {
            setSelectedRepo(repoIdentifier, false);
          }
        }
      } catch (e) {
        console.error("Error initializing repos:", e);
      }
    }

    initializeRepos();

    return () => {
      mounted = false;
    };
  }, [fetchRepos, repos, setSelectedRepo]);

  useEffect(() => {
    return () => {
      if (loadingToastRef.current) {
        toast.dismiss(loadingToastRef.current);
      }
    };
  }, []);

  const handleRepoChange = async (repo: Repository) => {
    if (isEmbedding) return;

    try {
      setIsEmbedding(true);
      const repoIdentifier = getRepoIdentifier(repo.html_url);
      setSelectedRepo(repoIdentifier);
      localStorage.setItem("selectedRepo", repo.html_url);
      setOpen(false);

      // Clear ALL existing toasts
      await dismissAllToasts();

      loadingToastRef.current = toast.loading("Preparing database...", {
        id: "repo-loading-toast",
      });

      const statusResponse = await fetch("/api/pinecone-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repository: repoIdentifier }),
      });

      const statusData = await statusResponse.json();

      if (!statusResponse.ok || !statusData.ready) {
        throw new Error("Failed to prepare index");
      }

      toast.loading("Embedding repository...", {
        id: "repo-loading-toast",
      });

      const response = await fetch("/api/embedding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repository: repoIdentifier, // Send in "owner/repo" format
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to embed repository");
      }

      // Clean up and show success
      await dismissAllToasts();

      toast.success(
        `Repository embedded successfully! ${data.stats.totalItems} items processed`,
        {
          id: "repo-success-toast",
        }
      );
    } catch (error: any) {
      await dismissAllToasts();

      if (error.message?.includes("Index is not ready")) {
        toast.error(
          "Database is still initializing. Please wait a few minutes and try again.",
          { id: "repo-error-toast" }
        );
      } else {
        toast.error("Failed to embed repository. Please try again.", {
          id: "repo-error-toast",
        });
      }
      console.error("Error embedding repository:", error);
    }
  };

  // Let's modify the getRepoIdentifier function to be more robust
  const getRepoIdentifier = (html_url: string) => {
    try {
      if (!html_url) {
        console.log("Empty URL provided to getRepoIdentifier");
        return "";
      }

      // Handle both full URLs and owner/repo format
      if (html_url.includes("github.com")) {
        const url = new URL(html_url);
        const pathParts = url.pathname.split("/").filter(Boolean);
        if (pathParts.length >= 2) {
          return `${pathParts[0]}/${pathParts[1]}`;
        }
      } else if (html_url.includes("/")) {
        // If it's already in owner/repo format
        const parts = html_url.split("/");
        if (parts.length === 2) {
          return html_url;
        }
      }

      console.log("Invalid URL format:", html_url);
      return "";
    } catch (e) {
      console.error("Error in getRepoIdentifier:", e);
      return "";
    }
  };

  return (
    <div className="w-full flex px-4 py-6 items-center justify-between lg:justify-center">
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger>
          <HamburgerMenuIcon className="lg:hidden w-5 h-5" />
        </SheetTrigger>
        <SheetContent side="left">
          <Sidebar isCollapsed={false} isMobile={false} />
        </SheetContent>
      </Sheet>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            disabled={isLoading}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[300px] justify-between"
          >
            {selectedRepo && selectedRepo !== "undefined/undefined"
              ? selectedRepo
              : "Select repo"}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-1">
          {repos?.length > 0 ? (
            repos.map((repo) => {
              const identifier = getRepoIdentifier(repo.html_url);
              return (
                <Button
                  key={repo.name}
                  variant="ghost"
                  className="w-full"
                  onClick={() => handleRepoChange(repo)}
                >
                  {identifier || "Invalid Repository"}
                </Button>
              );
            })
          ) : (
            <Button variant="ghost" disabled className="w-full">
              No repositories available
            </Button>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
