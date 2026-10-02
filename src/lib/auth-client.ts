"use client";

import { createAuthClient } from "@neondatabase/neon-js/auth";

const baseURL=process.env.NEXT_PUBLIC_NEON_AUTH_BASE_URL;

if(!baseURL){
  throw new Error("NEXT_PUBLIC_NEON_AUTH_BASE_URL_NOT_CONFIGURED");
}

export const authClient=createAuthClient(baseURL);
