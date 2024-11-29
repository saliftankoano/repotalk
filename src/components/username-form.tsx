"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import React from "react";
import axios from "axios";
import { toast } from "sonner";

const formSchema = z.object({
  username: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  githubToken: z
    .string()
    .min(1, {
      message: "GitHub token is required",
    })
    .regex(/^ghp_[a-zA-Z0-9]+$/, {
      message: "Invalid GitHub token format. Should start with 'ghp_'",
    }),
});

interface UsernameFormProps {
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function UsernameForm({ setOpen }: UsernameFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      githubToken: "",
    },
  });

  const fetchAndStoreRepos = async (username: string, token: string) => {
    try {
      const response = await axios.get(
        `https://api.github.com/users/${username}/repos`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      console.log(response.data);
      const repoNames = response.data.map(
        (repo: { name: string }) => repo.name
      );
      localStorage.setItem("github_repos", JSON.stringify(repoNames));
      window.dispatchEvent(new Event("storage"));
      return true;
    } catch (error) {
      console.error("Error fetching repositories:", error);
      toast.error(
        "Failed to fetch repositories. Please check your credentials."
      );
      return false;
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    const success = await fetchAndStoreRepos(
      values.username,
      values.githubToken
    );

    if (success) {
      localStorage.setItem("chat_user", values.username);
      localStorage.setItem("github_token", values.githubToken);
      window.dispatchEvent(new Event("storage"));
      setOpen(false);
    } else {
      // Clear the form if there was an error
      form.reset();
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 pt-2">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GitHub Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter your GitHub username" {...field} />
              </FormControl>
              <FormDescription>
                Your GitHub username to fetch repositories from.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="githubToken"
          render={({ field }) => (
            <FormItem>
              <FormLabel>GitHub Personal Access Token</FormLabel>
              <FormControl>
                <Input
                  type="password"
                  placeholder="ghp_your_token_here"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Your GitHub token will be stored locally and used to fetch
                repositories. Create one at GitHub Settings → Developer Settings
                → Personal Access Tokens.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className="w-full" type="submit">
          Submit
        </Button>
      </form>
    </Form>
  );
}
