# Implementation Plan: Voice-Based Artisan Registration

## Overview

This feature implements voice-based artisan registration for the ArtifyBharat Android app following Clean Architecture with MVVM pattern. The implementation spans 4 architectural layers (Presentation, ViewModel, Domain, Data) and includes:

- Dual-mode registration (voice-guided vs traditional form)
- 12-language support with audio prompts and transcription
- Real-time speech-to-text with NLP field extraction
- Preview/edit screen with confidence indicators
- Offline-first architecture with sync queue
- Accessibility features (screen readers, haptics, audio feedback)
- AES-256-GCM encryption for voice recordings
- Integration with existing authentication backend

## Tasks

- [ ] 1. Project setup and core infrastructure
  - [-] 1.1 Create module structure and navigation graph
    - Create `features/voice_registration` package structure
    - Add navigation routes for 4 screens (ModeSelection, LanguageSelection, VoiceFlow, Preview)
    - Configure Jetpack Compose Navigation integration
    - _Requirements: 1.1, 15.3_
  
  - [-] 1.2 Set up dependency injection for voice registration module
    - Create Hilt modules for VoiceRegistration feature
    - Define interface bindings for Repository, Use Cases, Services
    - Configure singleton scopes for hardware abstractions (AudioRecorder, AudioPlayer, PermissionManager)
    - _Requirements: 15.3, 15.4_
  
  - [-] 1.3 Define domain models and data classes
    - Implement `RegistrationField`, `FieldType` enum, `VoiceCapture` data classes
    - Implement `TranscriptionResult`, `TranscriptionSegment`, `NLPExtraction`
    - Implement `Language` model with 12 supported languages
    - Implement `VoiceFlowState`, `PreviewState`, `ModeSelectionState`
    - _Requirements: 2.1, 6.2_
  
  - [x] 1.4 Create Room database entities and DAOs
    - Define `OfflineRegistrationEntity` with Room annotations
    - Create `OfflineRegistrationDao` with insert, query, update operations
    - Configure Room database builder with migrations
    - _Requirements: 10.2, 10.4_

- [ ] 2. Data layer implementation
  - [~] 2.1 Implement audio file storage and encryption
    - Create `AudioFileStorage` class for local file management
    - Implement AES-256-GCM encryption utility (`AESEncryptionUtil`)
    - Add methods for save, retrieve, clear, and encrypt audio files
    - _Requirements: 4.6, 13.1_
  
  - [~] 2.2 Implement local data sources
    - Create `RegistrationLocalDataSource` wrapping OfflineRegistrationDao
    - Implement offline queue operations (insert, getPending, markSynced)
    - Add SharedPreferences cache for registration field templates
    - _Requirements: 10.2, 10.4_
  
  - [~] 2.3 Implement remote API services
    - Create `AuthenticationApi` Retrofit interface with `/auth/register` endpoint
    - Define `VoiceRegisterRequestDto` and `VoiceRegisterResponseDto`
    - Configure OkHttp client with TLS 1.2+ and certificate pinning
    - _Requirements: 9.1, 13.2, 15.1_
  
  - [~] 2.4 Implement transcription service
    - Create `TranscriptionService` interface
    - Implement `WhisperTranscriptionService` with API client
    - Add support for 12 languages with confidence scoring
    - Handle transcription segments and transliteration
    - _Requirements: 2.1, 5.1, 5.2, 5.5_
  
  - [~] 2.5 Implement NLP extraction service
    - Create `NLPExtractionService` interface
    - Implement `BackendNLPExtractionService` with field-specific extraction rules
    - Add extraction for phone (10 digits), PIN (4-6 digits), name, craft type, PIN code (6 digits), experience years
    - Return confidence scores and alternative values
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  
  - [~] 2.6 Implement voice registration repository
    - Create `VoiceRegistrationRepository` interface
    - Implement `VoiceRegistrationRepositoryImpl` with offline-first pattern
    - Add methods: `getRegistrationFieldsTemplate`, `saveVoiceCapture`, `encryptAudio`, `clearVoiceCaptures`, `queueOfflineRegistration`, `syncOfflineRegistrations`
    - Implement network error handling with offline queue fallback
    - _Requirements: 9.5, 10.1, 10.2, 10.6_

