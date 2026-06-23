import React, { useState, useEffect } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Building2, HardHat, UserCircle, Briefcase, Copy, Check } from 'lucide-react'
import { BigButton } from '@components/BigButton'
import { useTelegram } from '@hooks/useTelegram'
import { useUserStore, ROLE_LABELS, resolveLogin, normalizeLogin, normalizePhone, type AppRole, type SavedAccount } from '@store/userStore'
import { maskPhone } from '@utils/accountStorage'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useOrganizationStore } from '@store/organizationStore'
import { usePersonProfileStore } from '@store/personProfileStore'
import type { SpecializationId } from '@/constants/specializations'
import { specialtyTextFromIds } from '@/constants/specializations'
import { buildUserKey } from '@utils/notificationFilter'
import { SpecializationPicker } from '@components/register/SpecializationPicker'
import { OrganizationLinkBlock, isOrgCodeConfirmed } from '@components/register/OrganizationLinkBlock'
import type { OrgLinkMode } from '@components/register/OrganizationLinkBlock'
import { FacePhotoUpload } from '@components/register/FacePhotoUpload'
import { ForemanLinkBlock } from '@components/register/ForemanLinkBlock'
import { useBrigadeStore } from '@store/brigadeStore'
import { WorkerBrigadeModePicker } from '@components/register/WorkerBrigadeModePicker'
import type { WorkerBrigadeMode } from '@/types/brigade'
import type { PersonProfile } from '@/types/person'
import { WorkerTypePicker } from '@components/register/WorkerTypePicker'
import { notifyWorkerJoinedForeman } from '@utils/personNotifications'
import { syncOrganizationRegistryFromStores } from '@utils/objectChain'
import { syncDirectoryFromApp } from '@utils/directorySync'
import { syncUsersFromAuth } from '@store/usersStore'
import { WORKER_TYPE_LABELS, type WorkerEmploymentType } from '@/types/person'
import type { DirectoryPerson } from '@store/directoryStore'
import { useDirectoryStore } from '@store/directoryStore'

const roles: { id: AppRole; title: string; desc: string; icon: typeof Building2 }[] = [
  {
    id: 'client',
    title: 'Заказчик',
    desc: 'Следить за ремонтом, домами, квартирами и работами',
    icon: UserCircle,
  },
  {
    id: 'foreman',
    title: 'Прораб',
    desc: 'Объекты, бюджет, команда, задачи и отчёты',
    icon: Building2,
  },
  {
    id: 'subcontractor',
    title: 'Организация',
    desc: 'Назначенные работы, ваши мастера и контроль задач',
    icon: Briefcase,
  },
  {
    id: 'worker',
    title: 'Мастер',
    desc: 'Задачи, фотоотчёты, таймер и голосовые заметки',
    icon: HardHat,
  },
]

const ROLES_WITH_SPEC: AppRole[] = ['worker', 'foreman', 'subcontractor']
const ROLES_WITH_PHOTO: AppRole[] = ['worker', 'foreman', 'subcontractor']

