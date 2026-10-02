import { createNeonAuth } from "@neondatabase/neon-js/auth/next/server";

const baseUrl=process.env.NEON_AUTH_BASE_URL;
const cookieSecret=process.env.NEON_AUTH_COOKIE_SECRET;

if(!baseUrl) throw new Error("NEON_AUTH_BASE_URL_NOT_CONFIGURED");
if(!cookieSecret) throw new Error("NEON_AUTH_COOKIE_SECRET_NOT_CONFIGURED");

export const authServer=createNeonAuth({
  baseUrl,
  cookies:{
    secret:cookieSecret,
    sessionDataTtl:300
  }
});
