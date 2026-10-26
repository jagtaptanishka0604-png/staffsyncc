import { db } from '../staffsync/server/db';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('🧪 Starting StaffSync Automated Quality Assurance Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  await db.init();

  // Test 1: Seed data integrity
  assert(db.users.length >= 8, 'Initial database contains seeded users');
  assert(db.employees.length >= 8, 'Initial database contains seeded employees');
  assert(db.departments.length >= 4, 'Departments initialized correctly');

  // Test 2: Authentication & Password Verification
  const hrUser = db.users.find(u => u.email === 'hr@staffsync.io');
  assert(Boolean(hrUser), 'HR user account exists');
  const validPassword = await bcrypt.compare('Password123!', hrUser!.passwordHash);
  assert(validPassword, 'HR password hash verifies correctly');
  const invalidPassword = await bcrypt.compare('WrongPassword', hrUser!.passwordHash);
  assert(!invalidPassword, 'Invalid password is rejected');

  // Test 3: Role-Based Access Control Structure
  const managerUser = db.users.find(u => u.email === 'marcus.vance@staffsync.io');
  const employeeUser = db.users.find(u => u.email === 'alex.rivera@staffsync.io');
  assert(hrUser?.role === 'hr', 'Sarah Jenkins has HR role');
  assert(managerUser?.role === 'manager', 'Marcus Vance has Manager role');
  assert(employeeUser?.role === 'employee', 'Alex Rivera has Employee role');

  // Test 4: Attendance record integrity
  const hasRecordedAttendance = db.attendances.some(
    a => a.employeeId === 'emp_alex'
  );
  assert(hasRecordedAttendance, 'Employee Alex Rivera has recorded attendance history');

  // Test 5: Leave Balance Allocations
  const alexCasualBalance = db.leaveBalances.find(
    b => b.employeeId === 'emp_alex' && b.leaveTypeId === 'casual'
  );
  assert(Boolean(alexCasualBalance), 'Leave balance for Alex Rivera (casual) exists');
  assert(alexCasualBalance!.allocatedDays === 12, 'Casual leave has 12 allocated days');

  // Test 6: Leave Two-Stage Approval Consistency
  const chloeLeave = db.leaves.find(l => l._id === 'leave_chloe_1');
  assert(Boolean(chloeLeave), 'Chloe Dupont leave record exists');
  assert(
    chloeLeave?.status === 'Pending HR Approval',
    'Chloe leave is at Pending HR Approval stage after Manager approved it'
  );
  assert(
    Boolean(chloeLeave?.approvalHistory.some(h => h.stage === 'Manager' && h.action === 'Approved')),
    'Approval history logs Manager stage approval'
  );

  // Test 7: Audit Log Compliance
  assert(db.auditLogs.length > 0, 'Audit trail contains recorded events');
  const hasCorrectionAudit = db.auditLogs.some(a => a.action === 'ATTENDANCE_CORRECTION');
  assert(hasCorrectionAudit, 'Attendance correction audit log is present with metadata');

  console.log(`\nTest Summary: ${passed} Passed, ${failed} Failed.`);
  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
