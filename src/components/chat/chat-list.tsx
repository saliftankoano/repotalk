import React, { useRef, useEffect, useContext } from "react";
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
import { Message } from "./chat-bottombar";
import { useMessages } from "@/context";
import { toast } from "sonner";
import { useRepo } from "@/context";

interface ChatListProps {
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  loadingSubmit: boolean;
  formRef: React.RefObject<HTMLFormElement>;
  isMobile: boolean;
  handleQuestionClick: (value: string, e: React.MouseEvent) => void;
  stop: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 15);

export default function ChatList({
  handleQuestionClick,
  isLoading,
  loadingSubmit,
  formRef,
  isMobile,
  stop,
}: ChatListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [name, setName] = React.useState<string>("");
  const [localStorageIsLoading, setLocalStorageIsLoading] =
    React.useState(true);
  const [initialQuestions, setInitialQuestions] = React.useState<Message[]>([]);
  const {
    messages: contextMessages,
    addMessage,
    updateMessage,
    setMessages: setContextMessages,
  } = useMessages();
  const { selectedRepo } = useRepo();
  // console.log("updateMessage function:", updateMessage);

  useEffect(() => {
    // console.log("Messages updated:", messages);
  }, [contextMessages]);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  };

  useEffect(() => {
    const username = localStorage.getItem("ollama_user");
    const storedRepo = localStorage.getItem("selected_repo");
    if (username) {
      setName(username);
      setLocalStorageIsLoading(false);
    }
    if (storedRepo) {
      // setSelectedRepo(storedRepo);
    }
  }, []);

  useEffect(() => {
    // Fetch 4 initial questions
    if (!contextMessages || contextMessages.length === 0) {
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
    }
  }, [isMobile, contextMessages]);
  // Default Questions Handler
  const onClickQuestion = (value: string, e: React.MouseEvent) => {
    e.preventDefault();
    handleQuestionClick(value, e);

    setTimeout(() => {
      formRef.current?.dispatchEvent(
        new Event("submit", {
          cancelable: true,
          bubbles: true,
        })
      );
    }, 1);
  };

  const fetchAIResponse = async (userMessage: string) => {
    try {
      const assistantMessageId = generateId();
      let accumulatedContent = "";

      // Add only one user message and one assistant message
      setContextMessages((prev) => [
        ...prev.filter((msg) => msg.content !== userMessage), // Remove any duplicate messages
        {
          id: generateId(),
          role: "user",
          content: userMessage,
        },
        {
          id: assistantMessageId,
          role: "assistant",
          content: "",
        },
      ]);

      // Format messages for API
      const formattedMessages = [
        ...contextMessages,
        { role: "user", content: userMessage },
      ].map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: formattedMessages,
          selectedRepo: selectedRepo,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API error response:", errorData); // Add this debug log
        if (errorData.type === "NOT_EMBEDDED") {
          toast.error(
            "Please embed the repository first before asking questions."
          );
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No reader available");
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                accumulatedContent += content;
                setContextMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            } catch (e) {
              console.error("Error parsing chunk:", e);
            }
          }
        }
      }

      return accumulatedContent;
    } catch (error) {
      console.error("Error fetching AI response:", error);
      toast.error("Failed to get AI response. Please try again.");
    }
  };

  useEffect(() => {
    // console.log("Messages effect triggered", {
    //   messages: contextMessages,
    // });

    if (contextMessages && contextMessages.length > 0 && selectedRepo) {
      const lastMessage = contextMessages[contextMessages.length - 1];
      if (lastMessage.role === "user") {
        fetchAIResponse(lastMessage.content);
      }
      scrollToBottom();
    }
  }, [contextMessages, selectedRepo]);

  if (!contextMessages?.length) {
    return (
      <div className="w-full h-full flex justify-center items-center">
        <div className="relative flex flex-col gap-4 items-center justify-center w-full h-full">
          <div></div>
          <div className="flex flex-col gap-4 items-center">
            <Image
              src="/gitcat.png"
              alt="Gitcat logo"
              width={150}
              height={150}
              className="h-24 w-24 object-contain dark:invert"
            />
            <p className="text-center text-lg text-muted-foreground">
              How can I help you today?
            </p>
          </div>

          <div className="absolute bottom-0 w-full px-4 sm:max-w-3xl grid gap-2 sm:grid-cols-2 sm:gap-4 text-sm">
            {/* Only display 4 random questions */}
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
      </div>
    );
  }

  return (
    <div
      id="scroller"
      className="w-full overflow-y-scroll overflow-x-hidden h-full justify-end"
    >
      <div className="w-full flex flex-col overflow-x-hidden overflow-y-hidden min-h-full justify-end">
        {contextMessages?.map((message, index) => (
          <motion.div
            key={message.id}
            layout
            initial={{ opacity: 0, scale: 1, y: 20, x: 0 }}
            animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, scale: 1, y: 20, x: 0 }}
            transition={{
              opacity: { duration: 0.1 },
              layout: {
                type: "spring",
                bounce: 0.3,
                duration: 0.05 + 0.2,
              },
            }}
            className={cn(
              "flex flex-col gap-2 p-4 whitespace-pre-wrap",
              message.role === "user" ? "items-end" : "items-start"
            )}
          >
            <div className="flex gap-3 items-center">
              {message.role === "user" ? (
                <div className="flex items-end gap-3">
                  <div className="flex flex-col gap-2 bg-accent p-3 rounded-md max-w-xs sm:max-w-2xl overflow-x-auto">
                    <p className="text-end">{message.content}</p>
                  </div>
                  <Avatar>
                    <AvatarFallback>
                      {name && name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              ) : (
                <div className="flex items-end gap-2">
                  <Avatar>
                    <AvatarImage
                      src="/gitcat.png"
                      alt="AI"
                      className="object-contain dark:invert"
                    />
                  </Avatar>
                  <span className="bg-accent p-3 rounded-md max-w-xs sm:max-w-2xl overflow-x-auto">
                    {message.content ? (
                      <Markdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({
                            node,
                            inline,
                            className,
                            children,
                            ...props
                          }: {
                            node?: any;
                            inline?: boolean;
                            className?: string;
                            children?: React.ReactNode;
                          }) {
                            return !inline ? (
                              <CodeDisplayBlock
                                language={className?.replace("language-", "")}
                                code={String(children).replace(/\n$/, "")}
                                {...props}
                              />
                            ) : (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </Markdown>
                    ) : (
                      <span className="animate-pulse">...</span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {loadingSubmit && (
          <div className="flex pl-4 pb-4 gap-2 items-center">
            <Avatar className="flex justify-start items-center">
              <AvatarImage
                src="/gitcat.png"
                alt="Gitcat logo"
                width={6}
                height={6}
                className="object-contain dark:invert"
              />
            </Avatar>
            <div className="bg-accent p-3 rounded-md max-w-xs sm:max-w-2xl overflow-x-auto">
              <div className="flex gap-1">
                <span className="size-1.5 rounded-full bg-slate-700 motion-safe:animate-[bounce_1s_ease-in-out_infinite] dark:bg-slate-300"></span>
                <span className="size-1.5 rounded-full bg-slate-700 motion-safe:animate-[bounce_0.5s_ease-in-out_infinite] dark:bg-slate-300"></span>
                <span className="size-1.5 rounded-full bg-slate-700 motion-safe:animate-[bounce_1s_ease-in-out_infinite] dark:bg-slate-300"></span>
              </div>
            </div>
          </div>
        )}
      </div>
      <div id="anchor" ref={bottomRef}></div>
    </div>
  );
}
