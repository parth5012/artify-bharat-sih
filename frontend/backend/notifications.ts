export async function sendPaymentConfirmation(input:{phone:string;language:string;orderId:string;status:'paid'|'failed'}){
 const endpoint=process.env.CONFIRMATION_CALL_URL;if(!endpoint)return{sent:false,reason:'CONFIRMATION_CALL_URL is not configured'};
 const headers={'Content-Type':'application/json','Authorization':`Bearer ${process.env.CONFIRMATION_CALL_TOKEN??''}`};
 // Retry with exponential backoff: payment confirmations must survive
 // transient provider failures. 4xx (except 429) are permanent rejections.
 for(let attempt=1;attempt<=3;attempt++){
  try{
   const response=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(input)});
   if(response.ok)return{sent:true,attempts:attempt};
   if(response.status<500&&response.status!==429)return{sent:false,attempts:attempt,reason:`Confirmation call rejected with ${response.status}`};
  }catch(error){
   if(attempt===3)return{sent:false,attempts:attempt,reason:error instanceof Error?error.message:'network error'};
  }
  await new Promise(r=>setTimeout(r,2**attempt*250));
 }
 return{sent:false,attempts:3,reason:'Confirmation call failed after retries'};
}