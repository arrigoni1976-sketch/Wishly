import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { Plus, Trash2, ExternalLink, ChevronLeft, ChevronRight, Check, Gift, Lightbulb, MapPin } from 'lucide-react'
import Layout from '../components/Layout'
import StepIndicator from '../components/StepIndicator'
import CakeIcon from '../components/CakeIcon'
import { createEvent, checkEmailQuota, createStripeCheckout } from '../lib/api'
import { formatEur } from '../lib/format'
import { useAuth } from '../hooks/useAuth'
import { useTranslation } from 'react-i18next'
import AuthModal from '../components/AuthModal'

// ─── Monetizzazione ────────────────────────────────────────────────────────
const PAYMENT_ACTIVE = false
const PRICE_PER_EVENT = 1.99

// Internal routing keys (language-independent)
const STEP_KEYS_LOGGED_IN = ['Info festa', 'Regali', 'Anteprima', 'Crea lista']
const STEP_KEYS_GUEST     = ['Info festa', 'Chi organizza', 'Regali', 'Anteprima', 'Crea lista']

const STEP_FIELDS_MAP = {
  'Info festa':     ['childName', 'partyDate'],
  'Chi organizza':  ['parentEmail'],
  'Regali':         [],
  'Anteprima':      [],
  'Crea lista':     [],
}

// ─── DateInput: GG / MM / AAAA ────────────────────────────────────────────
function DateInput({ value, onChange, onBlur }) {
  const { t } = useTranslation()
  const split = (v) => {
    if (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const [yr, mo, dy] = v.split('-')
      return [dy, mo, yr]
    }
    return ['', '', '']
  }
  const [fields, setFields] = useState(() => split(value))
  const prevVal = useRef(value)
  useEffect(() => {
    if (value !== prevVal.current) { setFields(split(value)); prevVal.current = value }
  }, [value])

  const dayRef = useRef(); const mthRef = useRef(); const yrRef = useRef()
  const [day, month, year] = fields

  const update = (d, m, y) => {
    setFields([d, m, y])
    if (d.length === 2 && m.length === 2 && y.length === 4) {
      const str = `${y}-${m}-${d}`
      onChange(!isNaN(new Date(str).getTime()) ? str : '')
    } else {
      onChange('')
    }
  }

  return (
    <div className="input flex items-center">
      <input ref={dayRef} type="text" inputMode="numeric" placeholder={t('create.step1.date.day')} maxLength={2}
        value={day}
        onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,2); update(v,month,year); if(v.length===2) mthRef.current?.focus() }}
        className="w-7 text-center bg-transparent outline-none" />
      <span className="text-gray-300 select-none mx-0.5">/</span>
      <input ref={mthRef} type="text" inputMode="numeric" placeholder={t('create.step1.date.month')} maxLength={2}
        value={month}
        onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,2); update(day,v,year); if(v.length===2) yrRef.current?.focus() }}
        onKeyDown={(e) => { if(e.key==='Backspace'&&!month) dayRef.current?.focus() }}
        className="w-7 text-center bg-transparent outline-none" />
      <span className="text-gray-300 select-none mx-0.5">/</span>
      <input ref={yrRef} type="text" inputMode="numeric" placeholder={t('create.step1.date.year')} maxLength={4}
        value={year}
        onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,4); update(day,month,v) }}
        onKeyDown={(e) => { if(e.key==='Backspace'&&!year) mthRef.current?.focus() }}
        onBlur={onBlur}
        className="w-14 bg-transparent outline-none" />
    </div>
  )
}

