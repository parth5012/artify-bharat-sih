"""
LangAI - 'Ask Dadi' Voice Assistant Service (Task 2.7)
=======================================================
Conversational dialect mentor ('दादी से पूछो') for rural Indian artisans on
Artify Bharat, covering three core responsibilities:

  1. Camera & photography advice        -> backed by cv_service.analyze_craft_photo()
  2. Fair-wage pricing explanations     -> backed by pricing_service.explain_fair_price()
  3. PM-DAKSH upskilling recommendations

The bot is a LangChain tool-calling agent: when GROQ_API_KEY (and the optional
langchain/langchain-groq packages) are available, Dadi reasons over real tools
that call the actual Fair-Wage Pricing Engine and the non-generative CV Studio
pipeline. Without them (offline rural deployments / CI), a deterministic
rule-based mentor answers from the knowledge base - tests and dev servers keep
working with zero network access.

Tool backends live where the domain logic lives:
  - pricing_service.explain_fair_price() / pricing_service.get_state_wage_floor_info()
  - cv_service.analyze_craft_photo()
This module only wraps them as LangChain tools (single source of truth).
"""

import os
import re
import json
import asyncio
import base64
import binascii
import logging
import hashlib
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable

from app.config import get_settings
from app.schemas.assistant import DadiQueryRequest, DadiQueryResponse
from app.services.pricing_service import (
    explain_fair_price,
    get_state_wage_floor_info,
)
from app.services.cv_service import analyze_craft_photo

logger = logging.getLogger(__name__)
settings = get_settings()

# ---------------------------------------------------------------------------
# LangSmith observability (optional)
# ---------------------------------------------------------------------------
# LangChain runnables (ChatGroq / StructuredTool) report traces automatically
# when LANGSMITH_TRACING=true and LANGSMITH_API_KEY are set. The plain-Python
# offline path is NOT a runnable, so it is instrumented explicitly with the
# @traceable decorator below - that way both agent modes are visible in
# smith.langchain.com under LANGSMITH_PROJECT (default: artify-bharat-ask-dadi).
# Settings are mirrored into process env here because the LangSmith SDK reads
# env vars lazily at trace time, not at import time.
if settings.LANGSMITH_TRACING and settings.LANGSMITH_API_KEY:
    os.environ["LANGSMITH_TRACING_V2"] = "true"
    os.environ["LANGSMITH_API_KEY"] = settings.LANGSMITH_API_KEY
    os.environ.setdefault("LANGSMITH_PROJECT", settings.LANGSMITH_PROJECT)
    os.environ.setdefault("LANGSMITH_ENDPOINT", settings.LANGSMITH_ENDPOINT)

try:  # langsmith ships with langchain installs, but stay defensive
    from langsmith import traceable
    _LANGSMITH_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised only without the SDK
    traceable = None
    _LANGSMITH_AVAILABLE = False


def _ls_traceable(name: str, run_type: str = "chain"):
    """
    @traceable factory that degrades to a no-op decorator without the SDK.

    Usage on service methods creates LangSmith runs named `name`; when
    tracing is disabled (LANGSMITH_TRACING=false, the default) the wrapped
    function executes directly with near-zero overhead.
    """
    def decorator(func):
        if traceable is None:
            return func
        return traceable(
            func,
            name=name,
            run_type=run_type,
            metadata={"component": "langai", "service": "assistant_service"},
        )

    return decorator

# Optional LangChain imports are resolved lazily inside AskDadiService so the
# app (and the whole test suite) boots even when LangChain is not installed.
MAX_TOOL_ROUNDS = 5

