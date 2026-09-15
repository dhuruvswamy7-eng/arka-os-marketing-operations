import assert from 'node:assert/strict';
import test from 'node:test';
import {
  authenticateDemoUser,
  getAssignablePeople,
  getAttendanceScope,
  getVisiblePeopleForRole,
  isApprovedLeaveActiveOnDate,
  updateLeaveStatus,
} from './App';

const people = [
  { id: 'maya', name: 'Monika Sriniva', role: 'Founder' as const, title: 'Founder / Admin', managerId: null, presence: 'Online' as const, lastActiveAt: 'Just now' },
  { id: 'priya', name: 'Priya Shah', role: 'Manager' as const, title: 'Operations Manager', managerId: null, presence: 'Online' as const, lastActiveAt: 'Just now' },
  { id: 'rahul', name: 'Rahul Mehta', role: 'Team member' as const, title: 'Product Designer', managerId: 'priya', presence: 'Online' as const, lastActiveAt: 'Just now' },
  { id: 'arun', name: 'Arun Nair', role: 'Team member' as const, title: 'SEO Specialist', managerId: 'priya', presence: 'Online' as const, lastActiveAt: 'Just now' },
  { id: 'new-member', name: 'New Member', role: 'Team member' as const, title: 'Designer', managerId: 'priya', presence: 'Offline' as const, lastActiveAt: 'Never' },
];

const pendingRahulLeave = {
  id: 'leave-pending',
  userId: 'rahul',
  leaveType: 'Casual' as const,
  startDate: '2026-09-15',
  endDate: '2026-09-16',
  reason: 'Family commitment',
  status: 'Pending' as const,
  createdAt: 'Just now',
};

test('keeps leave visible only to the correct role scope', () => {
  assert.deepEqual(getVisiblePeopleForRole(people[1], people).map((item) => item.id), ['priya', 'rahul', 'arun', 'new-member']);
  assert.deepEqual(getVisiblePeopleForRole(people[2], people).map((item) => item.id), ['rahul']);
  assert.deepEqual(getVisiblePeopleForRole(people[0], people).map((item) => item.id), people.map((item) => item.id));
  assert.deepEqual(getAttendanceScope(people[1], people).map((item) => item.id), ['rahul', 'arun', 'new-member']);
  assert.deepEqual(getAttendanceScope(people[2], people).map((item) => item.id), ['rahul']);
});

test('allows a Founder to approve pending leave and marks only overlapping approved dates as active', () => {
  const approved = updateLeaveStatus([pendingRahulLeave], pendingRahulLeave.id, 'Approved', people[0]);
  assert.equal(approved[0].status, 'Approved');
  assert.equal(approved[0].approvedBy, 'maya');
  assert.equal(isApprovedLeaveActiveOnDate(approved[0], '2026-09-15'), true);
  assert.equal(isApprovedLeaveActiveOnDate(approved[0], '2026-09-17'), false);
  assert.equal(isApprovedLeaveActiveOnDate({ ...approved[0], status: 'Rejected' }, '2026-09-15'), false);
});

test('rejecting leave leaves attendance unchanged and non-Founders cannot decide', () => {
  const rejected = updateLeaveStatus([pendingRahulLeave], pendingRahulLeave.id, 'Rejected', people[0]);
  assert.equal(rejected[0].status, 'Rejected');
  assert.equal(isApprovedLeaveActiveOnDate(rejected[0], '2026-09-15'), false);
  assert.deepEqual(updateLeaveStatus([pendingRahulLeave], pendingRahulLeave.id, 'Approved', people[1]), [pendingRahulLeave]);
});

test('demo authentication accepts the requested three role accounts and rejects non-matching passwords', () => {
  assert.deepEqual(authenticateDemoUser('arka@founder', '1234'), { id: 'maya', role: 'Founder', name: 'Founder' });
  assert.deepEqual(authenticateDemoUser('arka@manager', '1234'), { id: 'priya', role: 'Manager', name: 'Manager' });
  assert.deepEqual(authenticateDemoUser('arka@teammember', '1234'), { id: 'rahul', role: 'Team member', name: 'Team Member 1' });
  assert.equal(authenticateDemoUser('arka@founder', 'wrong-password'), null);
  assert.equal(authenticateDemoUser('arka@unknown', '1234'), null);
});

test('new employees are available to Founder work assignment selectors', () => {
  assert.deepEqual(getAssignablePeople(people).map((item) => item.id), ['priya', 'rahul', 'arun', 'new-member']);
  assert.deepEqual(getAssignablePeople(people, 'Team member').map((item) => item.id), ['rahul', 'arun', 'new-member']);
});