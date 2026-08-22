"use strict";


(function () {


  /* ==========================================
     SUPABASE CHECK
  ========================================== */

  function getSupabase() {

    if (!window.tcaSupabase) {

      throw new Error(
        "Supabase is not initialized."
      );

    }

    return window.tcaSupabase;
  }


  /* ==========================================
     STUDENT EMAIL
  ========================================== */

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
      window.TCA_CONFIG
        ?.STUDENT_EMAIL_DOMAIN
        || "students.terabyte.academy";


    return (
      cleanUsername +
      "@" +
      domain
    );
  }


  /* ==========================================
     STAFF LOGIN
  ========================================== */

  async function signInStaff(
    email,
    password
  ) {

    const supabase =
      getSupabase();


    const cleanEmail =
      String(email || "")
        .trim()
        .toLowerCase();


    if (!cleanEmail) {

      throw new Error(
        "Email is required."
      );

    }


    const {
      data,
      error
    } =
      await supabase.auth.signInWithPassword({

        email:
          cleanEmail,

        password:
          password

      });


    if (error) {

      throw error;

    }


    if (!data.user) {

      throw new Error(
        "Login failed."
      );

    }


    const role =
      data.user.user_metadata?.role;


    if (
      role !== "admin" &&
      role !== "teacher"
    ) {

      await supabase.auth.signOut();

      throw new Error(
        "This account is not authorized as administrator or teacher."
      );

    }


    return data;

  }


  /* ==========================================
     STUDENT LOGIN
  ========================================== */

  async function signInStudent(
    username,
    password
  ) {

    const supabase =
      getSupabase();


    const email =
      studentEmail(username);


    const {
      data,
      error
    } =
      await supabase.auth.signInWithPassword({

        email:
          email,

        password:
          password

      });


    if (error) {

      throw error;

    }


    if (!data.user) {

      throw new Error(
        "Student login failed."
      );

    }


    const role =
      data.user.user_metadata?.role;


    if (role !== "student") {

      await supabase.auth.signOut();

      throw new Error(
        "This account is not a student account."
      );

    }


    return data;

  }


  /* ==========================================
     LOGOUT
  ========================================== */

  async function signOut() {

    const supabase =
      getSupabase();

    await supabase.auth.signOut();

  }


  /* ==========================================
     CURRENT USER
  ========================================== */

  async function getCurrentUser() {

    const supabase =
      getSupabase();


    const {
      data,
      error
    } =
      await supabase.auth.getSession();


    if (error) {

      throw error;

    }


    return data.session
      ? data.session.user
      : null;

  }


  /* ==========================================
     SB()

     Shorthand accessor used throughout
     app.js and student.js to reach the
     Supabase client, e.g. SB().from("students").
  ========================================== */

  function SB() {

    return getSupabase();

  }


  /* ==========================================
     REQUIRE ROLE

     Confirms a signed-in user exists AND
     that the user's role matches the page
     that is asking ("staff" = admin/teacher,
     "student" = student).

     Redirects back to the login page and
     returns null when authentication or the
     role check fails, so callers can simply
     stop initializing when this returns null.
  ========================================== */

  function goToLogin() {

    window.location.replace(
      "index.html"
    );

  }


  async function requireRole(kind) {

    try {

      const user =
        await getCurrentUser();


      if (!user) {

        goToLogin();

        return null;

      }


      const role =
        user.user_metadata?.role;


      const isStaff =
        role === "admin" ||
        role === "teacher";


      const isStudent =
        role === "student";


      const authorized =
        kind === "staff"
          ? isStaff
          : kind === "student"
            ? isStudent
            : false;


      if (!authorized) {

        await signOut();

        goToLogin();

        return null;

      }


      return user;


    } catch (error) {

      console.error(
        "requireRole error:",
        error
      );

      goToLogin();

      return null;

    }

  }


  /* ==========================================
     LOGOUT (page-level helper)

     Signs the user out of Supabase and sends
     them back to the login page. Used directly
     by the Logout buttons on the dashboard and
     student portal.
  ========================================== */

  async function logout() {

    try {

      await signOut();

    } catch (error) {

      console.error(
        "Logout error:",
        error
      );

    } finally {

      goToLogin();

    }

  }


  /* ==========================================
     EXPORT
  ========================================== */

  window.signInStaff =
    signInStaff;

  window.signInStudent =
    signInStudent;

  window.tcaSignOut =
    signOut;

  window.tcaGetCurrentUser =
    getCurrentUser;

  window.SB =
    SB;

  window.requireRole =
    requireRole;

  window.logout =
    logout;


})();
