# ADR 0005: Voice-First Progressive Onboarding (Android)

## Status
Accepted (map #108, tickets #109-#114, PRs #115-#120)

## Context
Rural weavers need <3 min, <10 taps onboarding with phone-digits-only typing, 20sp Hindi, 56dp targets, full voice readout, offline-safe. Prior flow had permissions blocker, scrolling cluster list, fake Demo Artisan, Pehchan gate.

## Decision
5-screen flow MODE_SELECT -> WELCOME_LANGUAGE -> IDENTITY -> CLUSTER -> COMPLETION (PERMISSIONS_OVERVIEW kept only as legacy passthrough):
- T1 (#109): Mode Select solo|shg + voice-bhasha entry (6 dialects, TTS readout, speak-name Yes/No).
- T2 (#110): Progressive identity (phone now, Pehchan/e-Shram later as Verified Badge) + real Room OfflineRegistration + WorkManager Saved-safely badge; delete Demo Artisan.
- T3 (#111): ClusterAutoSuggest GPS+registry Yes(56dp)/Badlein card, full list behind toggle, offline pending never blocks, GI preserved.
- T4 (#112): JIT inline Mic/Camera/GPS with Hindi why + rationale; deny-all still completes.
- T5 (#113): CompletionSwagat seal Verified/Unverified-pending, pending-sync badge, Ask Dadi readout stub, 56dp CTA, TalkBack tags.
- T6 (#114): Nav popUpTo Onboarding inclusive -> VoiceCatalog; dots hide legacy step; E2E <10 taps (exactly 4 Next taps).

## Consequences
- Positive: Hindi-only tester can finish; airplane-mode saves to Room and syncs later; mis-tap GI loss prevented.
- Negative: Hinglish readout kept (Devanagari full pass deferred to follow-up); live Bhashini pipeline IDs still stubbed.
- Follow-up: SHG bulk import, Bhashini keys, thermal/passport wiring from onboarding data.