- [ ] 3. Domain layer - Use cases
  - [~] 3.1 Implement StartVoiceRegistrationUseCase
    - Load registration field template (7 fields: name, phone, PIN, craft, experience, location, pincode)
    - Return Flow<Result<List<RegistrationField>>>
    - _Requirements: 3.1_
  
  - [~] 3.2 Implement CaptureVoiceFieldUseCase
    - Accept audio file, field, and language parameters
    - Encrypt audio file before transmission
    - Send to transcription service
    - Store audio locally until submission succeeds
    - Return Flow<Result<TranscriptionResult>>
    - _Requirements: 4.1, 4.2, 5.1, 5.2_
  
  - [~] 3.3 Implement ExtractFieldsUseCase
    - Accept transcription result and target field
    - Invoke NLP service with field type and language
    - Return Flow<Result<NLPExtraction>> with confidence scores
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [~] 3.4 Implement ValidateRegistrationUseCase
    - Validate all mandatory fields filled
    - Apply field-specific validators (PhoneValidator, PINValidator, PINCodeValidator, NameValidator, CraftTypeValidator)
    - Return Map<String, ValidationResult> for field errors
    - _Requirements: 7.4, 7.5, 8.5_
  
  - [~] 3.5 Implement SubmitRegistrationUseCase
    - Build `VoiceRegisterRequestDto` from registration fields
    - Attempt online submission to `/auth/register`
    - On success: clear local audio files, return artisan ID
    - On network failure: queue offline registration
    - Return Flow<Result<String>> or OfflineQueuedException
    - _Requirements: 9.1, 9.2, 9.5, 10.2_

- [ ] 4. Hardware abstraction layer
  - [~] 4.1 Implement AudioPlayer for TTS and playback
    - Wrap Android TextToSpeech for audio prompts
    - Implement MediaPlayer for recorded audio playback
    - Add `playTTS(text, languageCode)` with locale mapping for 12 languages
    - Add `playAudioFile(file)` for replay functionality
    - _Requirements: 3.2, 3.3, 4.4_
  
  - [~] 4.2 Extend AudioRecorder for voice registration
    - Add ambient noise level monitoring (decibels)
    - Implement auto-stop on 2s silence or 30s max duration
    - Expose StateFlow for recording state (isRecording, ambientDecibels, isExcessiveNoise)
    - _Requirements: 4.1, 4.2, 12.1, 12.2_
  
  - [~] 4.3 Implement PermissionManager for microphone access
    - Check and request RECORD_AUDIO permission
    - Handle permission grant/deny callbacks
    - Display persistent notification during active recording
    - _Requirements: 12.5, 13.5, 13.6_
  
  - [~] 4.4 Implement HapticFeedbackManager
    - Define vibration patterns for recording start, stop, confirmation, error
    - Use VibrationEffect API for pattern playback
    - _Requirements: 11.4_
  
  - [~] 4.5 Implement AudioFeedbackManager
    - Create SoundPool for button press sounds (click, success, error)
    - Play audio feedback on all button presses and navigation actions
    - _Requirements: 11.1_

