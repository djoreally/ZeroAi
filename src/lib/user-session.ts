import { authServer } from "./auth-server";

export async function getSignedInUser(){
  const result:any=await authServer.getSession();
  const data=result?.data ?? result;
  const user=data?.user ?? result?.user ?? null;
  if(!user?.id) return null;
  return {id:String(user.id),name:user.name ? String(user.name) : undefined,email:user.email ? String(user.email) : undefined};
}
