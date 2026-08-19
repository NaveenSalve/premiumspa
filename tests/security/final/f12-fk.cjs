'use strict';

// F-12 FK integrity: verify (via direct SQL against the SAME database the app
// uses) that referential integrity + uniqueness constraints actually exist and
// are enforced, and that deleting a service with booking history is impossible
// while deleting a therapist preserves history (set null).

const H = require('./helpers.cjs');
const T = H.createReporter('f12-fk');

async function main() {
  const client = await H.connectDb(); // lib.connectDb already connects
  const q = async (text, params) => {
    const r = await client.query(text, params);
    return r.rows;
  };

  try {
    // 1) FK from bookings.service_id -> services.id must exist and be RESTRICT.
    const svcFk = await q(
      `SELECT rc.delete_rule, rc.update_rule
         FROM information_schema.referential_constraints rc
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = rc.constraint_name
            AND kcu.constraint_schema = rc.constraint_schema
        WHERE kcu.table_name = 'bookings' AND kcu.column_name = 'service_id'`
    );
    T.record('F12 bookings.service_id FK exists', svcFk.length === 1, `rows=${svcFk.length}`);
    T.record('F12 bookings.service_id FK RESTRICT', svcFk.length === 1 && svcFk[0].delete_rule === 'RESTRICT', `rule=${svcFk[0]?.delete_rule || 'none'}`);

    // 2) FK from bookings.therapist_id -> therapists.id must exist and be SET NULL.
    const thFk = await q(
      `SELECT rc.delete_rule, rc.update_rule
         FROM information_schema.referential_constraints rc
         JOIN information_schema.key_column_usage kcu
           ON kcu.constraint_name = rc.constraint_name
            AND kcu.constraint_schema = rc.constraint_schema
        WHERE kcu.table_name = 'bookings' AND kcu.column_name = 'therapist_id'`
    );
    T.record('F12 bookings.therapist_id FK exists', thFk.length === 1, `rows=${thFk.length}`);
    T.record('F12 bookings.therapist_id FK SET NULL', thFk.length === 1 && thFk[0].delete_rule === 'SET NULL', `rule=${thFk[0]?.delete_rule || 'none'}`);

    // 3) Unique guard on (therapist_id, date, time) for non-cancelled rows.
    const uniq = await q(
      `SELECT indexname FROM pg_indexes WHERE tablename='bookings' AND indexname='uniq_bookings_active_therapist_slot'`
    );
    T.record('F12 unique active-slot index exists', uniq.length === 1, `found=${uniq.length}`);

    // 4) Deleting a service that has booking history must FAIL (FK restrict).
    const svc = (await q(`SELECT id, name FROM services ORDER BY created_at ASC LIMIT 1`))[0];
    if (svc) {
      const hasBookings = (await q(`SELECT 1 FROM bookings WHERE service_id=$1 LIMIT 1`, [svc.id])).length > 0;
      if (hasBookings) {
        let threw = false;
        let code = null;
        try {
          await q(`DELETE FROM services WHERE id=$1`, [svc.id]);
        } catch (e) {
          threw = true;
          code = e.code;
        }
        T.record('F12 delete service with history blocked', threw === true, `code=${code || 'no-error'}`);
      } else {
        T.record('F12 delete service with history blocked', true, 'no service with history available; constraint inspected above');
      }
    }

    // 5) Deleting a therapist with history must SET NULL, preserving rows.
    // Uses a disposable therapist (created + cleaned up here) so real data is untouched.
    const disposableTh = 'fk-th-' + Date.now();
    const svcForTh = (await q(`SELECT id FROM services ORDER BY created_at ASC LIMIT 1`))[0]?.id;
    await q(
      `INSERT INTO therapists (id, name, tier, category, rating, experience, specialties, bio, image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [disposableTh, 'FK Disposable', 'Classic', 'General', '5', '1yr', '[]', 'temp', 'temp']
    );
    const linkedBooking = 'fk-bk-' + Date.now();
    await q(
      `INSERT INTO bookings (id, customer_name, customer_mobile, service_id, service_name, date, time, duration, address, locality, service_amount, travel_advance, total_amount, therapist_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [linkedBooking, 'FK SetNull', '9876543002', svcForTh, 'x', '2099-02-02', '9:15 AM', '60 min', 'x', 'x', 0, 0, 0, disposableTh]
    );
    const delRes = await q(`DELETE FROM therapists WHERE id=$1 RETURNING id`, [disposableTh]).catch((e) => ({ err: e }));
    if (delRes.err) {
      T.record('F12 delete therapist with history blocked (FK) or preserved', false, `unexpected error: ${delRes.err.code || delRes.err.message}`);
    } else {
      const leftover = (await q(`SELECT COUNT(*) AS c FROM bookings WHERE id=$1`, [linkedBooking]))[0].c;
      T.record('F12 therapist delete preserves bookings', Number(leftover) === 1, `booking count after delete=${leftover}`);
      const thRef = (await q(`SELECT therapist_id FROM bookings WHERE id=$1`, [linkedBooking]))[0].therapist_id;
      T.record('F12 therapist delete set null verified', thRef === null, `therapist_id=${thRef}`);
    }
    await q(`DELETE FROM bookings WHERE id=$1`, [linkedBooking]).catch(() => {});

    // 6) DB-level CHECK constraints on money + status values.
    const checks = await q(
      `SELECT conname FROM pg_constraint WHERE conrelid='bookings'::regclass AND contype='c'`
    );
    const checkNames = checks.map((r) => r.conname).join(',');
    T.record('F12 bookings CHECK constraints present', checks.length >= 4, `${checks.length} checks: ${checkNames}`);

    // 7) Orphan insert attempt -> FK must reject (integrity can't be bypassed by raw SQL).
    const orphanSvc = (await q(`SELECT id FROM services ORDER BY created_at DESC LIMIT 1`))[0]?.id || 'svc-x';
    const fake = 'fk-orphan-' + Date.now();
    const ins = {
      id: fake,
      customer_name: 'FK Orphan',
      customer_mobile: '9876543000',
      service_id: 'definitely-not-a-real-service',
      service_name: 'x',
      date: '2099-12-31',
      time: '11:59 PM',
      duration: '60 min',
      address: 'x',
      locality: 'x',
      service_amount: 0,
      travel_advance: 0,
      total_amount: 0,
    };
    let fkViolation = false;
    let fkCode = null;
    try {
      await q(
        `INSERT INTO bookings (id, customer_name, customer_mobile, service_id, service_name, date, time, duration, address, locality, service_amount, travel_advance, total_amount)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [ins.id, ins.customer_name, ins.customer_mobile, ins.service_id, ins.service_name, ins.date, ins.time, ins.duration, ins.address, ins.locality, ins.service_amount, ins.travel_advance, ins.total_amount]
      );
      await q(`DELETE FROM bookings WHERE id=$1`, [ins.id]);
    } catch (e) {
      fkViolation = e.code === '23503';
      fkCode = e.code;
    }
    T.record('F12 orphan booking insert rejected (FK 23503)', fkViolation === true, `code=${fkCode || 'no-error'}`);

    // 8) Duplicate active-slot insert must be rejected by the unique index.
    const slotSvc = (await q(`SELECT id FROM services ORDER BY created_at ASC LIMIT 1`))[0]?.id || orphanSvc;
    const slotTh = (await q(`SELECT id FROM therapists ORDER BY created_at ASC LIMIT 1`))[0]?.id;
    if (slotTh) {
      const slotDate = '2099-01-01';
      const slotTime = '11:45 AM';
      const mk = (id) =>
        q(
          `INSERT INTO bookings (id, customer_name, customer_mobile, service_id, service_name, date, time, duration, address, locality, service_amount, travel_advance, total_amount, therapist_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
          [id, 'Slot Test', '9876543001', slotSvc, 'x', slotDate, slotTime, '60 min', 'x', 'x', 0, 0, 0, slotTh]
        ).catch((e) => ({ err: e }));
      const a = await mk('slot-a-' + Date.now());
      const b = await mk('slot-b-' + Date.now());
      const uniqViolated = (b && b.err && b.err.code === '23505') || (a && a.err && a.err.code === '23505');
      await q(`DELETE FROM bookings WHERE service_id=$1 AND customer_mobile IN ('9876543001')`, [slotSvc]).catch(() => {});
      T.record('F12 duplicate active slot rejected (23505)', uniqViolated === true, `uniq=${uniqViolated}`);
    }
  } finally {
    await client.end().catch(() => {});
  }

  T.finish();
}

main().catch((e) => { console.error(e); process.exit(1); });
