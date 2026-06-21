import React, { useMemo, useRef, useState } from 'react'
import { MessageSquare, Send, Camera, Filter } from 'lucide-react'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useUserStore } from '@store/userStore'
import { getCurrentUserKey, resolveWorkerIdForUser } from '@utils/notificationFilter'
import { useBrigadeStore } from '@store/brigadeStore'
import { WORK_TYPE_LABELS } from '@api/hierarchy'

interface TaskChatProps {
  taskId: string
}

export const TaskChat: React.FC<TaskChatProps> = ({ taskId }) => {
  const [text, setText] = useState('')
  const [filterAuthor, setFilterAuthor] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const messages = useProjectWorkflowStore((s) => s.chatMessages.filter((m) => m.taskId === taskId))
  const addChatMessage = useProjectWorkflowStore((s) => s.addChatMessage)
  const addChatReport = useProjectWorkflowStore((s) => s.addChatReport)
  const task = useProjectWorkflowStore((s) => s.tasks[taskId])
  const { fullName, role, brigadeId } = useUserStore()
  const brigade = useBrigadeStore((s) => (brigadeId ? s.getBrigade(brigadeId) : undefined))

  const authorRole: 'foreman' | 'worker' | 'client' | 'subcontractor' =
    role === 'foreman' ? 'foreman'
      : role === 'subcontractor' ? 'subcontractor'
        : role === 'worker' ? 'worker' : 'client'

  const authors = useMemo(() => {
    const set = new Set<string>()
    for (const m of messages) set.add(m.authorName)
    return [...set]
  }, [messages])

  const visible = filterAuthor
    ? messages.filter((m) => m.authorName === filterAuthor)
    : messages

  const sendText = () => {
    if (!text.trim()) return
    addChatMessage(taskId, authorRole, fullName || 'Пользователь', text.trim())
    setText('')
  }

  const onPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const photoUrl = reader.result as string
      const apt = task ? `Кв.${task.apartmentNumber} ${WORK_TYPE_LABELS[task.workType] ?? ''}`.trim() : ''
      const reportText = text.trim() || `${apt} готово`
      addChatReport({
        taskId,
        authorRole,
        authorName: fullName || 'Мастер',
        authorUserKey: getCurrentUserKey(),
        workerMemberId: resolveWorkerIdForUser(fullName),
        text: reportText,
        photoUrl,
        brigadeId: brigade?.id,
        apartmentLabel: apt || reportText,
      })
      setText('')
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between gap-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <MessageSquare size={18} className="text-primary-600" />
          <span className="text-sm-mobile font-semibold text-gray-900">Чат задачи</span>
        </div>
        {role === 'foreman' && authors.length > 1 && (
          <div className="flex items-center gap-1">
            <Filter size={14} className="text-gray-400" />
            <select
              value={filterAuthor}
              onChange={(e) => setFilterAuthor(e.target.value)}
              className="text-xs-mobile border border-gray-200 rounded-lg px-2 py-1"
            >
              <option value="">Все мастера</option>
              {authors.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="max-h-56 overflow-y-auto p-3 space-y-3 bg-white">
        {visible.length === 0 && (
          <p className="text-xs-mobile text-gray-400 text-center py-4">
            Скиньте фото готовой работы — подпись добавится автоматически
          </p>
        )}
        {visible.map((m) => (
          <div key={m.id} className={`text-sm-mobile ${m.authorRole === 'foreman' ? 'text-right' : ''}`}>
            <p className="text-xs-mobile text-gray-400">
              {new Date(m.createdAt).toLocaleString('ru-RU', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
              })}
            </p>
            <p className={`inline-block mt-0.5 px-3 py-2 rounded-xl max-w-[90%] ${
              m.authorRole === 'foreman' ? 'bg-primary-100 text-primary-900' : 'bg-gray-100 text-gray-900'
            }`}>
              {m.text}
            </p>
            {m.photoUrl && (
              <img src={m.photoUrl} alt="" className="mt-2 max-w-full max-h-40 rounded-xl border border-gray-100" />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-3 border-t border-gray-100">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="p-2.5 bg-gray-100 text-gray-700 rounded-xl shrink-0"
          title="Фото отчёт"
        >
          <Camera size={18} />
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendText()}
          placeholder="Комментарий к фото..."
          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
        />
        <button type="button" onClick={sendText} className="p-2.5 bg-primary-600 text-white rounded-xl shrink-0">
          <Send size={18} />
        </button>
      </div>
    </div>
  )
}