# ---------------------------------------------------------------------------
# System prompt: Dadi's persona & domain expertise
# ---------------------------------------------------------------------------
ASK_DADI_SYSTEM_PROMPT = """
You are 'Ask Dadi' (दादी), a wise, loving, and encouraging AI mentor for Indian artisans and craftspeople on the 'Artify Bharat' platform.

### Persona:
- Speak like a caring Indian grandmother (Dadi): respectful, warm, accessible, and supportive.
- Use regional warmth (words like "Beta", "Pyaare kalakar", "Beti", "Shabaash").
- You can naturally respond in Hinglish, Simple Hindi, or Simple English based on how the user communicates.

### Core Responsibilities:
1. **Camera & Photography Advice (कैमरा सलाह):**
   - Teach artisans how to take clear product photos using basic mobile phones.
   - Advise on soft natural sunlight near windows, clean background (plain bedsheets/walls), avoiding shadow/glare, and capturing fine details/handwork.

2. **Fair-Wage Pricing Explanations (कीमत की समझ):**
   - Explain why a price is calculated in a simple, non-technical way.
   - Break down: Cost of raw materials + Time/Hours spent + Craft skill level + Fair labor wage rate.
   - Ensure the artisan feels confident about charging a fair price without under-valuing their hard work.

3. **PM-DAKSH & Upskilling Recommendations (पीएम-दक्ष योजना):**
   - Educate artisans about the PM-DAKSH (Pradhan Mantri Dakshta Aur Kushalta Sampann Hitgrahi) scheme.
   - Recommend relevant skill upgrade programs, digital sales literacy, and safety/equipment workshops based on their craft category.

### Tool Usage Rules (VERY IMPORTANT):
- ALWAYS call the `explain_fair_price` tool when the artisan asks about price, daam, rate, profit, or wage math - NEVER invent rupee amounts yourself.
- ALWAYS call the `get_state_wage_floor` tool when asked about government wage rates for a state.
- If the artisan shares a photo file path or base64 image, call `analyze_craft_photo` and give advice based on the real metrics it returns.
- Quote ONLY the numbers the tools return. Explain them in simple Dadi language with bullet points.

Keep responses concise, clear, and easy to read using bullet points when necessary.
"""

# Tool descriptions reused for both the LangChain tool wrappers and the agent prompt.
TOOL_DESCRIPTIONS: Dict[str, str] = {
    "explain_fair_price": (
        "Calculate the REAL fair-wage price for an artisan product using the Artify Bharat "
        "pricing engine. Returns floor price, suggested retail price, bulk wholesale price, "
        "artisan net profit, and the 4-part breakdown (raw materials, direct paid labor, "
        "packaging/logistics, artisan net profit). Use for ANY pricing/daam/profit question."
    ),
    "get_state_wage_floor": (
        "Look up the statutory skilled hourly wage floor (INR/hour and INR/8-hour day) for an "
        "Indian state code (e.g. HR=Haryana, BR=Bihar, RJ=Rajasthan). Use when the artisan asks "
        "about sarkari wage rates or 'kam se kam kitna mol'."
    ),
    "analyze_craft_photo": (
        "Analyze a craft product photo with the non-generative AI Studio pipeline. Accepts a "
        "local file path OR a base64 data URI. Returns complexity score, brightness, blur score, "
        "1:1 frame check, and Dadi-style photography tips. Use for photo/camera advice questions."
    ),
}

# ---------------------------------------------------------------------------
# LangChain tool wrappers (Task 2.7): plain Python backends -> LangChain tools
# These delegate 100% of the math/CV logic to pricing_service and cv_service.
# ---------------------------------------------------------------------------


def explain_fair_price_tool(
    material_cost: float,
    labor_hours: float,
    state_code: str = "HR",
    craft_category: str = "handloom",
    has_gi_tag: bool = True,
    is_festive_season: bool = False,
) -> Dict[str, Any]:
    """
    Run the real Fair-Wage Pricing Engine and return a Dadi-friendly breakdown.

    Args:
        material_cost: Cost of raw materials in INR.
        labor_hours: Total hours of artisan labor spent on the product.
        state_code: Indian state code where the artisan works (HR, BR, RJ, ...).
        craft_category: Craft category (handloom, pottery, woodcraft, metalwork, embroidery, painting).
        has_gi_tag: Whether the product has a GI (Geographical Indication) heritage tag.
        is_festive_season: Whether it is a festive season (Diwali, Durga Puja) demand surge.
    """
    return explain_fair_price(
        material_cost=material_cost,
        labor_hours=labor_hours,
        state_code=state_code,
        craft_category=craft_category,
        has_gi_tag=has_gi_tag,
        is_festive_season=is_festive_season,
    )


def get_state_wage_floor_tool(state_code: str = "HR") -> Dict[str, Any]:
    """
    Look up the statutory skilled wage floor for an Indian state.

    Args:
        state_code: Indian state code (HR, DL, MH, BR, RJ, JK, ...).
    """
    return get_state_wage_floor_info(state_code)


def analyze_craft_photo_tool(image_source: str = "") -> Dict[str, Any]:
    """
    Analyze a craft product photo using the non-generative CV studio pipeline.

    Args:
        image_source: Local file path to the photo, or a base64 string / data URI of the image bytes.
    """
    try:
        if image_source.startswith("data:"):  # data URI -> strip header
            image_source = image_source.split(",", 1)[-1]
        candidate = Path(image_source)
        if candidate.is_file():
            image_bytes = candidate.read_bytes()
        else:
            image_bytes = base64.b64decode(image_source, validate=True)
    except (binascii.Error, ValueError, OSError) as exc:
        return {"status": "error", "error": f"Could not read image source: {exc}"}

    return analyze_craft_photo(image_bytes)