- [ ] 5. ViewModel layer
  - [~] 5.1 Implement VoiceRegistrationViewModel - state management
    - Define sealed `VoiceRegistrationUiState` (Initial, ModeSelection, LanguageSelection, VoiceFlow, Preview, Success, Error)
    - Manage StateFlows for `uiState`, `voiceFlowState`, `previewState`
    - Inject all 5 use cases, AudioRecorder, AudioPlayer, ConnectivityMonitor
    - _Requirements: 1.1, 15.3_
  
  - [~] 5.2 Implement mode selection logic
    - Add `selectVoiceMode()` → navigate to language selection
    - Add `selectFormMode()` → navigate to traditional form
    - Add `switchMode()` with data preservation
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_
  
  - [~] 5.3 Implement language selection logic
    - Load 12 supported languages with TTS/ASR flags
    - Add `selectLanguage(language)` → initialize voice flow
    - Configure transcription service and audio player for selected language
    - _Requirements: 2.1, 2.2, 2.3, 2.5_
  
  - [~] 5.4 Implement voice flow orchestration
    - Manage field-by-field progression (7 fields total)
    - Play audio prompts via AudioPlayer before each field
    - Trigger recording via AudioRecorder with 1s delay after prompt
    - Handle auto-stop on silence/timeout
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 4.1, 4.2_
  
  - [~] 5.5 Implement transcription and NLP extraction flow
    - Call `stopRecordingAndTranscribe()` on recording completion
    - Invoke CaptureVoiceFieldUseCase with audio file
    - Display transcription with confidence indicator
    - Automatically invoke ExtractFieldsUseCase for NLP extraction
    - Update field with `capturedValue`, `nlpExtractedValue`, confidence scores
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 6.1, 6.2_
  
  - [~] 5.6 Implement confirmation and re-record logic
    - Add `confirmAndProceedToNext()` for field progression
    - Add `reRecordField()` to restart current field capture
    - Handle low confidence (<70%) with automatic re-record prompt
    - Play confirmation audio prompt before advancing
    - _Requirements: 3.3, 3.6, 5.4, 4.5_
  
  - [~] 5.7 Implement preview state preparation
    - Organize fields into sections (Personal, Contact, Craft)
    - Calculate confidence indicators (✅ 95%+, ⚠️ 85-94%, ❌ <85%)
    - Validate all fields before enabling submission
    - Display offline mode indicator if network unavailable
    - _Requirements: 8.1, 8.2, 8.4, 10.3_
  
  - [~] 5.8 Implement field editing on preview
    - Add `editFieldText(fieldId, newValue)` for manual text editing
    - Add `reRecordFieldFromPreview(fieldId)` to return to voice capture
    - Re-validate field after edit
    - _Requirements: 8.3, 7.7_
  
  - [~] 5.9 Implement registration submission
    - Call ValidateRegistrationUseCase before submission
    - Invoke SubmitRegistrationUseCase with all fields
    - Handle success → clear audio, navigate to dashboard
    - Handle failure → display error, retain data
    - Handle offline → queue registration, notify user
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.2_

- [ ] 6. Presentation layer - Composables
  - [~] 6.1 Create ModeSelectionScreen
    - Display large card buttons for Voice Mode and Form Mode
    - Show icons (microphone, keyboard) with bilingual labels
    - Handle mode selection with audio feedback
    - Show permission denied message if microphone unavailable
    - _Requirements: 1.1, 1.2, 1.3, 11.1_
  
  - [~] 6.2 Create LanguageSelectionScreen
    - Display 3-column grid of 12 language cards
    - Show native script name + English name for each language
    - Highlight selected language with accent color
    - Enable continue button after selection
    - _Requirements: 2.1, 2.2, 2.5_
  
  - [~] 6.3 Create VoiceGuidedFlowScreen - main layout
    - Display progress indicator (X/7 fields)
    - Show large waveform visualization during recording
    - Display recording indicator (🎤) when active
    - Show current field name in bilingual text
    - Add bottom action buttons: Pause, Re-record, Next
    - _Requirements: 3.1, 3.5, 4.3, 11.5_
  
  - [~] 6.4 Create VoiceGuidedFlowScreen - transcription display
    - Show transcribed text in original script
    - Show transliterated text in parentheses
    - Display confidence percentage with color-coded indicator
    - Show processing spinner during transcription
    - _Requirements: 5.2, 5.3, 5.5, 5.6_
  
  - [~] 6.5 Create VoiceGuidedFlowScreen - noise warning
    - Monitor ambient noise level from AudioRecorder state
    - Display warning banner if noise exceeds 70 dB
    - Suggest moving to quieter location
    - _Requirements: 12.1, 12.2_
  
  - [~] 6.6 Create PreviewAndEditScreen - field sections
    - Organize fields into Personal, Contact, Craft sections
    - Display each field with bilingual label
    - Show captured value (mask phone/PIN)
    - Display confidence badge (✅⚠️❌)
    - Add Edit (text) and 🎤 (voice) buttons per field
    - _Requirements: 7.3, 8.1, 8.2, 8.3, 8.4_
  
  - [~] 6.7 Create PreviewAndEditScreen - validation and submission
    - Display inline validation errors per field
    - Enable Submit button only when all fields valid
    - Show offline mode indicator if network unavailable
    - Handle submission with loading state
    - Display error message if submission fails
    - _Requirements: 8.5, 8.6, 9.4, 9.5, 10.3_
  
  - [~] 6.8 Implement bilingual UI rendering throughout
    - Create composable utility for bilingual text display
    - Render all labels, prompts, errors in selected language + English
    - Apply to all screens and interactive elements
    - _Requirements: 2.4, 15.5_

