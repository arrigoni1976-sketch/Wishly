import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { Plus, Trash2, ExternalLink, ChevronLeft, ChevronRight, Check, Gift, Lightbulb, MapPin } from 'lucide-react'
import Layout from '../components/Layout'
import StepIndicator from '../components/StepIndicator'
import CakeIcon from '../components/CakeIcon'
import { createEvent, addUserKeyLink, checkEmailQuota } from '../lib/api'

// ─── Monetizzazione ────────────────────────────────────────────────────────
// Imposta su true quando vuoi attivare il pagamento per il secondo evento
const PAYMENT_ACTIVE = false
const PRICE_PER_EVENT = 1.29

const STEPS = ['Info festa', 'La tua lista', 'Regali', 'Conferma']

// ─── DateInput: GG / MM / AAAA ────────────────────────────────────────────
function DateInput({ value, onChange, onBlur }) {
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
      <input ref={dayRef} type="text" inputMode="numeric" placeholder="GG" maxLength={2}
        value={day}
        onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,2); update(v,month,year); if(v.length===2) mthRef.current?.focus() }}
        className="w-7 text-center bg-transparent outline-none" />
      <span className="text-gray-300 select-none mx-0.5">/</span>
      <input ref={mthRef} type="text" inputMode="numeric" placeholder="MM" maxLength={2}
        value={month}
        onChange={(e) => { const v = e.target.value.replace(/\D/g,'').slice(0,2); update(day,v,year); if(v.length===2) yrRef.current?.focus() }}
        onKeyDown={(e) => { if(e.key==='Backspace'&&!month) dayRef.current?.focus() }}
        className="w-7 text-center bg-transparent outline-none" />
      <span className="text-gray-300 select-none mx-0.5">/</span>
      <input ref={yrRef} type="text" inputMode="numeric" placeholder="AAAA" maxLength={4}
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
  const validYear = (v) => {
    if (!v) return true
    const y = new Date(v).getFullYear()
    return (y >= 1900 && y <= 2099) || 'Anno non valido'
  }
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
          Chi festeggia?
        </h2>
        <p className="text-gray-500 text-sm">Inserisci i dettagli del compleanno</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Nome del festeggiato *</label>
          <div className="flex gap-2">
            <input
              {...register('childName', { required: 'Campo obbligatorio' })}
              type="text"
              placeholder="Es. Sofia"
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
          <label className="label">Data della festa *</label>
          <Controller name="partyDate" control={control} rules={{ required: 'Campo obbligatorio', validate: validYear }}
            render={({ field }) => <DateInput value={field.value||''} onChange={field.onChange} onBlur={field.onBlur} />} />
          {errors.partyDate && (
            <p className="text-xs text-red-500 mt-1">{errors.partyDate.message}</p>
          )}
        </div>

        <div>
          <label className="label">Orario</label>
          <input
            {...register('partyTime')}
            type="time"
            className="input"
            defaultValue="16:00"
          />
        </div>

        <div>
          <label className="label">Luogo</label>
          <input
            {...register('location')}
            type="text"
            placeholder="Es. Oratorio di Vercurago, Bar Centrale"
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Aggiungi indirizzo</label>
            {watch('address')?.trim() && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(watch('address').trim())}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-salvia hover:underline flex items-center gap-1"
              >
                <MapPin className="w-3 h-3" /> Verifica su mappa →
              </a>
            )}
          </div>
          <input
            {...register('address')}
            type="text"
            placeholder="Es. Via Roma 12, Vercurago BG"
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label">Note per gli invitati</label>
          <textarea
            {...register('notes')}
            rows={3}
            placeholder="Es. Parcheggio disponibile, tema festa, cosa portare..."
            className="input resize-none"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Step 2: Chi organizza ────────────────────────────────────────────────