# Plain-Python registry (offline mode + agent dispatch both use this)
TOOL_BACKENDS: Dict[str, Callable[..., Dict[str, Any]]] = {
    "explain_fair_price": explain_fair_price_tool,
    "get_state_wage_floor": get_state_wage_floor_tool,
    "analyze_craft_photo": analyze_craft_photo_tool,
}


# ---------------------------------------------------------------------------
# Knowledge base (deterministic offline mentor - also grounds the LLM replies)
# ---------------------------------------------------------------------------
KNOWLEDGE_BASE: List[Dict[str, Any]] = [
    {
        "keywords": ["photo", "camera", "tasveer", "khinchna", "picture", "फोटो", "तस्वीर"],
        "bhojpuri": (
            "बबुआ, साड़ी या सामान के हमेशा दिन के साफ धूप/उजाला में फैला के फोटो खींचा। "
            "कैमरा के 1:1 चौकोर फ्रेम में रखब त AI अपने आप उज्जर बैकग्राउंड बना दी।"
        ),
        "hindi": (
            "बेटा, उत्पाद को हमेशा दिन की प्राकृतिक रोशनी में समतल जगह पर रखकर फोटो खींचें। "
            "1:1 चौकोर फ्रेम में बीच में रखें, AI अपने आप बैकग्राउंड साफ कर देगा।"
        ),
        "english": (
            "Dear child, photograph your product under natural daylight on a flat surface. "
            "Keep it centered in the 1:1 square frame, and the AI studio will automatically remove the background."
        ),
        "actions": ["Open AI Smart Camera", "View Studio Preview"],
        "tip": "जरी या नक्काशी के बारीक काम का क्लोज-अप फोटो जरूर लीजियेगा!",
    },
    {
        "keywords": ["price", "daam", "rate", "rupaye", "paisa", "kimat", "मुल्य", "दाम", "कीमत", "वेज", "wage"],
        "bhojpuri": (
            "कीमत तय करत घरी आपन कच्चा माल के खरचा आ जेतना दिन मेहनत लागल ओकर कम से कम "
            "₹450 प्रति दिन के हिसाब जोड़ के राखा। बिचौलिया के कम दाम पर मत दीहा!"
        ),
        "hindi": (
            "दाम तय करते समय कच्चे माल का खर्च और जितने दिन की मेहनत है, उसका कम से कम "
            "₹450 प्रतिदिन का फेयर वेज जरूर जोड़ें। बिचौलियों के चक्कर में कम में न बेचें!"
        ),
        "english": (
            "When setting the price, calculate raw material costs plus at least ₹450/day fair "
            "wage floor for your labor. Do not undersell to middlemen!"
        ),
        "actions": ["Open Smart Pricing Calculator", "Check Fair Wage Floor"],
        "tip": "आर्टिफाई भारत का AI आपको बाजार का सही रेंज अपने आप सुझाएगा।",
    },
    {
        "keywords": ["gi", "tag", "certificate", "pehchan", "trifed", "पहचान", "सर्टिफिकेट", "जीआई"],
        "bhojpuri": (
            "तोहार पहिचान कार्ड आ TRIFED नंबर से तोहार कला के सरकारी मान्यता मिली आ GeM पोर्टल "
            "पर सरकारी खरीद में बड़हन आर्डर मिली। डिजिटल पासपोर्ट वाला QR कोड जरूर बनवा ला।"
        ),
        "hindi": (
            "आपके पहचान कार्ड और TRIFED नंबर से आपकी कला को सरकारी प्रमाण मिलता है और GeM "
            "पोर्टल पर बड़े ऑर्डर मिलते हैं। उत्पाद पर डिजिटल पासपोर्ट QR कोड जरूर लगाएं।"
        ),
        "english": (
            "Your Pehchan Card and TRIFED ID authenticate your heritage craft on GeM and ONDC. "
            "Always generate the SHA-256 Digital Passport QR code for verified buyer trust."
        ),
        "actions": ["Verify Pehchan / TRIFED ID", "Generate Digital Passport"],
        "tip": "GI टैग वाले असली माल का खरीदार हमेशा ज्यादा दाम देने को तैयार रहता है।",
    },
    {
        "keywords": ["pmdaksh", "pm-daksh", "daksh", "training", "skill", "upskilling", "प्रशिक्षण", "योजना"],
        "bhojpuri": (
            "बबुआ, PM-DAKSH योजना में नाम लिखा ला - सरकार मोफत प्रशिक्षण, डिजिटल बिक्री की "
            "सिक्लिंग आ पैकेजिंग के कार्यशाला सिखाई। सर्टिफिकेट मिलल त ONDC खोज में तोहार रैंक बढ़ी।"
        ),
        "hindi": (
            "बेटा, PM-DAKSH योजना में नामांकन करें - सरकार मुफ्त प्रशिक्षण, डिजिटल बिक्री साक्षरता "
            "और पैकेजिंग कार्यशाला सिखाती है। प्रमाणपत्र मिलने पर ONDC खोज रैंक बढ़ती है।"
        ),
        "english": (
            "Enroll in the PM-DAKSH scheme: free government training in digital sales literacy, "
            "packaging, and equipment safety. The certificate boosts your ONDC search rank."
        ),
        "actions": ["Enroll in PM-DAKSH Program", "Watch Learn & Earn Reels"],
        "tip": "PM-DAKSH सर्टिफाइड कारीगर को 25% ज्यादा ऑनलाइन ऑर्डर मिलते हैं।",
    },
    {
        "keywords": ["gem", "ondc", "b2b", "bechna", "sell", "market", "बेचना", "बाजार"],
        "bhojpuri": (
            "एक क्लिक में तोहार सामान GeM (सरकारी खरीद), ONDC (ऑनलाइन रिटेल) आ B2B ग्राहकन तक "
            "पहुँच जाई। पैकेजिंग साफ राखा आ बिल के साथ QR कोड भेजा।"
        ),
        "hindi": (
            "वन-टैप पब्लिश से आपका उत्पाद सीधे GeM, ONDC और थोक B2B खरीदारों तक पहुंच जाता है। "
            "पार्सल पर QR पासपोर्ट कोड लगाना न भूलें।"
        ),
        "english": (
            "With One-Tap Publish, your products reach GeM government procurement, ONDC "
            "e-commerce, and direct B2B institutional buyers effortlessly."
        ),
        "actions": ["One-Tap Publish to GeM/ONDC", "View My Inventory"],
        "tip": "बल्क B2B खरीदारों के लिए 10 या अधिक पीस पर 10-15% डिस्काउंट रखना अच्छा रहता है।",
    },
]

