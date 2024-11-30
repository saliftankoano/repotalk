"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { GearIcon } from "@radix-ui/react-icons";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { set } from "zod";
import UsernameForm from "./username-form";
import EditUsernameForm from "./edit-username-form";
import PullModel from "./pull-model";
import { UserButton, UserProfile } from "@clerk/nextjs";

export default function UserSettings() {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleStorageChange = () => {
      const username = localStorage.getItem("ollama_user");
      if (username) {
        setName(username);
        setIsLoading(false);
      }
    };

    const fetchData = () => {
      const username = localStorage.getItem("ollama_user");
      if (username) {
        setName(username);
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Listen for storage changes
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex justify-start gap-3 w-full h-14 text-base font-normal items-center"
        >
          <div className="flex items-center gap-2">
            <UserButton />
          </div>

          <div className="text-xs truncate">
            {isLoading ? (
              <Skeleton className="w-20 h-4" />
            ) : (
              name || "Anonymous"
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 p-2">
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <PullModel />
        </DropdownMenuItem>
        <Dialog>
          <DialogTrigger className="w-full">
            <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
              <div className="flex w-full gap-2 p-1 items-center cursor-pointer">
                <GearIcon className="w-4 h-4" />
                Settings
              </div>
            </DropdownMenuItem>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader className="space-y-4">
              <DialogTitle>Settings</DialogTitle>
              <EditUsernameForm setOpen={setOpen} />
            </DialogHeader>
          </DialogContent>
        </Dialog>
        <Dialog></Dialog>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