function StepListSettings({ register, control, errors, emailQuota, onEmailBlur }) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
          Chi organizza?
        </h2>
        <p className="text-gray-500 text-sm">
          La tua email ci permette di ritrovare il tuo evento
        </p>
      </div>

      <div>
        <label className="label">La tua email *</label>
        <input
          {...register('parentEmail', {
            required: 'Campo obbligatorio',
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: 'Email non valida',
            },
            onBlur: onEmailBlur,
          })}
          type="email"
          placeholder="nome@esempio.it"
          className="input"
        />
        {errors.parentEmail && (
          <p className="text-xs text-red-500 mt-1">{errors.parentEmail.message}</p>
        )}
        {/* Banner utente di ritorno — informativo finché PAYMENT_ACTIVE = false */}
        {emailQuota?.freeEventUsed && (
          <div className="bg-salvia/5 border border-salvia/20 rounded-2xl p-4 text-sm text-gray-600 mt-3">
            <p className="font-medium text-salvia mb-1">Bentornato su Piky! 👋</p>
            <p className="text-gray-500">
              Hai già creato {emailQuota.eventCount} {emailQuota.eventCount === 1 ? 'festa' : 'feste'} con questa email — stai organizzando il tuo{' '}
              <strong>{emailQuota.eventCount + 1}° compleanno</strong>.
              {!PAYMENT_ACTIVE && ' Piky è ancora completamente gratuita, goditi la festa!'}
            </p>
          </div>
        )}
      </div>

      <div>
        <label className="label">Chiudi le prenotazioni il</label>
        <Controller name="closingDate" control={control}
          render={({ field }) => <DateInput value={field.value||''} onChange={field.onChange} onBlur={field.onBlur} />} />
        <p className="text-xs text-gray-400 mt-1.5">
          Dopo questa data gli invitati non potranno più prenotare regali né confermare la presenza.
        </p>
      </div>

    </div>
  )
}