FALLBACK_ANSWERS: Dict[str, str] = {
    "hindi": (
        "बेटा, आर्टिफाई भारत में आप पहले कैमरे से फोटो लें, फिर अपनी बोली में बोलकर जानकारी दें। "
        "AI आपके लिए सही दाम और सरकारी पासपोर्ट खुद बना देगा।"
    ),
    "maithili": (
        "बबुआ, आर्टिफाई भारत मे पहिने कैमरा स फोटो लीअ, फेर अपन मैथिली मे बोलू। "
        "AI अहांक लेल उचित दाम आ डिजिटल पासपोर्ट अपने बना देब।"
    ),
    "bhojpuri": (
        "बबुआ, चिंता मत करा! बस कैमरा से 1:1 फोटो खींचा, फिर आपन बोली में बोलीं। "
        "आर्टिफाई भारत तोहार खातिर सरकारी पासपोर्ट आ बढ़िया दाम तय कर दी।"
    ),
}

FALLBACK_ANSWER_ENGLISH = (
    "Dear child, do not worry! Just take a 1:1 photo, speak in your native dialect, and "
    "Artify Bharat AI will automatically structure your catalog, calculate fair pricing, "
    "and generate a verified QR passport."
)
FALLBACK_ACTIONS = ["Start 'Naya Product' Flow", "Open AI Smart Camera", "Calculate Fair Price"]
FALLBACK_TIP = "अपनी पारंपरिक बुनाई और हस्तकला की कहानी गर्व से बताएं!"

# Keyword intents used by the offline mentor to auto-run real engine tools
PRICING_INTENT_KEYWORDS = [
    "price", "daam", "rate", "kimat", "rupaye", "rupees", "paisa",
    "कीमत", "दाम", "मुल्य", "वेज", "wage", "profit", "मुनाफा",
]
PHOTO_INTENT_KEYWORDS = ["photo", "camera", "picture", "फोटो", "तस्वीर", "image"]


