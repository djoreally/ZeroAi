type CachedToken={token:string;expiresAt:number};
type CachedSession={cookie:string};

let tokenCache:CachedToken|undefined;
let sessionCache:CachedSession|undefined;

function decodeBase64Url(input:string){
  return Buffer.from(input.replace(/-/g,"+").replace(/_/g,"/"),"base64").toString("utf8");
}

export function jwtPayload(token:string):Record<string,unknown>|null {
  const parts=token.split(".");
  if(parts.length!==3) return null;
  try {
    return JSON.parse(decodeBase64Url(parts[1])) as Record<string,unknown>;
  } catch {
    return null;
  }
}

export function jwtExpiry(token:string):number {
  const payload=jwtPayload(token);
  const exp=payload?.exp;
  return typeof exp==="number" ? exp*1000 : 0;
}

function cookieHeader(response:Response):string {
  const headers=response.headers as Headers & {getSetCookie?:()=>string[]};
  const values=headers.getSetCookie?.() ?? [response.headers.get("set-cookie") ?? ""];
  return values
    .filter(Boolean)
    .map(value=>value.split(";")[0])
    .filter(Boolean)
    .join("; ");
}

async function signInService(baseUrl:string,email:string,password:string):Promise<string> {
  const response=await fetch(`${baseUrl.replace(/\/$/,"")}/sign-in/email`,{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({email,password})
  });

  if(!response.ok){
    throw new Error(`NEON_SERVICE_SIGN_IN_FAILED:${response.status}`);
  }

  const cookie=cookieHeader(response);
  if(!cookie) throw new Error("NEON_SERVICE_SESSION_COOKIE_MISSING");
  return cookie;
}

async function fetchJwt(baseUrl:string,cookie:string):Promise<string> {
  const response=await fetch(`${baseUrl.replace(/\/$/,"")}/token`,{
    method:"GET",
    headers:{cookie}
  });

  if(!response.ok){
    throw new Error(`NEON_SERVICE_TOKEN_FAILED:${response.status}`);
  }

  const body=await response.json() as {token?:string;data?:{token?:string}};
  const token=body.token ?? body.data?.token;
  if(!token) throw new Error("NEON_SERVICE_JWT_MISSING");
  return token;
}

export async function getNeonDataApiToken():Promise<string> {
  const staticToken=process.env.ZEROAI_NEON_DATA_API_TOKEN;
  if(staticToken) return staticToken;

  const now=Date.now();
  if(tokenCache && tokenCache.expiresAt-now>60_000) return tokenCache.token;

  const baseUrl=process.env.NEON_AUTH_BASE_URL;
  const email=process.env.ZEROAI_NEON_SERVICE_EMAIL;
  const password=process.env.ZEROAI_NEON_SERVICE_PASSWORD;

  if(!baseUrl || !email || !password){
    throw new Error("ZEROAI_NEON_SERVICE_AUTH_NOT_CONFIGURED");
  }

  if(!sessionCache){
    sessionCache={cookie:await signInService(baseUrl,email,password)};
  }

  let token:string;
  try {
    token=await fetchJwt(baseUrl,sessionCache.cookie);
  } catch {
    sessionCache={cookie:await signInService(baseUrl,email,password)};
    token=await fetchJwt(baseUrl,sessionCache.cookie);
  }

  const payload=jwtPayload(token);
  if(payload?.role!=="zeroai_service"){
    throw new Error("NEON_SERVICE_ROLE_MISMATCH");
  }

  tokenCache={
    token,
    expiresAt:jwtExpiry(token) || now+5*60_000
  };
  return token;
}

export function resetNeonServiceTokenCache(){
  tokenCache=undefined;
  sessionCache=undefined;
}
