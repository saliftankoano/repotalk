import { createContext } from "react";
import { GithubRepo } from "@/components/chat/chat-topbar";

export const ReposContext = createContext<GithubRepo[] | []>([]);
