// /api/github-repos
import { NextApiRequest, NextApiResponse } from "next";
import { auth, clerkClient } from "@clerk/nextjs/server";
import axios from "axios";
import { NextResponse } from "next/server";

export async function GET(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = await auth();

  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  // Get the OAuth access token for the user
  const provider = "oauth_github";
  const client = await clerkClient();
  const clerkResponse = await client.users.getUserOauthAccessToken(
    userId,
    provider
  );
  const accessToken = clerkResponse.data[0].token || "";
  // If the access token is not found, return an error
  if (!accessToken) {
    return res.status(401).json({ message: "Access token not found" });
  }
  try {
    // Fetch GitHub user details
    const userDetails = await fetchGithubUserDetails(accessToken);
    // Fetch the user's GitHub repos
    const repos = await getUserRepos(accessToken);

    return NextResponse.json({
      username: userDetails.login,
      repos: repos,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch GitHub repos" },
      { status: 500 }
    );
  }
}
async function fetchGithubUserDetails(accessToken: string) {
  try {
    const response = await axios.get("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data; // GitHub user details
  } catch (error) {
    console.error("Error fetching GitHub user details:", error);
    throw error;
  }
}
async function getUserRepos(githubToken: string) {
  try {
    const repos = await fetchGithubRepos(githubToken);
    return repos;
  } catch (error) {
    console.error("Error fetching user repos:", error);
    throw error;
  }
}

async function fetchGithubRepos(accessToken: string) {
  try {
    const response = await axios.get(
      "https://api.github.com/user/repos?per_page=100&type=owner",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return response.data; // List of repos
  } catch (error) {
    console.error("Error fetching GitHub repos:", error);
    throw error;
  }
}
