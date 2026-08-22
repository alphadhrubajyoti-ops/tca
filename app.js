"use strict";

let currentUser = null;
let students = [];
let posts = [];
let messages = [];

let selectedStudent = null;
let registrationResult = null;
let photoFile = null;


/* =========================================================
   HELPERS
   ========================================================= */

const $ = id => document.getElementById(id);

const money = n =>
  "₹" + Number(n || 0).toLocaleString("en-IN");

const esc = value =>
  String(value ?? "").replace(/[&<>'"]/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;"
  }[char]));

function toast(message) {

  const el = $("toast");

  if (!el) {
    console.log(message);
    return;
  }

  el.textContent = message;

  el.classList.remove("hidden");

  clearTimeout(window.__toastTimer);

  window.__toastTimer = setTimeout(() => {
    el.classList.add("hidden");
  }, 3500);
}


/* =========================================================
   REGISTRATION NUMBER
   ========================================================= */

/*
  This is the important part.

  We first try the Supabase RPC function.

  If RPC fails, we look at existing students.

  If that also fails, we generate a temporary fallback
  so the registration field NEVER remains blank.
*/

async function nextAdmission() {

  /* -----------------------------------------
     METHOD 1 — Supabase RPC
     ----------------------------------------- */

  try {

    const {
      data,
      error
    } = await SB().rpc("next_admission_no");

    if (!error && data) {

      const number = String(data).trim();

      if (number) {
        return number;
      }
    }

    if (error) {
      console.warn(
        "next_admission_no RPC error:",
        error
      );
    }

  } catch (error) {

    console.warn(
      "RPC registration number failed:",
      error
    );
  }


  /* -----------------------------------------
     METHOD 2 — Find highest existing number
     ----------------------------------------- */

  try {

    const {
      data,
      error
    } = await SB()
      .from("students")
      .select("admission_no")
      .not("admission_no", "is", null);

    if (!error) {

      let highest = 0;

      (data || []).forEach(student => {

        const value =
          String(
            student.admission_no || ""
          );

        /*
          Extract the LAST group of digits.

          Examples:

          TCA00001
          TCA260001
          TCA20260001
        */

        const matches =
          value.match(/\d+/g);

        if (!matches || !matches.length) {
          return;
        }

        const last =
          parseInt(
            matches[matches.length - 1],
            10
          );

        if (
          Number.isFinite(last) &&
          last > highest
        ) {
          highest = last;
        }
      });


      return (
        "TCA" +
        String(highest + 1)
          .padStart(5, "0")
      );
    }

  } catch (error) {

    console.warn(
      "Database fallback failed:",
      error
    );
  }


  /* -----------------------------------------
     METHOD 3 — Guaranteed fallback
     ----------------------------------------- */

  return (
    "TCA" +
    Date.now()
      .toString()
      .slice(-8)
  );
}


/*
  Put the number into the actual HTML field.
*/

async function showNextAdmissionNumber() {

  const field =
    $("admissionNo");

  if (!field) {

    console.error(
      "ERROR: #admissionNo was not found."
    );

    return null;
  }


  field.value =
    "Generating...";


  try {

    const number =
      await nextAdmission();


    field.value =
      number;


    console.log(
      "Registration number:",
      number
    );


    return number;

  } catch (error) {

    console.error(
      "Registration number error:",
      error
    );


    const fallback =
      "TCA" +
      Date.now()
        .toString()
        .slice(-8);


    field.value =
      fallback;


    return fallback;
  }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function init() {

  currentUser =
    await requireRole("staff");


  if (!currentUser) {
    return false;
  }


  const name =
    currentUser.user_metadata?.name ||
    currentUser.email?.split("@")[0] ||
    "Administrator";


  if ($("adminName")) {
    $("adminName").textContent =
      name;
  }


  if ($("adminAvatar")) {
    $("adminAvatar").textContent =
      (name[0] || "A").toUpperCase();
  }


  return true;
}


/* =========================================================
   REFRESH DATABASE
   ========================================================= */

async function refreshAll() {

  try {

    const studentsRequest =
      await SB()
        .from("students")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (studentsRequest.error) {
      throw studentsRequest.error;
    }


    students =
      studentsRequest.data || [];


  } catch (error) {

    console.error(
      "Students loading error:",
      error
    );

    students = [];
  }


  /* POSTS */

  try {

    const {
      data,
      error
    } =
      await SB()
        .from("posts")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        );


    if (error) {
      throw error;
    }

    posts =
      data || [];

  } catch (error) {

    console.warn(
      "Posts loading error:",
      error
    );

    posts = [];
  }


  /* MESSAGES */

  try {

    const {
      data,
      error
    } =
      await SB()
        .from("messages")
        .select("*")
        .order(
          "created_at",
          {
            ascending: false
          }
        )
        .limit(50);


    if (error) {
      throw error;
    }

    messages =
      data || [];

  } catch (error) {

    console.warn(
      "Messages loading error:",
      error
    );

    messages = [];
  }


  renderOverview();
  renderStudents();
  renderFees();
  renderCertificates();
  renderIdSelect();
  renderPosts();
  renderMessages();
  populateRecipients();
}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function showPage(pageId) {

  document
    .querySelectorAll(".module")
    .forEach(section => {

      section.classList.remove("active");
    });


  const page =
    $(pageId);


  if (page) {
    page.classList.add("active");
  }


  document
    .querySelectorAll(".nav button")
    .forEach(button => {

      button.classList.toggle(
        "active",
        button.dataset.page === pageId
      );
    });


  const titles = {

    overview: [
      "Dashboard",
      "Academy overview and daily operations"
    ],

    students: [
      "Student Records",
      "Search and manage registered students"
    ],

    admission: [
      "New Admission",
      "Register a student and create portal credentials"
    ],

    fees: [
      "Fees & Dues",
      "Monitor payments and outstanding balances"
    ],

    certificates: [
      "Certificates",
      "Manage certificate status"
    ],

    idcard: [
      "ID Card",
      "Generate and download student identity cards"
    ],

    posts: [
      "Blog & Notices",
      "Publish content for student portals"
    ],

    messages: [
      "Messages",
      "Send private or academy-wide messages"
    ],

    settings: [
      "Settings",
      "System and security configuration"
    ]
  };


  if (titles[pageId]) {

    if ($("pageTitle")) {
      $("pageTitle").textContent =
        titles[pageId][0];
    }

    if ($("pageSub")) {
      $("pageSub").textContent =
        titles[pageId][1];
    }
  }


  /*
    When opening New Admission,
    make sure a number exists.
  */

  if (pageId === "admission") {

    if (
      $("admissionNo") &&
      (
        !$("admissionNo").value ||
        $("admissionNo").value === "Generating..."
      )
    ) {

      showNextAdmissionNumber();
    }
  }
}


