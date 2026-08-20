const SB = () => window.tcaSupabase;
const cfg = () => window.TCA_CONFIG;
const studentEmail = username => `${String(username).trim().toLowerCase()}@${cfg().STUDENT_EMAIL_DOMAIN}`;

async function signInStaff(email, password) {
  const { data, error } = await SB().auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw error;
  if (!['admin','teacher'].includes(data.user?.user_metadata?.role)) {
    await SB().auth.signOut();
    throw new Error('This account is not an administrator account.');
  }
  return data.user;
}

async function signInStudent(username, password) {
  const { data, error } = await SB().auth.signInWithPassword({ email: studentEmail(username), password });
  if (error) throw error;
  if (data.user?.user_metadata?.role !== 'student') {
    await SB().auth.signOut();
    throw new Error('This account is not a student account.');
  }
  return data.user;
}

async function requireRole(role) {
  const { data: { session } } = await SB().auth.getSession();
  if (!session?.user) {
    location.href = 'index.html';
    return null;
  }
  const actual = session.user.user_metadata?.role;
  if (role === 'staff' && !['admin','teacher'].includes(actual)) {
    location.href = actual === 'student' ? 'student.html' : 'index.html';
    return null;
  }
  if (role !== 'staff' && actual !== role) {
    location.href = actual === 'student' ? 'student.html' : 'dashboard.html';
    return null;
  }
  return session.user;
}

async function logout() {
  await SB().auth.signOut();
  location.href = 'index.html';
}

window.logout = logout;
window.signInStaff = signInStaff;
window.signInStudent = signInStudent;
window.requireRole = requireRole;
