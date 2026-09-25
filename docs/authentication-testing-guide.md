# Artisan PIN Authentication - Testing Guide

## Overview
This document outlines the testing procedures for the new voice-first PIN-based authentication system for artisans.

## System Architecture

### Authentication Flow
1. **New Artisan**: Onboarding → Set PIN → Home Dashboard
2. **Returning Artisan**: Login (Voice/Manual) → Home Dashboard
3. **Session Management**: 30-day cookie-based sessions with SHA-256 hashed PINs

### Key Components
- **Database**: User model with optional `pinHash` field (SHA-256)
- **API Endpoints**: 
  - `/api/auth/login` - Phone + PIN authentication
  - `/api/auth/set-pin` - Secure PIN setup for authenticated users
  - `/api/auth/logout` - Session termination
  - `/api/auth/me` - Session validation
- **Pages**:
  - `/onboarding` - Voice-first profile creation with PIN setup
  - `/login` - Voice-first login with manual fallback
  - `/home` - Protected dashboard with logout

## Test Scenarios

### A. New Artisan Profile Creation

**Expected Flow**: Create Profile → Set Phone + 4-digit PIN → Profile created → Dashboard

**Test Steps**:
1. Navigate to `/onboarding`
2. Click microphone button
3. Speak: "My name is Ramesh Kumar. My artisan ID is ART-2041 and phone number is 9876543210. My PIN is 1234. I am from Bastar, Chhattisgarh practicing traditional handloom weaving."
4. Verify extracted fields appear correctly:
   - Name: Ramesh Kumar
   - Artisan ID: ART-2041
   - Phone: 9876543210
   - PIN: 1234
   - Location: Bastar, Chhattisgarh
   - Craft: Handloom & Weaving
5. Click "Confirm" or edit any incorrect fields
6. Verify redirect to `/home` dashboard

**Alternative Test (Manual Entry)**:
1. Click "Try sample speech" or "Enter text" on voice screen
2. Manually enter or type artisan details including PIN
3. Confirm and verify profile creation

**Verification**:
- User record created in database with `pinHash` (not plain PIN)
- Session cookie set (artifact_session)
- Dashboard shows artisan name, ID, phone, location

---

### B. Returning Artisan with Valid Session

**Expected Flow**: Open App → Existing Session → Dashboard directly

**Test Steps**:
1. After completing Test A, close browser tab
2. Open new tab and navigate to `/home`
3. Verify immediate access without login prompt

**Verification**:
- No redirect to `/login` or `/onboarding`
- Dashboard loads with artisan information
- Session cookie is valid (check browser dev tools)

**Session Expiry Test**:
1. Clear browser cookies or wait 30 days
2. Navigate to `/home`
3. Verify redirect to `/login`

---

### C. Logged-out Artisan Login

**Expected Flow**: Open App → Login → Voice enters Phone + PIN → Authenticate → Dashboard

**Voice Login Test Steps**:
1. Navigate to `/login`
2. Click large microphone button
3. Speak: "9876543210, my PIN is 1234"
4. Verify processing and successful login
5. Verify redirect to `/home` dashboard

**Manual Login Test Steps**:
1. Navigate to `/login`
2. Scroll to "Or enter manually" section
3. Enter phone: 9876543210
4. Enter PIN: 1234
5. Click "Login" button
6. Verify redirect to `/home` dashboard

**Verification**:
- Login endpoint validates phone and PIN hash
- New session token created
- Session cookie set with 30-day expiration
- User profile loaded on dashboard

---

### D. Wrong PIN Handling

**Expected Flow**: Show a simple "Invalid phone number or PIN" message

**Test Steps**:
1. Navigate to `/login`
2. Enter correct phone: 9876543210
3. Enter wrong PIN: 9999
4. Click "Login"
5. Verify error message: "Invalid phone number or PIN"

**Voice Test**:
1. Use microphone and say: "9876543210, my PIN is 9999"
2. Verify same error message appears

**Rate Limiting Test**:
1. Attempt 6+ failed logins within 15 minutes
2. Verify rate limit error: "Too many login attempts. Try again later."

**Verification**:
- No session created
- No redirect occurs
- Clear error message displayed
- Rate limiting prevents brute force attacks

---

### E. Logout and Re-login

**Expected Flow**: Logout → Login screen appears → Login again → Dashboard

**Test Steps**:
1. While logged in on `/home`, click logout button (top-right)
2. Verify redirect to `/login`
3. Verify session cookie cleared
4. Attempt to navigate to `/home` directly
5. Verify redirect back to `/login` (protected route)
6. Log in again using voice or manual method
7. Verify redirect to `/home` with restored session

**Verification**:
- Logout endpoint revokes session token
- Session cookie removed from browser
- Protected routes redirect to login
- New login creates fresh session

---

## Security Checklist

- [x] PINs never stored as plain text (SHA-256 hashing)
- [x] Timing-safe comparison for PIN validation (prevents timing attacks)
- [x] Rate limiting on login endpoint (10 attempts per 15 min per IP)
- [x] Rate limiting on PIN setup (5 attempts per hour)
- [x] Session tokens use SHA-256 hashing
- [x] HttpOnly cookies prevent XSS access
- [x] Secure flag enabled in production
- [x] 30-day session expiration
- [x] Server-side session validation on protected routes
- [x] Audit logging for authentication events