- [ ] 7. Accessibility implementation
  - [~] 7.1 Add content descriptions for screen readers
    - Apply semantics modifiers to all interactive elements
    - Define role (Button, Checkbox, etc.) for each component
    - Provide contextual descriptions (e.g., "Start recording voice input", "Stop recording")
    - _Requirements: 11.3_
  
  - [~] 7.2 Implement large touch targets and high contrast
    - Ensure all buttons are minimum 48x48 dp
    - Use Material 3 color scheme with sufficient contrast ratios
    - Apply elevation for visual depth
    - Use 18sp minimum font size
    - _Requirements: 11.2_
  
  - [~] 7.3 Integrate haptic feedback throughout flow
    - Call HapticFeedbackManager on recording start/stop
    - Trigger haptic on confirmation and error events
    - Add haptic to all button presses
    - _Requirements: 11.4_
  
  - [~] 7.4 Integrate audio feedback throughout flow
    - Call AudioFeedbackManager on all button presses
    - Play success sound on field confirmation
    - Play error sound on validation failure or transcription error
    - _Requirements: 11.1_

- [ ] 8. Offline sync and background processing
  - [~] 8.1 Implement ConnectivityMonitor
    - Observe network state changes via ConnectivityManager
    - Expose StateFlow<Boolean> for online/offline state
    - Register NetworkCallback for real-time updates
    - _Requirements: 10.1, 10.4_
  
  - [~] 8.2 Implement OfflineRegistrationSyncWorker
    - Create CoroutineWorker for periodic sync
    - Fetch pending registrations from Room DB
    - Submit each registration to API
    - Mark as synced on success, retain on failure
    - Implement exponential backoff (30s, 60s, 120s, 300s)
    - _Requirements: 10.2, 10.4_
  
  - [~] 8.3 Schedule periodic offline sync with WorkManager
    - Configure Constraints for network connectivity
    - Create PeriodicWorkRequest with 30-minute interval
    - Set backoff policy for retry on failure
    - Enqueue unique periodic work
    - _Requirements: 10.4_
  
  - [~] 8.4 Implement offline submission notification
    - Display notification when queued registration syncs successfully
    - Include artisan ID and success message
    - _Requirements: 10.5_

- [ ] 9. Security and validation
  - [~] 9.1 Implement field validators
    - Create `PhoneValidator`: exactly 10 digits, starts with 6-9
    - Create `PINValidator`: 4-6 digits
    - Create `PINCodeValidator`: exactly 6 digits, valid Indian postal code
    - Create `NameValidator`: minimum 2 characters, maximum 100
    - Create `CraftTypeValidator`: matches known craft taxonomy
    - Return sealed `ValidationResult` (Valid | Invalid(message))
    - _Requirements: 7.4, 7.5, 8.5_
  
  - [~] 9.2 Implement sensitive field masking
    - Create utility function `maskSensitiveField(value, fieldType)`
    - Mask phone: show last 4 digits (●●●●●●3210)
    - Mask PIN: all digits (●●●●)
    - Apply to UI display and logs
    - _Requirements: 7.3, 13.4_
  
  - [~] 9.3 Implement log masking utility
    - Create `LogMasker` object with regex patterns for phone, PIN
    - Replace sensitive data with [REDACTED] tokens
    - Apply to all log statements in voice registration module
    - _Requirements: 13.4_
  
  - [~] 9.4 Configure network security
    - Add `network_security_config.xml` with cleartext traffic disabled
    - Configure TLS 1.2+ requirement
    - Add certificate pinning for api.artifybharat.in
    - Apply to OkHttp client configuration
    - _Requirements: 13.2_

