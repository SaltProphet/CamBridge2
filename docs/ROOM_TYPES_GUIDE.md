# Multi-Room Management Guide

## Overview
CamBridge now supports multiple rooms per model with two distinct room types: Public and Private Ultra. This guide explains how to set up, manage, and use these room types.

## Room Types

### 🌐 Public Rooms
**Purpose**: Standard video sessions requiring login with access code.

**Features**:
- Access code authentication required
- Suitable for general sessions
- Daily.co URL format: `{domain}.daily.co/{modelname}-{roomslug}-public`
- Visible type indicator in dashboard and room entrance

**Use Cases**:
- Regular scheduled sessions
- Group shows
- Standard fan interactions
- General content streaming

### 🔒 Private Ultra Rooms
**Purpose**: Premium, exclusive sessions with enhanced security.

**Features**:
- Access code authentication required
- Separate Daily.co namespace for isolation
- Daily.co URL format: `{domain}.daily.co/{modelname}-{roomslug}-private`
- Clear "Private Ultra" badge displayed
- Enhanced exclusivity perception

**Use Cases**:
- VIP client sessions
- One-on-one exclusive content
- High-paying subscriber access
- Premium tier experiences

## Configuration

### Setting Up Models and Rooms

Edit `config.json`:

```json
{
  "dailyDomainPrefix": "cambridge",
  "subscriptionPrice": 30,
  "maxSessionDuration": 7200,
  "sessionWarningTime": 6600,
  "maxRoomsPerModel": 8,
  "models": {
    "modelname": {
      "active": true,
      "rooms": {
        "main": {
          "name": "Main Studio",
          "type": "public",
          "slug": "main",
          "active": true,
          "createdAt": "2024-01-01T00:00:00Z"
        },
        "vip": {
          "name": "VIP Lounge",
          "type": "private",
          "slug": "vip",
          "active": true,
          "createdAt": "2024-01-01T00:00:00Z"
        }
      }
    }
  }
}
```

## Model Dashboard Usage

### Accessing the Dashboard
1. Navigate to `/dashboard`
2. Enter your model name (e.g., "modelname")
3. Enter password (default: "modelpass")

### Creating a New Room
1. Click "Create Room" button
2. Fill in room details:
   - **Room Name**: Friendly name (e.g., "VIP Lounge")
   - **Room Slug**: URL-safe identifier (e.g., "vip-lounge")
   - **Room Type**: Select Public or Private Ultra
3. Click "Create Room"
4. Access code is automatically generated

### Managing Existing Rooms

#### Room Card Features
Each room displays:
- Room name with type badge (🌐 Public / 🔒 Private)
- Room URL
- Current access code
- Room slug
- Active/Inactive status

#### Available Actions
- **Copy URL**: Copy room URL to clipboard
- **Enter Room**: Test the room directly
- **Change Code**: Generate new access code
- **Delete Room**: Remove room (with confirmation)

### Room Limits
- Default: 8 rooms per model
- Configurable via `maxRoomsPerModel` in config.json
- Dashboard shows current usage (e.g., "5 / 8")

## Client Access Flow

### Accessing a Room
1. Receive room URL from model (e.g., `cambridge.app/room/modelname/vip`)
2. Visit the URL
3. See room name and type indicator
4. Enter access code provided by model
5. Click "Establish Link" to join

### Room Indicators
- **Public**: 🌐 PUBLIC badge displayed
- **Private Ultra**: 🔒 PRIVATE badge displayed

### During Session
- Watermark shows room name and timestamp
- 2-hour maximum duration
- Warning at 1:50 (10 minutes before end)
- Tip system and chat available

## URL Structure

### New Format
```
/room/:modelname/:roomslug
```

Examples:
- `/room/modelname/main` - Main public room
- `/room/modelname/vip` - VIP private room
- `/room/modelname/studio` - Studio public room

### Backward Compatibility
```
/room/:modelname
```
Automatically defaults to model's "main" room.

## Daily.co Integration

### Room URL Generation
The system generates unique Daily.co URLs based on room type:

**Public Room**:
```
https://{dailyDomainPrefix}.daily.co/{modelname}-{roomslug}-public
```

