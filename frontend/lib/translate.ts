export async function translateText(text:string,sourceLanguage:string,targetLanguage:string){
 const response=await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,sourceLanguage,targetLanguage})});
 const data=await response.json();if(!response.ok)throw new Error(data.error??'Translation failed.');return data.translation as string;
}