import {describe,expect,it} from "vitest";
import {jwtExpiry} from "./neon-service-token";

function fakeJwt(payload:object){
  const enc=(value:string)=>Buffer.from(value).toString("base64url");
  return `${enc(JSON.stringify({alg:"none"}))}.${enc(JSON.stringify(payload))}.sig`;
}

describe("Neon service token helpers",()=>{
  it("reads JWT expiry",()=>{
    expect(jwtExpiry(fakeJwt({exp:1234}))).toBe(1_234_000);
  });

  it("returns zero for invalid tokens",()=>{
    expect(jwtExpiry("not-a-jwt")).toBe(0);
  });
});
