(function () {
  // Mobile menu
  var btn = document.querySelector('.menu-btn');
  var nav = document.getElementById('nav');
  function setMenu(open) {
    nav.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  }
  btn.addEventListener('click', function () { setMenu(!nav.classList.contains('open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  // Footer year
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  // Fade in on scroll (IntersectionObserver, no scroll listeners)
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('in'); });
  }

  // Inquiry form
  var form = document.getElementById('inquiry');
  if (!form) return;
  var status = document.getElementById('form-status');
  var submit = form.querySelector('.submit');
  var label = submit.querySelector('.label');
  var fields = ['fullName', 'businessName', 'email', 'phone', 'businessType', 'service', 'message'];

  function setErr(name, msg) {
    var el = document.getElementById(name);
    var box = document.getElementById('err-' + name);
    if (!el || !box) return;
    box.textContent = msg || '';
    el.closest('.field').classList.toggle('invalid', !!msg);
    if (msg) el.setAttribute('aria-describedby', 'err-' + name); else el.removeAttribute('aria-describedby');
    el.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function validate(d) {
    var e = {};
    if (d.fullName.trim().length < 2) e.fullName = 'Enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email.trim())) e.email = 'Enter a valid email address.';
    if (!/^[\d\s+()]{7,25}$/.test(d.phone.trim())) e.phone = 'Enter a valid phone or WhatsApp number.';
    if (!d.businessType) e.businessType = 'Choose a business type.';
    if (!d.service) e.service = 'Choose a service.';
    if (d.message.trim().length < 10) e.message = 'Tell us a little about your business (at least 10 characters).';
    return e;
  }

  fields.forEach(function (n) {
    var el = document.getElementById(n);
    el.addEventListener('blur', function () {
      var d = collect(); var e = validate(d); setErr(n, e[n]);
    });
  });

  function collect() {
    var d = {};
    fields.forEach(function (n) { d[n] = document.getElementById(n).value; });
    d.website = form.elements['website'].value;
    return d;
  }

  function show(kind, msg) {
    status.className = 'status ' + kind;
    status.textContent = msg;
    status.focus();
  }

  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    status.className = 'status'; status.textContent = '';
    var d = collect(); var errs = validate(d);
    fields.forEach(function (n) { setErr(n, errs[n]); });
    var first = fields.find(function (n) { return errs[n]; });
    if (first) { document.getElementById(first).focus(); return; }

    submit.disabled = true; label.textContent = 'Sending...';
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 20000);

    fetch('/api/inquiry', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(d), signal: ctrl.signal
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok && j.ok, j: j }; });
    }).then(function (res) {
      if (res.ok) {
        form.reset();
        show('ok', 'Thank you. Your inquiry has been received. Legacy Reef Consulting Services will contact you shortly.');
      } else if (res.j && res.j.errors) {
        Object.keys(res.j.errors).forEach(function (n) { setErr(n, res.j.errors[n]); });
        show('bad', 'Please fix the highlighted fields and try again.');
      } else {
        show('bad', (res.j && res.j.error) || 'We could not send your inquiry. Please try again, or email legacyreefconsultingservices@gmail.com or call 592 627 8668.');
      }
    }).catch(function () {
      show('bad', 'We could not reach the server. Check your connection and try again, or email legacyreefconsultingservices@gmail.com or call 592 627 8668.');
    }).finally(function () {
      clearTimeout(timer); submit.disabled = false; label.textContent = 'Send Inquiry';
    });
  });
})();