// ─── Card regalo collettivo (dentro step 3, stile identico ai gift card) ──
function CollectiveGiftCard({ register, watch, setValue }) {
  const collectiveEnabled = watch('collectiveEnabled')
  const fixedQuotaEnabled = watch('fixedQuotaEnabled')

  return (
    <div className="bg-white border border-avorio-dark rounded-2xl p-4 space-y-3 relative">
      {/* Header card — identico ai gift card */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Regalo collettivo
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
          Attiva per raccogliere una quota dagli invitati — es. per un regalo importante insieme
        </p>
      ) : (
        <div className="space-y-3 animate-fade-in">
          <input
            {...register('collectiveGoal', {
              required: collectiveEnabled ? 'Inserisci un obiettivo' : false,
              min: { value: 10, message: 'Minimo €10' },
            })}
            type="number"
            min={10}
            step={5}
            placeholder="Obiettivo (€) *"
            className="input text-sm"
          />

          <input
            {...register('collectiveDescription')}
            type="text"
            placeholder="Descrizione (opzionale) — es. Per la bicicletta di Sofia"
            className="input text-sm"
          />

          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setValue('fixedQuotaEnabled', !fixedQuotaEnabled)}
          >
            <span className="text-sm text-gray-600">Quota fissa per persona</span>
            <div className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${fixedQuotaEnabled ? 'bg-salvia' : 'bg-gray-200'}`}>
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${fixedQuotaEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>

          {fixedQuotaEnabled && (
            <input
              {...register('collectiveFixedQuota', {
                required: fixedQuotaEnabled ? 'Inserisci la quota' : false,
                min: { value: 1, message: 'Minimo €1' },
              })}
              type="number"
              min={1}
              placeholder="Quota per persona (€) *"
              className="input text-sm"
            />
          )}

          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-medium select-none">paypal.me/</span>
            <input
              {...register('paypalEmail')}
              type="text"
              placeholder="username (opzionale)"
              className="input text-sm pl-[5.5rem]"
            />
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Aggiungi regali ───────────────────────────────────────────────
function StepGifts({ control, register, watch, setValue }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'gifts' })

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
          Regali desiderati
        </h2>
        <p className="text-gray-500 text-sm">
          Aggiungi i regali che vuoi. Puoi modificarli anche dopo.
        </p>
      </div>

      <div className="space-y-3">
        {/* Card regalo collettivo — stesso stile dei gift card */}
        <CollectiveGiftCard register={register} watch={watch} setValue={setValue} />

        {/* Separatore visivo tra collettivo e lista regali */}
        <div className="flex items-center gap-3 py-1">
          <div className="flex-1 h-px bg-avorio-dark" />
          <span className="text-xs text-gray-400 font-medium uppercase tracking-widest">Regali della lista</span>
          <div className="flex-1 h-px bg-avorio-dark" />
        </div>

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="bg-white border border-avorio-dark rounded-2xl p-4 space-y-3 relative"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                Regalo {index + 1}
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
              placeholder="Nome del regalo *"
              className="input text-sm"
            />

            <input
              {...register(`gifts.${index}.description`)}
              type="text"
              placeholder="Descrizione (opzionale)"
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
                  placeholder="Prezzo"
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
                  placeholder="Link Amazon"
                  className="input text-sm pl-9"
                />
              </div>
              <div className="relative">
                <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
                <input
                  {...register(`gifts.${index}.storeUrl`)}
                  type="url"
                  placeholder="Link negozio"
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
        Aggiungi regalo
      </button>

      {fields.length === 0 && (
        <p className="text-center text-sm text-gray-400 bg-avorio-dark rounded-2xl py-4">
          Puoi aggiungere regali anche dopo, direttamente dalla tua lista
        </p>
      )}
    </div>
  )
}

// ─── Step 5: Conferma e riepilogo ──────────────────────────────────────────
function StepConfirm({ data }) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
          Quasi pronto!
        </h2>
        <p className="text-gray-500 text-sm">Controlla i dati prima di creare la lista</p>
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
                ? new Date(data.partyDate).toLocaleDateString('it-IT', {
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
            <span className="text-gray-400">Luogo</span>
            <p className="font-medium text-gray-700">{data.location || '—'}</p>
            {data.address && <p className="text-xs text-gray-500 mt-0.5">{data.address}</p>}
          </div>
          <div>
            <span className="text-gray-400">Email</span>
            <p className="font-medium text-gray-700 truncate">{data.parentEmail || '—'}</p>
          </div>
          <div>
            <span className="text-gray-400">Chiusura lista</span>
            <p className="font-medium text-gray-700">
              {data.closingDate
                ? new Date(data.closingDate).toLocaleDateString('it-IT')
                : 'Non impostata'}
            </p>
          </div>
          <div>
            <span className="text-gray-400">Regali</span>
            <p className="font-medium text-gray-700">{data.gifts?.length || 0} regali</p>
          </div>
        </div>

        {data.collectiveEnabled && (
          <div className="pt-2 border-t border-avorio-dark">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-salvia bg-salvia/10 px-3 py-1 rounded-full">
              <Gift className="w-3.5 h-3.5" />
              Regalo collettivo: obiettivo €{data.collectiveGoal}
            </span>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────
export default function CreateEventPage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [emailQuota, setEmailQuota] = useState(null)

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
      partyTime: '16:00',
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

  // Restore draft from sessionStorage on mount
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

  // Save draft to sessionStorage on every change
  useEffect(() => {
    const subscription = watch((vals) => {
      try { sessionStorage.setItem('piky_create_draft', JSON.stringify(vals)) } catch {}
    })
    return () => subscription.unsubscribe()
  }, [watch])

  const STEP_FIELDS = {
    1: ['childName', 'partyDate'],
    2: ['parentEmail'],
    3: [],
    4: [],
  }

  const handleNext = async () => {
    let fields = STEP_FIELDS[currentStep]
    if (currentStep === 3 && watchedData.collectiveEnabled) {
      fields = ['collectiveGoal']
      if (watchedData.fixedQuotaEnabled) fields.push('collectiveFixedQuota')
    }
    const valid = await trigger(fields)
    if (!valid) return

    // Quando PAYMENT_ACTIVE = true, aggiungere qui il blocco se freeEventUsed

    setCurrentStep((s) => Math.min(s + 1, 4))
  }

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 1))

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')
    try {
      const res = await createEvent(data)

      // Salva in localStorage
      const saved = JSON.parse(localStorage.getItem('piky_events') || '[]')
      saved.unshift({
        childName: data.childName,
        partyDate: data.partyDate,
        parentToken: res.data.parentToken,
        createdAt: new Date().toISOString(),
      })
      localStorage.setItem('piky_events', JSON.stringify(saved.slice(0, 10)))

      // Associa alla chiave personale (non bloccante)
      const userKey = localStorage.getItem('piky_user_key')
      if (userKey) {
        addUserKeyLink(userKey, {
          linkType: 'event',
          token: res.data.parentToken,
          childName: data.childName,
          partyDate: data.partyDate,
        }).catch(() => {})
      }

      sessionStorage.removeItem('piky_create_draft')
      navigate(`/dashboard/${res.data.parentToken}?nuovo=1`)
    } catch (e) {
      setError(e?.response?.data?.message || 'Errore nella creazione. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout>
      <div className="max-w-xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-salvia mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            Torna alla home
          </Link>
          <h1 className="font-display text-3xl font-bold text-gray-900">Organizza la festa</h1>
        </div>

        <StepIndicator steps={STEPS} currentStep={currentStep} />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card mb-6">
            {currentStep === 1 && <StepPartyInfo register={register} control={control} errors={errors} watch={watch} setValue={setValue} />}
            {currentStep === 2 && <StepListSettings register={register} control={control} errors={errors} emailQuota={emailQuota} onEmailBlur={handleEmailBlur} />}
            {currentStep === 3 && <StepGifts control={control} register={register} watch={watch} setValue={setValue} />}
            {currentStep === 4 && <StepConfirm data={watchedData} />}
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
                Indietro
              </button>
            )}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-primary flex-1 flex items-center justify-center gap-1.5"
              >
                Avanti
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2 text-base"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Creo la lista...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Organizza la festa
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

