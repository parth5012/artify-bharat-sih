# Phone Number Uniqueness - Implementation Guide

## Overview
This document describes the phone number uniqueness enforcement implemented in the artisan authentication system to prevent duplicate profiles.

## Business Rules

### Rule 1: Phone Number Uniqueness
- **Constraint**: Each phone number can only be associated with ONE artisan profile
- **Database Field**: `User.phone` must be unique when `User.pinHash` exists
- **Enforcement**: Server-side validation during registration

### Rule 2: Registration Flow
When a new artisan attempts to create a profile:

1. **Extract phone number** from voice input or manual entry
2. **Check database** for existing user with that phone number
3. **If phone exists WITH PIN**:
   - Block registration
   - Show message: "This phone number is already registered."
   - Redirect to login page
4. **If phone does NOT exist OR exists WITHOUT PIN**:
   - Continue with profile creation
   - Collect remaining details (name, artisan ID, location, craft)
   - Save profile
   - Set PIN (hashed)
   - Create session
   - Redirect to dashboard

### Rule 3: Login Flow
- Existing artisans login with phone + PIN
- Voice input: "My phone number is 9876543210 and my PIN is 1234"
- Manual input: Phone field + PIN field
- Successful authentication → Dashboard

### Rule 4: Returning Users
- Valid session → Direct dashboard access
- No session → Redirect to login page

## Implementation Details

### Database Schema
```typescript
export type User = {
  id: string;
  phone: string;           // Must be unique when pinHash exists
  name?: string;
  artisanId?: string;
  place?: string;
  craft?: string;
  pinHash?: string;        // Presence indicates registered user
  createdAt: number;
  updatedAt: number;
};
```

### API Endpoint: `/api/artisans/register`

**Before (Old Behavior)**:
- Always created or updated user record
- No duplicate phone check
- Could create multiple profiles with same phone

**After (New Behavior)**:
```typescript
// Check if phone exists with PIN (registered user)
if (user && user.pinHash) {
  return NextResponse.json({
    error: 'phone_exists',
    message: 'This phone number is already registered.',
    action: 'login'
  }, { status: 409 }); // HTTP 409 Conflict
}

// Continue with registration for new users
```

**Response Codes**:
- `200` - Registration successful (new user or user without PIN)
- `409` - Phone number already registered (conflict)
- `400` - Invalid input (missing required fields)
- `429` - Rate limit exceeded

### Onboarding Page Flow

```
┌─────────────────────────────────────┐
│ Artisan enters profile details     │
│ (Voice or manual input)             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ POST /api/artisans/register         │
│ { phone, name, artisanId, ... }     │
└──────────────┬──────────────────────┘
               │
               ▼
      ┌────────┴────────┐
      │                 │
      ▼                 ▼
┌──────────┐      ┌──────────────┐
│ 409      │      │ 200 OK       │
│ Conflict │      │ Success      │
└────┬─────┘      └──────┬───────┘
     │                   │
     ▼                   ▼
┌──────────────┐  ┌────────────────┐
│ Show message │  │ Set PIN        │
│ "Already     │  │ Create session │
│ registered"  │  │ Redirect /home │
└──────┬───────┘  └────────────────┘
       │
       ▼
┌────────────────┐
│ Button:        │
│ "Login instead"│
│ → /login       │
└────────────────┘
```

## User Experience

### Scenario A: New Artisan (Phone Not Registered)
```
1. User: Opens /onboarding
2. User: Speaks "My name is Priya, phone 9123456789, PIN 5678, ID ART-123"
3. System: Checks database → Phone not found
4. System: Creates profile, sets PIN, creates session
5. System: Redirects to /home dashboard
6. User: Sees their profile and can add products
```

### Scenario B: Existing Artisan Tries to Re-register
```
1. User: Opens /onboarding (forgot they already registered)
2. User: Speaks "My name is Ramesh, phone 9876543210, PIN 1234, ID ART-2041"
3. System: Checks database → Phone exists with PIN
4. System: Blocks registration, shows warning screen
5. Screen: "⚠️ Already Registered
           This phone number is already registered.
           [Login instead →]"
6. User: Clicks "Login instead"
7. System: Redirects to /login
8. User: Logs in with phone + PIN
9. System: Redirects to /home dashboard
```

### Scenario C: OTP User Upgrading to PIN
```
1. User: Previously registered with phone only (no PIN)
2. User: Opens /onboarding
3. User: Completes voice onboarding with PIN
4. System: Checks database → Phone exists WITHOUT PIN
5. System: Updates profile, sets PIN (first time)
6. System: Creates session
7. System: Redirects to /home
```

## Security Considerations

### Why Check `pinHash` Instead of Just `phone`?
- A phone number may exist in the database from OTP authentication
- Only users with `pinHash` have completed full registration
- This allows OTP-only users to upgrade to PIN authentication

