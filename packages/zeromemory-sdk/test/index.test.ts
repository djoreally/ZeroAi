import { describe,expect,it } from "vitest";
import { ZeroMemoryClient,ZeroMemoryError } from "../src/index";

describe("@zeroai/memory",()=>{
  it("sends scoped context requests with bearer auth",async()=>{
    const calls:Array<{url:string;init:RequestInit}> = [];
    const fetcher:typeof fetch=async(input,init)=>{
      calls.push({url:String(input),init:init ?? {}});
      return new Response(JSON.stringify({capsuleId:"c1",workspaceId:"w1",scope:{userId:"u1"},memories:[],workingMemory:"",count:0,pipe:{scanned:0,active:0,scopeMatched:0,supersededCollapsed:0,ranked:0,returned:0}}),{status:200,headers:{"content-type":"application/json"}});
    };
    const client=new ZeroMemoryClient({baseUrl:"https://brain.example/",apiKey:"secret",fetch:fetcher});
    await client.context({scope:{userId:"u1"},input:"hello"});
    expect(calls[0].url).toBe("https://brain.example/api/v1/brain/context");
    expect((calls[0].init.headers as Record<string,string>).authorization).toBe("Bearer secret");
  });

  it("runs context -> model -> observe as one helper loop",async()=>{
    const paths:string[]=[];
    const fetcher:typeof fetch=async(input)=>{
      const url=String(input);
      paths.push(new URL(url).pathname);
      if(url.endsWith("/context")){
        return new Response(JSON.stringify({capsuleId:"c1",workspaceId:"w1",scope:{userId:"u1"},memories:[],workingMemory:"[fact:x] remembered",count:1,pipe:{scanned:1,active:1,scopeMatched:1,supersededCollapsed:0,ranked:1,returned:1}}),{status:200,headers:{"content-type":"application/json"}});
      }
      return new Response(JSON.stringify({workspaceId:"w1",scope:{userId:"u1"},stored:[],storedCount:0,supersededCount:0,inferredCount:0,ignored:true}),{status:200,headers:{"content-type":"application/json"}});
    };
    const client=new ZeroMemoryClient({baseUrl:"https://brain.example",apiKey:"secret",fetch:fetcher});
    const result=await client.runTurn({
      scope:{userId:"u1"},
      message:"what do you remember?",
      run:async({workingMemory})=>`model saw ${workingMemory}`
    });
    expect(result.output).toContain("remembered");
    expect(paths).toEqual(["/api/v1/brain/context","/api/v1/brain/observe"]);
  });

  it("throws a typed error for non-2xx responses",async()=>{
    const fetcher:typeof fetch=async()=>new Response(JSON.stringify({error:"FORBIDDEN"}),{status:403,headers:{"content-type":"application/json"}});
    const client=new ZeroMemoryClient({baseUrl:"https://brain.example",apiKey:"bad",fetch:fetcher});
    await expect(client.context({scope:{userId:"u1"},input:"hello"})).rejects.toBeInstanceOf(ZeroMemoryError);
  });
});
