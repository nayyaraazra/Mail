document.addEventListener('DOMContentLoaded', function() {

  // Navigation buttons
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // Compose form submit
  document.querySelector('#compose-form').addEventListener('submit', send_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function show_view(view_id) {
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';
  document.querySelector('#email-view').style.display  = 'none';
  document.querySelector(`#${view_id}`).style.display  = 'block';
}

// ── Compose ───────────────────────────────────────────────────────────────────

function compose_email() {
  show_view('compose-view');
  document.querySelector('#compose-recipients').value = '';
  document.querySelector('#compose-subject').value    = '';
  document.querySelector('#compose-body').value       = '';
}

function send_email(event) {
  event.preventDefault();

  const recipients = document.querySelector('#compose-recipients').value;
  const subject    = document.querySelector('#compose-subject').value;
  const body       = document.querySelector('#compose-body').value;

  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({ recipients, subject, body })
  })
  .then(r => r.json())
  .then(result => {
    if (result.error) {
      alert(result.error);
    } else {
      load_mailbox('sent');
    }
  });
}

// ── Mailbox List ──────────────────────────────────────────────────────────────

function load_mailbox(mailbox) {
  show_view('emails-view');

  const container = document.querySelector('#emails-view');
  container.innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;

  fetch(`/emails/${mailbox}`)
  .then(r => r.json())
  .then(emails => {
    if (emails.length === 0) {
      container.innerHTML += '<p class="text-muted px-2">No emails here.</p>';
      return;
    }

    emails.forEach(email => {
      const row = document.createElement('div');
      row.classList.add('email-row');
      row.classList.add(email.read ? 'email-read' : 'email-unread');

      row.innerHTML = `
        <span class="email-sender">${email.sender}</span>
        <span class="email-subject">${email.subject}</span>
        <span class="email-timestamp">${email.timestamp}</span>
      `;

      row.addEventListener('click', () => view_email(email.id, mailbox));
      container.appendChild(row);
    });
  });
}

// ── Single Email View ─────────────────────────────────────────────────────────

function view_email(id, mailbox) {
  show_view('email-view');

  fetch(`/emails/${id}`)
  .then(r => r.json())
  .then(email => {

    // Mark as read
    fetch(`/emails/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ read: true })
    });

    const view = document.querySelector('#email-view');

    // Archive button: only show for inbox / archive, not sent
    const archiveBtn = mailbox !== 'sent'
      ? `<button class="btn btn-sm btn-outline-warning" id="archive-btn">
           ${email.archived ? 'Unarchive' : 'Archive'}
         </button>`
      : '';

    view.innerHTML = `
      <div class="email-detail">
        <div class="email-meta">
          <p><strong>From:</strong> ${email.sender}</p>
          <p><strong>To:</strong> ${email.recipients.join(', ')}</p>
          <p><strong>Subject:</strong> ${email.subject}</p>
          <p><strong>Timestamp:</strong> ${email.timestamp}</p>
        </div>
        <div class="email-actions mb-3">
          <button class="btn btn-sm btn-outline-primary" id="reply-btn">Reply</button>
          ${archiveBtn}
        </div>
        <hr>
        <div class="email-body">${email.body.replace(/\n/g, '<br>')}</div>
      </div>
    `;

    // Reply
    document.querySelector('#reply-btn').addEventListener('click', () => reply_email(email));

    // Archive / Unarchive
    if (mailbox !== 'sent') {
      document.querySelector('#archive-btn').addEventListener('click', () => {
        fetch(`/emails/${id}`, {
          method: 'PUT',
          body: JSON.stringify({ archived: !email.archived })
        })
        .then(() => load_mailbox('inbox'));
      });
    }
  });
}

// ── Reply ─────────────────────────────────────────────────────────────────────

function reply_email(email) {
  compose_email();

  document.querySelector('#compose-recipients').value = email.sender;

  const subject = email.subject.startsWith('Re: ')
    ? email.subject
    : `Re: ${email.subject}`;
  document.querySelector('#compose-subject').value = subject;

  document.querySelector('#compose-body').value =
    `On ${email.timestamp} ${email.sender} wrote:\n${email.body}`;
}