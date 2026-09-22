type BhashiniResponse={pipelineResponse?:Array<{output?:Array<{target?:string}>}>};

const DEFAULT_ENDPOINT='https://dhruva-api.bhashini.gov.in/services/inference/pipeline';
const endpoint=()=>{const value=process.env.BHASHINI_INFERENCE_URL;return value?.startsWith('http://')||value?.startsWith('https://')?value:DEFAULT_ENDPOINT};
const inferenceKey=()=>process.env.BHASHINI_INFERENCE_API_KEY||((process.env.BHASHINI_INFERENCE_URL&&!process.env.BHASHINI_INFERENCE_URL.startsWith('http'))?process.env.BHASHINI_INFERENCE_URL:undefined);

export async function translateWithBhashini(text:string,sourceLanguage:string,targetLanguage:string){
 const apiKey=process.env.BHASHINI_API_KEY;const userId=process.env.BHASHINI_USER_ID;const serviceId=process.env.BHASHINI_TRANSLATION_SERVICE_ID||process.env.BHASHINI_TRANSLATION_MODEL_ID;const authKey=inferenceKey();
 if(!apiKey||!userId||!serviceId)throw new Error('Bhashini translation is not configured. Set BHASHINI_API_KEY, BHASHINI_USER_ID, and BHASHINI_TRANSLATION_SERVICE_ID or BHASHINI_TRANSLATION_MODEL_ID.');
 const headers:Record<string,string>={'Content-Type':'application/json',userID:userId,ulcaApiKey:apiKey};if(authKey)headers.Authorization=authKey;
 const response=await fetch(endpoint(),{method:'POST',headers,body:JSON.stringify({pipelineTasks:[{taskType:'translation',config:{language:{sourceLanguage,targetLanguage},serviceId}}],inputData:{input:[{source:text}]}})});
 if(!response.ok)throw new Error(`Bhashini translation failed with ${response.status}`);
 const data=await response.json() as BhashiniResponse;const translated=data.pipelineResponse?.[0]?.output?.[0]?.target;if(!translated)throw new Error('Bhashini returned no translated text.');return translated;
}

