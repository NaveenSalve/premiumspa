'use strict';

// Shared helpers for the FINAL audit harnesses (tests/security/final/*).
// Uses the same conventions as tests/security/lib/assert.cjs.
// NEVER prints credentials, cookies, JWTs or PINs.

const path = require('path');
const fs = require('fs');

const lib = require('../lib/assert.cjs');
const { request, signJWT, setCookieFrom, hasSetCookieAttr, createReporter, redact, connectDb } = lib;

const BASE = (process.env.BASE_URL || 'http://127.0.0.1:4060').replace(/\/+$/, '');
const TEST_ADMIN_PIN = process.env.TEST_ADMIN_PIN || '';
const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-final-audit-secret';
const TEST_DATE = '2099-01-01';

function req(path, opts = {}) {
  return request(BASE, path, opts);
}

// Returns { services, svc, availTh, offTh }
async function loadCatalog() {
  const services = await req('/api/services');
  const therapists = await req('/api/therapists');
  const svc = services.data[0];
  const availTh = therapists.data.find((t) => t.status === 'available');
  const offTh = therapists.data.find((t) => t.status === 'off_duty');
  return { services, therapists, svc, availTh, offTh };
}

// admin login -> cookie string (never printed)
async function adminLogin() {
  const good = await req('/api/auth/login', { method: 'POST', body: { pin: TEST_ADMIN_PIN } });
  if (good.status !== 200) throw new Error('admin login failed for harness');
  return setCookieFrom(good);
}

// Slot picker that avoids times already booked for the test date + therapist.
// Pass therapistId to scope the used-set to that therapist only, so booked
// slots on other therapists don't shrink this therapist's available space.
async function makeSlotPicker(cookie, { therapistId } = {}) {
  const used = new Set();
  let offset = 0;
  for (let pages = 0; pages < 100; pages++) {
    const r = await req(`/api/bookings?limit=100&offset=${offset}`, { cookie });
    const rows = Array.isArray(r.data) ? r.data : [];
    for (const b of rows) {
      if (b.date === TEST_DATE && b.status !== 'Cancelled' && (!therapistId || b.therapistId === therapistId)) used.add(b.time);
    }
    if (rows.length < 100) break;
    offset += 100;
  }
  // 900 distinct slots: 08:00-22:59 (all minutes, AM/PM as the app expects).
  // Earlier versions only produced 60 distinct times (08-12), which saturates
  // as the shared test date accumulates bookings in the persistent test DB.
  const all = [];
  for (let h = 8; h <= 22; h++) {
    const mer = h < 12 ? 'AM' : 'PM';
    const hr = h > 12 ? h - 12 : h;
    for (let m = 0; m < 60; m++) all.push(`${hr}:${String(m).padStart(2, '0')} ${mer}`);
  }
  // Randomise the start index so separate harness runs don't collide on the
  // same slot for the same shared test date.
  const start = Math.floor(Math.random() * all.length);
  return {
    used,
    pickFree() {
      for (let i = 0; i < all.length; i++) {
        const t = all[(start + i) % all.length];
        if (!used.has(t)) { used.add(t); return t; }
      }
      return null;
    },
  };
}

async function mkBookingFactory({ svc, availTh, cookie, slotPicker, over = {}, hdrs = {} } = {}) {
  const picker = slotPicker || await makeSlotPicker(cookie, { therapistId: availTh && availTh.id });
  return req('/api/bookings', {
    method: 'POST',
    cookie,
    body: {
      customerName: 'Audit Customer',
      customerMobile: '9876543999',
      serviceId: svc.id,
      therapistId: availTh.id,
      fullAddress: '12 Audit Lane',
      city: 'Audit City',
      date: TEST_DATE,
      time: picker.pickFree(),
      duration: '60 min',
      ...over,
    },
    headers: hdrs,
  });
}

module.exports = { BASE, TEST_ADMIN_PIN, TEST_JWT_SECRET, TEST_DATE, req, loadCatalog, adminLogin, makeSlotPicker, mkBookingFactory, signJWT, setCookieFrom, hasSetCookieAttr, createReporter, redact, connectDb, path, fs };
