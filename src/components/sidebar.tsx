"use client";

import { SquarePen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Message } from "ai/react";
import Image from "next/image";
import UserSettings from "./user-settings";
import { useRouter } from "next/navigation";

interface SidebarProps {
  isCollapsed: boolean;
  isMobile: boolean;
}

export function Sidebar({ isCollapsed, isMobile }: SidebarProps) {
  const router = useRouter();

  return (
    <div
      data-collapsed={isCollapsed}
      className="relative justify-between group lg:bg-accent/20 lg:dark:bg-card/35 flex flex-col h-full gap-4 p-2 data-[collapsed=true]:p-2"
    >
      <div className="flex flex-col justify-between p-2 max-h-fit overflow-y-auto">
        <Button
          onClick={() => {
            router.push("/");
          }}
          variant="ghost"
          className="flex justify-between w-full h-14 text-sm xl:text-lg font-normal items-center"
        >
          <div className="flex gap-3 items-center">
            {!isCollapsed && !isMobile && (
              <Image
                src="/gitcat.png"
                alt="AI"
                width={28}
                height={28}
                className="dark:invert hidden 2xl:block"
              />
            )}
            RepoTalk 🗣️
          </div>
          <SquarePen size={18} className="shrink-0 w-4 h-4" />
        </Button>
      </div>

      <div className="justify-end px-2 py-2 w-full border-t">
        <UserSettings />
      </div>
    </div>
  );
}
