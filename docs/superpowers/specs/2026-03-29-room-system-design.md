# Room System Design
**Date:** 2026-03-29
**Status:** Approved

---

## Overview

Build out the full room system for Nottify — covering the course rep's ManageRoomScreen (tabs: Notices + Members with Add Lecturer), a role-aware RoomFeedScreen (students read-only, lecturers/reps can post), and a redesigned LecturerHomeScreen with Rooms + Broadcasts tabs.

---

## Scope

Three screens are affected:

1. `ManageRoomScreen` — add Members tab with live lecturer search
2. `RoomFeedScreen` — make it real-time and role-aware
3. `LecturerHomeScreen` — replace with Rooms + Broadcasts tabs

No new services needed — `roomService.js` already has `addMemberToRoom`, `postNotice`, `getRoomsForUser`, `createRoom`, `autoEnrollStudents`.

---

## Section 1: ManageRoomScreen

### Layout
Two tabs at the top of the screen: **Notices** | **Members**. Tab bar is a simple custom two-button toggle (no external tab library needed).

### Notices Tab
Existing functionality — no changes. Notices feed with FAB to post.

### Members Tab

**Add Lecturer search bar** at the top of the tab.
- Placeholder text: `Search by name or staff ID`
- As the user types (after 2 characters), query Firestore: `users` where `role == "lecturer"` and `status == "active"`
- Filter results client-side by whether `displayName` or `staffId` contains the typed string (case-insensitive)
- Results appear as a floating dropdown beneath the input, max 5 entries
- Each dropdown row: lecturer name (bold) + staffId (gray)
- Tap a result → call `addMemberToRoom(roomId, userId)` → close dropdown → refresh members list
- If lecturer is already a member, show a disabled row with a checkmark instead of adding again

**Members list** below the search bar, grouped:
- Lecturers section (role badge: purple) — name + staffId
- Students/CourseReps section (role badge: gray) — name + matric number
- Each group has a section header with count e.g. "Lecturers (2)"

### Data
- Members fetched via real-time `onSnapshot` on `rooms/{roomId}/members`
- For each member uid, fetch user profile from `users/{uid}` to get name/matric/staffId
- Lecturer search is a one-time `getDocs` triggered on each keystroke (debounced 300ms)

---

## Section 2: RoomFeedScreen

### Navigation
Receives `roomId` as a route param. Both `StudentNavigator` and `LecturerNavigator` already have a `RoomFeed` route — no App.js changes needed. RepNavigator also has it.

### Role Check
On mount, fetch `rooms/{roomId}/members/{uid}`. Get the `role` field from that document. This determines what the user can do in this room.

- `student` → read-only feed, no FAB
- `lecturer` or `courserep` → feed + FAB to compose a notice

### Feed
Real-time `onSnapshot` on `rooms/{roomId}/notices` ordered by `createdAt desc`. Each notice rendered with `NoticeCard` (already exists).

### Post Flow (lecturers/reps only)
FAB opens a bottom sheet modal with Title + Message inputs. On submit → calls `postNotice(roomId, title, body)` from `roomService.js`. This already handles push notifications to all room members. Modal closes on success.

### Empty State
Show icon + "No notices yet" if feed is empty.

### Error State
If user is not a member of the room, show "You are not a member of this room."

---

## Section 3: LecturerHomeScreen

### Layout
Two tabs: **Rooms** | **Broadcasts**

Custom two-button tab toggle (same pattern as ManageRoomScreen tabs — reuse the same approach).

### Rooms Tab
- On mount, call `getRoomsForUser(uid)` to fetch all rooms the lecturer belongs to
- Display as a card list: room name, dept, level, semester badge
- Tap a card → `navigation.navigate('RoomFeed', { roomId })`
- Empty state: "You haven't been added to any rooms yet."

### Broadcasts Tab
- Existing broadcasts feed (real-time `onSnapshot` on `broadcasts` ordered by `createdAt desc`)
- "Post Notice to Students" button at top — opens existing compose modal
- Identical to current implementation, just moved into a tab

---

## Permission Model

| Action | Student | CourseRep | Lecturer | Dean |
|--------|---------|-----------|---------|------|
| Read room notices | ✅ | ✅ | ✅ | — |
| Post room notice | ❌ | ✅ | ✅ (if member) | — |
| Add lecturer to room | ❌ | ✅ | ❌ | — |
| Create room | ❌ | ✅ | ❌ | ✅ |
| Broadcast to all students | ❌ | ❌ | ✅ | ✅ |

Permission is enforced client-side via the member's `role` field in `rooms/{roomId}/members/{uid}`. Firestore rules enforce it server-side (already specified in earlier session).

---

## Files Changed

| File | Change |
|------|--------|
| `src/screens/courserep/ManageRoomScreen.js` | Add Members tab + live lecturer search |
| `src/screens/student/RoomFeedScreen.js` | Real-time feed + role-aware post FAB |
| `src/screens/lecturer/LecturerHomeScreen.js` | Replace with Rooms + Broadcasts tabs |

No new files. No service changes. No navigation changes.
