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
      await supabase.auth.getUser();


    if (error) {

      throw error;

    }


    return data.user;

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


})();