/* =========================================================
   MOBILE SIDEBAR MENU
   ========================================================= */

function closeSidebar() {

  $("sidebar")?.classList.remove("open");

  $("sidebarBackdrop")?.classList.remove("open");

  document.body.style.overflow =
    "";
}


function openSidebar() {

  $("sidebar")?.classList.add("open");

  $("sidebarBackdrop")?.classList.add("open");

  document.body.style.overflow =
    "hidden";
}


if ($("menuToggle")) {

  $("menuToggle").onclick =
    () => {

      const isOpen =
        $("sidebar")?.classList.contains("open");

      if (isOpen) {
        closeSidebar();
      } else {
        openSidebar();
      }
    };
}


if ($("sidebarBackdrop")) {

  $("sidebarBackdrop").onclick =
    closeSidebar;
}


/* =========================================================
   NAV BUTTONS
   ========================================================= */

document
  .querySelectorAll("[data-page]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        showPage(
          button.dataset.page
        );

        closeSidebar();
      }
    );
  });


document
  .querySelectorAll("[data-page-jump]")
  .forEach(button => {

    button.addEventListener(
      "click",
      () => {

        showPage(
          button.dataset.pageJump
        );
      }
    );
  });


/* =========================================================
   LOGOUT
   ========================================================= */

if ($("logoutBtn")) {

  $("logoutBtn").onclick =
    async () => {

      try {

        await logout();

      } catch (error) {

        console.error(
          error
        );

        toast(
          error.message ||
          "Logout failed"
        );
      }
    };
}


/* =========================================================
   REFRESH BUTTON
   ========================================================= */

