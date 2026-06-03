import Layout from '../components/Layout'

export default function PrivacyPolicyPage() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8 text-gray-700">
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-400">Ultimo aggiornamento: giugno 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-gray-800">1. Titolare del trattamento</h2>
          <p className="text-sm leading-relaxed">
            Il titolare del trattamento dei dati personali è <strong>Alessio Arrigoni</strong>,
            raggiungibile all'indirizzo email{' '}
            <a href="mailto:arrigoni1976@gmail.com" className="text-salvia underline">
              arrigoni1976@gmail.com
            </a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-gray-800">2. Quali dati raccogliamo</h2>
          <p className="text-sm leading-relaxed">
            Piky raccoglie esclusivamente i dati che l'utente inserisce volontariamente durante l'utilizzo dell'app:
          </p>
          <ul className="text-sm leading-relaxed list-disc list-inside space-y-1 text-gray-600">
            <li>Nome del bambino e data della festa (inseriti da chi organizza)</li>
            <li>Lista dei regali desiderati (titoli, descrizioni, link, prezzi)</li>
            <li>Nome degli ospiti che prenotano un regalo o confermano la presenza</li>
            <li>Indirizzo email PayPal (opzionale, solo per la raccolta fondi collettiva)</li>
            <li>Codice personale anonimo (scelto dall'utente, es. "MARCO-7X2Q") per il recupero delle liste su altri dispositivi</li>
            <li>Log anonimi di accesso ai link (data/ora, numero di visualizzazioni)</li>
          </ul>
          <p className="text-sm leading-relaxed">
            <strong>Non raccogliamo</strong> indirizzi email degli utenti, numeri di telefono,
            dati di pagamento, né utilizziamo cookie di profilazione o strumenti di tracciamento
            pubblicitario.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-gray-800">3. Finalità del trattamento</h2>
          <p className="text-sm leading-relaxed">
            I dati sono utilizzati esclusivamente per:
          </p>
          <ul className="text-sm leading-relaxed list-disc list-inside space-y-1 text-gray-600">
            <li>Mostrare la lista dei regali agli ospiti invitati tramite link</li>
            <li>Coordinare le prenotazioni dei regali tra gli ospiti</li>
            <li>Permettere all'organizzatore di vedere chi ha confermato la presenza</li>
            <li>Consentire il recupero delle proprie liste su altri dispositivi tramite codice personale</li>
          </ul>
          <p className="text-sm leading-relaxed">
            I dati non vengono venduti, ceduti o condivisi con terze parti, salvo i fornitori
            tecnici indicati di seguito.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-gray-800">4. Dove sono conservati i dati</h2>
          <p className="text-sm leading-relaxed">
            I dati sono conservati su infrastrutture cloud localizzate nell'Unione Europea:
          </p>
          <ul className="text-sm leading-relaxed list-disc list-inside space-y-1 text-gray-600">
            <li><strong>Supabase</strong> (database) — server in <strong>Francoforte, Germania</strong> (eu-central-1)</li>
            <li><strong>Railway</strong> (server applicativo) — infrastruttura AWS con possibilità di region europea</li>
            <li><strong>Vercel</strong> (hosting frontend) — CDN globale con edge in Europa</li>
          </ul>
          <p className="text-sm leading-relaxed">
            Alcuni dati (lista degli eventi visitati, codice personale) sono conservati anche
            localmente nel browser dell'utente tramite <em>localStorage</em>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-gray-800">5. Per quanto tempo</h2>
          <p className="text-sm leading-relaxed">
            I dati relativi a un evento (lista regali, RSVP, log di accesso) non hanno una
            scadenza automatica. Su richiesta dell'utente, i dati vengono eliminati
            entro 30 giorni. Puoi richiedere la cancellazione scrivendo a{' '}
            <a href="mailto:arrigoni1976@gmail.com" className="text-salvia underline">
              arrigoni1976@gmail.com
            </a>{' '}
            indicando il token o il codice personale associato ai tuoi dati.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-gray-800">6. I tuoi diritti (GDPR)</h2>
          <p className="text-sm leading-relaxed">
            Ai sensi del Regolamento UE 2016/679 (GDPR) hai diritto di:
          </p>
          <ul className="text-sm leading-relaxed list-disc list-inside space-y-1 text-gray-600">
            <li>Accedere ai tuoi dati personali</li>
            <li>Rettificare dati inesatti</li>
            <li>Richiedere la cancellazione ("diritto all'oblio")</li>
            <li>Opporti al trattamento</li>
            <li>Presentare reclamo al Garante per la Protezione dei Dati Personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noopener noreferrer" className="text-salvia underline">garanteprivacy.it</a>)</li>
          </ul>
          <p className="text-sm leading-relaxed">
            Per esercitare questi diritti scrivi a{' '}
            <a href="mailto:arrigoni1976@gmail.com" className="text-salvia underline">
              arrigoni1976@gmail.com
            </a>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-gray-800">7. Cookie</h2>
          <p className="text-sm leading-relaxed">
            Piky non utilizza cookie di profilazione né cookie di terze parti a fini pubblicitari.
            Vengono utilizzati esclusivamente meccanismi tecnici del browser (<em>localStorage</em>)
            necessari al funzionamento dell'app, che non richiedono consenso ai sensi della
            normativa vigente.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-bold text-gray-800">8. Modifiche alla policy</h2>
          <p className="text-sm leading-relaxed">
            Questa policy può essere aggiornata in caso di modifiche all'app o alla normativa.
            La data di ultimo aggiornamento è indicata in cima alla pagina.
          </p>
        </section>
      </div>
    </Layout>
  )
}