export const Register: React.FC = () => {
  const navigate = useNavigate()
  const registered = useUserStore((s) => s.registered)
  const { haptic, user: tgUser } = useTelegram()
  const register = useUserStore((s) => s.register)
  const signIn = useUserStore((s) => s.signIn)
  const loginAsAccount = useUserStore((s) => s.loginAsAccount)
  const registerContractor = useProjectWorkflowStore((s) => s.registerContractor)
  const linkUserByInviteCode = useOrganizationStore((s) => s.linkUserByInviteCode)
  const linkWorkerToForemanAndOrg = useOrganizationStore((s) => s.linkWorkerToForemanAndOrg)
  const allocateCode = usePersonProfileStore((s) => s.allocateCode)
  const registerProfile = usePersonProfileStore((s) => s.registerProfile)
  const createBrigade = useBrigadeStore((s) => s.createBrigade)
  const joinBrigadeByCode = useBrigadeStore((s) => s.joinByCode)
  const recoverAccounts = useUserStore((s) => s.recoverAccounts)
  const savedAccounts = useUserStore((s) => s.accounts)

  useEffect(() => {
    recoverAccounts()
  }, [recoverAccounts])

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [fullName, setFullName] = useState(tgUser?.first_name || '')
  const [phone, setPhone] = useState('')
  const [loginName, setLoginName] = useState('')
  const [loginInput, setLoginInput] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pickAccounts, setPickAccounts] = useState<SavedAccount[] | null>(null)
  const [facePhoto, setFacePhoto] = useState('')
  const [role, setRole] = useState<AppRole | null>(null)
  const [organizationName, setOrganizationName] = useState('')
  const [organizationInn, setOrganizationInn] = useState('')
  const [specializationIds, setSpecializationIds] = useState<SpecializationId[]>([])
  const [orgMode, setOrgMode] = useState<OrgLinkMode>('code')
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [orgConfirmCode, setOrgConfirmCode] = useState('')
  const [foremanCode, setForemanCode] = useState('')
  const [foremanUserKey, setForemanUserKey] = useState('')
  const [foremanMatch, setForemanMatch] = useState<DirectoryPerson | null>(null)
  const [workerEmploymentType, setWorkerEmploymentType] = useState<WorkerEmploymentType>('hourly')
  const [workerBrigadeMode, setWorkerBrigadeMode] = useState<WorkerBrigadeMode>('solo')
  const [brigadeJoinCode, setBrigadeJoinCode] = useState('')
  const [error, setError] = useState('')
  const [createdCode, setCreatedCode] = useState<string | null>(null)
  const [createdBrigadeCode, setCreatedBrigadeCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const showSpec = role != null && ROLES_WITH_SPEC.includes(role)
  const showPhoto = role != null && ROLES_WITH_PHOTO.includes(role)
  const selectedOrg = useDirectoryStore((s) =>
    selectedOrgId ? s.orgs[selectedOrgId] : s.findOrgByCode(orgConfirmCode),
  )

  if (registered) {
    return <Navigate to="/" replace />
  }

  const saveProfile = (userKey: string, personalCode: string, extra: Partial<PersonProfile>) => {
    if (!role) return
    registerProfile({
      userKey,
      role,
      fullName: fullName.trim(),
      phone: phone.trim(),
      facePhoto,
      personalCode,
      specializationIds,
      createdAt: new Date().toISOString(),
      ...extra,
    })
  }

  const handleQuickLogin = (acc: SavedAccount) => {
    setError('')
    if (!acc.password && password.length < 4) {
      setLoginInput(acc.login || acc.phone)
      setError('Введите пароль ниже — он сохранится для этого аккаунта')
      return
    }
    const result = loginAsAccount(acc.userKey, acc.password ? undefined : password)
    if (result.ok) {
      haptic('success')
      navigate('/', { replace: true })
    } else {
      setLoginInput(acc.login || acc.phone)
      setError(result.reason ?? 'Не удалось войти')
    }
  }

  const handleLogin = () => {
    setError('')
    setPickAccounts(null)
    const result = signIn(loginInput.trim(), password)
    if (result.ok) {
      haptic('success')
      navigate('/', { replace: true })
      return
    }
    if (result.pickAccounts?.length) {
      setPickAccounts(result.pickAccounts)
      return
    }
    setError(result.reason ?? 'Аккаунт не найден')
  }

  const handlePickAccount = (userKey: string) => {
    const result = loginAsAccount(userKey)
    if (result.ok) {
      haptic('success')
      navigate('/', { replace: true })
    } else {
      setError(result.reason ?? 'Аккаунт не найден')
    }
  }

  const handleSubmit = () => {
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Введите корректный телефон')
      return
    }
    if (loginName.trim() && loginName.trim().length < 3) {
      setError('Логин — минимум 3 символа')
      return
    }
    if (password.length < 4) {
      setError('Пароль — минимум 4 символа')
      return
    }
    if (password !== confirmPassword) {
      setError('Пароли не совпадают')
      return
    }
    if (!fullName.trim()) {
      setError('Введите ФИО полностью')
      return
    }
    if (!role) {
      setError('Выберите вашу роль')
      return
    }
    if (showPhoto && !facePhoto) {
      setError('Загрузите фото лица')
      return
    }
    if (showSpec && specializationIds.length === 0) {
      setError('Выберите хотя бы одну специализацию')
      return
    }

    const resolvedLogin = resolveLogin(loginName.trim(), phone.trim())
    const userKeyPreview = buildUserKey(phone.trim(), role!, '', fullName.trim())
    const loginTaken = savedAccounts.some(
      (a) => a.userKey !== userKeyPreview && normalizeLogin(a.login || a.phone) === resolvedLogin,
    )
    if (loginTaken) {
      setError('Этот логин уже занят')
      return
    }

    haptic('success')

    if (role === 'client') {
      register({ fullName: fullName.trim(), phone: phone.trim(), login: resolvedLogin, password, role })
      navigate('/', { replace: true })
      return
    }

    if (role === 'subcontractor') {
      if (!organizationName.trim()) {
        setError('Укажите название организации')
        return
      }
      if (!organizationInn.trim() || organizationInn.replace(/\D/g, '').length < 10) {
        setError('Укажите корректный ИНН (10 или 12 цифр)')
        return
      }
      const org = registerContractor({
        name: organizationName.trim(),
        phone: phone.trim(),
        specializationIds,
      })
      const personalCode = org.inviteCode ?? allocateCode('ОРГ')
      const userKey = buildUserKey(phone.trim(), role, org.id, fullName.trim())
      saveProfile(userKey, personalCode, {
        contractorId: org.id,
        organizationId: org.id,
      })
      register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        login: resolvedLogin,
        password,
        role,
        contractorId: org.id,
        specializationIds,
        organizationName: organizationName.trim(),
        inn: organizationInn.trim(),
        facePhoto,
        personalCode,
      })
      syncOrganizationRegistryFromStores()
      syncUsersFromAuth(useUserStore.getState().accounts)
      syncDirectoryFromApp()
      setCreatedCode(personalCode)
      return
    }

    const userKey = buildUserKey(phone.trim(), role, '', fullName.trim())
    const personalCode = allocateCode(role === 'foreman' ? 'ПР' : 'М')

    if (role === 'foreman') {
      const orgFromCode = useDirectoryStore.getState().findOrgByCode(orgConfirmCode)
      const org = selectedOrg ?? orgFromCode
      if (!org || !isOrgCodeConfirmed({ inviteCode: org.inviteCode }, orgConfirmCode)) {
        setError('Введите правильный код организации ОРГ-XXXX')
        return
      }
      const contractorId = org.contractorId

      linkUserByInviteCode({
        contractorId,
        userKey,
        fullName: fullName.trim(),
        phone: phone.trim(),
        memberRole: 'foreman',
        specializationIds,
        facePhoto,
        personalCode,
      })
      saveProfile(userKey, personalCode, {
        organizationId: contractorId,
        contractorId,
      })
      register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        login: resolvedLogin,
        password,
        role,
        specializationIds,
        organizationId: contractorId,
        organizationName: org.name,
        organizationLinkStatus: 'approved',
        facePhoto,
        personalCode,
      })
      syncDirectoryFromApp()
      navigate('/', { replace: true })
      return
    }

    if (role === 'worker') {
      const foremanPerson =
        foremanMatch
        ?? useDirectoryStore.getState().findPersonByCode(foremanCode)
      if (!foremanPerson || foremanPerson.role !== 'foreman') {
        setError('Укажите прораба по коду ПР-XXXX')
        return
      }
      const orgId = foremanPerson.organizationId || foremanPerson.contractorId
      if (!orgId) {
        setError('У прораба не указана организация')
        return
      }
      const resolvedForemanKey = foremanPerson.userKey
      const isMemberJoin = !!brigadeJoinCode.trim()
      const employmentType: WorkerEmploymentType =
        workerBrigadeMode === 'brigadier' ? 'brigade' : workerEmploymentType

      const linked = linkWorkerToForemanAndOrg({
        userKey,
        contractorId: orgId,
        foremanUserKey: resolvedForemanKey,
        fullName: fullName.trim(),
        phone: phone.trim(),
        specializationIds,
        facePhoto,
        personalCode,
        workerEmploymentType: employmentType,
      })

      let brigadeId = ''
      let brigadeCode = ''
      let brigadeMode: WorkerBrigadeMode = 'solo'

      if (isMemberJoin) {
        const joined = joinBrigadeByCode(
          brigadeJoinCode,
          userKey,
          fullName.trim(),
          linked.workerMemberId,
        )
        if (!joined.ok) {
          setError(joined.reason ?? 'Не удалось войти в бригаду')
          return
        }
        brigadeId = joined.brigade?.id ?? ''
        brigadeCode = joined.brigade?.brigadeCode ?? ''
        brigadeMode = 'member'
      } else if (workerBrigadeMode === 'brigadier') {
        const brigade = createBrigade({
          leaderUserKey: userKey,
          leaderName: fullName.trim(),
          leaderWorkerMemberId: linked.workerMemberId,
          specializationIds,
        })
        brigadeId = brigade.id
        brigadeCode = brigade.brigadeCode
        brigadeMode = 'brigadier'
        setCreatedBrigadeCode(brigade.brigadeCode)
      }

      saveProfile(userKey, personalCode, {
        organizationId: orgId,
        foremanUserKey: resolvedForemanKey,
        workerMemberId: linked.workerMemberId,
        workerEmploymentType: employmentType,
        workerBrigadeMode: brigadeMode,
        brigadeId: brigadeId || undefined,
        brigadeCode: brigadeCode || undefined,
      })
      notifyWorkerJoinedForeman({
        foremanUserKey: resolvedForemanKey,
        workerName: fullName.trim(),
        facePhoto,
        specialization: specialtyTextFromIds(specializationIds),
        workerType: brigadeMode === 'brigadier' ? 'Бригадир' : WORKER_TYPE_LABELS[employmentType],
        personalCode,
      })
      register({
        fullName: fullName.trim(),
        phone: phone.trim(),
        login: resolvedLogin,
        password,
        role,
        specializationIds,
        organizationId: orgId,
        organizationLinkStatus: 'approved',
        workerMemberId: linked.workerMemberId,
        facePhoto,
        personalCode,
        workerEmploymentType: employmentType,
        workerBrigadeMode: brigadeMode,
        brigadeId,
        brigadeCode,
        foremanUserKey: resolvedForemanKey,
      })
      syncDirectoryFromApp()
      if (workerBrigadeMode === 'brigadier' && !isMemberJoin) return
      navigate('/', { replace: true })
    }
  }

  const copyCode = async () => {
    if (!createdCode) return
    try {
      await navigator.clipboard.writeText(createdCode)
      setCopied(true)
      haptic('success')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  if (createdBrigadeCode) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 pb-12">
        <div className="max-w-md mx-auto text-center">
          {facePhoto && (
            <img src={facePhoto} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-amber-100" />
          )}
          <h1 className="text-2xl-mobile font-bold text-gray-900 mb-2">Бригада создана</h1>
          <p className="text-sm-mobile text-gray-500 mb-6">Дайте код мастерам — они введут его при регистрации</p>
          <div className="bg-white rounded-2xl p-6 border-2 border-amber-200 mb-4">
            <p className="text-xs-mobile text-gray-500 mb-1">Код бригады</p>
            <p className="text-3xl-mobile font-bold text-amber-700 tracking-wide">{createdBrigadeCode}</p>
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(createdBrigadeCode)
                setCopied(true)
                haptic('success')
                setTimeout(() => setCopied(false), 2000)
              }}
              className="mt-4 inline-flex items-center gap-2 text-amber-700 text-sm-mobile font-medium"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Скопировано' : 'Скопировать код'}
            </button>
          </div>
          <BigButton variant="primary" size="xl" fullWidth onClick={() => navigate('/', { replace: true })}>
            Перейти в кабинет
          </BigButton>
        </div>
      </div>
    )
  }

  if (createdCode) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 pb-12">
        <div className="max-w-md mx-auto text-center">
          {facePhoto && (
            <img src={facePhoto} alt="" className="w-20 h-20 rounded-full object-cover mx-auto mb-4 border-4 border-primary-100" />
          )}
          <h1 className="text-2xl-mobile font-bold text-gray-900 mb-2">Организация зарегистрирована</h1>
          <p className="text-sm-mobile text-gray-500 mb-6">Ваш уникальный код для поиска и привязки</p>
          <div className="bg-white rounded-2xl p-6 border-2 border-primary-200 mb-4">
            <p className="text-xs-mobile text-gray-500 mb-1">Код организации</p>
            <p className="text-3xl-mobile font-bold text-primary-700 tracking-wide">{createdCode}</p>
            <button
              type="button"
              onClick={copyCode}
              className="mt-4 inline-flex items-center gap-2 text-primary-600 text-sm-mobile font-medium"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Скопировано' : 'Скопировать код'}
            </button>
          </div>
          <BigButton variant="primary" size="xl" fullWidth onClick={() => navigate('/', { replace: true })}>
            Перейти в кабинет
          </BigButton>
        </div>
      </div>
    )
  }

  if (pickAccounts?.length) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 pb-12">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl-mobile font-bold text-gray-900 mb-2 text-center">Выберите аккаунт</h1>
          <p className="text-sm-mobile text-gray-500 mb-6 text-center">На этот телефон зарегистрировано несколько ролей</p>
          <div className="space-y-3">
            {pickAccounts.map((acc) => (
              <button
                key={acc.userKey}
                type="button"
                onClick={() => handlePickAccount(acc.userKey)}
                className="w-full text-left p-4 rounded-2xl border-2 border-gray-100 bg-white hover:border-primary-300 transition-all"
              >
                <p className="text-base-mobile font-bold text-gray-900">{acc.fullName}</p>
                <p className="text-sm-mobile text-primary-600 mt-0.5">{ROLE_LABELS[acc.role]}</p>
                {acc.personalCode && (
                  <p className="text-xs-mobile text-gray-500 mt-1">Код: {acc.personalCode}</p>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPickAccounts(null)}
            className="mt-6 w-full text-center text-sm-mobile text-gray-500"
          >
            Назад
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-8 pb-12">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200">
              <Building2 size={32} className="text-white" />
            </div>
            <h1 className="text-2xl-mobile font-bold text-gray-900">СтройХаб</h1>
            <p className="text-sm-mobile text-gray-500 mt-2">Вход в аккаунт</p>
          </div>

          <div className="flex rounded-xl bg-gray-200 p-1 mb-6">
            <button
              type="button"
              onClick={() => { setMode('login'); setError('') }}
              className="flex-1 py-2.5 rounded-lg text-sm-mobile font-semibold bg-white text-gray-900 shadow-sm"
            >
              Вход
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); setError('') }}
              className="flex-1 py-2.5 rounded-lg text-sm-mobile font-semibold text-gray-600"
            >
              Регистрация
            </button>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 space-y-4">
            <div>
              <label className="text-sm-mobile font-medium text-gray-700">Логин или телефон</label>
              <input
                type="text"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                placeholder="ivanov или +7 999 123-45-67"
                autoComplete="username"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-sm-mobile font-medium text-gray-700">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 4 символа"
                autoComplete="current-password"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {error && <p className="text-sm-mobile text-red-600 mb-3 text-center">{error}</p>}

          {savedAccounts.length > 0 && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
              <p className="text-sm-mobile font-semibold text-gray-900 mb-3">
                Сохранённые аккаунты ({savedAccounts.length})
              </p>
              <div className="space-y-2">
                {savedAccounts.map((acc) => (
                  <button
                    key={acc.userKey}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 bg-gray-50 hover:border-primary-300 hover:bg-primary-50 transition-all"
                  >
                    <p className="text-sm-mobile font-bold text-gray-900">{acc.fullName}</p>
                    <p className="text-xs-mobile text-primary-600 mt-0.5">{ROLE_LABELS[acc.role]}</p>
                    <p className="text-xs-mobile text-gray-500 mt-0.5">
                      {acc.login && acc.login !== normalizePhone(acc.phone) ? acc.login : maskPhone(acc.phone)}
                    </p>
                    {!acc.password && (
                      <p className="text-xs-mobile text-amber-600 mt-1">Введите пароль ниже при первом входе</p>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs-mobile text-gray-400 mt-3 text-center">
                Нажмите на аккаунт для быстрого входа
              </p>
            </div>
          )}

          <BigButton variant="primary" size="xl" fullWidth onClick={handleLogin}>
            Войти
          </BigButton>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 pb-12">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200">
            <Building2 size={32} className="text-white" />
          </div>
          <h1 className="text-2xl-mobile font-bold text-gray-900">СтройХаб</h1>
          <p className="text-sm-mobile text-gray-500 mt-2">Регистрация — выберите свой путь</p>
        </div>

        <div className="flex rounded-xl bg-gray-200 p-1 mb-6">
          <button
            type="button"
            onClick={() => { setMode('login'); setError('') }}
            className="flex-1 py-2.5 rounded-lg text-sm-mobile font-semibold text-gray-600"
          >
            Вход
          </button>
          <button
            type="button"
            onClick={() => { setMode('register'); setError('') }}
            className="flex-1 py-2.5 rounded-lg text-sm-mobile font-semibold bg-white text-gray-900 shadow-sm"
          >
            Регистрация
          </button>
        </div>

        <p className="text-sm-mobile font-semibold text-gray-900 mb-3">Кто вы?</p>
        <div className="space-y-3 mb-4">
          {roles.map((r) => {
            const Icon = r.icon
            const selected = role === r.id
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  haptic('selection')
                  setRole(r.id)
                  setError('')
                  if (!ROLES_WITH_SPEC.includes(r.id)) setSpecializationIds([])
                }}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  selected ? 'border-primary-500 bg-primary-50 shadow-sm' : 'border-gray-100 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    selected ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <p className="text-base-mobile font-bold text-gray-900">{r.title}</p>
                    <p className="text-sm-mobile text-gray-500 mt-0.5">{r.desc}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {role && (
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4 space-y-4">
            {showPhoto && (
              <FacePhotoUpload value={facePhoto} onChange={setFacePhoto} />
            )}
            <div>
              <label className="text-sm-mobile font-medium text-gray-700">ФИО полностью</label>
              <input
                type="text"
                lang="ru"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-sm-mobile font-medium text-gray-700">Телефон</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+7 (999) 123-45-67"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-sm-mobile font-medium text-gray-700">Логин</label>
              <input
                type="text"
                value={loginName}
                onChange={(e) => setLoginName(e.target.value)}
                placeholder="ivanov (необязательно — по умолчанию телефон)"
                autoComplete="username"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-sm-mobile font-medium text-gray-700">Пароль</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 4 символа"
                autoComplete="new-password"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="text-sm-mobile font-medium text-gray-700">Повторите пароль</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ещё раз"
                autoComplete="new-password"
                className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {role === 'subcontractor' && (
              <>
                <div>
                  <label className="text-sm-mobile font-medium text-gray-700">Название организации</label>
                  <input
                    type="text"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    placeholder="ООО «АкваТех»"
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
                  />
                </div>
                <div>
                  <label className="text-sm-mobile font-medium text-gray-700">ИНН</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={organizationInn}
                    onChange={(e) => setOrganizationInn(e.target.value.replace(/[^\d]/g, ''))}
                    placeholder="7701234567"
                    className="mt-1 w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {showSpec && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100 mb-4 space-y-2">
            <label className="text-sm-mobile font-semibold text-gray-900">Специализация</label>
            <SpecializationPicker value={specializationIds} onChange={setSpecializationIds} />
          </div>
        )}

        {role === 'foreman' && specializationIds.length > 0 && (
          <div className="mb-4">
            <OrganizationLinkBlock
              specializationIds={specializationIds}
              mode={orgMode}
              onModeChange={setOrgMode}
              selectedOrgId={selectedOrgId}
              onSelectedOrgIdChange={setSelectedOrgId}
              confirmCode={orgConfirmCode}
              onConfirmCodeChange={setOrgConfirmCode}
              foremanMode
            />
          </div>
        )}

        {role === 'worker' && specializationIds.length > 0 && (
          <div className="mb-4 space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-2">
              <label className="text-sm-mobile font-medium text-gray-700">Код бригады (если вас пригласили)</label>
              <input
                value={brigadeJoinCode}
                onChange={(e) => setBrigadeJoinCode(e.target.value.toUpperCase())}
                placeholder="БР-2055"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile uppercase tracking-wide"
              />
              <p className="text-xs-mobile text-gray-500">Оставьте пустым, если регистрируетесь как одиночка или бригадир</p>
            </div>
            {!brigadeJoinCode.trim() && (
              <>
                <WorkerBrigadeModePicker value={workerBrigadeMode} onChange={setWorkerBrigadeMode} />
                {workerBrigadeMode === 'solo' && (
                  <WorkerTypePicker value={workerEmploymentType} onChange={setWorkerEmploymentType} />
                )}
              </>
            )}
            <ForemanLinkBlock
              specializationIds={specializationIds}
              selectedOrgId={selectedOrgId}
              onSelectedOrgIdChange={setSelectedOrgId}
              foremanUserKey={foremanUserKey}
              onForemanUserKeyChange={setForemanUserKey}
              foremanCode={foremanCode}
              onForemanCodeChange={setForemanCode}
              foremanMatch={foremanMatch}
              onForemanMatchChange={setForemanMatch}
            />
          </div>
        )}

        {error && <p className="text-sm-mobile text-red-600 mb-3 text-center">{error}</p>}

        <BigButton variant="primary" size="xl" fullWidth onClick={handleSubmit}>
          {role === 'foreman' ? 'Отправить запрос организации' : 'Начать работу'}
        </BigButton>
      </div>
    </div>
  )
}