if ($("refresh")) {

  $("refresh").onclick =
    async () => {

      await refreshAll();

      /*
        Refresh registration number too.
      */

      await showNextAdmissionNumber();

      toast(
        "Data refreshed"
      );
    };
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderOverview() {

  const paid =
    students.reduce(
      (sum, student) =>
        sum +
        Number(
          student.paid || 0
        ),
      0
    );


  const total =
    students.reduce(
      (sum, student) =>
        sum +
        Number(
          student.total_fees || 0
        ),
      0
    );


  const due =
    Math.max(
      0,
      total - paid
    );


  const percentage =
    total > 0
      ? Math.round(
          paid / total * 100
        )
      : 0;


  if ($("statStudents")) {
    $("statStudents").textContent =
      students.length;
  }


  if ($("statPaid")) {
    $("statPaid").textContent =
      money(paid);
  }


  if ($("statDue")) {
    $("statDue").textContent =
      money(due);
  }


  if ($("statPosts")) {

    $("statPosts").textContent =
      posts.filter(
        post => post.published
      ).length;
  }


  if ($("feePercent")) {
    $("feePercent").textContent =
      percentage + "%";
  }


  if ($("feeBar")) {
    $("feeBar").style.width =
      percentage + "%";
  }


  if ($("paidMini")) {
    $("paidMini").textContent =
      money(paid);
  }


  if ($("dueMini")) {
    $("dueMini").textContent =
      money(due);
  }


  if (!$("recentAdmissions")) {
    return;
  }


  const recent =
    students.slice(0, 6);


  if (!recent.length) {

    $("recentAdmissions").innerHTML = `
      <div class="empty">
        No students registered yet.
      </div>
    `;

    return;
  }


  $("recentAdmissions").innerHTML = `

    <div class="table-wrap">

      <table>

        <thead>

          <tr>
            <th>Admission</th>
            <th>Student</th>
            <th>Course</th>
            <th>Due</th>
          </tr>

        </thead>

        <tbody>

          ${recent.map(student => `

            <tr>

              <td>
                ${esc(
                  student.admission_no ||
                  "—"
                )}
              </td>

              <td>
                ${esc(
                  student.name
                )}
              </td>

              <td>
                ${esc(
                  student.course
                )}
              </td>

              <td>
                ${money(
                  student.due_amount
                )}
              </td>

            </tr>

          `).join("")}

        </tbody>

      </table>

    </div>
  `;
}


/* =========================================================
   STUDENTS
   ========================================================= */

function renderStudents() {

  if (!$("studentsTable")) {
    return;
  }


  const query =
    (
      $("studentSearch")?.value ||
      ""
    )
      .toLowerCase()
      .trim();


  const rows =
    students.filter(student => {

      const text =
        [
          student.name,
          student.admission_no,
          student.username,
          student.contact,
          student.course
        ]
          .join(" ")
          .toLowerCase();


      return text.includes(query);
    });


  if (!rows.length) {

    $("studentsTable").innerHTML = `

      <tr>

        <td
          colspan="10"
          class="empty"
        >
          No students found.
        </td>

      </tr>

    `;

    return;
  }


  $("studentsTable").innerHTML =
    rows.map(student => `

      <tr>

        <td>
          <strong>
            ${esc(
              student.admission_no ||
              "—"
            )}
          </strong>
        </td>

        <td>
          ${esc(
            student.name
          )}
        </td>

        <td>
          ${esc(
            student.username ||
            "—"
          )}
        </td>

        <td>
          ${esc(
            student.contact
          )}
        </td>

        <td>
          ${esc(
            student.course
          )}
        </td>

        <td>
          ${money(
            student.total_fees
          )}
        </td>

        <td>
          ${money(
            student.paid
          )}
        </td>

        <td>
          ${money(
            student.due_amount
          )}
        </td>

        <td>
          ${esc(
            student.certificate_status ||
            "Not Eligible"
          )}
        </td>

        <td>

          <button
            class="btn secondary"
            onclick="
              editStudent('${student.id}')
            "
          >
            Edit
          </button>

          <button
            class="btn danger"
            onclick="
              deleteStudent('${student.id}')
            "
          >
            Delete
          </button>

        </td>

      </tr>

    `).join("");
}


if ($("studentSearch")) {

  $("studentSearch").oninput =
    renderStudents;
}


/* =========================================================
   FEES
   ========================================================= */

function renderFees() {

  if (!$("feesTable")) {
    return;
  }


  const query =
    (
      $("feeSearch")?.value ||
      ""
    )
      .toLowerCase()
      .trim();


  const filter =
    $("feeFilter")?.value ||
    "all";


  let rows =
    students.filter(student => {

      const text =
        [
          student.name,
          student.admission_no,
          student.course
        ]
          .join(" ")
          .toLowerCase();


      return text.includes(query);
    });


  if (filter === "due") {

    rows =
      rows.filter(
        student =>
          Number(
            student.due_amount || 0
          ) > 0
      );
  }


  if (filter === "paid") {

    rows =
      rows.filter(
        student =>
          Number(
            student.due_amount || 0
          ) <= 0
      );
  }


  if (!rows.length) {

    $("feesTable").innerHTML = `

      <tr>

        <td
          colspan="8"
          class="empty"
        >
          No fee records.
        </td>

      </tr>

    `;

    return;
  }


  $("feesTable").innerHTML =
    rows.map(student => {

      const total =
        Number(
          student.total_fees || 0
        );

      const paid =
        Number(
          student.paid || 0
        );


      const percent =
        total > 0
          ? Math.min(
              100,
              Math.round(
                paid /
                total *
                100
              )
            )
          : 0;


      return `

        <tr>

          <td>
            ${esc(
              student.admission_no ||
              "—"
            )}
          </td>

          <td>
            ${esc(
              student.name
            )}
          </td>

          <td>
            ${esc(
              student.course
            )}
          </td>

          <td>
            ${money(total)}
          </td>

          <td>
            ${money(paid)}
          </td>

          <td>
            ${money(
              student.due_amount
            )}
          </td>

          <td>

            <div class="progress">

              <i
                style="
                  width:${percent}%
                "
              ></i>

            </div>

          </td>

          <td>

            <button
              class="btn primary"
              onclick="
                recordPayment('${student.id}')
              "
            >
              Update
            </button>

          </td>

        </tr>

      `;
    }).join("");
}


if ($("feeSearch")) {
  $("feeSearch").oninput =
    renderFees;
}


if ($("feeFilter")) {
  $("feeFilter").onchange =
    renderFees;
}


/* =========================================================
   FEE CALCULATOR
   ========================================================= */

function updateDue() {

  const total =
    Number(
      $("totalFees")?.value ||
      0
    );


  const paid =
    Math.min(
      total,
      Math.max(
        0,
        Number(
          $("feesPaid")?.value ||
          0
        )
      )
    );


  const due =
    Math.max(
      0,
      total - paid
    );


  if ($("dueAmount")) {

    $("dueAmount").value =
      money(due);
  }


  if ($("paymentStatus")) {

    $("paymentStatus").value =
      due === 0
        ? "Paid"
        : paid > 0
          ? "Partial"
          : "Pending";
  }
}


if ($("totalFees")) {
  $("totalFees").oninput =
    updateDue;
}


if ($("feesPaid")) {
  $("feesPaid").oninput =
    updateDue;
}


/* =========================================================
   PHOTO
   ========================================================= */

if ($("photo")) {

  $("photo").onchange =
    event => {

      photoFile =
        event.target.files[0] ||
        null;


      if (!photoFile) {
        return;
      }


      if (
        photoFile.size >
        2 * 1024 * 1024
      ) {

        photoFile = null;

        event.target.value = "";

        toast(
          "Photo must be under 2 MB."
        );

        return;
      }


      if ($("photoPreview")) {

        $("photoPreview").src =
          URL.createObjectURL(
            photoFile
          );

        $("photoPreview").style.display =
          "block";
      }
    };
}


/* =========================================================
   PHOTO UPLOAD
   ========================================================= */

async function uploadPhoto(
  file,
  admissionNo
) {

  if (!file) {
    return null;
  }


  const extension =
    file.name
      .split(".")
      .pop()
      .toLowerCase();


  const path =
    `students/${admissionNo}-${crypto.randomUUID()}.${extension}`;


  const {
    error
  } =
    await SB()
      .storage
      .from("student-photos")
      .upload(
        path,
        file,
        {
          contentType:
            file.type,
          upsert: false
        }
      );


  if (error) {
    throw error;
  }


  return path;
}


/* =========================================================
   RESET ADMISSION
   ========================================================= */

/*
  IMPORTANT:
  We DO NOT clear admissionNo here.
*/

function resetAdmission() {

  if ($("regDate")) {

    $("regDate").value =
      new Date()
        .toISOString()
        .slice(0, 10);
  }


  if ($("dueAmount")) {
    $("dueAmount").value =
      "₹0";
  }


  if ($("paymentStatus")) {
    $("paymentStatus").value =
      "Pending";
  }


  if ($("photoPreview")) {

    $("photoPreview").style.display =
      "none";

    $("photoPreview").src = "";
  }


  if ($("photo")) {
    $("photo").value = "";
  }


  photoFile = null;
}


/* =========================================================
   RESET BUTTON
   ========================================================= */

if ($("resetAdmission")) {

  $("resetAdmission").onclick =
    async event => {

      /*
        Prevent browser's default reset
        because we want a NEW admission number.
      */

      event.preventDefault();


      resetAdmission();


      await showNextAdmissionNumber();


      toast(
        "New registration number generated"
      );
    };
}


/* =========================================================
   STUDENT REGISTRATION
   ========================================================= */

if ($("admissionForm")) {

  $("admissionForm").onsubmit =
    async event => {

      event.preventDefault();


      const button =
        $("registerBtn");


      if (button) {

        button.disabled =
          true;

        button.textContent =
          "Creating account...";
      }


      try {

        /*
          ALWAYS generate a fresh number
          immediately before registration.
        */

        const admissionNo =
          await showNextAdmissionNumber();


        if (!admissionNo) {

          throw new Error(
            "Could not generate registration number."
          );
        }


        /*
          Build payload.
        */

        const payload = {

          admission_no:
            admissionNo,

          registration_date:
            $("regDate")?.value ||
            new Date()
              .toISOString()
              .slice(0, 10),

          name:
            $("studentName")?.value
              .trim() || "",

          father_name:
            $("fatherName")?.value
              .trim() || "",

          contact:
            $("contact")?.value
              .trim() || "",

          email:
            $("studentEmail")?.value
              .trim() || null,

          class_level:
            $("classLevel")?.value
              .trim() || "",

          batch:
            $("batch")?.value || "",

          course:
            $("course")?.value || "",

          duration:
            $("duration")?.value || "",

          address:
            $("address")?.value
              .trim() || "",

          total_fees:
            Number(
              $("totalFees")?.value ||
              0
            ),

          paid:
            Number(
              $("feesPaid")?.value ||
              0
            ),

          certificate_status:
            $("certificate")?.value ||
            "Not Eligible"
        };


        payload.due_amount =
          Math.max(
            0,
            payload.total_fees -
            payload.paid
          );


        payload.payment_status =
          payload.due_amount === 0
            ? "Paid"
            : payload.paid > 0
              ? "Partial"
              : "Pending";


        /*
          Upload student photo.
        */

        if (photoFile) {

          payload.photo_path =
            await uploadPhoto(
              photoFile,
              admissionNo
            );
        }


        console.log(
          "Sending registration:",
          payload
        );


        /*
          Create student through Edge Function.
        */

        const {
          data,
          error
        } =
          await SB()
            .functions
            .invoke(
              "create-student",
              {
                body: payload
              }
            );


        if (error) {
          throw error;
        }


        if (data?.error) {

          throw new Error(
            data.error
          );
        }


        if (
          !data?.username ||
          !data?.temporary_password
        ) {

          throw new Error(
            "Student was created but credentials were not returned."
          );
        }


        /*
          Save result.
        */

        registrationResult = {

          ...payload,

          username:
            data.username,

          temporary_password:
            data.temporary_password
        };


        /*
          Show credentials.
        */

        if ($("generatedUsername")) {

          $("generatedUsername")
            .textContent =
            data.username;
        }


        if ($("generatedPassword")) {

          $("generatedPassword")
            .textContent =
            data.temporary_password;
        }


        if ($("credentialModal")) {

          $("credentialModal")
            .classList.add("open");
        }


        /*
          Clear student information,
          but DON'T erase admission number.
        */

        event.target.reset();


        resetAdmission();


        /*
          Generate the NEXT number.
        */

        await showNextAdmissionNumber();


        /*
          Reload students.
        */

        try {

          await refreshAll();

        } catch (refreshError) {

          console.warn(
            "Refresh after registration failed:",
            refreshError
          );
        }


        toast(
          `Student registered successfully. Admission No: ${admissionNo}`
        );


      } catch (error) {

        console.error(
          "Registration failed:",
          error
        );


        toast(
          error.message ||
          "Registration failed"
        );


      } finally {

        if (button) {

          button.disabled =
            false;

          button.textContent =
            "✓ Complete Registration";
        }
      }
    };
}


/* =========================================================
   PAYMENT UPDATE
   ========================================================= */

async function recordPayment(id) {

  const student =
    students.find(
      item => item.id === id
    );


  if (!student) {
    return;
  }


  const value =
    prompt(
      `Enter total amount paid by ${student.name}:`,
      student.paid || 0
    );


  if (value === null) {
    return;
  }


  const paid =
    Number(value);


  const total =
    Number(
      student.total_fees || 0
    );


  if (
    !Number.isFinite(paid) ||
    paid < 0 ||
    paid > total
  ) {

    toast(
      "Enter a valid payment amount."
    );

    return;
  }


  const due =
    Math.max(
      0,
      total - paid
    );


  const {
    error
  } =
    await SB()
      .from("students")
      .update({

        paid,

        due_amount:
          due,

        payment_status:
          due === 0
            ? "Paid"
            : paid > 0
              ? "Partial"
              : "Pending"

      })
      .eq(
        "id",
        id
      );


  if (error) {

    toast(
      error.message
    );

    return;
  }


  await refreshAll();

  toast(
    "Payment updated"
  );
}


/* =========================================================
   CERTIFICATE
   ========================================================= */

function renderCertificates() {

  if (!$("certTable")) {
    return;
  }


  if (!students.length) {

    $("certTable").innerHTML = `

      <tr>

        <td
          colspan="5"
          class="empty"
        >
          No students registered.
        </td>

      </tr>

    `;

    return;
  }


  $("certTable").innerHTML =
    students.map(student => `

      <tr>

        <td>
          ${esc(
            student.admission_no ||
            "—"
          )}
        </td>

        <td>
          ${esc(
            student.name
          )}
        </td>

        <td>
          ${esc(
            student.course
          )}
        </td>

        <td>
          ${esc(
            student.certificate_status ||
            "Not Eligible"
          )}
        </td>

        <td>

          <select
            onchange="
              setCertificate(
                '${student.id}',
                this.value
              )
            "
          >

            <option
              ${
                student.certificate_status ===
                "Not Eligible"
                  ? "selected"
                  : ""
              }
            >
              Not Eligible
            </option>

            <option
              ${
                student.certificate_status ===
                "Pending"
                  ? "selected"
                  : ""
              }
            >
              Pending
            </option>

            <option
              ${
                student.certificate_status ===
                "Issued"
                  ? "selected"
                  : ""
              }
            >
              Issued
            </option>

          </select>

        </td>

      </tr>

    `).join("");
}


async function setCertificate(
  id,
  status
) {

  const {
    error
  } =
    await SB()
      .from("students")
      .update({
        certificate_status:
          status
      })
      .eq(
        "id",
        id
      );


  if (error) {

    toast(
      error.message
    );

    return;
  }


  await refreshAll();

  toast(
    "Certificate status updated"
  );
}


/* =========================================================
   ID CARD
   ========================================================= */

function renderIdSelect() {

  if (!$("idStudentSelect")) {
    return;
  }


  $("idStudentSelect").innerHTML =
    `
      <option value="">
        Select student
      </option>
    ` +
    students.map(student => `

      <option
        value="${student.id}"
      >
        ${esc(
          student.admission_no ||
          "—"
        )}
        —
        ${esc(
          student.name
        )}
      </option>

    `).join("");


  $("idStudentSelect").onchange =
    () => {

      selectedStudent =
        students.find(
          student =>
            student.id ===
            $("idStudentSelect").value
        ) || null;


      renderIdCard();
    };
}


async function getPhotoUrl(path) {

  if (!path) {
    return "";
  }


  try {

    const {
      data,
      error
    } =
      await SB()
        .storage
        .from("student-photos")
        .createSignedUrl(
          path,
          3600
        );


    if (error) {
      return "";
    }


    return data?.signedUrl || "";

  } catch {

    return "";
  }
}


async function renderIdCard() {

  const target =
    $("idCardPreview");


  if (!target) {
    return;
  }


  if (!selectedStudent) {

    target.innerHTML = `

      <div class="empty">
        Select a student to preview
        the ID card.
      </div>

    `;

    return;
  }


  const photo =
    await getPhotoUrl(
      selectedStudent.photo_path
    );


  target.innerHTML = `

    <div
      id="idCardCanvas"
      class="id-card-modern"
    >

      <div class="id-top">

        <img
          src="logo.png"
          alt="TeraByte"
        >

        <h3>
          TeraByte Computer Academy
        </h3>

        <p>
          LEARN • GROW • SUCCEED
        </p>

      </div>


      ${
        photo
          ? `
            <img
              class="id-photo"
              src="${esc(photo)}"
              alt="Student"
            >
          `
          : ""
      }


      <div class="id-content">

        <h2>
          ${esc(
            selectedStudent.name
          )}
        </h2>

        <div class="id-reg">
          ${esc(
            selectedStudent.admission_no ||
            "—"
          )}
        </div>

        <div class="id-row">
          <span>Course</span>
          <strong>
            ${esc(
              selectedStudent.course
            )}
          </strong>
        </div>

        <div class="id-row">
          <span>Class</span>
          <strong>
            ${esc(
              selectedStudent.class_level ||
              "—"
            )}
          </strong>
        </div>

        <div class="id-row">
          <span>Batch</span>
          <strong>
            ${esc(
              selectedStudent.batch ||
              "—"
            )}
          </strong>
        </div>

        <div class="id-row">
          <span>Contact</span>
          <strong>
            ${esc(
              selectedStudent.contact
            )}
          </strong>
        </div>

      </div>

      <div class="id-footer">
        PROPERTY OF TERABYTE COMPUTER ACADEMY
      </div>

    </div>

  `;
}


if ($("downloadId")) {

  $("downloadId").onclick =
    async () => {

      if (!selectedStudent) {

        toast(
          "Select a student first."
        );

        return;
      }


      const canvasElement =
        $("idCardCanvas");


      if (!canvasElement) {

        toast(
          "ID card is not ready."
        );

        return;
      }


      const canvas =
        await html2canvas(
          canvasElement,
          {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff"
          }
        );


      const link =
        document.createElement("a");


      link.download =
        `${
          selectedStudent.admission_no ||
          "student"
        }_ID_Card.jpg`;


      link.href =
        canvas.toDataURL(
          "image/jpeg",
          0.95
        );


      link.click();
    };
}


/* =========================================================
   EDIT STUDENT
   ========================================================= */

function editStudent(id) {

  const student =
    students.find(
      item => item.id === id
    );


  if (!student) {
    return;
  }


  $("editId").value =
    id;

  $("editName").value =
    student.name || "";

  $("editFather").value =
    student.father_name || "";

  $("editContact").value =
    student.contact || "";

  $("editEmail").value =
    student.email || "";

  $("editClass").value =
    student.class_level || "";

  $("editCourse").value =
    student.course || "";

  $("editTotal").value =
    student.total_fees || 0;

  $("editPaid").value =
    student.paid || 0;

  $("editCert").value =
    student.certificate_status ||
    "Not Eligible";


  if ($("modal")) {
    $("modal").classList.add("open");
  }
}


if ($("editForm")) {

  $("editForm").onsubmit =
    async event => {

      event.preventDefault();


      const id =
        $("editId").value;


      const total =
        Number(
          $("editTotal").value || 0
        );


      const paid =
        Math.min(
          total,
          Math.max(
            0,
            Number(
              $("editPaid").value || 0
            )
          )
        );


      const due =
        Math.max(
          0,
          total - paid
        );


      const {
        error
      } =
        await SB()
          .from("students")
          .update({

            name:
              $("editName")
                .value
                .trim(),

            father_name:
              $("editFather")
                .value
                .trim(),

            contact:
              $("editContact")
                .value
                .trim(),

            email:
              $("editEmail")
                .value
                .trim() ||
              null,

            class_level:
              $("editClass")
                .value
                .trim(),

            course:
              $("editCourse")
                .value,

            total_fees:
              total,

            paid:
              paid,

            due_amount:
              due,

            payment_status:
              due === 0
                ? "Paid"
                : paid > 0
                  ? "Partial"
                  : "Pending",

            certificate_status:
              $("editCert")
                .value

          })
          .eq(
            "id",
            id
          );


      if (error) {

        toast(
          error.message
        );

        return;
      }


      if ($("modal")) {
        $("modal")
          .classList
          .remove("open");
      }


      await refreshAll();

      toast(
        "Student updated"
      );
    };
}


/* =========================================================
   DELETE STUDENT
   ========================================================= */

async function deleteStudent(id) {

  if (
    !confirm(
      "Delete this student record and permanently disable the student portal account?"
    )
  ) {
    return;
  }


  const {
    data,
    error
  } =
    await SB()
      .functions
      .invoke(
        "delete-student",
        {
          body: {
            id
          }
        }
      );


  if (error) {

    toast(
      error.message
    );

    return;
  }


  if (data?.error) {

    toast(
      data.error
    );

    return;
  }


  await refreshAll();

  toast(
    "Student deleted"
  );
}


window.editStudent =
  editStudent;

window.deleteStudent =
  deleteStudent;

window.recordPayment =
  recordPayment;

window.setCertificate =
  setCertificate;


/* =========================================================
   MODALS
   ========================================================= */

if ($("closeModal")) {

  $("closeModal").onclick =
    () => {

      $("modal")
        ?.classList
        .remove("open");
    };
}


if ($("cancelEdit")) {

  $("cancelEdit").onclick =
    () => {

      $("modal")
        ?.classList
        .remove("open");
    };
}


if ($("closeCredential")) {

  $("closeCredential").onclick =
    () => {

      $("credentialModal")
        ?.classList
        .remove("open");
    };
}


/* =========================================================
   CREDENTIAL COPY
   ========================================================= */

if ($("copyCredentials")) {

  $("copyCredentials").onclick =
    async () => {

      if (!registrationResult) {
        return;
      }


      const text =

`TeraByte Computer Academy

Registration No: ${registrationResult.admission_no}
Username: ${registrationResult.username}
Temporary Password: ${registrationResult.temporary_password}`;


      try {

        await navigator
          .clipboard
          .writeText(text);


        toast(
          "Credentials copied"
        );

      } catch {

        toast(
          "Could not copy credentials."
        );
      }
    };
}


/* =========================================================
   REGISTRATION DOWNLOAD
   ========================================================= */

if ($("downloadRegistration")) {

  $("downloadRegistration").onclick =
    async () => {

      if (!registrationResult) {
        return;
      }


      const wrapper =
        document.createElement("div");


      wrapper.style.position =
        "fixed";

      wrapper.style.left =
        "-10000px";

      wrapper.style.top =
        "0";

      wrapper.style.width =
        "900px";

      wrapper.style.background =
        "#ffffff";

      wrapper.style.padding =
        "40px";


      wrapper.innerHTML = `

        <div>

          <div
            style="
              display:flex;
              align-items:center;
              gap:20px;
              border-bottom:2px solid #111;
              padding-bottom:20px;
              margin-bottom:25px;
            "
          >

            <img
              src="logo.png"
              style="
                width:90px;
                height:90px;
                object-fit:contain;
              "
            >

            <div>

              <h1>
                TeraByte Computer Academy
              </h1>

              <p>
                OFFICIAL STUDENT REGISTRATION RECORD
              </p>

            </div>

          </div>


          <h2>
            ${esc(
              registrationResult.name
            )}
          </h2>


          <p>
            <strong>
              Admission Number:
            </strong>

            ${esc(
              registrationResult.admission_no
            )}
          </p>


          <p>
            <strong>
              Registration Date:
            </strong>

            ${esc(
              registrationResult.registration_date
            )}
          </p>


          <p>
            <strong>
              Father's / Guardian Name:
            </strong>

            ${esc(
              registrationResult.father_name
            )}
          </p>


          <p>
            <strong>
              Contact:
            </strong>

            ${esc(
              registrationResult.contact
            )}
          </p>


          <p>
            <strong>
              Course:
            </strong>

            ${esc(
              registrationResult.course
            )}
          </p>


          <p>
            <strong>
              Batch:
            </strong>

            ${esc(
              registrationResult.batch
            )}
          </p>


          <p>
            <strong>
              Duration:
            </strong>

            ${esc(
              registrationResult.duration
            )}
          </p>


          <p>
            <strong>
              Total Fees:
            </strong>

            ${money(
              registrationResult.total_fees
            )}
          </p>


          <p>
            <strong>
              Fees Paid:
            </strong>

            ${money(
              registrationResult.paid
            )}
          </p>


          <p>
            <strong>
              Due:
            </strong>

            ${money(
              registrationResult.due_amount
            )}
          </p>


          <p>
            <strong>
              Portal Username:
            </strong>

            ${esc(
              registrationResult.username
            )}
          </p>

        </div>

      `;


      document.body.appendChild(
        wrapper
      );


      const canvas =
        await html2canvas(
          wrapper,
          {
            scale: 2,
            useCORS: true,
            backgroundColor:
              "#ffffff"
          }
        );


      const link =
        document.createElement("a");


      link.download =
        `${
          registrationResult.admission_no
        }_Registration.jpg`;


      link.href =
        canvas.toDataURL(
          "image/jpeg",
          0.95
        );


      link.click();


      wrapper.remove();
    };
}


/* =========================================================
   POSTS
   ========================================================= */

if ($("postForm")) {

  $("postForm").onsubmit =
    async event => {

      event.preventDefault();


      const {
        error
      } =
        await SB()
          .from("posts")
          .insert({

            title:
              $("postTitle")
                .value
                .trim(),

            content:
              $("postContent")
                .value
                .trim(),

            published:
              $("postPublished")
                .checked,

            author_id:
              currentUser.id

          });


      if (error) {

        toast(
          error.message
        );

        return;
      }


      event.target.reset();

      $("postPublished").checked =
        true;


      await refreshAll();

      toast(
        "Post published"
      );
    };
}


function renderPosts() {

  if (!$("postsList")) {
    return;
  }


  if (!posts.length) {

    $("postsList").innerHTML = `

      <div class="empty">
        No posts yet.
      </div>

    `;

    return;
  }


  $("postsList").innerHTML =
    posts.map(post => `

      <article
        class="post-item"
      >

        <div class="post-meta">

          <span>
            ${
              post.published
                ? "PUBLISHED"
                : "DRAFT"
            }
          </span>

          <span>
            ${new Date(
              post.created_at
            ).toLocaleString(
              "en-IN"
            )}
          </span>

        </div>


        <h3>
          ${esc(
            post.title
          )}
        </h3>


        <p>
          ${esc(
            post.content
          ).replace(
            /\n/g,
            "<br>"
          )}
        </p>


        <button
          class="btn primary"
          onclick="
            togglePost(
              '${post.id}',
              ${!post.published}
            )
          "
        >
          ${
            post.published
              ? "Unpublish"
              : "Publish"
          }
        </button>


        <button
          class="btn danger"
          onclick="
            deletePost(
              '${post.id}'
            )
          "
        >
          Delete
        </button>

      </article>

    `).join("");
}


async function togglePost(
  id,
  published
) {

  const {
    error
  } =
    await SB()
      .from("posts")
      .update({
        published
      })
      .eq(
        "id",
        id
      );


  if (error) {

    toast(
      error.message
    );

    return;
  }


  await refreshAll();

  toast(
    published
      ? "Post published"
      : "Post unpublished"
  );
}


async function deletePost(id) {

  if (
    !confirm(
      "Delete this post?"
    )
  ) {
    return;
  }


  const {
    error
  } =
    await SB()
      .from("posts")
      .delete()
      .eq(
        "id",
        id
      );


  if (error) {

    toast(
      error.message
    );

    return;
  }


  await refreshAll();

  toast(
    "Post deleted"
  );
}


window.togglePost =
  togglePost;

window.deletePost =
  deletePost;


/* =========================================================
   MESSAGES
   ========================================================= */

function populateRecipients() {

  if (!$("messageRecipient")) {
    return;
  }


  $("messageRecipient").innerHTML =

    `<option value="all">
      All Students
    </option>` +

    students.map(student => `

      <option
        value="${student.user_id}"
      >
        ${esc(
          student.name
        )}
        —
        ${esc(
          student.admission_no ||
          "—"
        )}
      </option>

    `).join("");
}


if ($("messageForm")) {

  $("messageForm").onsubmit =
    async event => {

      event.preventDefault();


      const recipient =
        $("messageRecipient")
          .value;


      const {
        error
      } =
        await SB()
          .from("messages")
          .insert({

            recipient_user_id:
              recipient === "all"
                ? null
                : recipient,

            subject:
              $("messageSubject")
                .value
                .trim(),

            body:
              $("messageBody")
                .value
                .trim(),

            sender_id:
              currentUser.id

          });


      if (error) {

        toast(
          error.message
        );

        return;
      }


      event.target.reset();

      await refreshAll();

      toast(
        "Message sent"
      );
    };
}


function renderMessages() {

  if (!$("messagesList")) {
    return;
  }


  if (!messages.length) {

    $("messagesList").innerHTML = `

      <div class="empty">
        No messages sent yet.
      </div>

    `;

    return;
  }


  $("messagesList").innerHTML =
    messages.map(message => `

      <article
        class="message-item"
      >

        <div class="post-meta">

          <span>
            ${
              message.recipient_user_id
                ? "PRIVATE"
                : "ALL STUDENTS"
            }
          </span>

          <span>
            ${new Date(
              message.created_at
            ).toLocaleString(
              "en-IN"
            )}
          </span>

        </div>


        <h3>
          ${esc(
            message.subject
          )}
        </h3>


        <p>
          ${esc(
            message.body
          ).replace(
            /\n/g,
            "<br>"
          )}
        </p>

      </article>

    `).join("");
}


/* =========================================================
   START APPLICATION
   ========================================================= */

(async function startApplication() {

  try {

    /*
      Authenticate first.
    */

    const authenticated =
      await init();


    if (!authenticated) {
      return;
    }


    /*
      IMPORTANT:
      Generate registration number FIRST.

      This happens before refreshAll().
    */

    if ($("regDate")) {

      $("regDate").value =
        new Date()
          .toISOString()
          .slice(0, 10);
    }


    await showNextAdmissionNumber();


    /*
      Now load all other dashboard data.
    */

    await refreshAll();


    /*
      Make sure the number wasn't lost.
    */

    if (
      $("admissionNo") &&
      !$("admissionNo").value
    ) {

      await showNextAdmissionNumber();
    }


    console.log(
      "TeraByte Admin Portal initialized successfully."
    );


  } catch (error) {

    console.error(
      "Application startup error:",
      error
    );


    /*
      Even if some database operation fails,
      try to display a registration number.
    */

    try {

      await showNextAdmissionNumber();

    } catch (numberError) {

      console.error(
        numberError
      );
    }


    toast(
      error.message ||
      "Some dashboard data could not be loaded."
    );
  }

})();
