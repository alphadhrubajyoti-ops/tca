"use strict";

const SB = () => window.tcaSupabase;

const cfg = () => {

  if (!window.TCA_CONFIG) {
    throw new Error(
      "TeraByte configuration is not loaded."
    );
  }

  return window.TCA_CONFIG;
};


function studentEmail(username) {

  const cleanUsername =
    String(username || "")
      .trim()
      .toLowerCase();

  if (!cleanUsername) {
    throw new Error(
      "Student username is required."
    );
  }

  const domain =
    cfg().STUDENT_EMAIL_DOMAIN;

  if (!domain) {
    throw new Error(
      "Student email domain is not configured."
    );
  }

  return `${cleanUsername}@${domain}`;
}


/* =========================================================
   STAFF LOGIN
========================================================= */

async function signInStaff(email, password) {

  if (!SB()) {
    throw new Error(
      "Supabase is not initialized."
    );
  }

  const cleanEmail =
    String(email || "").trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error(
      "Email and password are required."
    );
  }

  const {
    data,
    error
  } = await SB().auth.signInWithPassword({
    email: cleanEmail,
    password
  });

  if (error) {
    throw error;
  }

  const role =
    data.user?.user_metadata?.role;

  if (
    role !== "admin" &&
    role !== "teacher"
  ) {

    await SB().auth.signOut();

    throw new Error(
      "This account is not an administrator or teacher account."
    );
  }

  return data.user;
}


/* =========================================================
   STUDENT LOGIN
========================================================= */

async function signInStudent(
  username,
  password
) {

  if (!SB()) {
    throw new Error(
      "Supabase is not initialized."
    );
  }

  const cleanUsername =
    String(username || "")
      .trim()
      .toLowerCase();

  if (!cleanUsername) {
    throw new Error(
      "Please enter your student username."
    );
  }

  if (!password) {
    throw new Error(
      "Please enter your password."
    );
  }

  const email =
    studentEmail(cleanUsername);

  console.log(
    "Student login:",
    email
  );

  const {
    data,
    error
  } = await SB().auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    throw error;
  }

  if (!data?.user) {

    throw new Error(
      "Student authentication failed."
    );
  }

  const role =
    data.user.user_metadata?.role;

  if (role !== "student") {

    await SB().auth.signOut();

    throw new Error(
      "This account is not a student account."
    );
  }

  return data.user;
}


/* =========================================================
   ROLE PROTECTION
========================================================= */

async function requireRole(role) {

  if (!SB()) {

    location.href =
      "index.html";

    return null;
  }

  const {
    data,
    error
  } = await SB().auth.getSession();

  if (error) {

    console.error(
      "Session error:",
      error
    );

    location.href =
      "index.html";

    return null;
  }

  const session =
    data?.session;

  if (!session?.user) {

    location.href =
      "index.html";

    return null;
  }

  const user =
    session.user;

  const actualRole =
    user.user_metadata?.role;

  /* Staff */

  if (role === "staff") {

    if (
      actualRole !== "admin" &&
      actualRole !== "teacher"
    ) {

      if (actualRole === "student") {
        location.href =
          "student.html";
      } else {
        location.href =
          "index.html";
      }

      return null;
    }

    return user;
  }

  /* Student */

  if (actualRole !== role) {

    if (
      actualRole === "admin" ||
      actualRole === "teacher"
    ) {

      location.href =
        "dashboard.html";

    } else {

      location.href =
        "index.html";
    }

    return null;
  }

  return user;
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {

  try {

    if (SB()) {
      await SB().auth.signOut();
    }

  } catch (error) {

    console.error(
      "Logout error:",
      error
    );

  } finally {

    location.href =
      "index.html";
  }
}


window.logout =
  logout;

window.signInStaff =
  signInStaff;

window.signInStudent =
  signInStudent;

window.requireRole =
  requireRole;

window.studentEmail =
  studentEmail;
