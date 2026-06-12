import nodemailer from 'nodemailer'
import { supabase } from '../lib/supabase.js'

// ─── Transporter ─────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: parseInt(process.env.SMTP_PORT || '465') === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

const FROM = process.env.SMTP_FROM || 'Piky <noreply@pikyapp.it>'
const BASE = process.env.FRONTEND_URL || 'http://localhost:3000'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('it-IT', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

async function send(to, subject, html) {
  if (!process.env.SMTP_USER) {
    console.log(`[email] SMTP not configured — skipping email to ${to}: ${subject}`)
    return
  }
  try {
    await transporter.sendMail({ from: FROM, to, subject, html })
    console.log(`[email] Sent "${subject}" to ${to}`)
  } catch (err) {
    console.error(`[email] Error sending to ${to}:`, err.message)
  }
}

// ─── Email: evento creato ─────────────────────────────────────────────────────

export async function sendEventCreatedEmail({
  to, childName, partyDate, partyTime, location,
  parentToken, guestToken, collectiveToken,
}) {
  const subject = `🎁 Piky — Lista di ${childName} creata con successo!`
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #4A7A50; padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: white; font-size: 28px; margin: 0; font-family: Georgia, serif;">
          🎁 Piky
        </h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Lista desideri pronta!</p>
      </div>

      <div style="background: #FAF7F2; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #F0EBE3;">
        <h2 style="font-family: Georgia, serif; font-size: 22px; color: #1a1a1a; margin: 0 0 8px;">
          Compleanno di ${childName} 🎂
        </h2>
        <p style="color: #666; margin: 0 0 24px; font-size: 15px;">
          ${formatDate(partyDate)}${partyTime ? ` · ${partyTime.slice(0,5)}` : ''}${location ? ` · ${location}` : ''}
        </p>

        <div style="background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #F0EBE3;">
          <p style="font-size: 13px; font-weight: 600; color: #666; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">
            🔒 Il tuo dashboard (tienilo privato)
          </p>
          <a href="${BASE}/dashboard/${parentToken}"
             style="color: #4A7A50; font-size: 14px; word-break: break-all;">
            ${BASE}/dashboard/${parentToken}
          </a>
        </div>

        <div style="background: #E8C4B8/20; border-radius: 12px; padding: 20px; margin-bottom: 16px; border: 1px solid #E8C4B8;">
          <p style="font-size: 13px; font-weight: 600; color: #666; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">
            🔗 Link per gli invitati
          </p>
          <a href="${BASE}/lista/${guestToken}"
             style="color: #4A7A50; font-size: 14px; word-break: break-all;">
            ${BASE}/lista/${guestToken}
          </a>
        </div>

        ${collectiveToken ? `
        <div style="background: white; border-radius: 12px; padding: 20px; border: 1px solid #F0EBE3;">
          <p style="font-size: 13px; font-weight: 600; color: #666; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.05em;">
            💝 Link regalo collettivo
          </p>
          <a href="${BASE}/collettivo/${collectiveToken}"
             style="color: #4A7A50; font-size: 14px; word-break: break-all;">
            ${BASE}/collettivo/${collectiveToken}
          </a>
        </div>
        ` : ''}

        <p style="color: #999; font-size: 13px; margin: 24px 0 0;">
          Riceverai un promemoria 2 giorni prima della festa e un riepilogo alla chiusura della lista.
        </p>
      </div>
    </div>
  `
  await send(to, subject, html)
}

// ─── Email: promemoria 2 giorni prima ────────────────────────────────────────

export async function sendPartyReminderEmail({ to, childName, partyDate, partyTime, location, guestToken }) {
  const subject = `Piky — Mancano solo 2 giorni al compleanno di ${childName}!`
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #E8C4B8; padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
        <p style="font-size: 13px; font-weight: 600; color: #4A7A50; letter-spacing: 0.08em; text-transform: uppercase; margin: 0 0 12px;">Piky</p>
        <h1 style="color: #1a1a1a; font-size: 24px; margin: 0; font-family: Georgia, serif; line-height: 1.4;">
          Ricordi? Mancano solo 2 giorni<br>al compleanno di ${childName}.
        </h1>
      </div>
      <div style="background: #FAF7F2; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #F0EBE3;">
        <p style="color: #444; font-size: 15px; margin: 0 0 8px; line-height: 1.6;">
          Non vediamo l'ora di vederti e festeggiare insieme.
        </p>
        <p style="color: #444; font-size: 15px; margin: 0 0 24px;">A presto!</p>
        <p style="color: #666; font-size: 14px; margin: 0 0 28px;">
          ${formatDate(partyDate)}${partyTime ? ` · ${partyTime.slice(0,5)}` : ''}${location ? `<br>${location}` : ''}
        </p>
        <a href="${BASE}/lista/${guestToken}"
           style="background: #4A7A50; color: white; padding: 14px 28px; border-radius: 12px;
                  text-decoration: none; font-weight: 600; display: inline-block;">
          Vedi la lista regali
        </a>
        <p style="color: #bbb; font-size: 11px; margin: 20px 0 0; font-style: italic;">
          Hai ancora tempo per prenotare un regalo.
        </p>
      </div>
    </div>
  `
  await send(to, subject, html)
}

// ─── Email: riepilogo finale al genitore ─────────────────────────────────────

export async function sendClosingSummaryEmail({ to, event }) {
  const reserved = event.gifts?.filter((g) => g.reserved_by) || []
  const free = event.gifts?.filter((g) => !g.reserved_by) || []
  const rsvpYes = event.rsvp?.filter((r) => r.status === 'yes') || []
  const collected = event.collective_amount || 0
  const goal = event.collective_goal || 0

  const giftRows = (gifts) =>
    gifts
      .map(
        (g) => `
        <tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0EBE3;">${g.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0EBE3; color: #666;">
            ${g.reserved_by ? `${g.reserved_by}${g.reserved_partner ? ` & ${g.reserved_partner}` : ''}` : '<em>—</em>'}
          </td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #F0EBE3; color: #4A7A50; font-weight: 600;">
            ${g.price ? `€${parseFloat(g.price).toFixed(2)}` : '—'}
          </td>
        </tr>`
      )
      .join('')

  const subject = `🎂 Piky — Riepilogo finale: compleanno di ${event.child_name}`
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #4A7A50; padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: white; font-family: Georgia, serif; margin: 0;">Riepilogo finale 🎂</h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">${event.child_name} · ${formatDate(event.party_date)}</p>
      </div>

      <div style="background: #FAF7F2; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #F0EBE3;">

        <!-- Stats -->
        <div style="display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap;">
          <div style="background: white; border-radius: 12px; padding: 16px 20px; border: 1px solid #F0EBE3; flex: 1; min-width: 120px; text-align: center;">
            <p style="font-size: 24px; font-weight: 700; margin: 0; color: #4A7A50;">${rsvpYes.length}</p>
            <p style="font-size: 12px; color: #999; margin: 4px 0 0;">Confermati</p>
          </div>
          <div style="background: white; border-radius: 12px; padding: 16px 20px; border: 1px solid #F0EBE3; flex: 1; min-width: 120px; text-align: center;">
            <p style="font-size: 24px; font-weight: 700; margin: 0; color: #4A7A50;">${reserved.length}/${event.gifts?.length || 0}</p>
            <p style="font-size: 12px; color: #999; margin: 4px 0 0;">Regali prenotati</p>
          </div>
          ${goal > 0 ? `
          <div style="background: white; border-radius: 12px; padding: 16px 20px; border: 1px solid #F0EBE3; flex: 1; min-width: 120px; text-align: center;">
            <p style="font-size: 24px; font-weight: 700; margin: 0; color: #4A7A50;">€${collected.toFixed(0)}</p>
            <p style="font-size: 12px; color: #999; margin: 4px 0 0;">Collettivo su €${goal.toFixed(0)}</p>
          </div>` : ''}
        </div>

        <!-- Gifts table -->
        <h3 style="font-family: Georgia, serif; font-size: 18px; margin: 0 0 12px;">Lista regali</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #F0EBE3;">
          <thead>
            <tr style="background: #F0EBE3;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #666;">Regalo</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #666;">Prenotato da</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #666;">Prezzo</th>
            </tr>
          </thead>
          <tbody>
            ${giftRows(event.gifts || [])}
          </tbody>
        </table>

        <!-- Contributions -->
        ${event.contributions?.length > 0 ? `
        <h3 style="font-family: Georgia, serif; font-size: 18px; margin: 28px 0 12px;">Contributi regalo collettivo</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; background: white; border-radius: 12px; overflow: hidden; border: 1px solid #F0EBE3;">
          <thead>
            <tr style="background: #F0EBE3;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #666;">Nome</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #666;">Metodo</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #666;">Importo</th>
            </tr>
          </thead>
          <tbody>
            ${event.contributions
              .filter((c) => c.status === 'completed')
              .map(
                (c) => `
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F0EBE3;">${c.contributor_name}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F0EBE3; color: #666; text-transform: capitalize;">${c.payment_method}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #F0EBE3; font-weight: 600; color: #4A7A50;">€${parseFloat(c.amount).toFixed(2)}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>` : ''}

        <p style="color: #999; font-size: 13px; margin: 28px 0 0; text-align: center;">
          Grazie per aver usato Piky 🎁
        </p>
      </div>
    </div>
  `
  await send(to, subject, html)
}

// ─── Email: messaggio di ringraziamento ──────────────────────────────────────

export async function sendThankYouEmail({ to, guestName, childName, message }) {
  const subject = `💝 Un grazie da ${childName}!`
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #E8C4B8; padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="font-family: Georgia, serif; color: #1a1a1a; margin: 0;">💝 Grazie!</h1>
      </div>
      <div style="background: #FAF7F2; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #F0EBE3;">
        <p style="font-size: 16px; margin: 0 0 16px;">Caro/a <strong>${guestName}</strong>,</p>
        <div style="background: white; border-left: 4px solid #4A7A50; padding: 20px; border-radius: 0 12px 12px 0; font-style: italic; color: #333; line-height: 1.7; margin-bottom: 20px;">
          ${message}
        </div>
        <p style="color: #666; font-size: 14px;">Con affetto,<br><strong>${childName} e famiglia</strong></p>
      </div>
    </div>
  `
  await send(to, subject, html)
}

// ─── Email: codice personale ─────────────────────────────────────────────────

export async function sendUserKeyEmail({ to, key }) {
  const subject = `🔑 Il tuo codice Piky: ${key.toUpperCase()}`
  const html = `
    <div style="font-family: Inter, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: #4A7A50; padding: 32px; border-radius: 16px 16px 0 0; text-align: center;">
        <h1 style="color: white; font-size: 28px; margin: 0; font-family: Georgia, serif;">
          🎁 Piky
        </h1>
        <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0;">Il tuo codice personale</p>
      </div>

      <div style="background: #FAF7F2; padding: 32px; border-radius: 0 0 16px 16px; border: 1px solid #F0EBE3;">
        <p style="color: #444; font-size: 15px; margin: 0 0 24px; line-height: 1.6;">
          Ecco il tuo codice personale Piky. Conserva questa email — ti servirà per
          ritrovare le tue liste e i tuoi inviti su qualsiasi dispositivo.
        </p>

        <div style="background: white; border: 2px solid #4A7A50; border-radius: 16px; padding: 28px; text-align: center; margin-bottom: 24px;">
          <p style="font-size: 12px; font-weight: 600; color: #999; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.08em;">
            Il tuo codice
          </p>
          <p style="font-size: 36px; font-weight: 800; color: #4A7A50; letter-spacing: 0.15em; margin: 0; font-family: 'Courier New', monospace;">
            ${key.toUpperCase()}
          </p>
        </div>

        <div style="background: #FFF8E6; border: 1px solid #F5D87A; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="font-size: 13px; color: #7A5C00; margin: 0; line-height: 1.5;">
            <strong>Come usarlo:</strong> apri Piky, tocca "Ho già un codice" e inserisci il codice qui sopra.
            Tutte le tue liste e i tuoi inviti appariranno automaticamente.
          </p>
        </div>

        <a href="${BASE}"
           style="display: inline-block; background: #4A7A50; color: white; padding: 14px 28px;
                  border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 15px;">
          Apri Piky →
        </a>

        <p style="color: #bbb; font-size: 12px; margin: 24px 0 0;">
          Se non hai creato un codice Piky, ignora questa email.
        </p>
      </div>
    </div>
  `
  await send(to, subject, html)
}

// ─── Cron jobs ────────────────────────────────────────────────────────────────

export async function sendReminders() {
  const twoDaysFromNow = new Date()
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
  const dateStr = twoDaysFromNow.toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('*, rsvp(*)')
    .eq('party_date', dateStr)
    .eq('reminder_sent', false)

  if (!events?.length) return

  for (const event of events) {
    const guests = event.rsvp?.filter((r) => r.guest_email && r.status !== 'no') || []

    for (const guest of guests) {
      await sendPartyReminderEmail({
        to: guest.guest_email,
        childName: event.child_name,
        partyDate: event.party_date,
        partyTime: event.party_time,
        location: event.location,
        guestToken: event.guest_token,
      })
    }

    // Mark reminder as sent
    await supabase.from('events').update({ reminder_sent: true }).eq('id', event.id)
    console.log(`[cron] Reminders sent for event ${event.id} (${event.child_name})`)
  }
}

export async function sendClosingSummaries() {
  const today = new Date().toISOString().split('T')[0]

  const { data: events } = await supabase
    .from('events')
    .select('*, gifts(*), rsvp(*), contributions(*)')
    .eq('closing_date', today)
    .eq('summary_sent', false)

  if (!events?.length) return

  for (const event of events) {
    if (!event.parent_email) continue

    await sendClosingSummaryEmail({ to: event.parent_email, event })

    await supabase.from('events').update({ summary_sent: true }).eq('id', event.id)
    console.log(`[cron] Closing summary sent for event ${event.id} (${event.child_name})`)
  }
}

