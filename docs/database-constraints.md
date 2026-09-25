# Database Constraints - Artisan Authentication

## Phone Number Uniqueness

### Business Rule
**Each phone number can only be associated with ONE registered artisan profile.**

### Implementation

#### Schema
```typescript
export type User = {
  id: string;              // Primary key: usr_[random_hex]
  phone: string;           // MUST be unique when pinHash exists
  name?: string;
  artisanId?: string;
  place?: string;
  craft?: string;
  pinHash?: string;        // SHA-256 hash of 4-digit PIN
  createdAt: number;       // Unix timestamp
  updatedAt: number;       // Unix timestamp
};
```

#### Uniqueness Logic
```typescript
// A phone is considered "registered" if it has a PIN
const isRegistered = (user: User) => user.phone && user.pinHash;

// Check for duplicate during registration
const user = db.users.find(x => x.phone === phone);
if (user && user.pinHash) {
  // Block: Phone already registered
  return 409; // HTTP Conflict
}
```

### Why Check `pinHash`?

Phone numbers can exist in the database in two states:

| State | Phone | PIN Hash | Status | Action Allowed |
|-------|-------|----------|--------|----------------|
| **Partial** | ✅ Exists | ❌ Null | OTP-only user | ✅ Can complete registration |
| **Complete** | ✅ Exists | ✅ Exists | Registered user | ❌ Must login instead |

**Rationale**: 
- Users who only used OTP authentication have a phone number but no PIN
- They should be allowed to "upgrade" by completing full registration
- Only users with both phone AND PIN are fully registered

### Database Recommendations

#### For Production (PostgreSQL)

Add a unique index on the phone field:
```sql
CREATE UNIQUE INDEX idx_users_phone_unique 
ON users(phone) 
WHERE pinHash IS NOT NULL;
```

**Benefits**:
- Enforces uniqueness at database level
- Fast lookup performance
- Prevents race conditions

#### For Development (JSON File)

No index needed. Application logic handles uniqueness check:
```typescript
const user = db.users.find(x => x.phone === phone);
```

### Edge Cases

#### Case 1: Race Condition (Simultaneous Registrations)
**Scenario**: Two users submit same phone number at exactly the same time

**Without DB Constraint**:
- First request: Reads DB, sees no user, creates user A
- Second request: Reads DB (before A is written), sees no user, creates user B
- Result: Two profiles with same phone ❌

**With DB Constraint**:
- First request: Inserts user A successfully
- Second request: Insert fails with UNIQUE constraint violation
- Result: Only one profile created ✅

**Mitigation** (Current Implementation):
- Synchronous read/write in route handler
- Single-threaded Node.js event loop reduces race condition window
- For production: Use database unique constraint

#### Case 2: Phone Number Formatting
**Scenario**: Same phone entered with different formats

**Examples**:
- `9876543210`
- `+91 9876543210`
- `98765 43210`
- `+91-98765-43210`

**Solution**: Normalize to digits only
```typescript
const phone = rawPhone.replace(/\D/g, '');
// All become: "919876543210" or "9876543210"
```

#### Case 3: International Numbers
**Current**: Only Indian numbers supported (10 digits, starting with 6-9)

**Validation**:
```typescript
if (phone.length < 10 || phone.length > 15) {
  return 400; // Bad Request
}
```

**Future**: Add country code support with proper validation

### Audit Trail

Every phone uniqueness check is logged:

```typescript
// Successful registration (new phone)
await audit({
  action: 'artisan.registered',
  actor: user.id,
  ip: clientIp(request)
});

// Blocked registration (duplicate phone)
await audit({
  action: 'artisan.registration_blocked',
  target: phone,
  ip: clientIp(request),
  detail: { reason: 'phone_already_registered' }
});
```

**Query blocked attempts**:
```typescript
const blocked = auditLogs.filter(
  log => log.action === 'artisan.registration_blocked'
);
```

### Testing Strategy

#### Unit Test Example
```typescript
describe('Phone Uniqueness', () => {
  it('should block registration with existing phone+PIN', async () => {
    // Setup: Create user with phone and PIN
    await createUser({ phone: '9876543210', pinHash: 'hash123' });
    
    // Act: Try to register again
    const response = await POST('/api/artisans/register', {
      phone: '9876543210',
      name: 'New User',
      artisanId: 'ART-999'
    });
    
    // Assert
    expect(response.status).toBe(409);
    expect(response.body.error).toBe('phone_exists');
  });
  
  it('should allow registration with phone but no PIN', async () => {
    // Setup: Create user with phone only
    await createUser({ phone: '9876543210', pinHash: null });
    
    // Act: Complete registration with PIN
    const response = await POST('/api/artisans/register', {
      phone: '9876543210',
      name: 'Upgraded User',
      artisanId: 'ART-888'
    });
    
    // Assert
    expect(response.status).toBe(200);
  });
});
```

#### Integration Test Checklist
- [ ] Register new user with unique phone → Success
- [ ] Register again with same phone → Blocked (409)
- [ ] Blocked screen shows "Already Registered" message
- [ ] "Login instead" button redirects to /login
- [ ] Login with original credentials → Success
- [ ] Dashboard shows original user's profile
- [ ] Audit log contains registration_blocked event

### Monitoring Queries

```typescript
// Count unique phones with PINs (registered users)
const registeredUsers = db.users.filter(u => u.pinHash).length;

// Count phone collisions detected today
const today = Date.now() - 24*60*60*1000;
const collisions = db.auditLogs.filter(
  log => log.action === 'artisan.registration_blocked' && log.ts > today
).length;

// Most attempted phone numbers (potential issues)
const phoneAttempts = db.auditLogs
  .filter(log => log.action === 'artisan.registration_blocked')
  .reduce((acc, log) => {
    acc[log.target] = (acc[log.target] || 0) + 1;
    return acc;
  }, {});
```

### Migration Guide

#### Adding Unique Constraint to Existing Database

```sql
-- Step 1: Find duplicates
SELECT phone, COUNT(*) as count
FROM users
WHERE pinHash IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1;

-- Step 2: (If duplicates found) Manually resolve
-- Decide which profile to keep, deactivate others

-- Step 3: Add constraint
CREATE UNIQUE INDEX idx_users_phone_unique 
ON users(phone) 
WHERE pinHash IS NOT NULL;
```

### Summary

✅ **Application-Level Enforcement**: Check phone+PIN existence before registration  
✅ **Database-Level Enforcement** (Recommended): Unique index in production  
✅ **User Experience**: Clear messaging and redirect to login  
✅ **Audit Trail**: All blocked attempts logged  
✅ **Edge Cases**: Race conditions, formatting variations handled  
✅ **Testing**: Unit and integration tests defined  

The phone uniqueness constraint ensures data integrity while maintaining a smooth user experience.
