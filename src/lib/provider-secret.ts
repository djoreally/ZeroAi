import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

type EncryptedSecret={
  version:1;
  algorithm:"aes-256-gcm";
  iv:string;
  tag:string;
  ciphertext:string;
};

function key(){
  const raw=process.env.ZEROAI_PROVIDER_SECRET_KEY;
  if(!raw) throw new Error("ZEROAI_PROVIDER_SECRET_KEY_NOT_CONFIGURED");
  const decoded=Buffer.from(raw,"base64");
  if(decoded.length!==32) throw new Error("ZEROAI_PROVIDER_SECRET_KEY_INVALID");
  return decoded;
}

export function encryptProviderSecret(value:string):EncryptedSecret {
  const iv=randomBytes(12);
  const cipher=createCipheriv("aes-256-gcm",key(),iv);
  const ciphertext=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return {
    version:1,
    algorithm:"aes-256-gcm",
    iv:iv.toString("base64"),
    tag:cipher.getAuthTag().toString("base64"),
    ciphertext:ciphertext.toString("base64")
  };
}

export function decryptProviderSecret(value:EncryptedSecret){
  const decipher=createDecipheriv("aes-256-gcm",key(),Buffer.from(value.iv,"base64"));
  decipher.setAuthTag(Buffer.from(value.tag,"base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(value.ciphertext,"base64")),
    decipher.final()
  ]).toString("utf8");
}