- [ ] 10. Error handling and analytics
  - [~] 10.1 Define error types and messages
    - Create sealed `VoiceRegistrationError` hierarchy
    - Implement `ErrorMessageMapper` for localized user messages
    - Handle permission denial, recording failure, transcription failure, network error, validation failure
    - _Requirements: 12.4, 12.5, 12.6_
  
  - [~] 10.2 Implement retry logic with exponential backoff
    - Create `retryWithExponentialBackoff` suspend function
    - Apply to transcription service calls (max 3 retries)
    - Use delays: 1s, 2s, 4s
    - _Requirements: 5.4, 12.6_
  
  - [~] 10.3 Implement audio compression
    - Create `AudioCompressor` utility
    - Compress audio to Opus format at 32 kbps
    - Enforce 5 MB max file size
    - _Requirements: 14.4_
  
  - [~] 10.4 Integrate analytics tracking
    - Track mode selection (voice vs form)
    - Track language selection
    - Track field capture with confidence scores and retry counts
    - Track registration completion with duration and total retries
    - Track errors with context
    - Track offline queue and sync events
    - _Requirements: 15.6_

- [ ] 11. Testing - Unit tests
  - [ ]* 11.1 Write unit tests for validators
    - Test PhoneValidator with valid/invalid cases
    - Test PINValidator with valid/invalid cases
    - Test PINCodeValidator with valid/invalid cases
    - Test NameValidator with valid/invalid cases
    - Test CraftTypeValidator with valid/invalid cases
  
  - [ ]* 11.2 Write unit tests for VoiceRegistrationViewModel
    - Test `selectLanguage` updates state to VoiceFlow
    - Test `confirmAndProceedToNext` advances to next field
    - Test `showPreview` organizes fields into sections
    - Test mode switching preserves data
    - Use Turbine for Flow testing
  
  - [ ]* 11.3 Write unit tests for use cases
    - Test StartVoiceRegistrationUseCase returns 7 fields
    - Test CaptureVoiceFieldUseCase encrypts audio and calls transcription
    - Test ExtractFieldsUseCase invokes NLP with correct parameters
    - Test ValidateRegistrationUseCase validates all fields
    - Test SubmitRegistrationUseCase queues offline on network failure

- [ ] 12. Testing - Integration tests
  - [ ]* 12.1 Write integration tests for repository
    - Test offline registration queuing stores data in Room DB
    - Test sync operation submits pending registrations
    - Test audio encryption and storage
    - Use in-memory Room database
  
  - [ ]* 12.2 Write integration tests for offline sync worker
    - Test worker fetches pending registrations
    - Test worker marks as synced on success
    - Test exponential backoff on failure

- [ ] 13. Testing - UI tests (Compose)
  - [ ]* 13.1 Write UI tests for mode selection flow
    - Test voice mode selection navigates to language selection
    - Test form mode selection navigates to traditional form
  
  - [ ]* 13.2 Write UI tests for language selection
    - Test selecting language enables continue button
    - Test continue navigates to voice flow
  
  - [ ]* 13.3 Write UI tests for voice flow
    - Test recording indicator displays during capture
    - Test transcription result displays after recording
    - Test next button advances to next field
  
  - [ ]* 13.4 Write UI tests for preview screen
    - Test all captured fields display in sections
    - Test edit button enables text editing
    - Test submit button disabled until all fields valid