**Private Room**:
```
https://{dailyDomainPrefix}.daily.co/{modelname}-{roomslug}-private
```

This ensures complete isolation between room types and individual rooms.

## Security Features

### Access Control
- Each room has unique access code
- Access codes stored in browser localStorage
- Separate Daily.co URLs per room prevent cross-room access
- Model and room validation before entry

### Room Isolation
- Public and private rooms use different namespaces
- No possibility of accidental mixing between room types
- Each slug creates unique Daily.co room

### Watermark Protection
- Room name displayed on video
- Timestamp updated every 30 seconds
- Deters unauthorized recording

## Best Practices

### For Models

1. **Room Organization**:
   - Use "main" for default public access
   - Create specific rooms for different tiers (e.g., "vip", "premium", "exclusive")
   - Name rooms clearly (e.g., "Group Show", "Private Sessions")

2. **Access Code Management**:
   - Change codes regularly for private rooms
   - Use different codes for public vs private
   - Don't share private room codes publicly

3. **Room Type Selection**:
   - Public: General audience, open shows
   - Private Ultra: VIP clients, exclusive content

4. **Client Communication**:
   - Clearly communicate which room type for each tier
   - Provide correct URL and access code
   - Explain benefits of private ultra rooms to premium clients

### For Platform Operators

1. **Model Onboarding**:
   - Add model to config.json
   - Set `active: true`
   - Create default "main" room

2. **Subscription Management**:
   - Set `active: false` when subscription expires
   - Monitor `maxRoomsPerModel` limits

3. **Daily.co Configuration**:
   - Ensure Daily.co domain matches config
   - Create rooms in Daily.co dashboard as needed
   - Monitor bandwidth and usage

## Troubleshooting

### Room Not Loading
- Verify model exists in config.json
- Check model is active
- Confirm room slug exists
- Validate room is active

### Access Code Not Working
- Verify code matches stored code
- Check localStorage for stored code
- Generate new code if needed

### Daily.co Connection Issues
- Verify Daily.co domain prefix in config
- Check Daily.co room exists
- Ensure proper Daily.co API configuration

## Demo Mode Notes

The current implementation includes demo mode features:

- Room creation saves to memory only (requires manual config.json update)
- Room deletion requires manual config.json cleanup
- Dashboard password is client-side only

**For Production**:
- Implement server-side API for room CRUD operations
- Use proper authentication system
- Add database for persistent storage
- Implement Stripe or payment gateway integration

## Migration from Old Format

### Old Config Format
```json
{
  "activeRooms": ["model1", "model2"]
}
```

### New Config Format
```json
{
  "models": {
    "model1": {
      "active": true,
      "rooms": {
        "main": { ... }
      }
    }
  }
}
```

### Backward Compatibility
Old URLs `/room/modelname` automatically redirect to `/room/modelname/main`, requiring a "main" room to exist in the configuration.

## Examples

### Example 1: Solo Model with Tiered Access
```json
"soloartist": {
  "active": true,
  "rooms": {
    "main": {
      "name": "Public Show",
      "type": "public",
      "slug": "main",
      "active": true
    },
    "vip": {
      "name": "VIP Only",
      "type": "private",
      "slug": "vip",
      "active": true
    }
  }
}
```

### Example 2: Studio with Multiple Rooms
```json
"studiocam": {
  "active": true,
  "rooms": {
    "main": {
      "name": "Main Studio",
      "type": "public",
      "slug": "main",
      "active": true
    },
    "studio-a": {
      "name": "Studio A",
      "type": "public",
      "slug": "studio-a",
      "active": true
    },
    "studio-b": {
      "name": "Studio B",
      "type": "public",
      "slug": "studio-b",
      "active": true
    },
    "private-suite": {
      "name": "Private Suite",
      "type": "private",
      "slug": "private-suite",
      "active": true
    }
  }
}
```

## Summary

The multi-room management system provides:
- ✅ Flexible room organization
- ✅ Clear public vs private distinction
- ✅ Unique access codes per room
- ✅ Easy room management via dashboard
- ✅ Backward compatibility
- ✅ Scalable architecture
- ✅ Enhanced security
- ✅ Professional tier system

This enables models to offer tiered services while maintaining security and organization across multiple access levels.
