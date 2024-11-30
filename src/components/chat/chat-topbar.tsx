"use client";
import axios from "axios";
import React, { useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "../ui/button";
import { CaretSortIcon, HamburgerMenuIcon } from "@radix-ui/react-icons";
import { Sidebar } from "../sidebar";
import { getSelectedRepo } from "@/lib/model-helper";
import { useAuth } from "@clerk/nextjs";

interface ChatTopbarProps {
  isLoading: boolean;
  chatId?: string;
  repos: string[];
}

interface GithubRepo {
  id: number;
  name: string;
  html_url: string;
}

export default function ChatTopbar({ isLoading, repos }: ChatTopbarProps) {
  const [open, setOpen] = React.useState(false);
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [currentRepo, setCurrentRepo] = React.useState<string | null>(null);
  const [storedRepos, setStoredRepos] = React.useState<GithubRepo[]>([]);
  const { userId } = useAuth();
  // Fetch the user's GitHub OAuth token
  const fetchRepos = async () => {
    const response = await fetch("/api/github-repos", {
      method: "GET",
    });

    const { repos } = await response.json();
    setStoredRepos(repos);
    console.log(repos);
  };
  useEffect(() => {
    fetchRepos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    setCurrentRepo(getSelectedRepo());
  }, [repos]);

  const handleRepoChange = (repo: string) => {
    setCurrentRepo(repo);
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedRepo", repo);
    }
    setOpen(false);
  };

  const handleCloseSidebar = () => {
    setSheetOpen(false);
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
            {currentRepo || "Select repo"}
            <CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-1">
          {storedRepos.length > 0 ? (
            storedRepos.map((repo) => (
              <Button
                key={repo.name}
                variant="ghost"
                className="w-full"
                onClick={() => handleRepoChange(repo.name)}
              >
                {repo.name}
              </Button>
            ))
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
export type { GithubRepo };
