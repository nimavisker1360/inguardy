import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { getConfiguredSiteUrl, PRODUCTION_SITE_URL } from "@/lib/deployment-url";
import {
  sendEmailVerificationCodeEmail,
  sendPasswordResetEmail,
} from "@/lib/auth-email";
import prisma from "@/lib/prisma";

function getTrustedOrigins() {
  return Array.from(
    new Set([
      PRODUCTION_SITE_URL,
      getConfiguredSiteUrl(),
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "http://localhost:3001",
      "http://127.0.0.1:3001",
      ...(process.env.BETTER_AUTH_TRUSTED_ORIGINS || "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    ])
  );
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || getConfiguredSiteUrl(),
  trustedOrigins: getTrustedOrigins(),
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google"],
      requireLocalEmailVerified: false,
    },
  },
  emailVerification: {
    // The email OTP plugin sends the code after sign-up. Disabling the core
    // link email prevents users from receiving two different verification emails.
    sendOnSignUp: false,
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl: url,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      prompt: "select_account",
    },
  },
  plugins: [
    emailOTP({
      otpLength: 6,
      expiresIn: 10 * 60,
      allowedAttempts: 5,
      storeOTP: "hashed",
      sendVerificationOnSignUp: true,
      rateLimit: {
        window: 60,
        max: 3,
      },
      sendVerificationOTP: async ({ email, otp, type }) => {
        if (type !== "email-verification") {
          return;
        }

        const user = await prisma.user.findUnique({
          where: { email },
          select: { name: true },
        });

        await sendEmailVerificationCodeEmail({
          to: email,
          name: user?.name,
          code: otp,
        });
      },
    }),
  ],
});