---

## Voice Recognition Patterns

### Supported PIN Extraction Patterns:
- "my PIN is 1234"
- "PIN 5678"
- "पिन 9876" (Hindi)
- "9876543210, 1234" (comma-separated)
- "9876543210 my PIN is 1234"

### Confidence Scoring:
- Labeled PIN ("my PIN is 1234"): 95% confidence
- Comma-separated ("9876543210, 1234"): 85% confidence

---

## Known Issues & Edge Cases

### Edge Case: Missing PIN during Onboarding
- **Scenario**: User completes voice onboarding but PIN is not detected
- **Current Behavior**: Profile created but no PIN set
- **Impact**: User cannot login with PIN, must use OTP or contact support
- **Mitigation**: PIN field marked as required with "Missing" badge in confirmation UI

### Edge Case: PIN vs OTP Confusion
- **Scenario**: User tries to use OTP code as PIN
- **Current Behavior**: 4-digit validation accepts OTP format but login fails
- **Mitigation**: Clear UI labels distinguish "4-digit PIN" from "6-digit OTP"

---

## Manual Testing Checklist

Before deployment, verify:

- [ ] New artisan can create profile with voice input
- [ ] PIN field extracted and stored securely (check database - should see hashed value)
- [ ] Returning artisan with valid session goes directly to dashboard
- [ ] Login page accepts both voice and manual input
- [ ] Voice login correctly extracts phone + PIN from speech
- [ ] Manual login validates phone number (10 digits)
- [ ] Manual login validates PIN (exactly 4 digits)
- [ ] Wrong PIN shows error message (not generic error)
- [ ] Logout clears session and redirects to login
- [ ] Protected routes redirect to login when not authenticated
- [ ] Re-login after logout works correctly
- [ ] Rate limiting prevents brute force attempts
- [ ] Session persists across browser tabs
- [ ] Session expires after 30 days

---

## Test Data

### Sample Artisan Profiles for Testing:

**Profile 1: Hindi Speaker**
```
Name: Ramesh Kumar
Artisan ID: ART-2041
Phone: 9876543210
PIN: 1234
Location: Bastar, Chhattisgarh
Craft: Handloom Weaving
Voice: "मेरा नाम रमेश कुमार है। मेरा कलाकार आईडी ART-2041 है और फ़ोन नंबर 9876543210 है। मेरा पिन 1234 है।"
```

**Profile 2: English Speaker**
```
Name: Priya Singh
Artisan ID: ART-5678
Phone: 9123456789
PIN: 5678
Location: Jaipur, Rajasthan
Craft: Block Printing
Voice: "My name is Priya Singh. My artisan ID is ART-5678 and phone is 9123456789. My PIN is 5678."
```

**Profile 3: Tamil Speaker**
```
Name: Sundaram
Artisan ID: ART-9012
Phone: 9840123456
PIN: 9012
Location: Kanchipuram, Tamil Nadu
Craft: Silk Weaving
Voice: "என் பெயர் சுந்தரம். கைவினைஞர் ஐடி ART-9012, தொலைபேசி 9840123456, பின் 9012."
```

---

## Deployment Notes

### Environment Variables Required:
- `DATABASE_URL` - PostgreSQL connection (production)
- `BHASHINI_API_KEY` - Voice transcription service
- `NODE_ENV=production` - Enables secure cookies

### Database Migration:
The `pinHash` field is optional, so existing users without PINs can still use OTP authentication. No data migration required.

### Rollback Plan:
If issues arise, authentication system falls back to existing OTP flow. PINs are additive, not replacing OTP system.

---

## Success Criteria

✅ All 5 test scenarios pass (A-E)
✅ Voice input extracts phone + PIN with >80% accuracy
✅ Security checklist items confirmed
✅ Manual testing checklist complete
✅ No plain-text PINs in database or logs
✅ Rate limiting prevents brute force
✅ Sessions persist correctly across browser restarts

---

## Support & Troubleshooting

### Common Issues:

**"Could not understand phone or PIN"**
- Cause: Voice recognition failed or unclear speech
- Solution: Use manual input fallback or retry with clearer pronunciation

**"Invalid phone number or PIN"**
- Cause: Wrong credentials or PIN not set during onboarding
- Solution: Verify phone number, try password reset, or re-register

**"Too many login attempts"**
- Cause: Rate limiting triggered (>10 attempts in 15 min)
- Solution: Wait 15 minutes and try again

**Session expires unexpectedly**
- Cause: Cookie cleared or browser privacy settings
- Solution: Re-login; check browser cookie settings

---

## Future Enhancements

- [ ] Forgot PIN flow (reset via OTP)
- [ ] PIN change functionality in profile settings
- [ ] Biometric authentication (fingerprint/face on mobile)
- [ ] Multi-factor authentication (PIN + OTP for high-value actions)
- [ ] Session management dashboard (view/revoke active sessions)
- [ ] Login history and security notifications
