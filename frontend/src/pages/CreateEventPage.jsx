import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { Plus, Trash2, ExternalLink, ChevronLeft, ChevronRight, Check, Gift, Mail, Lightbulb } from 'lucide-react'
import Layout from '../components/Layout'
import StepIndicator from '../components/StepIndicator'
import CakeIcon from '../components/CakeIcon'
import { createEvent, addUserKeyLink } from '../lib/api'

const STEPS = ['Info festa', 'Lista', 'Collettivo', 'Regali', 'Conferma']

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
          <label className="label">Data di nascita</label>
          <Controller name="birthDate" control={control} rules={{ validate: validYear }}
            render={({ field }) => <DateInput value={field.value||''} onChange={field.onChange} onBlur={field.onBlur} />} />
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
            placeholder="Es. Giardino di casa, Sala feste..."
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

// ─── Step 2: Impostazioni lista ────────────────────────────────────────────
function StepListSettings({ register, control, errors }) {
  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
          Impostazioni lista
        </h2>
        <p className="text-gray-500 text-sm">
          Riceverai i link e le notifiche su questa email
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
          })}
          type="email"
          placeholder="nome@esempio.it"
          className="input"
        />
        {errors.parentEmail && (
          <p className="text-xs text-red-500 mt-1">{errors.parentEmail.message}</p>
        )}
      </div>

      <div>
        <label className="label">Data chiusura lista</label>
        <Controller name="closingDate" control={control}
          render={({ field }) => <DateInput value={field.value||''} onChange={field.onChange} onBlur={field.onBlur} />} />
        <p className="text-xs text-gray-400 mt-1.5">
          Dopo questa data gli invitati non potranno più prenotare. Ti verrà inviato un riepilogo
          finale.
        </p>
      </div>

      <div className="bg-cipria/10 border border-cipria/30 rounded-2xl p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-700 mb-1"><span className="flex items-center gap-1.5"><Mail className="w-4 h-4 text-salvia" /> Cosa riceverai:</span></p>
        <ul className="space-y-1 text-gray-500">
          <li>· I link per condividere la lista</li>
          <li>· Un promemoria quando mancano 2 giorni alla festa</li>
          <li>· Il riepilogo completo alla chiusura della lista</li>
        </ul>
      </div>
    </div>
  )
}

