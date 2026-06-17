import { Router } from 'express'
import { supabase } from '../lib/supabase.js'
import { sendUserKeyEmail } from '../services/email.js'
import { createResourceLimiter } from '../lib/rateLimit.js'

const router = Router()

// POST /api/user-keys/register — Create a new personal key
router.post('/register', createResourceLimiter, async (req, res, next) => {
  try {
    const { key, email } = req.body
    if (!key || key.trim().length < 3) {
      return res.status(400).json({ message: 'Chiave non valida (minimo 3 caratteri)' })
    }

    const normalized = key.trim().toLowerCase()

    // Check uniqueness
    const { data: existing } = await supabase
      .from('user_keys')
      .select('key_value')
      .eq('key_value', normalized)
      .maybeSingle()

    if (existing) {
      return res.status(409).json({ message: 'Codice già in uso, riprova' })
    }

    const { error } = await supabase.from('user_keys').insert({ key_value: normalized })
    if (error) throw error

    // Send key reminder email if provided (non-blocking)
    if (email && email.includes('@')) {
      sendUserKeyEmail({ to: email, key: normalized })
        .catch((err) => console.error('[email] failed to send user key email:', err.message))
    }

    res.status(201).json({ key: normalized })
  } catch (err) {
    next(err)
  }
})

// GET /api/user-keys/:key — Get all links for a key
router.get('/:key', async (req, res, next) => {
  try {
    const normalized = req.params.key.trim().toLowerCase()

    const { data: keyRecord } = await supabase
      .from('user_keys')
      .select('key_value')
      .eq('key_value', normalized)
      .maybeSingle()

    if (!keyRecord) {
      return res.status(404).json({ message: 'Codice non trovato' })
    }

    const { data: links, error } = await supabase
      .from('user_key_links')
      .select('*')
      .eq('user_key', normalized)
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({ links: links || [] })
  } catch (err) {
    next(err)
  }
})

// POST /api/user-keys/:key/link — Add an event or invite link to a key
router.post('/:key/link', createResourceLimiter, async (req, res, next) => {
  try {
    const normalized = req.params.key.trim().toLowerCase()
    const { linkType, token, childName, partyDate, guestName } = req.body

    if (!linkType || !token) {
      return res.status(400).json({ message: 'linkType e token sono obbligatori' })
    }

    // Upsert — silently ignore duplicates
    const { error } = await supabase.from('user_key_links').upsert(
      {
        user_key: normalized,
        link_type: linkType,
        token,
        child_name: childName || null,
        party_date: partyDate || null,
        guest_name: guestName || null,
      },
      { onConflict: 'user_key,token' }
    )

    if (error) throw error

    res.status(201).json({ ok: true })
  } catch (err) {
    next(err)
  }
})

// DELETE /api/user-keys/:key/link/:token — Remove a link from a key
router.delete('/:key/link/:token', async (req, res, next) => {
  try {
    const normalized = req.params.key.trim().toLowerCase()
    const { token } = req.params

    const { error } = await supabase
      .from('user_key_links')
      .delete()
      .eq('user_key', normalized)
      .eq('token', token)

    if (error) throw error

    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
