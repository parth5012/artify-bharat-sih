export async function sendPaymentConfirmation(input:{phone:string;language:string;orderId:string;status:'paid'|'failed'}){
 const endpoint=process.env.CONFIRMATION_CALL_URL;if(!endpoint)return{sent:false,reason:'CONFIRMATION_CALL_URL is not configured'};
 const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.CONFIRMATION_CALL_TOKEN??''}`},body:JSON.stringify(input)});if(!response.ok)throw new Error(`Confirmation call failed with ${response.status}`);return{sent:true};
}