import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;

type AuthClientError = {
  code?: string;
  message?: string;
  status?: number;
  statusText?: string;
};

type AuthClientResponse<T> = Promise<{
  data: T | null;
  error: AuthClientError | null;
}>;

export function requestPasswordReset(input: {
  email: string;
  redirectTo: string;
}): AuthClientResponse<{ status: boolean; message: string }> {
  return authClient.$fetch("/request-password-reset", {
    method: "POST",
    body: input,
  }) as AuthClientResponse<{ status: boolean; message: string }>;
}

export function resetPassword(input: {
  newPassword: string;
  token: string;
}): AuthClientResponse<{ status: boolean }> {
  return authClient.$fetch("/reset-password", {
    method: "POST",
    body: input,
  }) as AuthClientResponse<{ status: boolean }>;
}