- [ ] 14. Testing - Property-based tests
  - [ ]* 14.1 Write property test for Property 1: Mode Switching Preserves Data
    - Generate arbitrary registration state before submission
    - Perform mode switch (voice ↔ form)
    - Assert all field values preserved after switch
    - **Property 1: Mode Switching Preserves Data**
    - **Validates: Requirements 1.4, 1.5**
  
  - [ ]* 14.2 Write property test for Property 2: Language Configuration Consistency
    - Generate arbitrary language selection
    - Assert transcription service, audio prompts, UI all use same language
    - **Property 2: Language Configuration Consistency**
    - **Validates: Requirements 2.3, 2.4**
  
  - [ ]* 14.3 Write property test for Property 24: Sensitive Field Masking
    - Generate arbitrary phone numbers and PINs
    - Assert all displayed values are masked (●●●●)
    - **Property 24: Sensitive Field Masking**
    - **Validates: Requirements 7.3**
  
  - [ ]* 14.4 Write property test for Property 25: Phone Number Validation
    - Generate arbitrary strings representing phone numbers
    - Assert validation enforces exactly 10 digits
    - **Property 25: Phone Number Validation**
    - **Validates: Requirements 7.4**
  
  - [ ]* 14.5 Write property test for Property 32: Validation Before Submission
    - Generate arbitrary registration states with various field validities
    - Assert submit button enabled only when all mandatory fields valid
    - **Property 32: Validation Before Submission**
    - **Validates: Requirements 8.5**
  
  - [ ]* 14.6 Write property test for Property 38: Offline Queue Insertion
    - Generate arbitrary registration data
    - Simulate network failure during submission
    - Assert data stored in offline queue
    - **Property 38: Offline Queue Insertion**
    - **Validates: Requirements 10.2**
  
  - [ ]* 14.7 Write property test for Property 46: Audio Cleanup After Success
    - Generate arbitrary successful registration submissions
    - Assert local audio recordings cleared from storage
    - **Property 46: Audio Cleanup After Success**
    - **Validates: Requirements 13.3**
  
  - [ ]* 14.8 Write property test for Property 49: Audio Compression Size Limit
    - Generate arbitrary voice recordings
    - Assert compressed audio file size does not exceed 5 MB
    - **Property 49: Audio Compression Size Limit**
    - **Validates: Requirements 14.4**

