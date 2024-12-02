import React, { useEffect } from "react";
import ChatTopbar from "./chat-topbar";
import ChatList from "./chat-list";
import ChatBottombar from "./chat-bottombar";
import { Message } from "./chat-bottombar";
export interface ChatProps {
  input: string;
  handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  loadingSubmit?: boolean;
  error: undefined | Error;
  stop: () => void;
  formRef: React.RefObject<HTMLFormElement>;
  isMobile?: boolean;
  setInput?: React.Dispatch<React.SetStateAction<string>>;
}

export default function Chat({
  input,
  handleInputChange,
  isLoading,
  error,
  stop,
  loadingSubmit,
  formRef,
  isMobile,
  setInput,
}: ChatProps) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [question, setQuestion] = React.useState<string>("");
  useEffect(() => {
    // console.log(messages);
  }, [messages]);
  const retrieveMessages = (messages: Message[]) => {
    setMessages(messages);
    console.log(messages);
  };
  const handleQuestionClick = (value: string, e: React.MouseEvent) => {
    e.preventDefault();
    setQuestion(value);
  };
  return (
    <div className="flex flex-col justify-between w-full max-w-3xl h-full ">
      <ChatTopbar isLoading={isLoading} />

      <ChatList
        handleQuestionClick={handleQuestionClick}
        handleInputChange={handleInputChange}
        isLoading={isLoading}
        loadingSubmit={loadingSubmit || false}
        isMobile={isMobile || false}
        formRef={formRef}
        stop={stop}
      />

      <ChatBottombar
        isLoading={isLoading}
        stop={stop}
        formRef={formRef}
        setInput={setInput}
        retrieveMessages={retrieveMessages}
        questionPassed={question}
        messages={messages}
      />
    </div>
  );
}
