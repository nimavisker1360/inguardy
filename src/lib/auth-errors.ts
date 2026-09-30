const SIGN_UP_AUTH_ERROR_MESSAGES: Record<string, string> = {
  account_not_linked:
    "This email is already registered with a different sign-in method. Please sign in with your existing account or use a different email.",
  user_already_exists:
    "This email is already registered. Please sign in with your existing account or use a different email.",
  USER_ALREADY_EXISTS:
    "This email is already registered. Please sign in with your existing account or use a different email.",
  INVALID_OTP: "The verification code is incorrect. Please try again.",
  OTP_EXPIRED: "This verification code has expired. Please request a new code.",
  TOO_MANY_ATTEMPTS: "Too many incorrect attempts. Please request a new code.",
};

const SIGN_IN_AUTH_ERROR_MESSAGES: Record<string, string> = {
  account_not_linked:
    "Please sign in with the same method you used when creating your account.",
  EMAIL_NOT_VERIFIED: "Please verify your email address before signing in.",
  email_not_verified: "Please verify your email address before signing in.",
};

function getMappedAuthErrorMessage(
  messages: Record<string, string>,
  error: string | null | undefined
) {
  if (!error) {
    return "";
  }

  return messages[error] ?? "";
}

export function getSignUpAuthErrorMessage(error: string | null | undefined) {
  return getMappedAuthErrorMessage(SIGN_UP_AUTH_ERROR_MESSAGES, error);
}

export function getSignInAuthErrorMessage(error: string | null | undefined) {
  return getMappedAuthErrorMessage(SIGN_IN_AUTH_ERROR_MESSAGES, error);
}

export function getSignUpAuthErrorFallbackMessage(error: string | null | undefined) {
  return getSignUpAuthErrorMessage(error) || "Authentication failed. Please try again.";
}

export function getSignInAuthErrorFallbackMessage(error: string | null | undefined) {
  return getSignInAuthErrorMessage(error) || "Authentication failed. Please try again.";
}