- [ ] 15. Integration and final wiring
  - [~] 15.1 Wire all screens into navigation graph
    - Add VoiceRegistrationActivity as entry point
    - Configure NavHost with 4 destinations
    - Handle back navigation and state restoration
    - _Requirements: 1.1, 15.3_
  
  - [~] 15.2 Integrate with existing authentication system
    - Ensure `/auth/register` API contract matches existing backend
    - Pass artisan ID to dashboard on success
    - Store auth token in existing credential manager
    - _Requirements: 9.3, 9.4, 15.1_
  
  - [~] 15.3 Register WorkManager sync worker
    - Call `scheduleOfflineSync()` in Application.onCreate()
    - Ensure work is enqueued with KEEP policy
    - _Requirements: 10.4_
  
  - [~] 15.4 Add microphone permission to AndroidManifest
    - Declare `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
    - Request permission at runtime before voice mode
    - _Requirements: 13.5_

- [~] 16. Checkpoint - Ensure all tests pass
  - Run full test suite (`./gradlew test`)
  - Run UI tests (`./gradlew connectedAndroidTest`)
  - Verify build succeeds without warnings
  - Ask the user if questions arise.

- [ ] 17. End-to-end verification
  - [~] 17.1 Verify complete voice registration flow
    - Select voice mode → language → capture all 7 fields → preview → submit
    - Confirm navigation to dashboard with artisan ID
    - Verify audio files cleared after success
    - _Requirements: 3.1, 3.5, 9.1, 9.4, 13.3_
  
  - [~] 17.2 Verify offline registration queueing
    - Disable network connectivity
    - Complete voice registration
    - Verify data queued in Room DB
    - Re-enable network
    - Verify automatic sync within 30 seconds
    - Verify notification displayed
    - _Requirements: 10.2, 10.4, 10.5_
  
  - [~] 17.3 Verify mode switching with data preservation
    - Start in voice mode
    - Capture 3 fields
    - Switch to form mode
    - Verify 3 fields pre-filled
    - Switch back to voice mode
    - Verify state restored
    - _Requirements: 1.4, 1.5_
  
  - [~] 17.4 Verify low confidence re-record flow
    - Mock transcription service to return <70% confidence
    - Verify system prompts for re-record
    - Re-record field
    - Verify new transcription replaces old
    - _Requirements: 5.4, 3.6_
  
  - [~] 17.5 Verify accessibility features
    - Enable TalkBack
    - Navigate through entire voice flow
    - Verify all buttons have content descriptions
    - Verify audio feedback plays on all interactions
    - Test with screen reader active
    - _Requirements: 11.1, 11.3_
  
  - [~] 17.6 Verify sensitive field masking
    - Capture phone number and PIN via voice
    - Verify displayed as ●●●●●●3210 and ●●●● on preview
    - Check application logs for masked values
    - _Requirements: 7.3, 13.4_
  
  - [~] 17.7 Verify noise warning
    - Simulate high ambient noise (>70 dB) during recording
    - Verify warning banner displays
    - Verify suggestion to move to quieter location
    - _Requirements: 12.1, 12.2_
  
  - [~] 17.8 Verify multi-language support
    - Test registration in Hindi, Bengali, Tamil
    - Verify audio prompts play in selected language
    - Verify UI renders bilingual text correctly
    - Verify transcription returns correct script
    - _Requirements: 2.1, 2.3, 2.4, 3.4_

- [~] 18. Final checkpoint - Ensure all tests pass
  - Run full test suite including property tests
  - Ensure all E2E verification scenarios pass
  - Ask the user if questions arise or if any refinements needed.

## Notes

- Tasks marked with `*` are optional test-related sub-tasks that can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property-based tests validate universal correctness properties from design document
- Unit/integration tests validate specific examples and edge cases
- Checkpoints ensure incremental validation at logical breaks
- All code follows existing MVVM + Clean Architecture patterns
- Kotlin used throughout with Jetpack Compose for UI
- Room for local persistence, Retrofit for API, WorkManager for background sync
- Accessibility is first-class concern with screen readers, haptics, audio feedback
- Security enforced with AES-256-GCM encryption and TLS 1.2+ with certificate pinning
- Offline-first architecture ensures registration works without network connectivity

## Task Dependency Graph

```json
{
  "waves": [
    {
      "id": 0,
      "tasks": ["1.1", "1.2", "1.3", "1.4"]
    },
    {
      "id": 1,
      "tasks": ["2.1", "2.2", "2.3", "2.4", "2.5"]
    },
    {
      "id": 2,
      "tasks": ["2.6", "3.1", "3.2", "3.3", "3.4", "4.1", "4.2", "4.3", "4.4", "4.5"]
    },
    {
      "id": 3,
      "tasks": ["3.5", "5.1", "5.2", "5.3", "9.1", "9.2", "9.3", "9.4"]
    },
    {
      "id": 4,
      "tasks": ["5.4", "5.5", "5.6", "8.1", "8.2", "8.3", "10.1", "10.2", "10.3"]
    },
    {
      "id": 5,
      "tasks": ["5.7", "5.8", "5.9", "6.1", "6.2", "6.3", "6.4", "6.5", "10.4"]
    },
    {
      "id": 6,
      "tasks": ["6.6", "6.7", "6.8", "7.1", "7.2", "7.3", "7.4", "8.4"]
    },
    {
      "id": 7,
      "tasks": ["11.1", "11.2", "11.3", "12.1", "12.2", "13.1", "13.2", "13.3", "13.4"]
    },
    {
      "id": 8,
      "tasks": ["14.1", "14.2", "14.3", "14.4", "14.5", "14.6", "14.7", "14.8"]
    },
    {
      "id": 9,
      "tasks": ["15.1", "15.2", "15.3", "15.4"]
    },
    {
      "id": 10,
      "tasks": ["17.1", "17.2", "17.3", "17.4", "17.5", "17.6", "17.7", "17.8"]
    }
  ]
}
```
