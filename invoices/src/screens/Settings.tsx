import { signOut } from 'firebase/auth'
import { useEffect, useRef, useState } from 'react'
import type { SyncState } from '../cloud'
import { auth } from '../firebase'
import { Button, Card, Field, Icon, Logo, NumberInput, Radio, TopBar, inputCls } from '../components/ui'
import { back, useRoute } from '../router'
import { normalizeData, useStore } from '../store'
import type { AppData, Business, BusinessType } from '../types'
import { BUSINESS_TYPE_LABELS, DOC_META, allowedDocTypes } from '../utils/docs'
import { compressImage, readAsDataUrl } from '../utils/fileStore'
import { downloadFile } from '../utils/pdf'
import { ResetCard, RestoreCard, backupFile } from './AccountReset'

export function Settings({ onboarding = false }: { onboarding?: boolean }) {
  const { data, setBusiness, replaceAll, user, sync } = useStore()
  const { query } = useRoute()
  const [b, setB] = useState<Business>(data.business)
  const [error, setError] = useState('')
  const logoInput = useRef<HTMLInputElement>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const backupRef = useRef<HTMLDivElement>(null)
  const set = (patch: Partial<Business>) => setB((x) => ({ ...x, ...patch }))

  useEffect(() => {
    if (query.get('section') === 'backup') backupRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [query])

  function save() {
    if (!b.name.trim()) return setError('יש למלא את שם העסק')
    if (!b.taxId.trim()) return setError(b.type === 'company' ? 'יש למלא ח.פ.' : 'יש למלא מספר עוסק / ת.ז.')
    setError('')
    setBusiness({ ...b, name: b.name.trim() })
    if (!onboarding) back()
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const small = await compressImage(f, 320, 0.85)
    set({ logo: await readAsDataUrl(small) })
  }

  function exportBackup() {
    downloadFile(backupFile(data))
  }

  function importBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    f.text()
      .then((t) => {
        const parsed = JSON.parse(t) as AppData
        if (!parsed.business || !Array.isArray(parsed.docs)) throw new Error('bad')
        if (confirm(`לייבא ${parsed.docs.length} מסמכים? הנתונים הקיימים יוחלפו.`)) {
          replaceAll(normalizeData(parsed))
          setB({ ...b, ...parsed.business })
        }
      })
      .catch(() => alert('הקובץ אינו גיבוי תקין'))
  }

  const issuedTypes = new Set(data.docs.filter((d) => d.status === 'issued').map((d) => d.type))

  return (
    <div className="min-h-dvh bg-mist pb-32">
      {onboarding ? (
        <div className="rounded-b-[36px] bg-lime-bg px-6 pb-10 pt-[max(env(safe-area-inset-top),32px)] text-center">
          <div className="flex justify-center">
            <Logo size={64} />
          </div>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-[#1d4d2b]">ברוכים הבאים לפנקס</h1>
          <p className="mx-auto mt-3 max-w-xs text-lg text-ink">קבלות, חשבוניות והוצאות — מכל מקום. נתחיל בפרטי העסק שיופיעו על המסמכים.</p>
          <p className="mt-3 text-sm text-ink-soft">
            מחובר/ת כ־<span dir="ltr">{user.email}</span> ·{' '}
            <button onClick={() => void signOut(auth)} className="font-medium text-indigo underline">
              התנתקות
            </button>
          </p>
        </div>
      ) : (
        <TopBar title="פרטי העסק" />
      )}

      <div className={`space-y-3 px-4 ${onboarding ? '-mt-5' : ''}`}>
        <RestoreCard />
        <Card className="space-y-4">
          <h2 className="text-lg font-bold">סוג העסק</h2>
          <div role="radiogroup">
            {(Object.keys(BUSINESS_TYPE_LABELS) as BusinessType[]).map((t) => (
              <Radio key={t} checked={b.type === t} onChange={() => set({ type: t })} label={BUSINESS_TYPE_LABELS[t]} />
            ))}
          </div>
          <p className="text-sm text-ink-soft">
            {b.type === 'exempt'
              ? 'עוסק פטור מפיק קבלות, חשבונות עסקה והצעות מחיר — ללא מע״מ.'
              : 'אפשר להפיק חשבוניות מס, חשבוניות מס/קבלה, חשבוניות זיכוי, קבלות, חשבונות עסקה והצעות מחיר.'}
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="text-lg font-bold">פרטים שיופיעו על המסמכים</h2>
          <div className="flex items-center gap-4">
            <button onClick={() => logoInput.current?.click()} className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-lavender text-sm text-ink-soft">
              {b.logo ? <img src={b.logo} alt="לוגו" className="h-full w-full object-contain" /> : 'לוגו'}
            </button>
            <div className="text-sm text-ink-soft">
              <button onClick={() => logoInput.current?.click()} className="font-medium text-indigo">
                {b.logo ? 'החלפת לוגו' : 'הוספת לוגו'}
              </button>
              {b.logo && (
                <button onClick={() => set({ logo: undefined })} className="mr-3 text-orange">
                  הסרה
                </button>
              )}
              <p>אופציונלי</p>
            </div>
            <input ref={logoInput} type="file" accept="image/*" onChange={onLogo} className="hidden" />
          </div>
          <Field label="שם העסק">
            <input value={b.name} onChange={(e) => set({ name: e.target.value })} className={inputCls} />
          </Field>
          <Field label="השם שלך (לברכה בדף הבית)">
            <input value={b.ownerName} onChange={(e) => set({ ownerName: e.target.value })} className={inputCls} />
          </Field>
          <Field label={b.type === 'company' ? 'ח.פ.' : 'מספר עוסק / ת.ז.'}>
            <input value={b.taxId} onChange={(e) => set({ taxId: e.target.value })} inputMode="numeric" dir="ltr" className={`${inputCls} text-right`} />
          </Field>
          <Field label="כתובת">
            <input value={b.address} onChange={(e) => set({ address: e.target.value })} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="טלפון">
              <input value={b.phone} onChange={(e) => set({ phone: e.target.value })} type="tel" dir="ltr" className={`${inputCls} text-right`} />
            </Field>
            <Field label="אימייל">
              <input value={b.email} onChange={(e) => set({ email: e.target.value })} type="email" dir="ltr" className={`${inputCls} text-right`} />
            </Field>
          </div>
          <Field label="טקסט קבוע בתחתית כל מסמך" hint="למשל פרטי חשבון בנק להעברה">
            <textarea value={b.footerNote} onChange={(e) => set({ footerNote: e.target.value })} rows={2} className={inputCls} />
          </Field>
        </Card>

        {!onboarding && (
          <>
            <Card className="space-y-3">
              <h2 className="text-lg font-bold">הגדרות מס</h2>
              {b.type !== 'exempt' && (
                <div className="grid grid-cols-2 gap-3">
                  <Field label="שיעור מע״מ (%)">
                    <NumberInput value={b.vatRate} onChange={(vatRate) => set({ vatRate })} />
                  </Field>
                  <Field label="סף למספר הקצאה (₪)" hint="לפני מע״מ">
                    <NumberInput value={b.allocationThreshold} onChange={(allocationThreshold) => set({ allocationThreshold })} />
                  </Field>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="תדירות דיווח" hint="מע״מ ומקדמות">
                  <select value={b.vatPeriod} onChange={(e) => set({ vatPeriod: e.target.value as Business['vatPeriod'] })} className={inputCls}>
                    <option value="bimonthly">דו־חודשי</option>
                    <option value="monthly">חודשי</option>
                  </select>
                </Field>
                <Field label="שיעור מקדמות מס הכנסה (%)" hint="מופיע בפנקס המקדמות">
                  <NumberInput value={b.incomeTaxAdvanceRate} onChange={(incomeTaxAdvanceRate) => set({ incomeTaxAdvanceRate: Math.max(0, incomeTaxAdvanceRate) })} />
                </Field>
              </div>
              <Field label="אימייל של רו״ח">
                <input value={b.accountantEmail} onChange={(e) => set({ accountantEmail: e.target.value })} type="email" dir="ltr" className={`${inputCls} text-right`} />
              </Field>
            </Card>

            <Card className="space-y-3">
              <h2 className="text-lg font-bold">מספור מסמכים</h2>
              <p className="text-sm text-ink-soft">
                אם עברתם מתוכנה אחרת — המשיכו מהמספר הבא שם. אפשר לשנות רק לפני שהופק המסמך הראשון מאותו סוג.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {allowedDocTypes(b.type).map((t) => (
                  <Field key={t} label={DOC_META[t].label}>
                    {issuedTypes.has(t) ? (
                      <div className={`${inputCls} bg-mist text-ink-soft`}>כבר בשימוש</div>
                    ) : (
                      <NumberInput
                        value={b.startNumbers[t] ?? 1}
                        onChange={(n) => set({ startNumbers: { ...b.startNumbers, [t]: Math.max(1, Math.floor(n)) } })}
                        placeholder="1"
                      />
                    )}
                  </Field>
                ))}
              </div>
            </Card>

            <div ref={backupRef} className="space-y-3">
              <Card className="space-y-3">
                <h2 className="text-lg font-bold">חשבון וגיבוי בענן</h2>
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-violet text-white">
                    <Icon name="user" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium" dir="ltr">
                      {user.email}
                    </p>
                    <SyncLine sync={sync} />
                  </div>
                </div>
                {sync.status === 'error' && sync.error && <p className="rounded-xl bg-peach p-3 text-sm text-orange">{sync.error}</p>}
                <p className="text-sm text-ink-soft">
                  כל המסמכים, הלקוחות וההוצאות (כולל תמונות הקבלות) נשמרים בחשבון. נכנסים מכל מכשיר עם אותו אימייל — והכל שם. אפשר לעבוד גם בלי אינטרנט; השינויים יעלו כשהחיבור יחזור.
                </p>
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => {
                    if (confirm('להתנתק מהחשבון?')) void signOut(auth)
                  }}
                >
                  התנתקות
                </Button>
              </Card>
              <Card className="space-y-3">
                <h2 className="text-lg font-bold">קובץ גיבוי</h2>
                <p className="text-sm text-ink-soft">
                  בנוסף לענן, אפשר לשמור עותק כקובץ במכשיר. (תמונות ההוצאות לא נכללות בקובץ.)
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={exportBackup} className="flex-1">
                    ייצוא גיבוי
                  </Button>
                  <Button variant="secondary" onClick={() => importInput.current?.click()} className="flex-1">
                    ייבוא גיבוי
                  </Button>
                  <input ref={importInput} type="file" accept="application/json" onChange={importBackup} className="hidden" />
                </div>
              </Card>
              <ResetCard />
            </div>
          </>
        )}

        {error && <p className="rounded-2xl bg-peach p-3 text-orange">{error}</p>}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-lg bg-gradient-to-t from-mist via-mist to-transparent px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-6">
        <Button onClick={save} className="w-full !py-4 text-lg">
          {onboarding ? 'יאללה, מתחילים' : 'שמירה'}
        </Button>
      </div>
    </div>
  )
}

function SyncLine({ sync }: { sync: SyncState }) {
  const map = {
    loading: { dot: 'bg-slate-tile', text: 'מתחבר לענן…' },
    synced: { dot: 'bg-mint', text: 'מגובה בענן' },
    saving: { dot: 'bg-violet', text: 'שומר בענן…' },
    offline: { dot: 'bg-orange', text: 'אין חיבור — השינויים יעלו כשיחזור' },
    error: { dot: 'bg-orange', text: 'הגיבוי לענן לא פעיל' },
  }[sync.status]
  return (
    <p className="flex items-center gap-2 text-sm text-ink-soft">
      <span className={`h-2.5 w-2.5 rounded-full ${map.dot}`} />
      {map.text}
      {sync.status === 'synced' && sync.lastSyncedAt && ` · ${new Date(sync.lastSyncedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}`}
    </p>
  )
}
