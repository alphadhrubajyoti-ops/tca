let currentUser = null;
let students = [];
let posts = [];
let messages = [];
let selectedStudent = null;
let registrationResult = null;

const $ = id => document.getElementById(id);

const money = n =>
  '₹' + Number(n || 0).toLocaleString('en-IN');

const esc = s =>
  String(s ?? '').replace(/[&<>'"]/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[c]));

function toast(msg) {
  const el = $('toast');

  if (!el) {
    console.log(msg);
    return;
  }

  el.textContent = msg;
  el.classList.remove('hidden');

  clearTimeout(window.__toast);

  window.__toast = setTimeout(() => {
    el.classList.add('hidden');
  }, 3000);
}


/* =========================================================
   REGISTRATION NUMBER
   ========================================================= */

async function nextAdmission() {

  /*
    First try the Supabase RPC function.
  */

  try {

    const { data, error } =
      await SB().rpc('next_admission_no');

    if (!error && data) {
      return String(data);
    }

    console.warn(
      'RPC next_admission_no failed:',
      error
    );

  } catch (error) {

    console.warn(
      'RPC registration number failed:',
      error
    );
  }


  /*
    Fallback:
    Read the latest student admission number.
  */

  try {

    const { data, error } = await SB()
      .from('students')
      .select('admission_no')
      .not('admission_no', 'is', null)
      .order('created_at', {
        ascending: false
      })
      .limit(100);

    if (error) {
      throw error;
    }

    let highest = 0;

    (data || []).forEach(student => {

      const value =
        String(student.admission_no || '');

      /*
        Accept formats such as:

        TCA00001
        TCA260001
        00001
        260001
      */

      const numbers =
        value.match(/\d+/g);

      if (!numbers || !numbers.length) {
        return;
      }

      const number =
        parseInt(
          numbers[numbers.length - 1],
          10
        );

      if (Number.isFinite(number)) {

        /*
          For TCA260001, use the final numeric part.
        */

        highest =
          Math.max(highest, number);
      }
    });


    /*
      Generate a simple reliable number.
    */

    const next =
      highest + 1;

    return (
      'TCA' +
      String(next).padStart(5, '0')
    );

  } catch (error) {

    console.error(
      'Fallback registration number failed:',
      error
    );

    /*
      Last-resort temporary number.
      This guarantees the form does not stay blank.
    */

    const random =
      Math.floor(
        10000 + Math.random() * 90000
      );

    return `TCA${random}`;
  }
}


/* =========================================================
   INITIALIZATION
   ========================================================= */

async function init() {

  currentUser =
    await requireRole('staff');

  if (!currentUser) {
    return false;
  }


  const name =
    currentUser.user_metadata?.name ||
    currentUser.email?.split('@')[0] ||
    'Admin';


  if ($('adminName')) {
    $('adminName').textContent = name;
  }

  if ($('adminAvatar')) {
    $('adminAvatar').textContent =
      (name[0] || 'A').toUpperCase();
  }

  const userSpan =
    document.querySelector('.user span');

  if (userSpan) {

    userSpan.textContent =
      (
        currentUser.user_metadata?.role ||
        'admin'
      ).toUpperCase();
  }


  return true;
}


/* =========================================================
   LOAD DATABASE
   ========================================================= */

async function refreshAll() {

  try {

    const [
      studentsResponse,
      postsResponse,
      messagesResponse
    ] = await Promise.all([

      SB()
        .from('students')
        .select('*')
        .order('created_at', {
          ascending: false
        }),

      SB()
        .from('posts')
        .select('*')
        .order('created_at', {
          ascending: false
        }),

      SB()
        .from('messages')
        .select('*')
        .order('created_at', {
          ascending: false
        })
        .limit(50)

    ]);


    if (studentsResponse.error) {
      throw studentsResponse.error;
    }

    /*
      Don't let a posts/messages problem
      prevent the student system from loading.
    */

    if (postsResponse.error) {

      console.warn(
        'Posts loading failed:',
        postsResponse.error
      );
    }

    if (messagesResponse.error) {

      console.warn(
        'Messages loading failed:',
        messagesResponse.error
      );
    }


    students =
      studentsResponse.data || [];

    posts =
      postsResponse.error
        ? []
        : (postsResponse.data || []);

    messages =
      messagesResponse.error
        ? []
        : (messagesResponse.data || []);


    renderOverview();
    renderStudents();
    renderFees();
    renderCertificates();
    renderIdSelect();
    renderPosts();
    renderMessages();
    populateRecipients();


  } catch (error) {

    console.error(
      'Database refresh error:',
      error
    );

    /*
      Don't destroy the registration page.
    */

    renderOverview();
    renderStudents();
    renderFees();
    renderCertificates();
    renderIdSelect();
    renderPosts();
    renderMessages();
    populateRecipients();

    throw error;
  }
}


/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

function showPage(id) {

  document
    .querySelectorAll('.module')
    .forEach(x =>
      x.classList.remove('active')
    );

  const page = $(id);

  if (page) {
    page.classList.add('active');
  }


  document
    .querySelectorAll('.nav button')
    .forEach(x =>
      x.classList.toggle(
        'active',
        x.dataset.page === id
      )
    );


  const names = {

    overview: [
      'Dashboard',
      'Academy overview and daily operations'
    ],

    students: [
      'Student Records',
      'Search and manage registered students'
    ],

    admission: [
      'New Admission',
      'Register a student and create portal credentials'
    ],

    fees: [
      'Fees & Dues',
      'Monitor payments and outstanding balances'
    ],

    certificates: [
      'Certificates',
      'Manage certificate status'
    ],

    idcard: [
      'ID Card',
      'Generate and download student identity cards'
    ],

    posts: [
      'Blog & Notices',
      'Publish content for student portals'
    ],

    messages: [
      'Messages',
      'Send private or academy-wide messages'
    ],

    settings: [
      'Settings',
      'System and security configuration'
    ]

  };


  if (names[id]) {

    if ($('pageTitle')) {
      $('pageTitle').textContent =
        names[id][0];
    }

    if ($('pageSub')) {
      $('pageSub').textContent =
        names[id][1];
    }
  }


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}


/* =========================================================
   NAVIGATION EVENTS
   ========================================================= */

document
  .querySelectorAll('[data-page]')
  .forEach(button => {

    button.onclick = () =>
      showPage(button.dataset.page);
  });


document
  .querySelectorAll('[data-page-jump]')
  .forEach(button => {

    button.onclick = () =>
      showPage(button.dataset.pageJump);
  });


if ($('logoutBtn')) {
  $('logoutBtn').onclick = logout;
}


if ($('refresh')) {

  $('refresh').onclick = async () => {

    try {

      await refreshAll();

      toast(
        'Data refreshed from database'
      );

    } catch (error) {

      toast(
        error.message ||
        'Unable to refresh data'
      );
    }
  };
}


/* =========================================================
   DASHBOARD
   ========================================================= */

function renderOverview() {

  const paid =
    students.reduce(
      (a, s) =>
        a + Number(s.paid || 0),
      0
    );


  const total =
    students.reduce(
      (a, s) =>
        a + Number(s.total_fees || 0),
      0
    );


  const due =
    Math.max(
      0,
      total - paid
    );


  const pct =
    total
      ? Math.round(
          paid / total * 100
        )
      : 0;


  if ($('statStudents')) {
    $('statStudents').textContent =
      students.length;
  }

  if ($('statPaid')) {
    $('statPaid').textContent =
      money(paid);
  }

  if ($('statDue')) {
    $('statDue').textContent =
      money(due);
  }

  if ($('statPosts')) {
    $('statPosts').textContent =
      posts.filter(
        p => p.published
      ).length;
  }

  if ($('feePercent')) {
    $('feePercent').textContent =
      pct + '%';
  }

  if ($('feeBar')) {
    $('feeBar').style.width =
      pct + '%';
  }

  if ($('paidMini')) {
    $('paidMini').textContent =
      money(paid);
  }

  if ($('dueMini')) {
    $('dueMini').textContent =
      money(due);
  }


  const recent =
    students.slice(0, 6);


  if (!$('recentAdmissions')) {
    return;
  }


  $('recentAdmissions').innerHTML =
    recent.length

      ? `
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Course</th>
                <th>Date</th>
                <th>Due</th>
              </tr>
            </thead>

            <tbody>

              ${recent.map(s => `

                <tr>

                  <td>
                    ${esc(s.name)}
                  </td>

                  <td>
                    ${esc(s.course)}
                  </td>

                  <td>
                    ${esc(
                      s.registration_date
                    )}
                  </td>

                  <td>

                    <span
                      class="badge ${
                        Number(s.due_amount) > 0
                          ? 'pending'
                          : 'paid'
                      }"
                    >
                      ${money(s.due_amount)}
                    </span>

                  </td>

                </tr>

              `).join('')}

            </tbody>
          </table>
        </div>
      `

      : `
        <div class="empty">
          No students registered yet.
        </div>
      `;
}


/* =========================================================
   STUDENTS
   ========================================================= */

function renderStudents() {

  const q =
    ($('studentSearch')?.value || '')
      .toLowerCase();


  const rows =
    students.filter(student =>

      [
        student.name,
        student.admission_no,
        student.username,
        student.contact,
        student.course
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)

    );


  if (!$('studentsTable')) {
    return;
  }


  $('studentsTable').innerHTML =

    rows.length

      ? rows.map(s => `

        <tr>

          <td>
            <strong>
              ${esc(s.admission_no || '—')}
            </strong>
          </td>

          <td>
            ${esc(s.name)}
          </td>

          <td>
            <code>
              ${esc(s.username || '—')}
            </code>
          </td>

          <td>
            ${esc(s.contact)}
          </td>

          <td>
            ${esc(s.course)}
          </td>

          <td>
            ${money(s.total_fees)}
          </td>

          <td>
            ${money(s.paid)}
          </td>

          <td>
            <strong>
              ${money(s.due_amount)}
            </strong>
          </td>

          <td>

            <span
              class="badge ${
                s.certificate_status === 'Issued'
                  ? 'paid'
                  : 'pending'
              }"
            >
              ${esc(
                s.certificate_status ||
                'Pending'
              )}
            </span>

          </td>

          <td>

            <button
              class="btn secondary"
              onclick="editStudent('${s.id}')"
            >
              Edit
            </button>

            <button
              class="btn danger"
              onclick="deleteStudent('${s.id}')"
            >
              Delete
            </button>

          </td>

        </tr>

      `).join('')

      : `
        <tr>
          <td
            colspan="10"
            class="empty"
          >
            No matching students.
          </td>
        </tr>
      `;
}


if ($('studentSearch')) {
  $('studentSearch').oninput =
    renderStudents;
}


/* =========================================================
   FEES
   ========================================================= */

function renderFees() {

  const q =
    ($('feeSearch')?.value || '')
      .toLowerCase();

  const f =
    $('feeFilter')?.value || 'all';


  let rows =
    students.filter(s =>

      [
        s.name,
        s.admission_no,
        s.course
      ]
        .join(' ')
        .toLowerCase()
        .includes(q)
    );


  if (f === 'due') {

    rows =
      rows.filter(
        s => Number(s.due_amount) > 0
      );
  }


  if (f === 'paid') {

    rows =
      rows.filter(
        s => Number(s.due_amount) <= 0
      );
  }


  if (!$('feesTable')) {
    return;
  }


  $('feesTable').innerHTML =

    rows.length

      ? rows.map(s => {

          const p =
            s.total_fees

              ? Math.min(
                  100,
                  Math.round(
                    s.paid /
                    s.total_fees *
                    100
                  )
                )

              : 0;


          return `

            <tr>

              <td>
                ${esc(
                  s.admission_no || '—'
                )}
              </td>

              <td>
                ${esc(s.name)}
              </td>

              <td>
                ${esc(s.course)}
              </td>

              <td>
                ${money(s.total_fees)}
              </td>

              <td>
                ${money(s.paid)}
              </td>

              <td>
                <strong>
                  ${money(s.due_amount)}
                </strong>
              </td>

              <td>

                <div class="progress">
                  <i
                    style="width:${p}%"
                  ></i>
                </div>

              </td>

              <td>

                <button
                  class="btn primary"
                  onclick="recordPayment('${s.id}')"
                >
                  Update
                </button>

              </td>

            </tr>

          `;
        }).join('')

      : `
        <tr>
          <td
            colspan="8"
            class="empty"
          >
            No fee records.
          </td>
        </tr>
      `;
}


if ($('feeSearch')) {
  $('feeSearch').oninput =
    renderFees;
}


if ($('feeFilter')) {
  $('feeFilter').onchange =
    renderFees;
}


/* =========================================================
   CERTIFICATES
   ========================================================= */

function renderCertificates() {

  if (!$('certTable')) {
    return;
  }


  $('certTable').innerHTML =

    students.length

      ? students.map(s => `

        <tr>

          <td>
            ${esc(
              s.admission_no || '—'
            )}
          </td>

          <td>
            ${esc(s.name)}
          </td>

          <td>
            ${esc(s.course)}
          </td>

          <td>

            <span
              class="badge ${
                s.certificate_status === 'Issued'
                  ? 'paid'
                  : 'pending'
              }"
            >
              ${esc(
                s.certificate_status ||
                'Not Eligible'
              )}
            </span>

          </td>

          <td>

            <select
              onchange="
                setCertificate(
                  '${s.id}',
                  this.value
                )
              "
            >

              <option
                ${
                  s.certificate_status ===
                  'Not Eligible'
                    ? 'selected'
                    : ''
                }
              >
                Not Eligible
              </option>

              <option
                ${
                  s.certificate_status ===
                  'Pending'
                    ? 'selected'
                    : ''
                }
              >
                Pending
              </option>

              <option
                ${
                  s.certificate_status ===
                  'Issued'
                    ? 'selected'
                    : ''
                }
              >
                Issued
              </option>

            </select>

          </td>

        </tr>

      `).join('')

      : `
        <tr>
          <td
            colspan="5"
            class="empty"
          >
            No students registered.
          </td>
        </tr>
      `;
}


/* =========================================================
   ID CARD
   ========================================================= */

function renderIdSelect() {

  if (!$('idStudentSelect')) {
    return;
  }


  $('idStudentSelect').innerHTML =

    '<option value="">Select student</option>' +

    students.map(s => `

      <option value="${s.id}">

        ${esc(
          s.admission_no || '—'
        )}

        —

        ${esc(s.name)}

      </option>

    `).join('');


  $('idStudentSelect').onchange =
    () => {

      selectedStudent =
        students.find(
          s =>
            s.id ===
            $('idStudentSelect').value
        ) || null;


      renderIdCard(
        selectedStudent,
        $('idCardPreview')
      );
    };
}


async function photoUrl(path) {

  if (!path) {
    return '';
  }


  const {
    data,
    error
  } =
    await SB()
      .storage
      .from('student-photos')
      .createSignedUrl(
        path,
        3600
      );


  return error
    ? ''
    : data?.signedUrl || '';
}


async function idCardHTML(s) {

  const url =
    await photoUrl(
      s.photo_path
    );


  return `

    <div
      id="idCardCanvas"
      class="id-card-modern"
    >

      <div class="id-top">

        <img
          src="logo.png"
          alt=""
        >

        <h3>
          TeraByte Computer Academy
        </h3>

        <p>
          LEARN • GROW • SUCCEED
        </p>

      </div>


      ${
        url
          ? `
            <img
              class="id-photo"
              src="${esc(url)}"
              alt="Student photo"
            >
          `
          : ''
      }


      <div class="id-content">

        <h2>
          ${esc(s.name)}
        </h2>

        <div class="id-reg">
          ${esc(
            s.admission_no || '—'
          )}
        </div>


        <div class="id-row">
          <span>Course</span>
          <strong>
            ${esc(s.course)}
          </strong>
        </div>


        <div class="id-row">
          <span>Class</span>
          <strong>
            ${esc(
              s.class_level || '—'
            )}
          </strong>
        </div>


        <div class="id-row">
          <span>Batch</span>
          <strong>
            ${esc(
              s.batch || '—'
            )}
          </strong>
        </div>


        <div class="id-row">
          <span>Contact</span>
          <strong>
            ${esc(s.contact)}
          </strong>
        </div>

      </div>


      <div class="id-footer">
        PROPERTY OF TERABYTE COMPUTER ACADEMY
      </div>

    </div>
  `;
}


async function renderIdCard(
  s,
  target
) {

  if (!target) {
    return;
  }


  target.innerHTML =
    s

      ? await idCardHTML(s)

      : `
        <div class="empty">
          Select a student to preview
          the ID card.
        </div>
      `;
}


async function downloadElementJpg(
  el,
  filename
) {

  if (!el) {
    return toast(
      'Nothing to download'
    );
  }


  const canvas =
    await html2canvas(
      el,
      {
        scale: 3,
        useCORS: true,
        backgroundColor: '#fff',
        logging: false
      }
    );


  const a =
    document.createElement('a');

  a.download = filename;

  a.href =
    canvas.toDataURL(
      'image/jpeg',
      0.95
    );

  a.click();
}


if ($('downloadId')) {

  $('downloadId').onclick =
    async () => {

      if (!selectedStudent) {

        return toast(
          'Select a student first'
        );
      }


      await downloadElementJpg(
        $('idCardCanvas'),

        `${
          selectedStudent.admission_no ||
          'student'
        }_ID_Card.jpg`
      );
    };
}


/* =========================================================
   FEES FORM
   ========================================================= */

function updateDue() {

  if (
    !$('totalFees') ||
    !$('feesPaid')
  ) {
    return;
  }


  const total =
    Number(
      $('totalFees').value || 0
    );


  const paid =
    Math.min(
      total,
      Math.max(
        0,
        Number(
          $('feesPaid').value || 0
        )
      )
    );


  const due =
    Math.max(
      0,
      total - paid
    );


  if ($('dueAmount')) {

    $('dueAmount').value =
      money(due);
  }


  if ($('paymentStatus')) {

    $('paymentStatus').value =
      due === 0
        ? 'Paid'
        : paid > 0
          ? 'Partial'
          : 'Pending';
  }
}


if ($('totalFees')) {
  $('totalFees').oninput =
    updateDue;
}


if ($('feesPaid')) {
  $('feesPaid').oninput =
    updateDue;
}


/* =========================================================
   PHOTO
   ========================================================= */

let photoFile = null;
let photoDataUrl = '';


if ($('photo')) {

  $('photo').onchange =
    e => {

      photoFile =
        e.target.files[0] || null;


      if (!photoFile) {
        return;
      }


      if ($('photoPreview')) {

        $('photoPreview').src =
          URL.createObjectURL(
            photoFile
          );

        $('photoPreview').style.display =
          'block';
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


  if (
    file.size >
    2 * 1024 * 1024
  ) {

    throw new Error(
      'Photo must be under 2 MB.'
    );
  }


  const ext =
    file.name
      .split('.')
      .pop()
      .toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ''
      ) || 'jpg';


  const path =
    `students/${admissionNo}-${crypto.randomUUID()}.${ext}`;


  const {
    error
  } =
    await SB()
      .storage
      .from('student-photos')
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

function resetAdmission() {

  if ($('admissionNo')) {
    $('admissionNo').value = '';
  }


  if ($('regDate')) {

    $('regDate').value =
      new Date()
        .toISOString()
        .slice(0, 10);
  }


  if ($('dueAmount')) {
    $('dueAmount').value =
      '₹0';
  }


  if ($('paymentStatus')) {
    $('paymentStatus').value =
      'Pending';
  }


  if ($('photoPreview')) {

    $('photoPreview').style.display =
      'none';

    $('photoPreview').src = '';
  }


  photoFile = null;
}


/* =========================================================
   RESET BUTTON
   ========================================================= */

if ($('resetAdmission')) {

  $('resetAdmission').onclick =
    async () => {

      resetAdmission();

      try {

        const number =
          await nextAdmission();

        if ($('admissionNo')) {

          $('admissionNo').value =
            number;
        }

      } catch (error) {

        console.error(
          error
        );

        toast(
          'Could not generate registration number'
        );
      }
    };
}


/* =========================================================
   STUDENT REGISTRATION
   ========================================================= */

if ($('admissionForm')) {

  $('admissionForm').onsubmit =
    async e => {

      e.preventDefault();


      const btn =
        $('registerBtn');


      if (btn) {

        btn.disabled = true;

        btn.textContent =
          'Creating account…';
      }


      try {

        /*
          ALWAYS generate a number
          immediately before registration.
        */

        const admissionNo =
          await nextAdmission();


        /*
          Show it on the page.
        */

        if ($('admissionNo')) {

          $('admissionNo').value =
            admissionNo;
        }


        const payload = {

          admission_no:
            admissionNo,

          registration_date:
            $('regDate')?.value ||
            new Date()
              .toISOString()
              .slice(0, 10),

          name:
            $('studentName')?.value
              .trim() || '',

          father_name:
            $('fatherName')?.value
              .trim() || '',

          contact:
            $('contact')?.value
              .trim() || '',

          email:
            $('studentEmail')?.value
              .trim() || null,

          class_level:
            $('classLevel')?.value
              .trim() || '',

          batch:
            $('batch')?.value || '',

          course:
            $('course')?.value || '',

          duration:
            $('duration')?.value || '',

          address:
            $('address')?.value
              .trim() || '',

          total_fees:
            Number(
              $('totalFees')?.value || 0
            ),

          paid:
            Number(
              $('feesPaid')?.value || 0
            ),

          certificate_status:
            $('certificate')?.value ||
            'Not Eligible'
        };


        payload.due_amount =
          Math.max(
            0,
            payload.total_fees -
            payload.paid
          );


        payload.payment_status =
          payload.due_amount === 0
            ? 'Paid'
            : payload.paid > 0
              ? 'Partial'
              : 'Pending';


        /*
          Upload photo.
        */

        if (photoFile) {

          payload.photo_path =
            await uploadPhoto(
              photoFile,
              admissionNo
            );
        }


        /*
          Send to Edge Function.
        */

        const {
          data: fnData,
          error: fnError
        } =
          await SB()
            .functions
            .invoke(
              'create-student',
              {
                body: payload
              }
            );


        if (fnError) {
          throw fnError;
        }


        if (
          !fnData?.username ||
          !fnData?.temporary_password
        ) {

          throw new Error(
            'Student was created but credentials were not returned.'
          );
        }


        /*
          Save registration result.
        */

        registrationResult = {

          ...payload,

          username:
            fnData.username,

          temporary_password:
            fnData.temporary_password
        };


        /*
          Show credentials.
        */

        if ($('generatedUsername')) {

          $('generatedUsername')
            .textContent =
            fnData.username;
        }


        if ($('generatedPassword')) {

          $('generatedPassword')
            .textContent =
            fnData.temporary_password;
        }


        if ($('credentialModal')) {

          $('credentialModal')
            .classList.add('open');
        }


        /*
          Clear form.
        */

        e.target.reset();

        resetAdmission();


        /*
          Generate next number
          immediately.
        */

        try {

          const next =
            await nextAdmission();

          if ($('admissionNo')) {

            $('admissionNo').value =
              next;
          }

        } catch (numberError) {

          console.warn(
            'Next number generation failed:',
            numberError
          );
        }


        /*
          Refresh database.
        */

        try {

          await refreshAll();

        } catch (refreshError) {

          console.warn(
            'Refresh failed:',
            refreshError
          );
        }


        toast(
          'Student registered successfully'
        );


      } catch (err) {

        console.error(
          'Registration error:',
          err
        );


        toast(
          err.message ||
          'Registration failed'
        );


      } finally {

        if (btn) {

          btn.disabled = false;

          btn.textContent =
            '✓ Complete Registration';
        }
      }
    };
}


/* =========================================================
   PAYMENT
   ========================================================= */

async function recordPayment(id) {

  const s =
    students.find(
      x => x.id === id
    );


  if (!s) {
    return;
  }


  const val =
    prompt(
      `Enter new total amount paid for ${s.name}:`,
      s.paid
    );


  if (val === null) {
    return;
  }


  const paid =
    Number(val);


  if (
    !Number.isFinite(paid) ||
    paid < 0 ||
    paid > Number(s.total_fees)
  ) {

    return toast(
      'Enter a valid payment amount.'
    );
  }


  const {
    error
  } =
    await SB()
      .from('students')
      .update({

        paid,

        due_amount:
          Math.max(
            0,
            Number(s.total_fees) -
            paid
          ),

        payment_status:
          paid === Number(s.total_fees)
            ? 'Paid'
            : paid > 0
              ? 'Partial'
              : 'Pending'

      })
      .eq('id', id);


  if (error) {

    toast(
      error.message
    );

  } else {

    await refreshAll();

    toast(
      'Payment updated'
    );
  }
}


/* =========================================================
   CERTIFICATE
   ========================================================= */

async function setCertificate(
  id,
  status
) {

  const {
    error
  } =
    await SB()
      .from('students')
      .update({
        certificate_status:
          status
      })
      .eq('id', id);


  if (error) {

    toast(
      error.message
    );

  } else {

    await refreshAll();

    toast(
      'Certificate status updated'
    );
  }
}


/* =========================================================
   EDIT STUDENT
   ========================================================= */

function editStudent(id) {

  const s =
    students.find(
      x => x.id === id
    );


  if (!s) {
    return;
  }


  $('editId').value =
    id;

  $('editName').value =
    s.name || '';

  $('editFather').value =
    s.father_name || '';

  $('editContact').value =
    s.contact || '';

  $('editEmail').value =
    s.email || '';

  $('editClass').value =
    s.class_level || '';

  $('editCourse').value =
    s.course || '';

  $('editTotal').value =
    s.total_fees || 0;

  $('editPaid').value =
    s.paid || 0;

  $('editCert').value =
    s.certificate_status ||
    'Not Eligible';


  $('modal').classList.add(
    'open'
  );
}


/* =========================================================
   DELETE STUDENT
   ========================================================= */

async function deleteStudent(id) {

  if (
    !confirm(
      'Delete this student record and permanently disable the student portal account?'
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
        'delete-student',
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

  } else if (data?.error) {

    toast(
      data.error
    );

  } else {

    await refreshAll();

    toast(
      'Student account and record deleted'
    );
  }
}


/* =========================================================
   GLOBAL FUNCTIONS
   ========================================================= */

window.editStudent =
  editStudent;

window.deleteStudent =
  deleteStudent;

window.recordPayment =
  recordPayment;

window.setCertificate =
  setCertificate;


/* =========================================================
   EDIT FORM
   ========================================================= */

if ($('editForm')) {

  $('editForm').onsubmit =
    async e => {

      e.preventDefault();


      const id =
        $('editId').value;


      const total =
        Number(
          $('editTotal').value || 0
        );


      const paid =
        Math.min(
          total,
          Math.max(
            0,
            Number(
              $('editPaid').value || 0
            )
          )
        );


      const {
        error
      } =
        await SB()
          .from('students')
          .update({

            name:
              $('editName').value.trim(),

            father_name:
              $('editFather').value.trim(),

            contact:
              $('editContact').value.trim(),

            email:
              $('editEmail').value.trim() ||
              null,

            class_level:
              $('editClass').value.trim(),

            course:
              $('editCourse').value,

            total_fees:
              total,

            paid:
              paid,

            due_amount:
              total - paid,

            payment_status:
              paid === total
                ? 'Paid'
                : paid > 0
                  ? 'Partial'
                  : 'Pending',

            certificate_status:
              $('editCert').value

          })
          .eq(
            'id',
            id
          );


      if (error) {

        toast(
          error.message
        );

      } else {

        $('modal')
          .classList.remove('open');

        await refreshAll();

        toast(
          'Student updated'
        );
      }
    };
}


/* =========================================================
   MODALS
   ========================================================= */

if ($('closeModal')) {

  $('closeModal').onclick =
    () =>
      $('modal')
        .classList.remove('open');
}


if ($('cancelEdit')) {

  $('cancelEdit').onclick =
    () =>
      $('modal')
        .classList.remove('open');
}


if ($('closeCredential')) {

  $('closeCredential').onclick =
    () =>
      $('credentialModal')
        .classList.remove('open');
}


/* =========================================================
   COPY CREDENTIALS
   ========================================================= */

if ($('copyCredentials')) {

  $('copyCredentials').onclick =
    async () => {

      if (!registrationResult) {
        return;
      }


      await navigator
        .clipboard
        .writeText(

          `TeraByte Student Portal
Username: ${registrationResult.username}
Temporary Password: ${registrationResult.temporary_password}
Registration Number: ${registrationResult.admission_no}`

        );


      toast(
        'Credentials copied'
      );
    };
}


/* =========================================================
   DOWNLOAD REGISTRATION
   ========================================================= */

if ($('downloadRegistration')) {

  $('downloadRegistration').onclick =
    async () => {

      if (!registrationResult) {
        return;
      }


      const wrap =
        document.createElement('div');


      wrap.className =
        'registration-sheet';


      wrap.innerHTML = `

        <div class="sheet-head">

          <img src="logo.png">

          <div>

            <h1>
              TeraByte Computer Academy
            </h1>

            <p>
              OFFICIAL STUDENT REGISTRATION RECORD
            </p>

          </div>

        </div>


        <div class="sheet-body">

          <h2>
            ${esc(
              registrationResult.name
            )}
          </h2>


          <div class="sheet-grid">

            <p>
              <span>
                Admission No.
              </span>

              <strong>
                ${esc(
                  registrationResult.admission_no
                )}
              </strong>
            </p>


            <p>
              <span>
                Registration Date
              </span>

              <strong>
                ${esc(
                  registrationResult.registration_date
                )}
              </strong>
            </p>


            <p>
              <span>
                Father / Guardian
              </span>

              <strong>
                ${esc(
                  registrationResult.father_name
                )}
              </strong>
            </p>


            <p>
              <span>
                Contact
              </span>

              <strong>
                ${esc(
                  registrationResult.contact
                )}
              </strong>
            </p>


            <p>
              <span>
                Email
              </span>

              <strong>
                ${esc(
                  registrationResult.email ||
                  'Not provided'
                )}
              </strong>
            </p>


            <p>
              <span>
                Class
              </span>

              <strong>
                ${esc(
                  registrationResult.class_level ||
                  '—'
                )}
              </strong>
            </p>


            <p>
              <span>
                Course
              </span>

              <strong>
                ${esc(
                  registrationResult.course
                )}
              </strong>
            </p>


            <p>
              <span>
                Batch
              </span>

              <strong>
                ${esc(
                  registrationResult.batch
                )}
              </strong>
            </p>


            <p>
              <span>
                Duration
              </span>

              <strong>
                ${esc(
                  registrationResult.duration
                )}
              </strong>
            </p>


            <p>
              <span>
                Total Fees
              </span>

              <strong>
                ${money(
                  registrationResult.total_fees
                )}
              </strong>
            </p>


            <p>
              <span>
                Fees Paid
              </span>

              <strong>
                ${money(
                  registrationResult.paid
                )}
              </strong>
            </p>


            <p>
              <span>
                Due Amount
              </span>

              <strong>
                ${money(
                  registrationResult.due_amount
                )}
              </strong>
            </p>


            <p>
              <span>
                Portal Username
              </span>

              <strong>
                ${esc(
                  registrationResult.username
                )}
              </strong>
            </p>

          </div>


          <div class="address-block">

            <span>
              Address
            </span>

            <strong>
              ${esc(
                registrationResult.address ||
                'Not provided'
              )}
            </strong>

          </div>


          <div class="sheet-note">

            Keep the portal password confidential.
            The temporary password is not printed
            on this official record.

          </div>

        </div>

      `;


      document.body.appendChild(
        wrap
      );


      await downloadElementJpg(
        wrap,

        `${
          registrationResult.admission_no
        }_Registration.jpg`
      );


      wrap.remove();
    };
}


/* =========================================================
   POSTS
   ========================================================= */

if ($('postForm')) {

  $('postForm').onsubmit =
    async e => {

      e.preventDefault();


      const {
        error
      } =
        await SB()
          .from('posts')
          .insert({

            title:
              $('postTitle').value.trim(),

            content:
              $('postContent').value.trim(),

            published:
              $('postPublished').checked,

            author_id:
              currentUser.id

          });


      if (error) {

        toast(
          error.message
        );

      } else {

        e.target.reset();

        $('postPublished').checked =
          true;

        await refreshAll();

        toast(
          'Post published'
        );
      }
    };
}


function renderPosts() {

  if (!$('postsList')) {
    return;
  }


  $('postsList').innerHTML =

    posts.length

      ? posts.map(p => `

        <article
          class="post-item"
        >

          <div class="post-meta">

            <span
              class="badge ${
                p.published
                  ? 'paid'
                  : 'pending'
              }"
            >
              ${
                p.published
                  ? 'PUBLISHED'
                  : 'DRAFT'
              }
            </span>

            <span>
              ${new Date(
                p.created_at
              ).toLocaleString(
                'en-IN'
              )}
            </span>

          </div>


          <h3>
            ${esc(p.title)}
          </h3>


          <p>
            ${esc(p.content)
              .replace(
                /\n/g,
                '<br>'
              )}
          </p>


          <button
            class="btn ${
              p.published
                ? 'danger'
                : 'primary'
            }"
            onclick="
              togglePost(
                '${p.id}',
                ${!p.published}
              )
            "
          >
            ${
              p.published
                ? 'Unpublish'
                : 'Publish'
            }
          </button>


          <button
            class="btn danger"
            onclick="
              deletePost('${p.id}')
            "
          >
            Delete
          </button>

        </article>

      `).join('')

      : `
        <div class="empty">
          No posts yet.
        </div>
      `;
}


async function togglePost(
  id,
  published
) {

  const {
    error
  } =
    await SB()
      .from('posts')
      .update({
        published
      })
      .eq(
        'id',
        id
      );


  if (error) {

    toast(
      error.message
    );

  } else {

    await refreshAll();

    toast(
      published
        ? 'Post published'
        : 'Post unpublished'
    );
  }
}


async function deletePost(id) {

  if (
    !confirm(
      'Delete this post?'
    )
  ) {
    return;
  }


  const {
    error
  } =
    await SB()
      .from('posts')
      .delete()
      .eq(
        'id',
        id
      );


  if (error) {

    toast(
      error.message
    );

  } else {

    await refreshAll();

    toast(
      'Post deleted'
    );
  }
}


window.togglePost =
  togglePost;

window.deletePost =
  deletePost;


/* =========================================================
   MESSAGES
   ========================================================= */

function populateRecipients() {

  if (!$('messageRecipient')) {
    return;
  }


  $('messageRecipient').innerHTML =

    '<option value="all">All Students</option>' +

    students.map(s => `

      <option
        value="${s.user_id}"
      >

        ${esc(s.name)}

        —

        ${esc(
          s.admission_no || '—'
        )}

      </option>

    `).join('');
}


if ($('messageForm')) {

  $('messageForm').onsubmit =
    async e => {

      e.preventDefault();


      const recipient =
        $('messageRecipient')
          .value;


      const {
        error
      } =
        await SB()
          .from('messages')
          .insert({

            recipient_user_id:
              recipient === 'all'
                ? null
                : recipient,

            subject:
              $('messageSubject')
                .value.trim(),

            body:
              $('messageBody')
                .value.trim(),

            sender_id:
              currentUser.id

          });


      if (error) {

        toast(
          error.message
        );

      } else {

        e.target.reset();

        await refreshAll();

        toast(
          'Message sent'
        );
      }
    };
}


function renderMessages() {

  if (!$('messagesList')) {
    return;
  }


  $('messagesList').innerHTML =

    messages.length

      ? messages.map(m => `

        <article
          class="message-item"
        >

          <div class="post-meta">

            <span
              class="badge ${
                m.recipient_user_id
                  ? 'partial'
                  : 'active'
              }"
            >
              ${
                m.recipient_user_id
                  ? 'PRIVATE'
                  : 'ALL STUDENTS'
              }
            </span>

            <span>
              ${new Date(
                m.created_at
              ).toLocaleString(
                'en-IN'
              )}
            </span>

          </div>


          <h3>
            ${esc(m.subject)}
          </h3>


          <p>
            ${esc(m.body)
              .replace(
                /\n/g,
                '<br>'
              )}
          </p>

        </article>

      `).join('')

      : `
        <div class="empty">
          No messages sent yet.
        </div>
      `;
}


/* =========================================================
   START APPLICATION
   ========================================================= */

(async () => {

  try {

    /*
      FIRST authenticate.
    */

    const authenticated =
      await init();


    if (!authenticated) {
      return;
    }


    /*
      IMPORTANT:
      Generate registration number BEFORE
      loading all the other database tables.
    */

    if ($('regDate')) {

      $('regDate').value =
        new Date()
          .toISOString()
          .slice(0, 10);
    }


    try {

      const registrationNumber =
        await nextAdmission();


      if ($('admissionNo')) {

        $('admissionNo').value =
          registrationNumber;

        console.log(
          'Registration number:',
          registrationNumber
        );
      }

    } catch (numberError) {

      console.error(
        'Registration number error:',
        numberError
      );


      /*
        Even if Supabase has a problem,
        display a temporary number instead
        of leaving the box blank.
      */

      const fallback =
        'TCA' +
        Math.floor(
          10000 +
          Math.random() *
          90000
        );


      if ($('admissionNo')) {

        $('admissionNo').value =
          fallback;
      }


      toast(
        'Registration number generated locally'
      );
    }


    /*
      Now load dashboard data.
      An error here will NOT remove
      the registration number.
    */

    try {

      await refreshAll();

    } catch (refreshError) {

      console.error(
        'Database refresh error:',
        refreshError
      );

      toast(
        'Some dashboard data could not be loaded.'
      );
    }


  } catch (error) {

    console.error(
      'Application initialization error:',
      error
    );


    toast(
      error.message ||
      'Unable to connect to the database'
    );

  }

})();