// ─── Step 1: Dettagli della festa ─────────────────────────────────────────
function StepPartyInfo({ register, control, errors, watch, setValue }) {
  const { t } = useTranslation()
  const validYear = (v) => {
    if (!v) return true
    const y = new Date(v).getFullYear()
    return (y >= 1900 && y <= 2099) || t('create.step1.date.year_error')
  }
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
          {t('create.step1.title')}
        </h2>
        <p className="text-gray-500 text-sm">{t('create.step1.subtitle')}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">{t('create.step1.name.label')}</label>
          <div className="flex gap-2">
            <input
              {...register('childName', { required: t('create.error.required') })}
              type="text"
              placeholder={t('create.step1.name.placeholder')}
              className="input flex-1"
            />
            <div className="flex gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setValue('gender', watch('gender') === 'F' ? '' : 'F')}
                className={`w-11 h-11 rounded-xl text-sm font-bold border-2 transition-colors ${
                  watch('gender') === 'F'
                    ? 'bg-cipria border-cipria-dark text-cipria-dark'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-cipria-dark hover:text-cipria-dark'
                }`}
              >
                F
              </button>
              <button
                type="button"
                onClick={() => setValue('gender', watch('gender') === 'M' ? '' : 'M')}
                className={`w-11 h-11 rounded-xl text-sm font-bold border-2 transition-colors ${
                  watch('gender') === 'M'
                    ? 'bg-salvia/20 border-salvia text-salvia'
                    : 'bg-white border-gray-200 text-gray-400 hover:border-salvia hover:text-salvia'
                }`}
              >
                M
              </button>
            </div>
          </div>
          {errors.childName && (
            <p className="text-xs text-red-500 mt-1">{errors.childName.message}</p>
          )}
        </div>

        <div>
          <label className="label">{t('create.step1.date.label')}</label>
          <Controller name="partyDate" control={control} rules={{ required: t('create.error.required'), validate: validYear }}
            render={({ field }) => <DateInput value={field.value||''} onChange={field.onChange} onBlur={field.onBlur} />} />
          {errors.partyDate && (
            <p className="text-xs text-red-500 mt-1">{errors.partyDate.message}</p>
          )}
        </div>

        <div>
          <label className="label">{t('create.step1.time.label')}</label>
          <div className="relative">
            <input
              {...register('partyTime')}
              type="time"
              className="input"
              style={!watch('partyTime') ? { color: 'transparent' } : {}}
            />
            {!watch('partyTime') && (
              <span className="absolute inset-0 flex items-center px-3 text-gray-400 text-sm pointer-events-none">
                {t('create.step1.time.placeholder')}
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="label">{t('create.step1.location.label')}</label>
          <input
            {...register('location')}
            type="text"
            placeholder={t('create.step1.location.placeholder')}
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">{t('create.step1.address.label')}</label>
            {watch('address')?.trim() && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(watch('address').trim())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-salvia hover:underline flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" /> {t('create.step1.address.map_link')}
              </a>
            )}
          </div>
          <input
            {...register('address')}
            type="text"
            placeholder={t('create.step1.address.placeholder')}
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label">{t('create.step1.notes.label')}</label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder={t('create.step1.notes.placeholder')}
            className="input resize-none"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Chi organizza ────────────────────────────────────────────────
function StepListSettings({ register, control, errors, emailQuota, onEmailBlur }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
          {t('create.step2.title')}
        </h2>
        <p className="text-gray-500 text-sm">
          {t('create.step2.subtitle')}
        </p>
      </div>

      <div>
        <label className="label">{t('create.step2.email.label')}</label>
        <input
          {...register('parentEmail', {
            required: t('create.error.required'),
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: t('create.step2.email.error'),
            },
            onBlur: onEmailBlur,
          })}
          type="email"
          placeholder={t('create.step2.email.placeholder')}
          className="input"
        />
        {errors.parentEmail && (
          <p className="text-xs text-red-500 mt-1">{errors.parentEmail.message}</p>
        )}
        {emailQuota?.freeEventUsed && (
          <div className="bg-salvia/5 border border-salvia/20 rounded-2xl p-4 text-sm text-gray-600 mt-3">
            <p className="font-medium text-salvia mb-1">{t('create.step2.returning.title')}</p>
            <p className="text-gray-500">
              {t('create.step2.returning.body', {
                count: emailQuota.eventCount,
                festa: emailQuota.eventCount === 1 ? 'festa' : 'feste',
                next: emailQuota.eventCount + 1,
              })}
              {!PAYMENT_ACTIVE && ' ' + t('create.step2.returning.free')}
            </p>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Card regalo collettivo ──────────────────────────────────────────────
function CollectiveGiftCard({ register, watch, setValue }) {
  const { t } = useTranslation()
  const collectiveEnabled = watch('collectiveEnabled')
  const fixedQuotaEnabled = watch('fixedQuotaEnabled')

  return (
    <div className="bg-white border border-avorio-dark rounded-2xl p-4 space-y-3 relative">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {t('create.collective.title')}
        </span>
        <div
          className={`w-10 h-5 rounded-full transition-colors duration-200 relative cursor-pointer flex-shrink-0 ${
            collectiveEnabled ? 'bg-salvia' : 'bg-gray-200'
          }`}
          onClick={() => setValue('collectiveEnabled', !collectiveEnabled)}
        >
          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
            collectiveEnabled ? 'translate-x-5' : 'translate-x-0.5'
          }`} />
        </div>
      </div>

      {!collectiveEnabled ? (
        <p
          className="text-sm text-gray-400 cursor-pointer"
          onClick={() => setValue('collectiveEnabled', true)}
        >
          {t('create.collective.hint')}
        </p>
      ) : (
        <div className="space-y-3 animate-fade-in">
          <input
            {...register('collectiveGoal', {
              required: collectiveEnabled ? t('create.collective.goal.error') : false,
              min: { value: 10, message: t('create.collective.goal.min_error') },
            })}
            type="number"
            min={10}
            step={5}
            placeholder={t('create.collective.goal.placeholder')}
            className="input text-sm"
          />

          <input
            {...register('collectiveDescription')}
            type="text"
            placeholder={t('create.collective.description.placeholder')}
            className="input text-sm"
          />

          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setValue('fixedQuotaEnabled', !fixedQuotaEnabled)}
          >
            <span className="text-sm text-gray-600">{t('create.collective.fixed_quota.label')}</span>
            <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${fixedQuotaEnabled ? 'bg-salvia' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${fixedQuotaEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>

          {fixedQuotaEnabled && (
            <input
              {...register('collectiveFixedQuota', {
                required: fixedQuotaEnabled ? t('create.collective.fixed_quota.error') : false,
                min: { value: 1, message: t('create.collective.fixed_quota.min_error') },
              })}
              type="number"
              min={1}
              placeholder={t('create.collective.fixed_quota.placeholder')}
              className="input text-sm"
            />
          )}

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium select-none">{t('create.collective.paypal.prefix')}</span>
            <input
              {...register('paypalEmail')}
              type="text"
              placeholder={t('create.collective.paypal.placeholder')}
              className="input text-sm pl-[5.5rem]"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 3: Aggiungi regali ───────────────────────────────────────────────
function StepGifts({ control, register, watch, setValue }) {
  const { t } = useTranslation()
  const { fields, append, remove } = useFieldArray({ control, name: 'gifts' })

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
          {t('create.step3.title')}
        </h2>
        <p className="text-gray-500 text-sm">
          {t('create.step3.subtitle')}
        </p>
      </div>

      <div className="space-y-3">
        <CollectiveGiftCard register={register} watch={watch} setValue={setValue} />

        <div className="pt-3">
          <h3 className="font-display text-xl font-bold text-gray-900">
            {t('create.step3.list.title')}
          </h3>
          <p className="text-sm text-gray-400 mt-0.5">{t('create.step3.list.hint')}</p>
        </div>

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="bg-white border border-avorio-dark rounded-2xl p-4 space-y-3 relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                {t('create.gift.card_label', { index: index + 1 })}
              </span>
              <button
                type="button"
                onClick={() => remove(index)}
                className="p-1 rounded-lg text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <input
              {...register(`gifts.${index}.name`, { required: true })}
              type="text"
              placeholder={t('create.gift.name.placeholder')}
              className="input text-sm"
            />

            <input
              {...register(`gifts.${index}.description`)}
              type="text"
              placeholder={t('create.gift.description.placeholder')}
              className="input text-sm"
            />

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">€</span>
                <input
                  {...register(`gifts.${index}.price`)}
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder={t('create.gift.price.placeholder')}
                  className="input text-sm pl-7"
                />
              </div>
              <div className="col-span-1" />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400 w-4 h-4" />
                <input
                  {...register(`gifts.${index}.amazonUrl`)}
                  type="url"
                  placeholder={t('create.gift.amazon.placeholder')}
                  className="input text-sm pl-9"
                />
              </div>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
                <input
                  {...register(`gifts.${index}.storeUrl`)}
                  type="url"
                  placeholder={t('create.gift.store.placeholder')}
                  className="input text-sm pl-9"
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => append({ name: '', description: '', price: '', amazonUrl: '', storeUrl: '' })}
        className="w-full py-3 border-2 border-dashed border-cipria-dark rounded-2xl text-cipria-dark font-medium text-sm flex items-center justify-center gap-2 hover:bg-cipria/10 transition-colors"
      >
        <Plus className="w-4 h-4" />
        {t('create.gift.add_btn')}
      </button>

      {fields.length === 0 && (
        <p className="text-center text-sm text-gray-400 bg-avorio-dark rounded-2xl py-4">
          {t('create.gift.empty_hint')}
        </p>
      )}
    </div>
  )
}

// ─── Step 4: Conferma e riepilogo ──────────────────────────────────────────
function StepConfirm({ data }) {
  const { t, i18n } = useTranslation()
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
          {t('create.step4.title')}
        </h2>
        <p className="text-gray-500 text-sm">{t('create.step4.subtitle')}</p>
      </div>

      <div className="bg-white border border-avorio-dark rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-3 pb-3 border-b border-avorio-dark">
          <div className="w-10 h-10 bg-cipria rounded-xl flex items-center justify-center">
            <CakeIcon size={24} />
          </div>
          <div>
            <p className="font-bold text-gray-900 font-display text-lg">{data.childName || '—'}</p>
            <p className="text-sm text-gray-500">
              {data.partyDate
                ? new Date(data.partyDate).toLocaleDateString(i18n.language === 'en' ? 'en-GB' : 'it-IT', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'}
              {data.partyTime ? ` · ${data.partyTime}` : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-gray-400">{t('create.confirm.location.label')}</span>
            <p className="font-medium text-gray-700">{data.location || '—'}</p>
            {data.address && <p className="text-xs text-gray-500 mt-0.5">{data.address}</p>}
          </div>
          <div>
            <span className="text-gray-400">{t('create.confirm.gifts.label')}</span>
            <p className="font-medium text-gray-700">{data.gifts?.length || 0} {t('create.confirm.gifts.unit')}</p>
          </div>
        </div>

        {data.notes && (
          <div className="pt-2 border-t border-avorio-dark">
            <span className="text-gray-400 text-xs">{t('create.confirm.notes.label')}</span>
            <p className="text-sm text-gray-700 mt-0.5">{data.notes}</p>
          </div>
        )}

        {data.collectiveEnabled && (
          <div className="pt-2 border-t border-avorio-dark">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-salvia bg-salvia/10 px-3 py-1 rounded-full">
              <Gift className="w-3.5 h-3.5" />
              {t('create.confirm.collective', { goal: formatEur(data.collectiveGoal) })}
            </span>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Step: Payment gate ───────────────────────────────────────────────────
function StepPaymentGate() {
  const { t } = useTranslation()
  return (
    <div className="space-y-5 animate-fade-in text-center">
      <div>
        <div className="flex justify-center mb-4">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Cono */}
            <path d="M12 44 L28 8 L44 44 Z" fill="#E8C4B8" stroke="#d4a090" strokeWidth="1.5" strokeLinejoin="round"/>
            {/* Striscia verticale cono */}
            <line x1="28" y1="8" x2="28" y2="44" stroke="#d4a090" strokeWidth="1" opacity="0.5"/>
            {/* Bordo apertura */}
            <ellipse cx="28" cy="44" rx="16" ry="4" fill="#d4a090" opacity="0.6"/>
            {/* Coriandoli */}
            <rect x="8" y="14" width="5" height="3" rx="1.5" fill="#4A7A50" transform="rotate(-30 8 14)"/>
            <rect x="40" y="10" width="4" height="2.5" rx="1.2" fill="#4A7A50" transform="rotate(20 40 10)"/>
            <circle cx="6" cy="26" r="2.5" fill="#E8C4B8" stroke="#d4a090" strokeWidth="1"/>
            <circle cx="48" cy="22" r="2" fill="#4A7A50"/>
            <rect x="36" y="18" width="4" height="2.5" rx="1.2" fill="#d4a090" transform="rotate(-15 36 18)"/>
            <rect x="10" y="32" width="4" height="2.5" rx="1.2" fill="#4A7A50" transform="rotate(25 10 32)"/>
            <circle cx="44" cy="34" r="1.8" fill="#E8C4B8" stroke="#d4a090" strokeWidth="1"/>
            <rect x="20" y="4" width="3.5" height="2" rx="1" fill="#4A7A50" transform="rotate(10 20 4)"/>
          </svg>
        </div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">
          {t('create.step5.title')}
        </h2>
        <p className="text-gray-500 text-sm">
          {t('create.step5.subtitle')}
        </p>
      </div>
      {!PAYMENT_ACTIVE && (
        <div className="bg-salvia/5 border border-salvia/20 rounded-2xl p-4 flex items-center gap-3">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
            {/* Scatola regalo */}
            <rect x="4" y="16" width="24" height="13" rx="2" fill="#E8C4B8"/>
            <rect x="4" y="16" width="24" height="13" rx="2" stroke="#d4a090" strokeWidth="1"/>
            {/* Coperchio */}
            <rect x="3" y="12" width="26" height="6" rx="2" fill="#d4a090"/>
            {/* Nastro verticale */}
            <rect x="14" y="12" width="4" height="17" fill="#4A7A50"/>
            {/* Nastro orizzontale coperchio */}
            <rect x="3" y="14" width="26" height="2" fill="#4A7A50"/>
            {/* Fiocco sinistro */}
            <path d="M16 12 C13 8 8 8 9 12" stroke="#4A7A50" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
            {/* Fiocco destro */}
            <path d="M16 12 C19 8 24 8 23 12" stroke="#4A7A50" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
          </svg>
          <div className="text-left">
            <p className="font-medium text-salvia text-sm">{t('create.step5.free.title')}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t('create.step5.free.body')}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function CreateEventPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { t } = useTranslation()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailQuota, setEmailQuota] = useState(null)

  const stepKeys = user ? STEP_KEYS_LOGGED_IN : STEP_KEYS_GUEST

  const STEP_LABEL_MAP = {
    'Info festa':    t('create.step.party_info'),
    'Chi organizza': t('create.step.organizer'),
    'Regali':        t('create.step.gifts'),
    'Anteprima':     t('create.step.preview'),
    'Crea lista':    t('create.step.create'),
  }
  const stepLabels = stepKeys.map((k) => STEP_LABEL_MAP[k] || k)

  useEffect(() => {
    if (!authLoading && !user) setShowAuthModal(true)
  }, [user, authLoading])

  const handleEmailBlur = async (e) => {
    const email = e.target.value.trim()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    try {
      const res = await checkEmailQuota(email)
      setEmailQuota(res.data)
    } catch { /* non bloccare */ }
  }

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    trigger,
  } = useForm({
    defaultValues: {
      childName: '',
      gender: '',
      partyDate: '',
      partyTime: '',
      location: '',
      address: '',
      notes: '',
      parentEmail: '',
      closingDate: '',
      collectiveEnabled: false,
      collectiveGoal: '',
      collectiveDescription: '',
      paypalEmail: '',
      fixedQuotaEnabled: false,
      collectiveFixedQuota: '',
      gifts: [],
    },
  })

  const watchedData = watch()

  useEffect(() => {
    if (user?.email) setValue('parentEmail', user.email)
  }, [user])

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('piky_create_draft')
      if (saved) {
        const vals = JSON.parse(saved)
        Object.entries(vals).forEach(([k, v]) => {
          if (v !== undefined && v !== null) setValue(k, v)
        })
      }
    } catch {}
  }, [])

  useEffect(() => {
    const subscription = watch((vals) => {
      try { sessionStorage.setItem('piky_create_draft', JSON.stringify(vals)) } catch {}
    })
    return () => subscription.unsubscribe()
  }, [watch])

  const handleNext = async () => {
    const stepKey = stepKeys[currentStep - 1]
    let fields = STEP_FIELDS_MAP[stepKey] || []
    if (stepKey === 'Regali' && watchedData.collectiveEnabled) {
      fields = ['collectiveGoal']
      if (watchedData.fixedQuotaEnabled) fields.push('collectiveFixedQuota')
    }
    const valid = await trigger(fields)
    if (!valid) return
    setCurrentStep((s) => Math.min(s + 1, stepKeys.length))
  }

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1))

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')
    try {
      const utmSource = sessionStorage.getItem('utm_source') || undefined
      const utmMedium = sessionStorage.getItem('utm_medium') || undefined
      const utmCampaign = sessionStorage.getItem('utm_campaign') || undefined
      const referralSource = sessionStorage.getItem('referral_source') || undefined
      const payload = { ...data, utmSource, utmMedium, utmCampaign, referralSource }

      if (PAYMENT_ACTIVE) {
        const res = await createStripeCheckout(payload)
        sessionStorage.removeItem('piky_create_draft')
        window.location.href = res.data.checkoutUrl
      } else {
        const res = await createEvent(payload)
        sessionStorage.removeItem('piky_create_draft')
        navigate(`/dashboard/${res.data.parentToken}?nuovo=1`)
      }
    } catch (e) {
      setError(e?.response?.data?.message || t('create.error.generic'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <AuthModal
        isOpen={showAuthModal}
        initialMode="register"
        onClose={() => { if (!user) navigate('/') }}
        onSuccess={() => setShowAuthModal(false)}
      />
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-salvia mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            {t('create.header.back')}
          </Link>
          <h1 className="font-display text-3xl font-bold text-gray-900">{t('create.header.title')}</h1>
        </div>

        <StepIndicator steps={stepLabels} currentStep={currentStep} />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card mb-6">
            {stepKeys[currentStep - 1] === 'Info festa'    && <StepPartyInfo register={register} control={control} errors={errors} watch={watch} setValue={setValue} />}
            {stepKeys[currentStep - 1] === 'Chi organizza' && <StepListSettings register={register} control={control} errors={errors} emailQuota={emailQuota} onEmailBlur={handleEmailBlur} />}
            {stepKeys[currentStep - 1] === 'Regali'        && <StepGifts control={control} register={register} watch={watch} setValue={setValue} />}
            {stepKeys[currentStep - 1] === 'Anteprima'     && <StepConfirm data={watchedData} />}
            {stepKeys[currentStep - 1] === 'Crea lista'    && <StepPaymentGate />}
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-4 bg-red-50 px-4 py-3 rounded-xl">{error}</p>
          )}

          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-1.5 btn-outline flex-1 justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
                {t('create.nav.back')}
              </button>
            )}

            {currentStep < stepKeys.length ? (
              <button
                key="next"
                type="button"
                onClick={handleNext}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5"
              >
                {t('create.nav.next')}
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                key="submit"
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    {t('create.nav.submit.loading')}
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    {t('create.nav.submit.btn')}
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </Layout>
  )
}
