import fetch from 'node-fetch';

export interface CopilotUsage {
  activeUsers: number;
  completions: {
    count: number;
    tokens: number;
  };
  completionsFetched: {
    count: number;
    tokens: number;
  };
}

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
}

/**
 * Check GitHub Copilot usage for a given token
 */
export async function getCopilotUsage(token: string): Promise<CopilotUsage> {
  const response = await fetch('https://api.github.com/user/copilot_usage', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch Copilot usage: ${response.statusText}`);
  }

  return (await response.json()) as CopilotUsage;
}

/**
 * Get GitHub user info
 */
export async function getGitHubUser(token: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch GitHub user: ${response.statusText}`);
  }

  return (await response.json()) as GitHubUser;
}

/**
 * Validate a GitHub token
 */
export async function validateToken(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