// ─── Step 3: Regalo collettivo (opzionale) ─────────────────────────────────
function StepCollective({ register, watch, setValue }) {
  const collectiveEnabled = watch('collectiveEnabled')
  const fixedQuotaEnabled = watch('fixedQuotaEnabled')

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h2 className="font-display text-2xl font-bold text-gray-900 mb-1">
          Regalo collettivo
        </h2>
        <p className="text-gray-500 text-sm">Opzionale — gli invitati prenotano una quota e portano i contanti alla festa</p>
      </div>

      <div
        className="flex items-center justify-between p-4 bg-white rounded-2xl border border-avorio-dark cursor-pointer"
        onClick={() => setValue('collectiveEnabled', !collectiveEnabled)}
      >
        <div>
          <p className="font-medium text-gray-800">Attiva il regalo collettivo</p>
          <p className="text-sm text-gray-500">
            Gli invitati prenotano la loro quota e portano i contanti il giorno della festa
          </p>
        </div>
        <div
          className={`w-12 h-6 rounded-full transition-colors duration-200 relative ${
            collectiveEnabled ? 'bg-salvia' : 'bg-gray-200'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
              collectiveEnabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </div>
      </div>

      {collectiveEnabled && (
        <div className="space-y-4 animate-fade-in">
          <div>
            <label className="label">Obiettivo (€) *</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
              <input
                {...register('collectiveGoal', {
                  required: collectiveEnabled ? 'Inserisci un obiettivo' : false,
                  min: { value: 10, message: 'Minimo €10' },
                })}
                type="number"
                min={10}
                step={5}
                placeholder="200"
                className="input pl-8"
              />
            </div>
          </div>

          <div>
            <label className="label">Descrizione (opzionale)</label>
            <textarea
              {...register('collectiveDescription')}
              rows={2}
              placeholder="Es. Per comprare la bicicletta che Sofia desidera..."
              className="input resize-none"
            />
          </div>

          {/* Quota fissa */}
          <div
            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-avorio-dark cursor-pointer"
            onClick={() => setValue('fixedQuotaEnabled', !fixedQuotaEnabled)}
          >
            <div>
              <p className="font-medium text-gray-800 text-sm">Quota fissa per persona</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Ogni invitato paga lo stesso importo — nessuna scelta
              </p>
            </div>
            <div
              className={`w-12 h-6 rounded-full transition-colors duration-200 relative flex-shrink-0 ${
                fixedQuotaEnabled ? 'bg-salvia' : 'bg-gray-200'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                  fixedQuotaEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </div>
          </div>

          {fixedQuotaEnabled && (
            <div className="animate-fade-in">
              <label className="label">Quota per persona (€) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                <input
                  {...register('collectiveFixedQuota', {
                    required: fixedQuotaEnabled ? 'Inserisci la quota' : false,
                    min: { value: 1, message: 'Minimo €1' },
                  })}
                  type="number"
                  min={1}
                  step={1}
                  placeholder="20"
                  className="input pl-8"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Ogni invitato vedrà solo questo importo, senza poterlo modificare
              </p>
            </div>
          )}

          <div>
            <label className="label">Username PayPal.me (opzionale)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-medium select-none">paypal.me/</span>
              <input
                {...register('paypalEmail')}
                type="text"
                placeholder="tuousername"
                className="input pl-[5.5rem]"
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Gli invitati potranno pagarti direttamente con un click. Lo username lo trovi su{' '}
              <a
                href="https://www.paypal.com/myaccount/settings/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-salvia underline hover:text-salvia-dark"
              >
                paypal.com → Impostazioni → PayPal.me
              </a>.
            </p>
          </div>

          <div className="bg-salvia/5 border border-salvia/20 rounded-2xl p-4 text-sm">
            <p className="font-medium text-salvia mb-2 flex items-center gap-1.5"><Lightbulb className="w-4 h-4" /> Come funziona:</p>
            <ul className="space-y-1 text-gray-600">
              <li>· Ogni contributo minimo è €10</li>
              <li>· Il massimo è l'importo rimanente all'obiettivo</li>
              <li>· I fondi ti vengono trasferiti al raggiungimento dell'obiettivo</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Aggiungi regali ───────────────────────────────────────────────
function StepGifts({ control, register, watch }) {
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

      <div className="bg-cipria/10 border border-cipria/30 rounded-2xl p-4 text-sm text-gray-600">
        <p className="font-medium text-gray-700 mb-1 flex items-center gap-1.5"><Mail className="w-4 h-4 text-salvia" /> Dopo la creazione riceverai:</p>
        <ul className="space-y-1 text-gray-500">
          <li>· Link di gestione lista (solo per te)</li>
          <li>· Link lista per gli invitati</li>
        </ul>
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
      birthDate: '',
      partyDate: '',
      partyTime: '16:00',
      location: '',
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

  const STEP_FIELDS = {
    1: ['childName', 'partyDate'],
    2: ['parentEmail'],
    3: [],
    4: [],
    5: [],
  }

  const handleNext = async () => {
    const fields = STEP_FIELDS[currentStep]
    const valid = await trigger(fields)
    if (valid) setCurrentStep((s) => Math.min(s + 1, 5))
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
          <h1 className="font-display text-3xl font-bold text-gray-900">Crea la lista</h1>
        </div>

        <StepIndicator steps={STEPS} currentStep={currentStep} />

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="card mb-6">
            {currentStep === 1 && <StepPartyInfo register={register} control={control} errors={errors} watch={watch} setValue={setValue} />}
            {currentStep === 2 && <StepListSettings register={register} control={control} errors={errors} />}
            {currentStep === 3 && (
              <StepCollective register={register} watch={watch} setValue={setValue} />
            )}
            {currentStep === 4 && <StepGifts control={control} register={register} watch={watch} />}
            {currentStep === 5 && <StepConfirm data={watchedData} />}
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

            {currentStep < 5 ? (
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
                    Crea la lista
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

