import { Message, useChat } from "ai/react";
import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { ChatProps } from "./chat";
import Image from "next/image";
import CodeDisplayBlock from "../code-display-block";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { INITIAL_QUESTIONS } from "@/utils/initial-questions";
import { Button } from "../ui/button";

export default function ChatList({
  input,
  handleInputChange,
  handleSubmit,
  isLoading,
  error,
  stop,
  loadingSubmit,
  formRef,
  isMobile,
}: ChatProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState<string>("");
  const [localStorageIsLoading, setLocalStorageIsLoading] =
    React.useState(true);
  const [initialQuestions, setInitialQuestions] = React.useState<Message[]>([]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    const username = localStorage.getItem("ollama_user");
    if (username) {
      setName(username);
      setLocalStorageIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const questionCount = isMobile ? 2 : 4;

    setInitialQuestions(
      INITIAL_QUESTIONS.sort(() => Math.random() - 0.5)
        .slice(0, questionCount)
        .map((message) => {
          return {
            id: "1",
            role: "user",
            content: message.content,
          };
        })
    );
  }, [isMobile]);

  const onClickQuestion = (value: string, e: React.MouseEvent) => {
    e.preventDefault();

    handleInputChange({
      target: { value },
    } as React.ChangeEvent<HTMLTextAreaElement>);

    setTimeout(() => {
      formRef.current?.dispatchEvent(
        new Event("submit", {
          cancelable: true,
          bubbles: true,
        })
      );
    }, 1);
  };

  return (
    <div className="w-full h-full flex justify-center items-center">
      <div className="relative flex flex-col gap-4 items-center justify-center w-full h-full">
        <div></div>
        <div className="flex flex-col gap-4 items-center">
          <Image
            src="/gitcat.png"
            alt="AI"
            width={60}
            height={60}
            className="h-20 w-14 object-contain dark:invert"
          />
          <p className="text-center text-lg text-muted-foreground">
            How can I help you today?
          </p>
        </div>

        <div className="absolute bottom-0 w-full px-4 sm:max-w-3xl grid gap-2 sm:grid-cols-2 sm:gap-4 text-sm">
          {initialQuestions.length > 0 &&
            initialQuestions.map((message) => {
              const delay = Math.random() * 0.25;

              return (
                <motion.div
                  initial={{ opacity: 0, scale: 1, y: 10, x: 0 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 1, y: 10, x: 0 }}
                  transition={{
                    opacity: { duration: 0.1, delay },
                    scale: { duration: 0.1, delay },
                    y: { type: "spring", stiffness: 100, damping: 10, delay },
                  }}
                  key={message.content}
                >
                  <Button
                    key={message.content}
                    type="button"
                    variant="outline"
                    className="sm:text-start px-4 py-8 flex w-full justify-center sm:justify-start items-center text-sm whitespace-pre-wrap"
                    onClick={(e) => onClickQuestion(message.content, e)}
                  >
                    {message.content}
                  </Button>
                </motion.div>
              );
            })}
        </div>
      </div>
      <div id="anchor" ref={bottomRef}></div>
    </div>
  );
}
