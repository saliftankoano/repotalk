"use client";
import { Message } from "@/components/chat/chat-bottombar";
import { ChatLayout } from "@/components/chat/chat-layout";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogContent,
} from "@/components/ui/dialog";
import UsernameForm from "@/components/username-form";
import { MessagesContext } from "@/context";
import React, { useEffect, useRef } from "react";
import { toast } from "sonner";

export default function Home() {
  const [open, setOpen] = React.useState(false);
  const [loadingSubmit, setLoadingSubmit] = React.useState(false);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!localStorage.getItem("chat_user")) {
      setOpen(true);
    }
  }, []);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoadingSubmit(true);
  };

  const onOpenChange = (isOpen: boolean) => {
    const username = localStorage.getItem("chat_user");
    if (username) return setOpen(isOpen);

    localStorage.setItem("chat_user", "Anonymous");
    window.dispatchEvent(new Event("storage"));
    setOpen(isOpen);
  };

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
      <main className="flex h-[calc(100dvh)] flex-col items-center ">
        <Dialog open={open} onOpenChange={onOpenChange}>
          <ChatLayout
            input={""}
            handleInputChange={() => {}}
            isLoading={false}
            loadingSubmit={loadingSubmit}
            error={undefined}
            stop={() => {}}
            navCollapsedSize={10}
            defaultLayout={[30, 160]}
            formRef={formRef}
            setInput={() => {}}
          />
          <DialogContent className="flex flex-col space-y-4">
            <DialogHeader className="space-y-2">
              <DialogTitle>Welcome to Chat!</DialogTitle>
              <DialogDescription>
                Enter your name to get started. This is just to personalize your
                experience.
              </DialogDescription>
              <UsernameForm setOpen={setOpen} />
            </DialogHeader>
          </DialogContent>
        </Dialog>
      </main>
    </MessagesContext.Provider>
  );
}