### Audit Logging
Every blocked registration attempt is logged:
```typescript
await audit({
  action: 'artisan.registration_blocked',
  target: phone,
  ip: clientIp(request),
  detail: { reason: 'phone_already_registered' }
});
```

### Rate Limiting
- 10 registration attempts per hour per IP
- Prevents automated phone number enumeration attacks

## Testing Guide

### Test Case 1: New Phone Number
**Setup**: Phone 9999999999 does not exist in database

**Steps**:
1. Navigate to `/onboarding`
2. Enter profile with phone 9999999999 and PIN 1111
3. Submit

**Expected**:
- ✅ Profile created successfully
- ✅ PIN hashed and stored
- ✅ Redirected to `/home`
- ✅ Dashboard shows profile information

### Test Case 2: Duplicate Phone Number
**Setup**: Phone 9876543210 already registered with PIN

**Steps**:
1. Navigate to `/onboarding`
2. Enter profile with phone 9876543210 and PIN 1234
3. Submit

**Expected**:
- ✅ Registration blocked (HTTP 409)
- ✅ Warning screen appears: "Already Registered"
- ✅ Message: "This phone number is already registered."
- ✅ Button appears: "Login instead →"
- ✅ Clicking button redirects to `/login`
- ✅ Can successfully login with phone + PIN
- ✅ Audit log entry created

### Test Case 3: Phone Without PIN (OTP User)
**Setup**: Phone 9111111111 exists but `pinHash` is null

**Steps**:
1. Navigate to `/onboarding`
2. Enter profile with phone 9111111111 and PIN 2222
3. Submit

**Expected**:
- ✅ Profile updated (not blocked)
- ✅ PIN set for first time
- ✅ Redirected to `/home`
- ✅ Can login with phone + PIN in future

### Test Case 4: Login After Blocked Registration
**Setup**: Just completed Test Case 2 (blocked registration)

**Steps**:
1. Click "Login instead →" button
2. Enter phone 9876543210, PIN 1234
3. Submit login

**Expected**:
- ✅ Login successful
- ✅ Redirected to `/home`
- ✅ Dashboard shows correct profile (original registration)

## Edge Cases

### Edge Case 1: Multiple Quick Registrations (Race Condition)
**Scenario**: Same phone number submitted twice within milliseconds

**Mitigation**:
- Database read/write cycle happens synchronously
- First request creates user with PIN
- Second request sees existing `pinHash` and blocks

**Result**: Second registration blocked correctly ✅

### Edge Case 2: Phone Formatting Variations
**Scenario**: Phone entered as "98765 43210" vs "9876543210"

**Mitigation**:
```typescript
const phone = body.phone.replace(/\D/g, ''); // Remove all non-digits
```
- All formats normalized to digits-only
- Consistent comparison in database

**Result**: Duplicates detected correctly ✅

### Edge Case 3: Voice Recognition Returns Wrong Phone
**Scenario**: User says "9876543210" but system hears "9876543211"

**Current Behavior**:
- User can edit extracted phone number before submission
- Confirmation screen shows all extracted fields
- User must review and confirm

**Future Enhancement**: Voice confirmation loop for critical fields

## Database Query Performance

### Index Recommendation
```sql
CREATE INDEX idx_users_phone ON users(phone);
```
- Speeds up duplicate phone lookups
- Essential for production with many users

### Query Pattern
```typescript
const user = db.users.find(x => x.phone === phone);
```
- O(n) in JSON file storage (development)
- O(log n) with B-tree index in PostgreSQL (production)

## Migration Notes

### Existing Users
- Existing users with phone but no PIN: **Not affected**
- Can complete onboarding to add PIN
- No data migration required

### Rollback Plan
If this feature causes issues:
1. Remove `pinHash` check in registration endpoint
2. Revert to previous version of `/api/artisans/register`
3. Artisans with duplicate phones can both login (not ideal, but system works)

## Monitoring & Alerts

### Metrics to Track
- **Registration blocks**: Count of 409 responses per day
- **Successful registrations**: Count of 200 responses per day
- **Block-to-login conversion**: Users who click "Login instead"

### Alert Thresholds
- Alert if registration blocks > 100/hour (possible attack)
- Alert if successful registrations = 0 for 24 hours (system issue)

## Future Enhancements

1. **Phone Verification**: Send OTP before allowing registration
2. **Account Recovery**: "Forgot PIN" flow for registered users
3. **Profile Merge**: Admin tool to merge duplicate profiles (if any exist)
4. **Self-Service**: "Change Phone Number" in profile settings
5. **Soft Delete**: Allow users to deactivate account and reuse phone later

---

## Summary

✅ **Phone number uniqueness enforced**
✅ **Duplicate registrations blocked**
✅ **Clear user messaging**
✅ **Seamless redirect to login**
✅ **Secure PIN storage**
✅ **Audit trail maintained**
✅ **Rate limiting active**
✅ **Edge cases handled**

The system now prevents duplicate artisan profiles while maintaining a smooth user experience for both new and returning artisans.