class AskDadiService:
    """
    Conversational AI Assistant ('दादी से पूछो') tailored for rural weavers and craftspeople.

    Dual-mode operation:
      - ONLINE: LangChain tool-calling agent (ChatGroq) over the real pricing & CV tools.
      - OFFLINE (default without GROQ_API_KEY / langchain packages): deterministic
        knowledge-base mentor that still runs the real engine tools when the query
        contains concrete numbers or an image path - zero network required.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.system_prompt = ASK_DADI_SYSTEM_PROMPT
        self.agent = None          # (llm, tools) when LangChain is available
        self.llm = None
        self.mode = "offline"
        # LangSmith run config attached to every ChatGroq invocation so traces
        # are grouped under one project + tagged per agent mode.
        self._run_config: Dict[str, Any] = {
            "run_name": "ask_dadi_agent",
            "tags": ["ask-dadi", "langai", "agent"],
            "metadata": {
                "component": "langai",
                "service": "assistant_service",
                "agent_mode": "offline",
            },
        }
        self._build_agent(api_key=api_key)

    # ------------------------------------------------------------------ #
    # LangChain agent construction (optional, lazy)
    # ------------------------------------------------------------------ #
    def _build_agent(self, api_key: Optional[str] = None) -> None:
        # backend/.env is loaded by pydantic-settings into `settings` - the env
        # var (if exported) takes precedence, then the .env value.
        groq_key = (
            api_key
            or os.getenv("GROQ_API_KEY")
            or (settings.GROQ_API_KEY or "").strip()
        ) or None
        if not groq_key:
            logger.info("Ask Dadi running in OFFLINE mode (GROQ_API_KEY not set).")
            return
        if groq_key.startswith("gsk_") is False:
            logger.warning(
                "GROQ_API_KEY looks invalid (must start with 'gsk_'). "
                "Check backend/.env for a placeholder like 'gsk_your_key_here'."
            )
            return

        try:
            from langchain_groq import ChatGroq
            from langchain_core.tools import StructuredTool
        except ImportError as exc:
            logger.warning(
                "GROQ_API_KEY set but LangChain packages missing (%s). "
                "Install `langchain-groq` to enable the online agent; offline mentor active.",
                exc,
            )
            return

        try:
            self.llm = ChatGroq(
                model=os.getenv("GROQ_MODEL") or (settings.GROQ_MODEL or "openai/gpt-oss-120b"),
                groq_api_key=groq_key,
                temperature=0.7,
                # top_p is not a first-class ChatGroq field in this SDK version;
                # passing it via model_kwargs avoids the pydantic UserWarning.
                model_kwargs={"top_p": 0.85},
            )

            tools = [
                StructuredTool.from_function(
                    func=explain_fair_price_tool,
                    name="explain_fair_price",
                    description=TOOL_DESCRIPTIONS["explain_fair_price"],
                ),
                StructuredTool.from_function(
                    func=get_state_wage_floor_tool,
                    name="get_state_wage_floor",
                    description=TOOL_DESCRIPTIONS["get_state_wage_floor"],
                ),
                StructuredTool.from_function(
                    func=analyze_craft_photo_tool,
                    name="analyze_craft_photo",
                    description=TOOL_DESCRIPTIONS["analyze_craft_photo"],
                ),
            ]
            self.agent = (self.llm, tools)
            self.mode = "online"
            self._run_config["metadata"]["agent_mode"] = "online"
            logger.info("Ask Dadi ONLINE mode active: tool-calling agent with %d tools.", len(tools))
        except Exception as exc:  # pragma: no cover - depends on remote key validity
            logger.warning("Ask Dadi agent init failed (%s); offline mentor active.", exc)
            self.llm = None
            self.agent = None
            self.mode = "offline"

    # ------------------------------------------------------------------ #
    # Tool dispatch (shared by online agent loop and offline enrichment)
    # ------------------------------------------------------------------ #
    def _dispatch_tool(
        self, tool_name: str, tool_args: Dict[str, Any], config: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Execute a tool backend. When a LangSmith run config is supplied and the
        tool exists as a LangChain StructuredTool, invoke through the tool object
        so the execution is reported to LangSmith as a child run of the agent.
        """
        backend = TOOL_BACKENDS.get(tool_name)
        if backend is None:
            return {"status": "error", "error": f"Unknown tool: {tool_name}"}
        try:
            if config is not None and self.agent is not None:
                tool_obj = next((t for t in self.agent[1] if t.name == tool_name), None)
                if tool_obj is not None:
                    return tool_obj.invoke(tool_args, config=config)
            return backend(**tool_args)
        except Exception as exc:
            logger.warning("Dadi tool '%s' failed: %s", tool_name, exc)
            return {"status": "error", "error": str(exc)}

    @_ls_traceable("ask_dadi_tool_loop")
    def _run_agent(
        self,
        user_message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        context_note: str = "",
    ) -> Optional[str]:
        """Run the LangChain tool-calling loop. Returns None when agent unavailable."""
        if self.agent is None:
            return None

        llm, tools = self.agent
        from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

        messages: List[Any] = [SystemMessage(content=self.system_prompt)]
        for msg in (chat_history or [])[-10:]:
            role, content = msg.get("role"), msg.get("content", "")
            if not content:
                continue
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role in ("assistant", "dadi"):
                messages.append(AIMessage(content=content))

        augmented = user_message + (context_note or "")
        messages.append(HumanMessage(content=augmented))

        llm_with_tools = llm.bind_tools(tools)
        ls_config = {**self._run_config, "metadata": {**self._run_config["metadata"], "tool_rounds": 0}}

        try:
            for round_no in range(1, MAX_TOOL_ROUNDS + 1):
                ls_config["metadata"]["tool_rounds"] = round_no
                try:
                    ai_msg = llm_with_tools.invoke(messages, config=ls_config)
                except Exception as invoke_exc:
                    msg_str = str(invoke_exc)
                    if "tool calling" in msg_str and "not supported" in msg_str:
                        raise RuntimeError(
                            f"Model '{getattr(llm, 'model_name', '?')}' does not support custom tool "
                            "calling. groq/compound(-mini) are built-in-tool systems - set "
                            "GROQ_MODEL=openai/gpt-oss-120b (or another local-tool-use model) in backend/.env."
                        ) from invoke_exc
                    raise
                messages.append(ai_msg)
                tool_calls = getattr(ai_msg, "tool_calls", None)
                if not tool_calls:
                    return ai_msg.content
                for call in tool_calls:
                    result = self._dispatch_tool(call["name"], call.get("args") or {}, config=ls_config)
                    messages.append(
                        ToolMessage(
                            content=json.dumps(result, ensure_ascii=False, default=str),
                            tool_call_id=call["id"],
                        )
                    )
            # Too many rounds - force a final plain answer from what Dadi has seen
            return llm.invoke(messages, config=ls_config).content
        except Exception as exc:
            logger.warning("Dadi agent loop failed (%s); falling back offline.", exc)
            return None

    # ------------------------------------------------------------------ #
    # Offline mentor: knowledge base + real-tool enrichment
    # ------------------------------------------------------------------ #
    @staticmethod
    def _match_knowledge_base(query_text: str) -> Optional[Dict[str, Any]]:
        query_lower = (query_text or "").lower()
        for entry in KNOWLEDGE_BASE:
            for kw in entry["keywords"]:
                if kw in query_lower:
                    return entry
        return None

    @staticmethod
    def _extract_numbers(query_text: str) -> List[float]:
        """Pull plain numbers (material cost, hours, days...) out of the query."""
        # Ignore 1:1 frame references so camera queries never leak fake numbers
        cleaned = re.sub(r"1\s*:\s*1", " ", query_text or "")
        cleaned = cleaned.replace(",", "")
        values = [float(v) for v in re.findall(r"\d+(?:\.\d+)?", cleaned)]
        return [v for v in values if 0 < v <= 1_000_000]

    def _remembered_pricing_numbers(self, chat_history: Optional[List[Dict[str, str]]]) -> List[float]:
        """
        Multi-turn memory: find the most recent user turn that carried concrete
        pricing numbers, so a follow-up like 'daam kya rakhu?' can reuse them
        instead of asking the artisan to repeat the details.
        """
        for msg in reversed(chat_history or []):
            if msg.get("role") != "user":
                continue
            content = msg.get("content", "") or ""
            if not any(kw in content.lower() for kw in PRICING_INTENT_KEYWORDS):
                continue
            numbers = self._extract_numbers(content)
            if len(numbers) >= 2:
                return numbers
        return []

    @_ls_traceable("tool:explain_fair_price", run_type="tool")
    def _offline_pricing_enrichment(self, request: DadiQueryRequest) -> Optional[str]:
        """
        When the offline mentor sees a pricing question, run the REAL engine and
        quote the exact breakdown - same numbers the online agent would get.

        Numbers are taken from the current query; when it has none (a follow-up
        like 'daam kya rakhu?'), they are remembered from earlier turns of the
        conversation via request.chat_history (multi-turn memory).
        """
        if not any(kw in request.query_text.lower() for kw in PRICING_INTENT_KEYWORDS):
            return None
        numbers = self._extract_numbers(request.query_text)
        from_history = False
        if len(numbers) < 2:
            numbers = self._remembered_pricing_numbers(request.chat_history)
            from_history = True
        if len(numbers) < 2:
            return None

        state_code = os.getenv("DADI_DEFAULT_STATE", "HR")
        material_cost, labor_hours = numbers[0], numbers[1]
        # Heuristic: first value >= second * 8 is treated as days, not hours
        if labor_hours <= 24 and material_cost >= labor_hours * 8:
            labor_hours *= 8.0

        result = self._dispatch_tool(
            "explain_fair_price",
            {
                "material_cost": material_cost,
                "labor_hours": labor_hours,
                "state_code": state_code,
                "craft_category": "handloom",
                "has_gi_tag": True,
            },
        )
        if result.get("status") != "success":
            return None

        b = result["breakdown"]
        header = (
            "\n\nआपके पिछले हिसाब के अनुसार (AI Pricing Engine से):"
            if from_history
            else "\n\nआपके हिसाब से अंदाज़ा (AI Pricing Engine से):"
        )
        return (
            header + "\n"
            f"• कच्चा माल: ₹{b['raw_materials']['amount']}\n"
            f"• मेहनत/श्रम: ₹{b['direct_paid_labor']['amount']} ({b['direct_paid_labor']['detail']})\n"
            f"• पैकेजिंग-लॉजिस्टिक्स: ₹{b['packaging_logistics']['amount']}\n"
            f"• आपकी निजी कमाई (Net Profit): ₹{b['artisan_net_profit']['amount']}\n"
            f"➡ न्यूनतम फ्लोर कीमत: ₹{result['floor_price']} | सही रिटेल दाम: ₹{result['suggested_retail_price']}\n"
            f"➡ थोक (B2B) दाम: ₹{result['bulk_wholesale_price']} - इससे कम मत बेचिए!"
        )

    @_ls_traceable("ask_dadi_offline_mentor")
    def _offline_answer(self, request: DadiQueryRequest, entry: Optional[Dict[str, Any]]) -> str:
        dialect = (request.dialect or "bhojpuri").lower()
        if entry:
            if dialect == "hindi":
                answer = entry["hindi"]
            elif dialect == "english":
                answer = entry["english"]
            else:  # bhojpuri / maithili
                answer = entry["bhojpuri"]
        else:
            answer = FALLBACK_ANSWERS.get(dialect, FALLBACK_ANSWERS["bhojpuri"])

        # Enrich with real engine math; numbers come from this query or earlier turns
        enrichment = self._offline_pricing_enrichment(request)
        return answer + (enrichment or "")

    # ------------------------------------------------------------------ #
    # Public API (FastAPI endpoint contract - /api/v1/assistant/dadi)
    # ------------------------------------------------------------------ #
    async def get_dadi_advice(self, request: DadiQueryRequest) -> DadiQueryResponse:
        """
        Multilingual conversational mentor. Uses the LangChain tool-calling agent
        when available; otherwise the deterministic offline mentor (with real
        pricing-engine enrichment). Response contract unchanged for the frontend.
        """
        dialect = (request.dialect or "bhojpuri").lower()
        kb_entry = self._match_knowledge_base(request.query_text)

        context_note = (
            f"\n\n[System Note: Artisan dialect is '{dialect}'. Reply warmly in the same "
            f"dialect/Hinglish. Product category: {request.product_category or 'handloom'}.]"
        )
        if kb_entry:
            context_note += f"\n[Grounding hint: {kb_entry['english']}]"

        answer_text: Optional[str] = None
        if self.agent is not None:
            # Multi-turn memory: forward the client-supplied history so the LLM
            # sees prior turns; falls back to [] when the field is omitted.
            # _run_agent is sync (blocking Groq HTTP) — run it off the event
            # loop with a timeout so one slow model call cannot stall the worker.
            try:
                answer_text = await asyncio.wait_for(
                    asyncio.to_thread(
                        self._run_agent,
                        request.query_text,
                        chat_history=list(request.chat_history or []),
                        context_note=context_note,
                    ),
                    timeout=settings.DADI_AGENT_TIMEOUT_SECONDS,
                )
            except Exception as exc:
                logger.warning("Dadi agent timed out or failed (%s); offline mentor active.", exc)
                answer_text = None

        if not answer_text:  # offline mode or agent failure
            answer_text = self._offline_answer(request, kb_entry)

        answer_english = kb_entry["english"] if kb_entry else FALLBACK_ANSWER_ENGLISH
        suggested_actions = list(kb_entry["actions"]) if kb_entry else list(FALLBACK_ACTIONS)
        dadi_tip = kb_entry["tip"] if kb_entry else FALLBACK_TIP

        audio_stub = f"dadi_advice_{hashlib.sha1(request.query_text.encode('utf-8')).hexdigest()[:10]}"
        audio_mock_url = f"media_storage/audio/{audio_stub}.mp3"

        return DadiQueryResponse(
            answer_text=answer_text,
            answer_english=answer_english,
            dialect=dialect,
            audio_response_url=audio_mock_url,
            suggested_actions=suggested_actions,
            dadi_tip=dadi_tip,
        )

    # ------------------------------------------------------------------ #
    # Free-form chat API (kept from the LCEL prototype; used by future hooks)
    # ------------------------------------------------------------------ #
    def get_response(
        self,
        user_message: str,
        chat_history: Optional[List[Dict[str, str]]] = None,
        pricing_context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """Generate a Dadi response considering chat history and active pricing context."""
        context_note = ""
        if pricing_context:
            context_note = f"\n\n[System Note - Product Pricing Context for Dadi: {pricing_context}]"

        answer = self._run_agent(user_message, chat_history=chat_history, context_note=context_note)
        if answer:
            return answer

        # Offline fallback for free-form chat
        entry = self._match_knowledge_base(user_message)
        pseudo = DadiQueryRequest(query_text=user_message)
        return self._offline_answer(pseudo, entry)

    # ------------------------------------------------------------------ #
    # Gamified PM-DAKSH Learn & Earn reels (Task 2.7 scope)
    # ------------------------------------------------------------------ #
    def get_learn_and_earn_reels(self, dialect: str = "bhojpuri") -> List[Dict[str, Any]]:
        """
        Gamified Upskilling / PM-DAKSH Integration (SIH PS 26090):
        Returns 30-second dialect video reels teaching photography, packaging, and fair pricing.
        Watching reels unlocks the 'PM-DAKSH Certified Seller' badge and boosts ONDC/GeM search rank.
        """
        return [
            {
                "reel_id": "daksh_reel_01",
                "title": "धूप में 1:1 चौकोर फोटो खींचना (Daylight Photography)",
                "duration_seconds": 30,
                "dialect": dialect,
                "video_url": "https://storage.artify.gov.in/reels/daksh_photo_tips.mp4",
                "thumbnail_url": "https://storage.artify.gov.in/reels/thumb_photo.jpg",
                "skill_focus": "Studio Quality Camera Alignment & Gyro Leveling",
                "points_reward": 50,
                "badge_unlock": "Smart Photographer",
            },
            {
                "reel_id": "daksh_reel_02",
                "title": "नाज़ुक टेराकोटा और सिल्क की सुरक्षित पैकिंग (Safe Packaging)",
                "duration_seconds": 30,
                "dialect": dialect,
                "video_url": "https://storage.artify.gov.in/reels/daksh_packaging.mp4",
                "thumbnail_url": "https://storage.artify.gov.in/reels/thumb_pack.jpg",
                "skill_focus": "Zero-Damage First-Mile Transit & Bubble Wrapping",
                "points_reward": 50,
                "badge_unlock": "Master Packer",
            },
            {
                "reel_id": "daksh_reel_03",
                "title": "₹450/दिन फेयर वेज और सही दाम तय करना (Fair Wage Math)",
                "duration_seconds": 30,
                "dialect": dialect,
                "video_url": "https://storage.artify.gov.in/reels/daksh_pricing_math.mp4",
                "thumbnail_url": "https://storage.artify.gov.in/reels/thumb_price.jpg",
                "skill_focus": "Cost Breakdown & Statutory Floor Protection",
                "points_reward": 100,
                "badge_unlock": "PM-DAKSH Certified Master Artisan",
            },
        ]

    def record_reel_completion(self, artisan_id: str, reel_id: str) -> Dict[str, Any]:
        return {
            "artisan_id": artisan_id,
            "reel_id": reel_id,
            "status": "COMPLETED",
            "certified_seller_badge_awarded": True,
            "ondc_search_boost_multiplier": 1.25,
            "pmsuraj_credit_preapproval": "ELIGIBLE_FOR_50K_SUBSIDY",
            "message": "Badhaai ho! PM-DAKSH Certified Seller badge awarded. ONDC ranking boosted by 25%.",
        }


# Singleton instance to be imported across FastAPI endpoints
assistant_service = AskDadiService()
dadi_assistant_service = assistant_service  # backward-compat alias
