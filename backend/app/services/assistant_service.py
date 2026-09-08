"""
LangAI - 'Ask Dadi' Voice Assistant Service
Provides contextual, empathetic, dialect-aware voice advice to rural Indian artisans.
"""

from typing import Dict, Any, List
import re
from app.schemas.assistant import DadiQueryRequest, DadiQueryResponse

class AskDadiService:
    """Conversational AI Assistant ('दादी से पूछो') tailored for rural weavers and craftspeople."""

    def __init__(self):
        self.knowledge_base = [
            {
                "keywords": ["photo", "camera", "tasveer", "khinchna", "picture", "camera", "फोटो", "तस्वीर"],
                "bhojpuri": "बबुआ, साड़ी या सामान के हमेशा दिन के साफ धूप/उजाला में फैला के फोटो खींचा। कैमरा के 1:1 चौकोर फ्रेम में रखब त AI अपने आप उज्जर बैकग्राउंड बना दी।",
                "hindi": "बेटा, उत्पाद को हमेशा दिन की प्राकृतिक रोशनी में समतल जगह पर रखकर फोटो खींचें। 1:1 चौकोर फ्रेम में बीच में रखें, AI अपने आप बैकग्राउंड साफ कर देगा।",
                "english": "Dear child, photograph your product under natural daylight on a flat surface. Keep it centered in the 1:1 square frame, and the AI studio will automatically remove the background.",
                "actions": ["Open AI Smart Camera", "View Studio Preview"],
                "tip": "जरी या नक्काशी के बारीक काम का क्लोज-अप फोटो जरूर लीजियेगा!"
            },
            {
                "keywords": ["price", "daam", "rate", "rupaye", "paisa", "kimat", "मुल्य", "दाम", "कीमत"],
                "bhojpuri": "कीमत तय करत घरी आपन कच्चा माल के खरचा आ जेतना दिन मेहनत लागल ओकर कम से कम ₹450 प्रति दिन के हिसाब जोड़ के राखा। बिचौलिया के कम दाम पर मत दीहा!",
                "hindi": "दाम तय करते समय कच्चे माल का खर्च और जितने दिन की मेहनत है, उसका कम से कम ₹450 प्रतिदिन का फेयर वेज जरूर जोड़ें। बिचौलियों के चक्कर में कम में न बेचें!",
                "english": "When setting the price, calculate raw material costs plus at least ₹450/day fair wage floor for your labor. Do not undersell to middlemen!",
                "actions": ["Open Smart Pricing Calculator", "Check Fair Wage Floor"],
                "tip": "आर्टिफाई भारत का AI आपको बाजार का सही रेंज अपने आप सुझाएगा।"
            },
            {
                "keywords": ["gi", "tag", "certificate", "pehchan", "trifed", "पहचान", "सर्टिफिकेट", "जीआई"],
                "bhojpuri": "तोहार पहिचान कार्ड आ TRIFED नंबर से तोहार कला के सरकारी मान्यता मिली आ GeM पोर्टल पर सरकारी खरीद में बड़हन आर्डर मिली। डिजिटल पासपोर्ट वाला QR कोड जरूर बनवा ला।",
                "hindi": "आपके पहचान कार्ड और TRIFED नंबर से आपकी कला को सरकारी प्रमाण मिलता है और GeM पोर्टल पर बड़े ऑर्डर मिलते हैं। उत्पाद पर डिजिटल पासपोर्ट QR कोड जरूर लगाएं।",
                "english": "Your Pehchan Card and TRIFED ID authenticate your heritage craft on GeM and ONDC. Always generate the SHA-256 Digital Passport QR code for verified buyer trust.",
                "actions": ["Verify Pehchan / TRIFED ID", "Generate Digital Passport"],
                "tip": "GI टैग वाले असली माल का खरीदार हमेशा ज्यादा दाम देने को तैयार रहता है।"
            },
            {
                "keywords": ["gem", "ondc", "b2b", "bechna", "sell", "market", "बेचना", "बाजार"],
                "bhojpuri": "एक क्लिक में तोहार सामान GeM (सरकारी खरीद), ONDC (ऑनलाइन रिटेल) आ B2B ग्राहकन तक पहुँच जाई। पैकेजिंग साफ राखा आ बिल के साथ QR कोड भेजा।",
                "hindi": "वन-टैप पब्लिश से आपका उत्पाद सीधे GeM, ONDC और थोक B2B खरीदारों तक पहुंच जाता है। पार्सल पर QR पासपोर्ट कोड लगाना न भूलें।",
                "english": "With One-Tap Publish, your products reach GeM government procurement, ONDC e-commerce, and direct B2B institutional buyers effortlessly.",
                "actions": ["One-Tap Publish to GeM/ONDC", "View My Inventory"],
                "tip": "बल्क B2B खरीदारों के लिए 10 या अधिक पीस पर 10-15% डिस्काउंट रखना अच्छा रहता है।"
            }
        ]

    async def get_dadi_advice(self, request: DadiQueryRequest) -> DadiQueryResponse:
        query_lower = request.query_text.lower()
        dialect = (request.dialect or "bhojpuri").lower()

        matched_entry = None
        for entry in self.knowledge_base:
            for kw in entry["keywords"]:
                if kw in query_lower:
                    matched_entry = entry
                    break
            if matched_entry:
                break

        if not matched_entry:
            # Fallback gentle wisdom
            if dialect == "hindi":
                answer_text = "बेटा, आर्टिफाई भारत में आप पहले कैमरे से फोटो लें, फिर अपनी बोली में बोलकर जानकारी दें। AI आपके लिए सही दाम और सरकारी पासपोर्ट खुद बना देगा।"
            elif dialect == "maithili":
                answer_text = "बबुआ, आर्टिफाई भारत मे पहिने कैमरा स फोटो लीअ, फेर अपन मैथिली मे बोलू। AI अहांक लेल उचित दाम आ डिजिटल पासपोर्ट अपने बना देब।"
            else: # bhojpuri default
                answer_text = "बबुआ, चिंता मत करा! बस कैमरा से 1:1 फोटो खींचा, फिर आपन बोली में बोलीं। आर्टिफाई भारत तोहार खातिर सरकारी पासपोर्ट आ बढ़िया दाम तय कर दी।"
            
            answer_english = "Dear child, do not worry! Just take a 1:1 photo, speak in your native dialect, and Artify Bharat AI will automatically structure your catalog, calculate fair pricing, and generate a verified QR passport."
            suggested_actions = ["Start 'Naya Product' Flow", "Open AI Smart Camera", "Calculate Fair Price"]
            dadi_tip = "अपनी पारंपरिक बुनाई और हस्तकला की कहानी गर्व से बताएं!"
        else:
            if dialect == "hindi":
                answer_text = matched_entry["hindi"]
            elif dialect == "english":
                answer_text = matched_entry["english"]
            else: # bhojpuri / maithili
                answer_text = matched_entry["bhojpuri"]

            answer_english = matched_entry["english"]
            suggested_actions = matched_entry["actions"]
            dadi_tip = matched_entry["tip"]

        audio_mock_url = f"media_storage/audio/dadi_advice_{abs(hash(request.query_text)) % 10000}.mp3"

        return DadiQueryResponse(
            answer_text=answer_text,
            answer_english=answer_english,
            dialect=dialect,
            audio_response_url=audio_mock_url,
            suggested_actions=suggested_actions,
            dadi_tip=dadi_tip
        )

assistant_service = AskDadiService()
